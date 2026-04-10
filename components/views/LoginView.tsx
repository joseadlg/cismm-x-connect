import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircleIcon } from '../Icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { parseQrData } from '../../utils/qr';
import { resolveAttendeeCategory } from '../../utils/attendeeCategory';
import { buildQrScanConfig, createQrScanner, tuneQrScannerForDistance } from '../../utils/qrScanner';

export const LoginView: React.FC = () => {
    const [isScannerMode, setIsScannerMode] = useState(true);
    const [loginInput, setLoginInput] = useState(''); // Accepts username or email
    const [password, setPassword] = useState('');
    const { showToast } = useToast();
    const { refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);

    const normalizeVirtualIdentifier = (value: unknown) =>
        (() => {
            const rawValue = String(value ?? '').trim();

            if (!rawValue) {
                return '';
            }

            if (rawValue.includes('@')) {
                return rawValue.toLowerCase();
            }

            const normalizedValue = rawValue
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

            const digitsOnly = normalizedValue.replace(/\D/g, '');
            if (digitsOnly.length >= 7 && !/[a-z]/.test(normalizedValue)) {
                return digitsOnly;
            }

            return normalizedValue
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
        })();

    const buildAttendeeProfilePatch = (userName: string, attendeeCategory: string, contactData: Record<string, any>) => ({
        name: userName,
        role: 'attendee',
        attendee_category: attendeeCategory,
        ...(contactData.phone ? { phone: contactData.phone } : {}),
        ...(contactData.email ? { email: contactData.email } : {}),
        ...(contactData.company ? { company: contactData.company } : {}),
        ...(contactData.title ? { title: contactData.title } : {}),
    });

    // Scanner state
    const scannerRef = useRef<Html5Qrcode | null>(null);

    const cleanupScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;

        if (!scanner) {
            return;
        }

        try {
            await scanner.stop();
        } catch {
            // Ignore stop errors if the scanner never started or is already stopped.
        }

        try {
            scanner.clear();
        } catch {
            // Ignore clear errors if the DOM node is already gone.
        }
    }, []);

    // Initialize/Destroy Scanner
    useEffect(() => {
        if (!isScannerMode) {
            void cleanupScanner();
            return;
        }

        const qrCodeScanner = createQrScanner("login-reader");
        scannerRef.current = qrCodeScanner;
        let isDisposed = false;

        const startScanner = () => {
            qrCodeScanner.start(
                { facingMode: { ideal: "environment" } },
                buildQrScanConfig('login'),
                async (decodedText: string) => {
                    // Pause scanner to prevent double-scans
                    if (scannerRef.current?.isScanning) {
                        try {
                            await scannerRef.current.pause();
                        } catch (e) { }
                    }
                    await handleQrLogin(decodedText);
                },
                (errorMessage: string) => { /* Ignore periodic clear texts */ }
            ).then(async () => {
                if (!isDisposed) {
                    await tuneQrScannerForDistance(qrCodeScanner);
                }
            }).catch((err: any) => {
                if (isDisposed) {
                    return;
                }
                showToast("No se pudo iniciar la cámara. Otorga los permisos en tu navegador.", "error");
            });
        };

        // Small delay to ensure div is rendered
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            isDisposed = true;
            clearTimeout(timer);
            void cleanupScanner();
        };
    }, [cleanupScanner, isScannerMode, showToast]);

    const handleQrLogin = async (decodedText: string) => {
        try {
            setLoading(true);

            const qrResult = await parseQrData(decodedText);

            if (!qrResult.ok) {
                showToast(
                    qrResult.reason === 'invalid_security'
                        ? 'Código QR inválido o manipulado.'
                        : 'Código QR no legible.',
                    'error'
                );
                scannerRef.current?.resume();
                setLoading(false);
                return;
            }

            const contactData = qrResult.data;
            const attendeeCategory = resolveAttendeeCategory(contactData);

            // Ensure userId is a string without spaces to prevent auth errors
            const rawUserId = contactData.id || contactData.exhibitorId || contactData.email || contactData.phone;
            const userId = normalizeVirtualIdentifier(rawUserId);
            const userName = (contactData.name as string | undefined) || "Asistente " + userId;
            const loginEmailFromQr = typeof contactData.loginEmail === 'string'
                ? contactData.loginEmail.trim().toLowerCase()
                : '';

            if (!userId) {
                showToast("Código QR vacío o sin identificador.", "error");
                scannerRef.current?.resume();
                setLoading(false);
                return;
            }

            // If the ID is an email (from a vCard), use it directly. Otherwise use the virtual domain wrapper.
            const autoEmail = loginEmailFromQr || (userId.includes('@')
                ? userId.toLowerCase()
                : `${userId.toLowerCase()}@asistente.cismm.com`);

            const autoPassword = `cismm-${userId}-secret`;

            // Attempt login
            let { data: signInData, error } = await supabase.auth.signInWithPassword({
                email: autoEmail,
                password: autoPassword
            });

            // Auto-register via Virtual Credentials if not exists
            if (error && error.message.includes("Invalid login credentials") && !loginEmailFromQr) {
                showToast('Creando perfil virtual...', 'info');
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: autoEmail,
                    password: autoPassword,
                    options: { data: { full_name: userName } }
                });

                if (signUpError) throw signUpError;

                if (signUpData.user) {
                    const { error: insertError } = await supabase.from('profiles').insert([
                        {
                            id: signUpData.user.id,
                            ...buildAttendeeProfilePatch(userName, attendeeCategory, contactData),
                        }
                    ]);
                    if (insertError) {
                        console.error("Profile insert error:", insertError);
                        throw new Error("No se pudo crear el perfil: " + insertError.message);
                    }

                    // Force a re-login after creating to establish the session definitely
                    const { error: signInError } = await supabase.auth.signInWithPassword({ email: autoEmail, password: autoPassword });
                    if (signInError) {
                        console.error("Auto-signin error after signup:", signInError);
                        throw new Error("Error al iniciar sesión automáticamente: " + signInError.message);
                    }
                }
            } else if (error) {
                throw error;
            } else if (signInData?.user) {
                // Login was successful! 
                // But if the 'profiles' db table got wiped, their Auth user exists but profile is missing.
                // Fail-safe: Ensure their row exists in 'profiles'
                const attendeeProfilePatch = buildAttendeeProfilePatch(userName, attendeeCategory, contactData);
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', signInData.user.id)
                    .maybeSingle();

                const profileCheckError = existingProfile
                    ? (await supabase
                        .from('profiles')
                        .update(attendeeProfilePatch)
                        .eq('id', signInData.user.id)).error
                    : (await supabase
                        .from('profiles')
                        .insert([{ id: signInData.user.id, ...attendeeProfilePatch }])).error;

                if (profileCheckError) {
                    console.error("Silent profile recovery failed:", profileCheckError);
                }
            }

            // Force AuthContext to reload profile so App.tsx redirects off LoginView immediately
            try {
                await refreshProfile();
            } catch (err) { }

            showToast(`¡Bienvenido, ${userName}!`, 'success');
        } catch (e: any) {
            console.error("QR Login Error:", e);
            showToast("Error de acceso: " + (e.message || "Credenciales inválidas"), "error");
            try {
                if (scannerRef.current) {
                    await scannerRef.current.resume();
                }
            } catch (err) {
                // ignore resume errors
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // If the user typed a username (no @), map it to the virtual staff email
            const resolvedEmail = loginInput.includes('@')
                ? loginInput
                : `${loginInput.trim().toLowerCase()}@staff.cismm.com`;
            const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password });
            if (error) throw error;
            showToast('Acceso correcto.', 'success');
        } catch (error: any) {
            showToast("Credenciales inválidas o incompletas.", 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side: Form Container */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-8">
                <div className="w-full max-w-sm mx-auto">

                    {/* Header */}
                    <div className="mb-8 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start mb-4">
                            <span className="text-3xl font-black tracking-tighter text-slate-900 border-b-4 border-brand-primary pb-1">
                                CISMM <span className="text-brand-primary font-light">X</span> CONNECT
                            </span>
                        </div>
                        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight mt-4">
                            Ingreso al Evento
                        </h2>
                    </div>

                    {/* Authentication Type Tabs */}
                    <div className="flex space-x-4 mb-6 border-b border-gray-200">
                        <button
                            type="button"
                            onClick={() => setIsScannerMode(true)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex-1 ${isScannerMode ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                        >
                            <span className="flex items-center justify-center">📷 Escanear Gafete</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsScannerMode(false)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors flex-1 ${!isScannerMode ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                        >
                            <span className="flex items-center justify-center">🔒 Acceso Privilegiado</span>
                        </button>
                    </div>

                    {/* Mode Switching Container */}
                    <div className="w-full">
                        {isScannerMode ? (
                            // SCANNER VIEW
                            <div className="flex flex-col items-center w-full">
                                <p className="text-slate-500 text-sm mb-3 text-center px-2">
                                    Alinea el <span className="font-bold text-slate-700">Código QR</span> de tu gafete oficial o un QR compatible tipo <span className="font-bold text-slate-700">vCard</span> dentro del recuadro.
                                </p>

                                <div
                                    className="w-full max-w-sm mx-auto relative overflow-hidden rounded-xl shadow-md border border-slate-200 bg-black"
                                    style={{ height: '24rem', maxHeight: '52vh' }}
                                >
                                    <div id="login-reader" className="w-full" />
                                    {loading && (
                                        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10 backdrop-blur-sm">
                                            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                                            <span className="mt-3 font-medium text-brand-primary text-sm tracking-wide bg-white px-3 py-1 rounded shadow-sm">Autenticando Identidad...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // STAFF LOGIN FORM
                            <form onSubmit={handleStaffSubmit} className="space-y-4 animate-in fade-in duration-300 pt-2">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 mb-6">
                                    Este acceso es exclusivo para Expositores, Ponentes y el equipo organizador del Congreso.
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Usuario / Correo Corporativo</label>
                                    <input
                                        type="text"
                                        required
                                        value={loginInput}
                                        placeholder="juan.garcia  o  admin@cismm.com"
                                        onChange={(e) => setLoginInput(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contraseña de Red</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        placeholder="••••••••"
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-slate-900"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-6 py-3 px-4 bg-slate-900 text-white rounded-md font-semibold hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    {loading ? 'Verificando...' : 'Iniciar Sesión Staff'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-10 text-center text-[11px] text-gray-400">
                        <p>© 2026 CISMM X CONNECT. Todos los derechos reservados.</p>
                        <p className="mt-1">Contacto de soporte: <a href="mailto:soporte@cismm.com" className="text-brand-primary hover:underline">soporte@cismm.com</a></p>
                    </div>

                </div>
            </div>

            {/* Right Side: Visual Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center flex-col p-12 text-white">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-primary rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-brand-accent rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>

                <div className="z-10 max-w-lg text-center">
                    <h3 className="text-4xl font-bold mb-6 tracking-tight">El Punto de Encuentro para Profesionales de la Salud Visual y Estética</h3>
                    <p className="text-slate-300 text-lg mb-10 leading-relaxed">
                        Conecta con expertos, descubre nuevas tecnologías y organiza tu agenda en tiempo real durante todo el evento.
                    </p>

                    <div className="space-y-4 text-left inline-block">
                        <div className="flex items-center space-x-3 text-slate-200">
                            <span className="text-brand-accent"><CheckCircleIcon /></span>
                            <span className="font-medium">Directorio de Expositores interactivo</span>
                        </div>
                        <div className="flex items-center space-x-3 text-slate-200">
                            <span className="text-brand-accent"><CheckCircleIcon /></span>
                            <span className="font-medium">Agenda personalizada y recordatorios</span>
                        </div>
                        <div className="flex items-center space-x-3 text-slate-200">
                            <span className="text-brand-accent"><CheckCircleIcon /></span>
                            <span className="font-medium">Networking y Gamificación en vivo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
