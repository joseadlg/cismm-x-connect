import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    isLoading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const getDeviceId = () => {
        let deviceId = localStorage.getItem('cismm_device_id');
        if (!deviceId) {
            deviceId = crypto.randomUUID();
            localStorage.setItem('cismm_device_id', deviceId);
        }
        return deviceId;
    };

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }

            // --- Device Limit Enforcement ---
            const deviceId = getDeviceId();
            let currentDevices: string[] = data.registered_devices || [];

            // Allow admins to always bypass device limits for safety
            if (data.role !== 'admin' && !currentDevices.includes(deviceId)) {
                if (currentDevices.length < (data.max_devices || 1)) {
                    // Add this device
                    currentDevices = [...currentDevices, deviceId];
                    await supabase.from('profiles').update({ registered_devices: currentDevices }).eq('id', userId);
                } else {
                    // Deny access
                    alert("Límite de dispositivos alcanzado para esta cuenta. Solicita un reseteo de dispositivos al administrador.");
                    await supabase.auth.signOut();
                    return null;
                }
            }
            // --------------------------------

            return {
                id: data.id,
                name: data.name,
                title: data.title || '',
                company: data.company || '',
                photoUrl: data.photo_url || '',
                interests: (data.interests as string[]) || [],
                role: data.role as any,
                track: data.track as any,
                exhibitorId: data.exhibitor_id || undefined,
                deviceId: data.device_id || undefined,
                points: data.points || 0,
                maxDevices: data.max_devices,
                registeredDevices: currentDevices,
                phone: data.phone || undefined,
                email: data.email || undefined,
            } as UserProfile;
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            return null;
        }
    };

    const refreshProfile = async () => {
        if (user?.id) {
            const p = await fetchProfile(user.id);
            setProfile(p);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).then(p => {
                    setProfile(p);
                    setIsLoading(false);
                });
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id).then(p => setProfile(p));
            } else {
                setProfile(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, isLoading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
