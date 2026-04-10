
import React, { useState, useEffect } from 'react';
import { Speaker, Exhibitor, AgendaSession, LeaderboardEntry, UserProfile } from '../../types';
import { ChevronDownIcon, PlusCircleIcon, PencilIcon, TrashIcon, LockOpenIcon, StarIcon } from '../Icons';
import { Modal } from '../common/Modal';
import { supabase } from '../../utils/supabase';
import { AnalyticsView } from './AnalyticsView';
import { AdminSessionRating } from '../../types';
import { getAttendeeCategoryLabel, normalizeAttendeeCategory } from '../../utils/attendeeCategory';
import { getAcceptedImageTypes, getImageUploadHint, removePublicImage, uploadPublicImage } from '../../utils/storageImages';
import QRious from 'qrious';
import { generateSecureToken } from '../../utils/security';

interface AdminViewProps {
    speakers: Speaker[];
    exhibitors: Exhibitor[];
    agendaSessions: AgendaSession[];
    setSpeakers: (value: Speaker[] | ((prevState: Speaker[]) => Speaker[])) => void;
    setExhibitors: (value: Exhibitor[] | ((prevState: Exhibitor[]) => Exhibitor[])) => void;
    setAgendaSessions: (value: AgendaSession[] | ((prevState: AgendaSession[]) => AgendaSession[])) => void;
    contacts: UserProfile[];
    setContacts: (value: UserProfile[] | ((prevState: UserProfile[]) => UserProfile[])) => void;
    exhibitorCategories: string[];
    setExhibitorCategories: (value: string[] | ((prevState: string[]) => string[])) => void;
}

const AdminSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-white rounded-lg shadow-md mb-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left p-4">
                <h3 className="text-xl font-bold text-brand-primary">{title}</h3>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDownIcon /></span>
            </button>
            {isOpen && <div className="p-4 border-t">{children}</div>}
        </div>
    );
};

// A generic form field component
const FormField: React.FC<{ label: string, id: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void, type?: string, required?: boolean, children?: React.ReactNode }> =
    ({ label, id, value, onChange, type = 'text', required = true, children }) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            {children ? (
                <select id={id} name={id} value={value} onChange={onChange} required={required} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm rounded-md">
                    {children}
                </select>
            ) : type === 'textarea' ? (
                <textarea id={id} name={id} value={value} onChange={onChange} required={required} rows={3} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-brand-accent focus:border-brand-accent" />
            ) : (
                <input type={type} id={id} name={id} value={value} onChange={onChange} required={required} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-brand-accent focus:border-brand-accent" />
            )}
        </div>
    );

export const AdminView: React.FC<AdminViewProps> = ({ speakers, exhibitors, agendaSessions, setSpeakers, setExhibitors, setAgendaSessions, contacts, setContacts, exhibitorCategories, setExhibitorCategories }) => {
    const [modalConfig, setModalConfig] = useState<{ type: 'speaker' | 'exhibitor' | 'session' | 'category' | 'userAccount' | 'attendeeQr' | null, item?: any }>({ type: null });
    const [generatedQrConfig, setGeneratedQrConfig] = useState<any | null>(null);

    // Fetch ALL profiles from the database for user management
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name');
            if (error) throw error;
            if (data) {
                setAllUsers(data.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    company: u.company || '',
                    title: u.title || '',
                    photoUrl: u.photo_url || '',
                    points: u.points || 0,
                    deviceId: u.device_id || '',
                    maxDevices: u.max_devices || 1,
                    registeredDevices: u.registered_devices || [],
                    email: u.email || '',
                    phone: u.phone || '',
                    exhibitorId: u.exhibitor_id || undefined,
                    speakerId: u.speaker_id || undefined,
                    interests: u.interests || [],
                    track: u.track || 'General',
                    attendeeCategory: normalizeAttendeeCategory(u.attendee_category),
                })));
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoadingUsers(false);
        }
    };

    const invokeManageUsers = async (action: string, payload: Record<string, unknown>) => {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('manage-users', {
            headers: { Authorization: `Bearer ${session?.access_token}` },
            body: { action, payload }
        });

        if (error) throw new Error(data?.error || error.message);
        if (data?.error) throw new Error(data.error);

        return data;
    };

    const mapSpeakerRow = (speakerRow: any): Speaker => ({
        id: speakerRow.id,
        name: speakerRow.name,
        photoUrl: speakerRow.photo_url || '',
        title: speakerRow.title || '',
        company: speakerRow.company || '',
        bio: speakerRow.bio || '',
        social: {
            linkedin: speakerRow.social_linkedin || undefined,
            twitter: speakerRow.social_twitter || undefined
        }
    });

    const mapAgendaSessionRow = (sessionRow: any): AgendaSession => ({
        id: sessionRow.id,
        title: sessionRow.title,
        startTime: sessionRow.start_time,
        endTime: sessionRow.end_time,
        room: sessionRow.room || '',
        description: sessionRow.description || '',
        day: sessionRow.day as any,
        track: sessionRow.track as any,
        speakerIds: Array.isArray(sessionRow.session_speakers) ? sessionRow.session_speakers.map((speakerLink: any) => speakerLink.speaker_id) : []
    });

    const refreshExhibitorAdminData = async () => {
        const [{ data: exhibitorRows, error: exhibitorError }, { data: categoryRows, error: categoryError }] = await Promise.all([
            supabase.from('exhibitors').select('*, exhibitor_categories(name)').order('name'),
            supabase.from('exhibitor_categories').select('*').order('name')
        ]);

        if (exhibitorError) throw exhibitorError;
        if (categoryError) throw categoryError;

        setExhibitors((exhibitorRows || []).map((e: any) => ({
            id: e.id,
            name: e.name,
            logoUrl: e.logo_url || '',
            description: e.description || '',
            contact: e.contact || '',
            website: e.website || '',
            standNumber: e.stand_number || '',
            category: (e.exhibitor_categories as any)?.name || ''
        })));

        setExhibitorCategories((categoryRows || []).map((category: any) => category.name));
    };

    const refreshSpeakerAdminData = async () => {
        const { data: speakerRows, error } = await supabase
            .from('speakers')
            .select('*')
            .order('name');

        if (error) throw error;

        setSpeakers((speakerRows || []).map(mapSpeakerRow));
    };

    const refreshAgendaAdminData = async () => {
        const { data: sessionRows, error } = await supabase
            .from('agenda_sessions')
            .select('*, session_speakers(speaker_id)')
            .order('id');

        if (error) throw error;

        setAgendaSessions((sessionRows || []).map(mapAgendaSessionRow));
    };

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const openModal = (type: 'speaker' | 'exhibitor' | 'session' | 'category' | 'userAccount' | 'attendeeQr', item?: any) => {
        setModalConfig({ type, item: item || null });
    };

    const closeModal = () => {
        setModalConfig({ type: null });
    };

    const openGeneratedQr = async (user: UserProfile) => {
        try {
            const edgeData = await invokeManageUsers('PREPARE_ATTENDEE_QR', { userId: user.id });
            setGeneratedQrConfig({
                userId: edgeData.attendee.id,
                loginEmail: edgeData.attendee.loginEmail,
                name: edgeData.attendee.name,
                attendeeCategory: edgeData.attendee.attendeeCategory,
                email: edgeData.attendee.email || '',
                phone: edgeData.attendee.phone || '',
                company: edgeData.attendee.company || '',
                title: edgeData.attendee.title || '',
            });
        } catch (error: any) {
            alert('Error al preparar el QR temporal del asistente: ' + error.message);
        }
    };

    const resolveManualAccountRole = (role: string) =>
        role === 'vip' || role === 'juez' ? 'attendee' : role;

    const resolveManualAttendeeCategory = (role: string, attendeeCategory?: string) => {
        if (role === 'vip') return 'vip';
        if (role === 'juez') return 'juez';
        if (role === 'attendee') return normalizeAttendeeCategory(attendeeCategory);
        return 'general';
    };

    const buildVirtualStaffEmail = (username: string) => `${username}@staff.cismm.com`;

    const getLinkedSpeakerAccount = (speakerId: number) =>
        allUsers.find(user => user.role === 'speaker' && user.speakerId === speakerId);

    const getLinkedExhibitorAccount = (exhibitorId: number) =>
        allUsers.find(user => user.role === 'exhibitor' && user.exhibitorId === exhibitorId);

    const uploadSpeakerPhotoIfNeeded = async (speakerId: number, speakerName: string, imageFile?: File | null) => {
        if (!imageFile) {
            return null;
        }

        const { publicUrl } = await uploadPublicImage({
            bucket: 'speakers',
            file: imageFile,
            entityKey: String(speakerId),
            fileSlug: speakerName,
        });

        return publicUrl;
    };

    const uploadExhibitorLogoIfNeeded = async (exhibitorId: number, exhibitorName: string, imageFile?: File | null) => {
        if (!imageFile) {
            return null;
        }

        const { publicUrl } = await uploadPublicImage({
            bucket: 'exhibitors',
            file: imageFile,
            entityKey: String(exhibitorId),
            fileSlug: exhibitorName,
        });

        return publicUrl;
    };

    const handleSave = async (type: 'speaker' | 'exhibitor' | 'session' | 'category' | 'userAccount' | 'attendeeQr', data: any) => {
        const isNew = !data.id;

        try {
            switch (type) {
                case 'speaker': {
                    const linkedAccount = data.id ? getLinkedSpeakerAccount(data.id) : undefined;
                    const baseSpeakerPayload = {
                        name: data.name,
                        photoUrl: data.photoUrl,
                        title: data.title,
                        company: data.company,
                        bio: data.bio,
                        social: data.social || {}
                    };

                    if (isNew) {
                        const edgeData = await invokeManageUsers('CREATE_SPEAKER', {
                            ...baseSpeakerPayload,
                            photoUrl: data.imageFile ? '' : baseSpeakerPayload.photoUrl,
                        });

                        if (data.imageFile) {
                            const uploadedPhotoUrl = await uploadSpeakerPhotoIfNeeded(edgeData.speaker.id, data.name, data.imageFile);
                            if (uploadedPhotoUrl) {
                                await invokeManageUsers('UPDATE_SPEAKER', {
                                    speakerId: edgeData.speaker.id,
                                    ...baseSpeakerPayload,
                                    photoUrl: uploadedPhotoUrl,
                                });
                            }
                        }

                        await refreshSpeakerAdminData();
                        if (data.createAccount && data.username) {
                            const virtualEmail = buildVirtualStaffEmail(data.username);
                            try {
                                await invokeManageUsers('CREATE_STAFF', {
                                    email: virtualEmail,
                                    password: data.password,
                                    name: data.name,
                                    role: 'speaker',
                                    speakerId: edgeData.speaker.id,
                                    maxDevices: 1
                                });
                                await fetchAllUsers();
                                alert(`\u00a1Cuenta de acceso creada!\n\nUsuario: ${data.username}\nContrase\u00f1a: ${data.password}\n\nEntrega estas credenciales al ponente. Inicia sesi\u00f3n con el usuario en la pesta\u00f1a de Acceso Privilegiado.`);
                            } catch (accountError: any) {
                                alert(`Ponente guardado, pero hubo un error creando su cuenta: ${accountError.message}`);
                            }
                        }
                    } else {
                        let nextPhotoUrl = baseSpeakerPayload.photoUrl;

                        if (data.imageFile) {
                            nextPhotoUrl = await uploadSpeakerPhotoIfNeeded(data.id, data.name, data.imageFile) || nextPhotoUrl;
                        }

                        await invokeManageUsers('UPDATE_SPEAKER', {
                            speakerId: data.id,
                            ...baseSpeakerPayload,
                            photoUrl: nextPhotoUrl
                        });

                        if (data.imageFile) {
                            await removePublicImage({ bucket: 'speakers', publicUrl: data.previousPhotoUrl });
                        }

                        await refreshSpeakerAdminData();

                        if (data.createAccount && data.username && !linkedAccount) {
                            const virtualEmail = buildVirtualStaffEmail(data.username);
                            try {
                                await invokeManageUsers('CREATE_STAFF', {
                                    email: virtualEmail,
                                    password: data.password,
                                    name: data.name,
                                    role: 'speaker',
                                    speakerId: data.id,
                                    maxDevices: 1
                                });
                                await fetchAllUsers();
                                alert(`\u00a1Cuenta de acceso creada!\n\nUsuario: ${data.username}\nContrase\u00f1a: ${data.password}\n\nEntrega estas credenciales al ponente. Inicia sesi\u00f3n con el usuario en la pesta\u00f1a de Acceso Privilegiado.`);
                            } catch (accountError: any) {
                                alert(`Ponente actualizado, pero hubo un error creando su cuenta: ${accountError.message}`);
                            }
                        }
                    }
                    break;
                }
                case 'exhibitor': {
                    const linkedAccount = data.id ? getLinkedExhibitorAccount(data.id) : undefined;
                    if (isNew) {
                        const edgeData = await invokeManageUsers('CREATE_EXHIBITOR', {
                            name: data.name,
                            logoUrl: data.imageFile ? '' : data.logoUrl,
                            description: data.description,
                            contact: data.contact,
                            website: data.website,
                            standNumber: data.standNumber,
                            category: data.category
                        });

                        if (data.imageFile) {
                            const uploadedLogoUrl = await uploadExhibitorLogoIfNeeded(edgeData.exhibitor.id, data.name, data.imageFile);
                            if (uploadedLogoUrl) {
                                await invokeManageUsers('UPDATE_EXHIBITOR', {
                                    exhibitorId: edgeData.exhibitor.id,
                                    name: data.name,
                                    logoUrl: uploadedLogoUrl,
                                    description: data.description,
                                    contact: data.contact,
                                    website: data.website,
                                    standNumber: data.standNumber,
                                    category: data.category
                                });
                            }
                        }

                        await refreshExhibitorAdminData();
                        if (data.createAccount && data.username) {
                            const virtualEmail = buildVirtualStaffEmail(data.username);
                            try {
                                await invokeManageUsers('CREATE_STAFF', {
                                    email: virtualEmail,
                                    password: data.password,
                                    name: data.name,
                                    role: 'exhibitor',
                                    exhibitorId: edgeData.exhibitor.id,
                                    maxDevices: 3
                                });
                                await fetchAllUsers();
                                alert(`\u00a1Cuenta de acceso creada!\n\nUsuario: ${data.username}\nContrase\u00f1a: ${data.password}\n\nEntrega estas credenciales al expositor. Inicia sesi\u00f3n con el usuario en la pesta\u00f1a de Acceso Privilegiado.`);
                            } catch (accountError: any) {
                                alert(`Expositor guardado, pero hubo un error creando su cuenta: ${accountError.message}`);
                            }
                        }
                    } else {
                        await invokeManageUsers('UPDATE_EXHIBITOR', {
                            exhibitorId: data.id,
                            name: data.name,
                            logoUrl: data.logoUrl,
                            description: data.description,
                            contact: data.contact,
                            website: data.website,
                            standNumber: data.standNumber,
                            category: data.category
                        });

                        if (data.imageFile) {
                            const uploadedLogoUrl = await uploadExhibitorLogoIfNeeded(data.id, data.name, data.imageFile);
                            if (uploadedLogoUrl) {
                                await invokeManageUsers('UPDATE_EXHIBITOR', {
                                    exhibitorId: data.id,
                                    name: data.name,
                                    logoUrl: uploadedLogoUrl,
                                    description: data.description,
                                    contact: data.contact,
                                    website: data.website,
                                    standNumber: data.standNumber,
                                    category: data.category
                                });

                                await removePublicImage({ bucket: 'exhibitors', publicUrl: data.previousLogoUrl });
                            }
                        }

                        await refreshExhibitorAdminData();

                        if (data.createAccount && data.username && !linkedAccount) {
                            const virtualEmail = buildVirtualStaffEmail(data.username);
                            try {
                                await invokeManageUsers('CREATE_STAFF', {
                                    email: virtualEmail,
                                    password: data.password,
                                    name: data.name,
                                    role: 'exhibitor',
                                    exhibitorId: data.id,
                                    maxDevices: 3
                                });
                                await fetchAllUsers();
                                alert(`\u00a1Cuenta de acceso creada!\n\nUsuario: ${data.username}\nContrase\u00f1a: ${data.password}\n\nEntrega estas credenciales al expositor. Inicia sesi\u00f3n con el usuario en la pesta\u00f1a de Acceso Privilegiado.`);
                            } catch (accountError: any) {
                                alert(`Expositor actualizado, pero hubo un error creando su cuenta: ${accountError.message}`);
                            }
                        }
                    }
                    break;
                }
                case 'session': {
                    const speakerIds = typeof data.speakerIds === 'string'
                        ? data.speakerIds.split(',').map(Number).filter(Boolean)
                        : Array.isArray(data.speakerIds)
                            ? data.speakerIds.map(Number).filter(Boolean)
                            : [];

                    const sessionPayload = {
                        title: data.title,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        room: data.room,
                        description: data.description,
                        day: data.day,
                        track: data.track || null,
                        speakerIds
                    };

                    if (isNew) {
                        await invokeManageUsers('CREATE_SESSION', sessionPayload);
                    } else {
                        await invokeManageUsers('UPDATE_SESSION', {
                            sessionId: data.id,
                            ...sessionPayload
                        });
                    }

                    await refreshAgendaAdminData();
                    break;
                }
                case 'category': {
                    const newCategoryName = data.name.trim();
                    if (!newCategoryName) return;

                    if (modalConfig.item) {
                        const oldName = modalConfig.item.name;
                        if (oldName !== newCategoryName) {
                            if (exhibitorCategories.includes(newCategoryName)) {
                                alert('Esta categoría ya existe.');
                                return;
                            }
                            await invokeManageUsers('UPDATE_EXHIBITOR_CATEGORY', { oldName, newName: newCategoryName });
                            await refreshExhibitorAdminData();
                        }
                    } else {
                        if (exhibitorCategories.includes(newCategoryName)) {
                            alert('Esta categoría ya existe.');
                            return;
                        }
                        await invokeManageUsers('CREATE_EXHIBITOR_CATEGORY', { name: newCategoryName });
                        await refreshExhibitorAdminData();
                    }
                    break;
                }
                case 'userAccount': {
                    const normalizedRole = resolveManualAccountRole(data.role);
                    const attendeeCategory = resolveManualAttendeeCategory(data.role, data.attendeeCategory);
                    const edgeData = await invokeManageUsers('CREATE_STAFF', {
                        email: data.email,
                        password: data.password,
                        name: data.name,
                        role: data.role,
                        attendeeCategory,
                        maxDevices: parseInt(data.maxDevices) || (data.role === 'admin' ? 999 : 1)
                    });

                    alert(`¡Cuenta creada con éxito!\nPor favor, entrega estas credenciales al usuario:\n\nCorreo: ${data.email}\nContraseña: ${data.password}`);

                    setContacts(prev => [...prev, {
                        id: edgeData.user.id,
                        name: data.name,
                        role: normalizedRole as any,
                        track: 'General',
                        title: '',
                        company: '',
                        photoUrl: '',
                        interests: [],
                        points: 0,
                        attendeeCategory,
                        maxDevices: parseInt(data.maxDevices) || (data.role === 'admin' ? 999 : 1),
                        registeredDevices: []
                    }]);
                    await fetchAllUsers();
                    break;
                }
                case 'attendeeQr': {
                    const attendeeCategory = normalizeAttendeeCategory(data.attendeeCategory);
                    const edgeData = await invokeManageUsers('CREATE_ATTENDEE_QR', {
                        name: data.name,
                        attendeeCategory,
                        email: data.email,
                        phone: data.phone,
                        company: data.company,
                        title: data.title,
                        maxDevices: parseInt(data.maxDevices) || 1
                    });

                    await fetchAllUsers();
                    setGeneratedQrConfig({
                        userId: edgeData.attendee.id,
                        loginEmail: edgeData.attendee.loginEmail,
                        name: edgeData.attendee.name,
                        attendeeCategory,
                        email: edgeData.attendee.email || '',
                        phone: edgeData.attendee.phone || '',
                        company: edgeData.attendee.company || '',
                        title: edgeData.attendee.title || '',
                    });
                    break;
                }
            }
            closeModal();
        } catch (err: any) {
            alert('Error al guardar en base de datos: ' + err.message);
        }
    };

    const handleDelete = async (type: 'speaker' | 'exhibitor' | 'session' | 'user' | 'category', id: any) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;
        try {
            switch (type) {
                case 'speaker':
                    await invokeManageUsers('DELETE_SPEAKER', { speakerId: id });
                    await Promise.all([refreshSpeakerAdminData(), refreshAgendaAdminData()]);
                    break;
                case 'exhibitor':
                    await invokeManageUsers('DELETE_EXHIBITOR', { exhibitorId: id });
                    setExhibitors(prev => prev.filter(item => item.id !== id));
                    await fetchAllUsers();
                    await refreshExhibitorAdminData();
                    break;
                case 'session':
                    await invokeManageUsers('DELETE_SESSION', { sessionId: id });
                    await refreshAgendaAdminData();
                    break;
                case 'user': {
                    await invokeManageUsers('DELETE_USER', { userId: id });
                    setContacts(prev => prev.filter(item => item.id !== id));
                    setAllUsers(prev => prev.filter(item => item.id !== id));
                    await fetchAllUsers();
                    break;
                }
                case 'category':
                    await invokeManageUsers('DELETE_EXHIBITOR_CATEGORY', { categoryName: id });
                    await refreshExhibitorAdminData();
                    break;
            }
        } catch (err: any) {
            alert('Error al eliminar en base de datos: ' + err.message);
        }
    };

    const handleUnlinkDevice = async (userId: string) => {
        if (!window.confirm('¿Desvincular dispositivo de este usuario? Podrá iniciar sesión / escanear su gafete en un nuevo dispositivo.')) return;

        try {
            await invokeManageUsers('RESET_USER_DEVICES', { userId });
            await fetchAllUsers();
            alert('✅ Dispositivos reseteados con éxito. El usuario puede volver a escanear su gafete.');
        } catch (err: any) {
            alert('Error al resetear dispositivos: ' + err.message);
        }
    };

    const renderForm = () => {
        if (!modalConfig.type) return null;

        const FormComponent = {
            speaker: (props: any) => <SpeakerForm {...props} linkedAccount={props.item ? getLinkedSpeakerAccount(props.item.id) : undefined} />,
            exhibitor: (props: any) => <ExhibitorForm {...props} categories={exhibitorCategories} linkedAccount={props.item ? getLinkedExhibitorAccount(props.item.id) : undefined} />,
            session: (props: any) => <SessionForm {...props} speakers={speakers} />,
            category: CategoryForm,
            userAccount: UserAccountForm,
            attendeeQr: AttendeeQrForm
        }[modalConfig.type];

        return <FormComponent item={modalConfig.item} onSave={(data: any) => handleSave(modalConfig.type!, data)} onClose={closeModal} />;
    };

    return (
        <div className="p-4">
            <AdminSection title="Analíticas en Vivo">
                <AnalyticsView />
            </AdminSection>

            <AdminSection title="Calificaciones de Sesiones (Auditoría)">
                <AdminRatingsView sessions={agendaSessions} />
            </AdminSection>

            <AdminSection title={`Ponentes (${speakers.length})`}>
                <ManagementList type="speaker" items={speakers} onEdit={openModal} onDelete={handleDelete} displayField="name" />
            </AdminSection>

            <AdminSection title={`Expositores (${exhibitors.length})`}>
                <ManagementList type="exhibitor" items={exhibitors} onEdit={openModal} onDelete={handleDelete} displayField="name" />
            </AdminSection>

            <AdminSection title={`Categorías de Expositores (${exhibitorCategories.length})`}>
                <ManagementList type="category" items={exhibitorCategories.map(c => ({ id: c, name: c }))} onEdit={openModal} onDelete={handleDelete} displayField="name" idField="id" />
            </AdminSection>

            <AdminSection title={`Agenda (${agendaSessions.length})`}>
                <ManagementList type="session" items={agendaSessions} onEdit={openModal} onDelete={handleDelete} displayField="title" />
            </AdminSection>

            <AdminSection title={`Usuarios y Dispositivos (${allUsers.length})`}>
                <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-4">
                        <button onClick={() => openModal('userAccount')} className="flex items-center text-brand-accent p-2 rounded hover:bg-gray-100">
                            <PlusCircleIcon /><span className="ml-2 font-semibold">Crear Cuenta Manual</span>
                        </button>
                        <button onClick={() => openModal('attendeeQr')} className="flex items-center text-brand-accent p-2 rounded hover:bg-gray-100">
                            <PlusCircleIcon /><span className="ml-2 font-semibold">Alta de Asistente con QR</span>
                        </button>
                        <button onClick={fetchAllUsers} className="text-gray-500 hover:text-brand-accent p-2 rounded hover:bg-gray-100 text-sm">
                            🔄 Actualizar lista
                        </button>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">
                        Gestiona administradores, asistentes y soporte. Las cuentas de ponentes y expositores ahora se crean desde sus propias fichas para capturar bio, enlaces y vínculo correcto.
                    </p>
                </div>
                {loadingUsers ? (
                    <p className="text-gray-500 text-center py-4">Cargando usuarios...</p>
                ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {allUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <div>
                                    <span className={`font-medium px-2 py-0.5 rounded text-xs mr-2 ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'exhibitor' ? 'bg-blue-100 text-blue-800' : user.role === 'speaker' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                        {user.role.toUpperCase()}
                                    </span>
                                    {user.role === 'attendee' && (
                                        <span className={`font-medium px-2 py-0.5 rounded text-xs mr-2 ${user.attendeeCategory === 'vip' ? 'bg-amber-100 text-amber-800' : user.attendeeCategory === 'juez' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700'}`}>
                                            {getAttendeeCategoryLabel(user.attendeeCategory)}
                                        </span>
                                    )}
                                    <span className="text-gray-800 font-bold">{user.name}</span>
                                    {user.email && <span className="text-xs text-gray-400 ml-2">{user.email}</span>}
                                    {user.company && <span className="text-xs text-gray-500 block">{user.company} {user.title ? `- ${user.title}` : ''}</span>}
                                    {(user.registeredDevices && user.registeredDevices.length > 0) || user.deviceId ? (
                                        <span className="text-xs text-brand-danger flex items-center mt-1">📱 Dispositivo vinculado</span>
                                    ) : (
                                        <span className="text-xs text-gray-500 flex items-center mt-1">✓ Sin dispositivo vinculado</span>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    {user.role === 'attendee' && (
                                        <button onClick={() => openGeneratedQr(user)} className="text-white bg-brand-primary hover:bg-blue-900 px-3 py-1 rounded text-xs font-bold" title="Mostrar QR del asistente">
                                            QR
                                        </button>
                                    )}
                                    {((user.registeredDevices && user.registeredDevices.length > 0) || user.deviceId) && (
                                        <button onClick={() => handleUnlinkDevice(user.id)} className="text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded text-xs font-bold" title="Resetear dispositivo para permitir re-escaneo del gafete">
                                            Resetear
                                        </button>
                                    )}
                                    <button onClick={() => handleDelete('user', user.id)} className="text-gray-400 hover:text-red-700 p-1">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {allUsers.length === 0 && <p className="text-gray-500 text-sm">No hay usuarios registrados.</p>}
                    </div>
                )}
            </AdminSection>

            {modalConfig.type && renderForm()}
            {generatedQrConfig && (
                <GeneratedAttendeeQrModal
                    config={generatedQrConfig}
                    onClose={() => setGeneratedQrConfig(null)}
                />
            )}
        </div>
    );
};

const ManagementList: React.FC<{ type: any, items: any[], onEdit: any, onDelete: any, displayField: string, idField?: string }> = ({ type, items, onEdit, onDelete, displayField, idField = 'id' }) => (
    <>
        <button onClick={() => onEdit(type)} className="flex items-center text-brand-accent mb-4 p-2 rounded hover:bg-gray-100">
            <PlusCircleIcon /><span className="ml-2 font-semibold">Añadir Nuevo</span>
        </button>
        <div className="space-y-2">
            {items.map(item => (
                <div key={item[idField]} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                    <span className="text-gray-800">{item[displayField]}</span>
                    <div className="flex space-x-2">
                        <button onClick={() => onEdit(type, item)} className="text-blue-600 hover:text-blue-800 p-1"><PencilIcon /></button>
                        <button onClick={() => onDelete(type, item[idField])} className="text-brand-danger hover:text-red-700 p-1"><TrashIcon /></button>
                    </div>
                </div>
            ))}
        </div>
    </>
);

const StaffAccessPanel: React.FC<{
    linkedAccount?: UserProfile;
    createAccount: boolean;
    setCreateAccount: (value: boolean) => void;
    username: string;
    password: string;
    roleLabel: string;
    onRegeneratePassword: () => void;
}> = ({ linkedAccount, createAccount, setCreateAccount, username, password, roleLabel, onRegeneratePassword }) => {
    const linkedUsername = linkedAccount?.email?.endsWith('@staff.cismm.com')
        ? linkedAccount.email.replace('@staff.cismm.com', '')
        : linkedAccount?.email || 'No disponible';

    if (linkedAccount) {
        return (
            <div className="border-t pt-4 mt-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm font-semibold text-emerald-800">Cuenta de acceso ya vinculada</p>
                    <p className="text-xs text-emerald-700 mt-1">Este {roleLabel} ya puede entrar a la app con sus credenciales.</p>
                    <p className="text-xs text-emerald-700 mt-2"><b>Usuario:</b> {linkedUsername}</p>
                    {linkedAccount.email && <p className="text-xs text-emerald-700"><b>Correo interno:</b> {linkedAccount.email}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="border-t pt-4 mt-2 space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-700">Crear acceso a la App</p>
                    <p className="text-xs text-gray-500">La cuenta quedará ligada a este {roleLabel} desde esta misma ficha.</p>
                </div>
                <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} className="w-5 h-5 rounded accent-brand-accent" />
            </div>
            {createAccount && (
                <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Usuario generado</label>
                        <div className="mt-1 flex items-center rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                            <span className="font-mono text-blue-800 text-sm">{username || <span className="text-gray-400 italic">Escribe el nombre arriba...</span>}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Este será su nombre de usuario para iniciar sesión.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contraseña (Autogenerada)</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input type="text" readOnly className="flex-1 block w-full border-gray-300 rounded-l-md bg-gray-50 sm:text-sm px-3 py-2 font-mono" value={password} />
                            <button type="button" onClick={onRegeneratePassword} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100">Regenerar</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const SpeakerForm: React.FC<{ item?: Speaker, linkedAccount?: UserProfile, onSave: (data: any) => void, onClose: () => void }> = ({ item, linkedAccount, onSave, onClose }) => {
    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let pw = ''; for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length)); return pw;
    };
    const toUsername = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const [formData, setFormData] = useState(item || { name: '', title: '', company: '', bio: '', photoUrl: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [password, setPassword] = useState(generatePassword());
    const [createAccount, setCreateAccount] = useState(!item);
    const username = toUsername(formData.name || '');
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Ponente' : 'Añadir Ponente'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, username, password, createAccount, imageFile, previousPhotoUrl: item?.photoUrl || '' }); }} className="p-4 space-y-4">
                <FormField label="Nombre *" id="name" value={formData.name} onChange={handleChange} required={true} />
                <FormField label="Cargo" id="title" value={formData.title} onChange={handleChange} required={false} />
                <FormField label="Empresa" id="company" value={formData.company} onChange={handleChange} required={false} />
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subir Foto del Ponente</label>
                    <input
                        type="file"
                        accept={getAcceptedImageTypes('speakers')}
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">{getImageUploadHint('speakers')} Si subes archivo, se usará en lugar del URL.</p>
                </div>
                <FormField label="URL de Foto" id="photoUrl" value={formData.photoUrl} onChange={handleChange} required={false} />
                <FormField label="Biografía" id="bio" value={formData.bio} onChange={handleChange} type="textarea" required={false} />
                <StaffAccessPanel
                    linkedAccount={linkedAccount}
                    createAccount={createAccount}
                    setCreateAccount={setCreateAccount}
                    username={username}
                    password={password}
                    roleLabel="ponente"
                    onRegeneratePassword={() => setPassword(generatePassword())}
                />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const ExhibitorForm: React.FC<{ item?: Exhibitor, linkedAccount?: UserProfile, categories: string[], onSave: (data: any) => void, onClose: () => void }> = ({ item, linkedAccount, categories, onSave, onClose }) => {
    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let pw = ''; for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length)); return pw;
    };
    const toUsername = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const [formData, setFormData] = useState(item || { name: '', description: '', contact: '', website: '', standNumber: '', category: categories.length > 0 ? categories[0] : '', logoUrl: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [password, setPassword] = useState(generatePassword());
    const [createAccount, setCreateAccount] = useState(!item);
    const username = toUsername(formData.name || '');
    const handleChange = (e: React.ChangeEvent<any>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Expositor' : 'Añadir Expositor'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave({ ...formData, username, password, createAccount, imageFile, previousLogoUrl: item?.logoUrl || '' }); }} className="p-4 space-y-4">
                <FormField label="Nombre *" id="name" value={formData.name} onChange={handleChange} required={true} />
                <div>
                    <label className="block text-sm font-medium text-gray-700">Subir Logo del Expositor</label>
                    <input
                        type="file"
                        accept={getAcceptedImageTypes('exhibitors')}
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-400 mt-1">{getImageUploadHint('exhibitors')} Si subes archivo, se usará en lugar del URL.</p>
                </div>
                <FormField label="URL de Logo" id="logoUrl" value={formData.logoUrl} onChange={handleChange} required={false} />
                <FormField label="Descripción" id="description" value={formData.description} onChange={handleChange} type="textarea" required={false} />
                <FormField label="Contacto (email del stand)" id="contact" value={formData.contact} onChange={handleChange} required={false} />
                <FormField label="Sitio Web" id="website" value={formData.website} onChange={handleChange} required={false} />
                <FormField label="Nº de Stand" id="standNumber" value={formData.standNumber} onChange={handleChange} required={false} />
                <FormField label="Categoría" id="category" value={formData.category} onChange={handleChange} required={false}>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </FormField>
                <StaffAccessPanel
                    linkedAccount={linkedAccount}
                    createAccount={createAccount}
                    setCreateAccount={setCreateAccount}
                    username={username}
                    password={password}
                    roleLabel="expositor"
                    onRegeneratePassword={() => setPassword(generatePassword())}
                />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const SessionForm: React.FC<{ item?: AgendaSession, speakers: Speaker[], onSave: (data: any) => void, onClose: () => void }> = ({ item, speakers, onSave, onClose }) => {
    const [formData, setFormData] = useState(item ? { ...item, speakerIds: item.speakerIds } : { title: '', description: '', room: '', day: 'Viernes', startTime: '', endTime: '', speakerIds: [] as number[], track: '' });
    const [isSpeakerPickerOpen, setIsSpeakerPickerOpen] = useState(false);

    const handleChange = (e: React.ChangeEvent<any>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const selectedSpeakers = speakers.filter((speaker) => formData.speakerIds.includes(speaker.id));
    const selectedSpeakerLabel = selectedSpeakers.length > 0
        ? selectedSpeakers.map((speaker) => speaker.name).join(', ')
        : 'Selecciona uno o varios ponentes';

    const toggleSpeakerSelection = (speakerId: number) => {
        setFormData((prev) => ({
            ...prev,
            speakerIds: prev.speakerIds.includes(speakerId)
                ? prev.speakerIds.filter((id) => id !== speakerId)
                : [...prev.speakerIds, speakerId]
        }));
    };

    return (
        <Modal title={item ? 'Editar Sesión' : 'Añadir Sesión'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <FormField label="Título" id="title" value={formData.title} onChange={handleChange} />
                <FormField label="Descripción" id="description" value={formData.description} onChange={handleChange} type="textarea" />
                <FormField label="Sala" id="room" value={formData.room} onChange={handleChange} />
                <div>
                    <label className="block text-sm font-medium text-gray-700">Ponentes</label>
                    <button
                        type="button"
                        onClick={() => setIsSpeakerPickerOpen((prev) => !prev)}
                        className="mt-1 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
                    >
                        <span className={selectedSpeakers.length > 0 ? 'text-gray-800' : 'text-gray-400'}>
                            {selectedSpeakerLabel}
                        </span>
                        <span className={`transform transition-transform ${isSpeakerPickerOpen ? 'rotate-180' : ''}`}>
                            <ChevronDownIcon />
                        </span>
                    </button>
                    {isSpeakerPickerOpen && (
                        <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
                            {speakers.length === 0 ? (
                                <p className="text-sm text-gray-500">No hay ponentes registrados todavía.</p>
                            ) : (
                                speakers.map((speaker) => {
                                    const isSelected = formData.speakerIds.includes(speaker.id);

                                    return (
                                        <label key={speaker.id} className="flex cursor-pointer items-start space-x-3 rounded-md bg-white px-3 py-2 shadow-sm hover:bg-blue-50">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleSpeakerSelection(speaker.id)}
                                                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-medium text-gray-800">{speaker.name}</span>
                                                <span className="block text-xs text-gray-500">
                                                    ID {speaker.id}{speaker.company ? ` • ${speaker.company}` : ''}
                                                </span>
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                        Puedes elegir varios ponentes para conferencias en conjunto.
                    </p>
                </div>
                <FormField label="Día" id="day" value={formData.day} onChange={handleChange}>
                    <option>Viernes</option>
                    <option>Sábado</option>
                    <option>Domingo</option>
                </FormField>
                <FormField label="Track (solo para Viernes, dejar en blanco si es general)" id="track" value={formData.track || ''} onChange={handleChange} required={false}>
                    <option value="">General</option>
                    <option value="Medicina Estética">Medicina Estética</option>
                    <option value="Spa">Spa</option>
                    <option value="PMU">PMU</option>
                </FormField>
                <FormField label="Hora de Inicio (HH:MM)" id="startTime" value={formData.startTime} onChange={handleChange} />
                <FormField label="Hora de Fin (HH:MM)" id="endTime" value={formData.endTime} onChange={handleChange} />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const CategoryForm: React.FC<{ item?: { name: string }, onSave: (data: { name: string }) => void, onClose: () => void }> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState(item || { name: '' });
    const handleChange = (e: React.ChangeEvent<any>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Categoría' : 'Añadir Categoría'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <FormField label="Nombre de Categoría" id="name" value={formData.name} onChange={handleChange} />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const UserAccountForm: React.FC<{ item?: any, onSave: (data: any) => void, onClose: () => void }> = ({ item, onSave, onClose }) => {
    // Generate a secure random password automatically for new accounts
    const generatePassword = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let pw = '';
        for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
        return pw;
    };

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'vip',
        attendeeCategory: 'vip',
        password: generatePassword(),
        maxDevices: '1'
    });

    const handleChange = (e: React.ChangeEvent<any>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'role') {
                next.maxDevices = value === 'admin' ? '999' : '1';
                next.attendeeCategory = value === 'vip' ? 'vip' : value === 'juez' ? 'juez' : 'general';
            }
            return next;
        });
    };

    return (
        <Modal title={'Añadir Cuenta de Acceso'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200 mb-4">
                    Usa este formulario para cuentas manuales de <b>administradores</b> y <b>asistentes</b>. Las cuentas de <b>ponentes</b> y <b>expositores</b> ahora se crean desde sus respectivas fichas.
                </div>

                <FormField label="Nombre Completo" id="name" value={formData.name} onChange={handleChange} />
                <FormField label="Correo Electrónico" id="email" type="email" value={formData.email} onChange={handleChange} />

                <FormField label="Rol" id="role" value={formData.role} onChange={handleChange}>
                    <option value="vip">Invitado VIP</option>
                    <option value="juez">Juez</option>
                    <option value="attendee">Asistente General</option>
                    <option value="admin">Administrador General</option>
                </FormField>

                <FormField label="Límite de Dispositivos Permitidos" id="maxDevices" type="number" value={formData.maxDevices} onChange={handleChange} required={true} />

                <div>
                    <label className="block text-sm font-medium text-gray-700">Contraseña (Autogenerada segura)</label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                        <input type="text" readOnly className="flex-1 block w-full border-gray-300 rounded-l-md bg-gray-50 focus:ring-0 sm:text-sm px-3 py-2 font-mono" value={formData.password} />
                        <button type="button" onClick={() => setFormData({ ...formData, password: generatePassword() })} className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm hover:bg-gray-100">
                            Regenerar
                        </button>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-6">
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded font-medium hover:bg-blue-900">Crear Cuenta</button>
                </div>
            </form>
        </Modal>
    );
};

const AttendeeQrForm: React.FC<{ onSave: (data: any) => void, onClose: () => void }> = ({ onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        attendeeCategory: 'general',
        email: '',
        phone: '',
        company: '',
        title: '',
        maxDevices: '1'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    return (
        <Modal title="Alta de Asistente con QR" onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
                    Úsalo cuando el gafete original no funcione o quieras entregar un QR nuevo generado por el sistema.
                </div>
                <FormField label="Nombre Completo" id="name" value={formData.name} onChange={handleChange} />
                <FormField label="Categoría" id="attendeeCategory" value={formData.attendeeCategory} onChange={handleChange}>
                    <option value="general">Asistente General</option>
                    <option value="vip">VIP</option>
                    <option value="juez">Juez</option>
                </FormField>
                <FormField label="Correo de contacto" id="email" type="email" value={formData.email} onChange={handleChange} required={false} />
                <FormField label="Teléfono" id="phone" value={formData.phone} onChange={handleChange} required={false} />
                <FormField label="Empresa" id="company" value={formData.company} onChange={handleChange} required={false} />
                <FormField label="Cargo" id="title" value={formData.title} onChange={handleChange} required={false} />
                <FormField label="Límite de dispositivos" id="maxDevices" type="number" value={formData.maxDevices} onChange={handleChange} required={true} />
                <div className="flex justify-end space-x-2 pt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded font-medium hover:bg-blue-900">Crear y Generar QR</button>
                </div>
            </form>
        </Modal>
    );
};

const GeneratedAttendeeQrModal: React.FC<{ config: any, onClose: () => void }> = ({ config, onClose }) => {
    const qrCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [qrError, setQrError] = React.useState<string | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;

        const drawQr = async () => {
            if (!qrCanvasRef.current) {
                return;
            }

            setIsGenerating(true);
            setQrError(null);

            try {
                const secureQrPayload = await generateSecureToken({
                    id: config.userId,
                    loginEmail: config.loginEmail,
                    name: config.name,
                    attendeeCategory: config.attendeeCategory,
                    email: config.email || '',
                    phone: config.phone || '',
                    company: config.company || '',
                    title: config.title || '',
                });

                if (!isMounted || !qrCanvasRef.current) {
                    return;
                }

                new QRious({
                    element: qrCanvasRef.current,
                    value: secureQrPayload,
                    size: 260,
                    background: 'white',
                    foreground: '#0D2A4C',
                    level: 'M',
                    padding: 10,
                });
            } catch (error) {
                console.error('Failed to generate attendee QR:', error);

                if (!isMounted) {
                    return;
                }

                setQrError('No se pudo generar el QR en este deploy. Verifica que Netlify tenga configuradas VITE_HMAC_SECRET y VITE_ENCRYPTION_KEY, y vuelve a publicar el frontend.');
            } finally {
                if (isMounted) {
                    setIsGenerating(false);
                }
            }
        };

        void drawQr();

        return () => {
            isMounted = false;
        };
    }, [config]);

    return (
        <Modal title="QR del Asistente" onClose={onClose}>
            <div className="p-4 text-center space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-brand-primary">{config.name}</h3>
                    <p className="text-sm text-gray-500">Categoría: {getAttendeeCategoryLabel(config.attendeeCategory)}</p>
                </div>
                {isGenerating && (
                    <p className="text-sm text-gray-500">Generando QR...</p>
                )}
                {qrError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {qrError}
                    </div>
                ) : (
                    <>
                        <canvas ref={qrCanvasRef} className="mx-auto" />
                        <p className="text-sm text-gray-600">
                            Este QR temporal puede ser escaneado por el asistente en la pantalla de acceso para volver a entrar con su perfil.
                        </p>
                    </>
                )}
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-brand-primary text-white rounded font-medium hover:bg-blue-900">Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};

const AdminRatingsView: React.FC<{ sessions: AgendaSession[] }> = ({ sessions }) => {
    const [ratings, setRatings] = useState<AdminSessionRating[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchRatings = async () => {
            setLoading(true);
            try {
                // Fetch ratings joined with the profiles table to get the real user's name
                const { data, error } = await supabase
                    .from('session_ratings')
                    .select(`
                        id,
                        user_id,
                        session_id,
                        rating,
                        comment,
                        created_at,
                        profiles ( name )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (data) {
                    const formatted = data.map((r: any) => ({
                        id: r.id,
                        userId: r.user_id,
                        sessionId: r.session_id,
                        rating: r.rating,
                        comment: r.comment,
                        createdAt: r.created_at,
                        userName: r.profiles?.name || 'Usuario Estándar',
                        sessionTitle: sessions.find(s => s.id === r.session_id)?.title || 'Sesión Desconocida'
                    }));
                    setRatings(formatted);
                }
            } catch (err) {
                console.error("Error fetching ratings:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRatings();
    }, [sessions]);

    if (loading) return <div className="text-center py-4 text-gray-500">Cargando la bóveda de calificaciones...</div>;

    if (ratings.length === 0) return <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">Aún no hay calificaciones registradas.</div>;

    return (
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200 mb-4 shadow-sm">
                <b>Confidencial:</b> Los asistentes ven la encuesta como anónima para incentivar feedback honesto. Como Administrador, tú sí puedes ver exactamente quién dejó cada comentario.
            </div>

            {ratings.map(rating => (
                <div key={rating.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <span className="font-bold text-brand-primary">{rating.sessionTitle}</span>
                        </div>
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map(star => (
                                <StarIcon key={star} filled={star <= rating.rating} className="w-4 h-4 text-brand-accent" />
                            ))}
                        </div>
                    </div>

                    {rating.comment && (
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg flex-1 mb-2 italic">"{rating.comment}"</p>
                    )}

                    <div className="mt-auto flex justify-between items-center text-xs text-gray-400 font-medium pt-2 border-t border-gray-50">
                        <span className="flex items-center text-brand-secondary">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {rating.userName}
                        </span>
                        <span>{new Date(rating.createdAt).toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
