import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../contexts/ToastContext';
import { CheckCircleIcon } from '../Icons';
import { Html5Qrcode } from 'html5-qrcode';

export const LoginView: React.FC = () => {
    const [isScannerMode, setIsScannerMode] = useState(true);
    const [loginInput, setLoginInput] = useState(''); // Accepts username or email
    const [password, setPassword] = useState('');
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Scanner state
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Initialize/Destroy Scanner
    useEffect(() => {
        if (!isScannerMode) {
            // Cleanup on mode switch
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear();
            }
            return;
        }

        const qrCodeScanner = new Html5Qrcode("login-reader");
        scannerRef.current = qrCodeScanner;

        const startScanner = () => {
            qrCodeScanner.start(
                { facingMode: "environment" },
                { fps: 15, qrbox: (w: number, h: number) => ({ width: Math.floor(Math.min(w, h) * 0.98), height: Math.floor(Math.min(w, h) * 0.98) }) },
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
            ).catch((err: any) => {
                showToast("No se pudo iniciar la cámara. Otorga los permisos en tu navegador.", "error");
            });
        };

        // Small delay to ensure div is rendered
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            clearTimeout(timer);
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear();
            }
        };
    }, [isScannerMode]);

    const handleQrLogin = async (decodedText: string) => {
        try {
            setLoading(true);
            let contactData;
            try {
                contactData = JSON.parse(decodedText);
            } catch (e) {
                contactData = JSON.parse(atob(decodedText));
            }

            const userId = contactData.id || contactData.exhibitorId;
            const userName = contactData.name || "Asistente " + userId;

            if (!userId) {
                showToast("Código QR no válido para la aplicación.", "error");
                scannerRef.current?.resume();
                return;
            }

            const autoEmail = `${userId}@asistente.cismm.com`;
            const autoPassword = `cismm-${userId}-secret`;

            // Attempt login
            let { error } = await supabase.auth.signInWithPassword({
                email: autoEmail,
                password: autoPassword
            });

            // Auto-register via Virtual Credentials if not exists
            if (error && error.message.includes("Invalid login credentials")) {
                showToast('Creando perfil virtual...', 'info');
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email: autoEmail,
                    password: autoPassword,
                    options: { data: { full_name: userName } }
                });

                if (signUpError) throw signUpError;

                if (signUpData.user) {
                    await supabase.from('profiles').insert([
                        { id: signUpData.user.id, name: userName, role: 'attendee' }
                    ]);
                    // Force a re-login after creating to establish the session definitely
                    await supabase.auth.signInWithPassword({ email: autoEmail, password: autoPassword });
                }
            } else if (error) {
                throw error;
            }

            showToast(`¡Bienvenido, ${userName}!`, 'success');
        } catch (e: any) {
            showToast("Error al ingresar: " + e.message, "error");
            if (scannerRef.current?.isScanning) scannerRef.current?.resume();
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
                                    Alinea el <span className="font-bold text-slate-700">Código QR</span> de tu gafete oficial dentro del recuadro.
                                </p>

                                <div className="w-full relative overflow-hidden rounded-xl shadow-md" style={{ minHeight: '60vh' }}>
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
