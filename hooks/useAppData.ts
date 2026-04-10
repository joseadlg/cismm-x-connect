import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Speaker, Exhibitor, AgendaSession, LeaderboardEntry, NewsPost, UserProfile } from '../types';
import { normalizeAttendeeCategory } from '../utils/attendeeCategory';
import { sortAgendaSessions } from '../utils/agendaSort';

export const useAppData = (userId: string | undefined) => {
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
    const [agendaSessions, setAgendaSessions] = useState<AgendaSession[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [exhibitorCategories, setExhibitorCategories] = useState<string[]>([]);
    const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
    const [unreadNewsCount, setUnreadNewsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // User specific data
    const [myAgenda, setMyAgenda] = useState<number[]>([]);
    const [visitedExhibitors, setVisitedExhibitors] = useState<number[]>([]);
    const [checkedInSessions, setCheckedInSessions] = useState<number[]>([]);
    const [myRatings, setMyRatings] = useState<number[]>([]);
    const [contacts, setContacts] = useState<UserProfile[]>([]);

    const fetchContacts = async (uid: string) => {
        const { data: contactLogs, error } = await supabase
            .from('user_contacts_log')
            .select('contact_id, profiles!user_contacts_log_contact_id_fkey(id, name, title, company, photo_url, email, phone, role, attendee_category)')
            .eq('user_id', uid);

        if (error) {
            throw error;
        }

        const fetchedContacts: UserProfile[] = (contactLogs || [])
            .filter((c: any) => c.profiles)
            .map((c: any) => {
                const p = c.profiles;
                return {
                    id: p.id,
                    name: p.name || '',
                    title: p.title || '',
                    company: p.company || '',
                    photoUrl: p.photo_url || '',
                    email: p.email || '',
                    phone: p.phone || '',
                    role: p.role || 'attendee',
                    attendeeCategory: normalizeAttendeeCategory(p.attendee_category),
                    points: 0,
                    interests: [],
                    track: 'General' as const,
                };
            });

        setContacts(fetchedContacts);
    };

    const fetchPublicData = async () => {
        try {
            const [
                { data: sData }, { data: eData }, { data: aData }, { data: nData }, { data: lData }
            ] = await Promise.all([
                supabase.from('speakers').select('*'),
                supabase.from('exhibitors').select('*'),
                supabase.from('agenda_sessions').select('*, session_speakers(speaker_id)'),
                supabase.from('news_posts').select('*').order('created_at', { ascending: false }),
                supabase.from('profiles').select('name, points, photo_url').eq('role', 'attendee').order('points', { ascending: false }).limit(10)
            ]);

            if (sData) setSpeakers(sData.map(s => ({
                id: s.id, name: s.name, photoUrl: s.photo_url || '', title: s.title || '', company: s.company || '', bio: s.bio || '', social: { linkedin: s.social_linkedin || undefined, twitter: s.social_twitter || undefined }
            })));
            if (eData) setExhibitors(eData.map(e => ({
                id: e.id, name: e.name, logoUrl: e.logo_url || '', description: e.description || '', contact: e.contact || '', website: e.website || '', standNumber: e.stand_number || '', category: ''
            })));
            if (aData) setAgendaSessions(sortAgendaSessions(aData.map(a => ({
                id: a.id, title: a.title, startTime: a.start_time, endTime: a.end_time, room: a.room || '', description: a.description || '', day: a.day as any, track: a.track as any, speakerIds: Array.isArray(a.session_speakers) ? a.session_speakers.map((ss: any) => ss.speaker_id) : []
            }))));
            setExhibitorCategories([]);
            if (nData) setNewsPosts(nData.map(n => ({
                id: n.id, title: n.title, content: n.content, authorName: n.author_name, authorRole: n.author_role as any, timestamp: n.created_at || '', category: n.category as any
            })));
            if (lData) setLeaderboard(lData.map((l, i) => ({
                rank: i + 1, name: l.name, points: l.points || 0, photoUrl: l.photo_url || ''
            })));
        } catch (err) {
            console.error("Error fetching public data:", err);
        }
    };

    const fetchUserData = async (uid: string) => {
        try {
            const [
                { data: userAgenda }, { data: userVisits }, { data: userCheckins }, { data: userRatings }
            ] = await Promise.all([
                supabase.from('user_agenda').select('session_id').eq('user_id', uid),
                supabase.from('user_visited_exhibitors').select('exhibitor_id').eq('user_id', uid),
                supabase.from('user_session_checkins').select('session_id').eq('user_id', uid),
                supabase.from('session_ratings').select('session_id').eq('user_id', uid)
            ]);
            if (userAgenda) setMyAgenda(userAgenda.map(u => u.session_id));
            if (userVisits) setVisitedExhibitors(userVisits.map(u => u.exhibitor_id));
            if (userCheckins) setCheckedInSessions(userCheckins.map(u => u.session_id));
            if (userRatings) setMyRatings(userRatings.map(u => u.session_id));

            await fetchContacts(uid);
        } catch (err) {
            console.error("Error fetching user data:", err);
        }
    };

    const setupRealtimeSubscriptions = () => {
        let isActive = true;

        // News Posts Subscription
        const newsChannel = supabase.channel('public:news_posts')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'news_posts' },
                (payload) => {
                    if (!isActive) {
                        return;
                    }

                    if (payload.eventType === 'INSERT') {
                        const newPost = {
                            id: payload.new.id,
                            title: payload.new.title,
                            content: payload.new.content,
                            authorName: payload.new.author_name,
                            authorRole: payload.new.author_role as any,
                            timestamp: payload.new.created_at || '',
                            category: payload.new.category as any
                        };
                        setNewsPosts(prev => {
                            if (prev.some(post => post.id === newPost.id)) return prev;
                            setUnreadNewsCount(count => count + 1);
                            return [newPost, ...prev];
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setNewsPosts(prev => prev.map(post => post.id === payload.new.id ? {
                            ...post,
                            title: payload.new.title,
                            content: payload.new.content,
                            authorName: payload.new.author_name,
                            authorRole: payload.new.author_role as any,
                            category: payload.new.category as any
                        } : post));
                    } else if (payload.eventType === 'DELETE') {
                        setNewsPosts(prev => prev.filter(post => post.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        // Agenda Sessions Subscription
        const agendaChannel = supabase.channel('public:agenda_sessions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agenda_sessions' },
                async (payload) => {
                    if (!isActive) {
                        return;
                    }

                    if (payload.eventType === 'DELETE') {
                        setAgendaSessions(prev => sortAgendaSessions(prev.filter(session => session.id !== payload.old.id)));
                    } else {
                        // For INSERT and UPDATE, fetch the specific session to get nested session_speakers
                        const { data: sessionData, error } = await supabase
                            .from('agenda_sessions')
                            .select('*, session_speakers(speaker_id)')
                            .eq('id', payload.new.id)
                            .single();

                        if (!isActive) {
                            return;
                        }

                        if (!error && sessionData) {
                            const newSession = {
                                id: sessionData.id,
                                title: sessionData.title,
                                startTime: sessionData.start_time,
                                endTime: sessionData.end_time,
                                room: sessionData.room || '',
                                description: sessionData.description || '',
                                day: sessionData.day as any,
                                track: sessionData.track as any,
                                speakerIds: Array.isArray(sessionData.session_speakers) ? sessionData.session_speakers.map((ss: any) => ss.speaker_id) : []
                            };

                            setAgendaSessions(prev => {
                                if (payload.eventType === 'INSERT') {
                                    return sortAgendaSessions([...prev, newSession]);
                                }

                                return sortAgendaSessions(prev.map(s => s.id === newSession.id ? newSession : s));
                            });
                        }
                    }
                }
            )
            .subscribe();

        const contactsChannel = userId
            ? supabase.channel(`public:user_contacts_log:${userId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'user_contacts_log', filter: `user_id=eq.${userId}` },
                    async () => {
                        if (!isActive || !userId) {
                            return;
                        }

                        try {
                            await fetchContacts(userId);
                        } catch (error) {
                            console.error('Error syncing contacts:', error);
                        }
                    }
                )
                .subscribe()
            : null;

        return () => {
            isActive = false;
            void newsChannel.unsubscribe();
            void agendaChannel.unsubscribe();
            if (contactsChannel) {
                void contactsChannel.unsubscribe();
                void supabase.removeChannel(contactsChannel);
            }
            void supabase.removeChannel(newsChannel);
            void supabase.removeChannel(agendaChannel);
        };
    };

    useEffect(() => {
        let mounted = true;
        let cleanupSubscriptions: (() => void) | undefined;

        const init = async () => {
            setLoading(true);
            await fetchPublicData();
            if (userId) {
                await fetchUserData(userId);
            }
            if (mounted) {
                cleanupSubscriptions = setupRealtimeSubscriptions();
                setLoading(false);
            }
        };
        void init();

        return () => {
            mounted = false;
            if (cleanupSubscriptions) cleanupSubscriptions();
        };
    }, [userId]);

    const refreshData = async () => {
        await fetchPublicData();
        if (userId) await fetchUserData(userId);
    };

    return {
        speakers, exhibitors, agendaSessions, leaderboard, exhibitorCategories, newsPosts,
        myAgenda, visitedExhibitors, checkedInSessions, myRatings, contacts, loading, unreadNewsCount,
        setSpeakers, setExhibitors, setAgendaSessions, setExhibitorCategories, setNewsPosts,
        setMyAgenda, setVisitedExhibitors, setCheckedInSessions, setLeaderboard,
        setUnreadNewsCount, setMyRatings, setContacts,
        refreshData
    };
};
