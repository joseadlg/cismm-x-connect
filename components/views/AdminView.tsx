
import React, { useState } from 'react';
import { Speaker, Exhibitor, AgendaSession, LeaderboardEntry, UserProfile } from '../../types';
import { ChevronDownIcon, PlusCircleIcon, PencilIcon, TrashIcon, LockOpenIcon } from '../Icons';
import { Modal } from '../common/Modal';
import { supabase } from '../../utils/supabase';

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
    const [modalConfig, setModalConfig] = useState<{ type: 'speaker' | 'exhibitor' | 'session' | 'category' | 'userAccount' | null, item?: any }>({ type: null });

    const openModal = (type: 'speaker' | 'exhibitor' | 'session' | 'category' | 'userAccount', item?: any) => {
        setModalConfig({ type, item: item || null });
    };

    const closeModal = () => {
        setModalConfig({ type: null });
    };

    const handleSave = async (type: 'speaker' | 'exhibitor' | 'session' | 'category' | 'userAccount', data: any) => {
        const isNew = !data.id;

        try {
            switch (type) {
                case 'speaker': {
                    const dbData = { name: data.name, photo_url: data.photoUrl, title: data.title, company: data.company, bio: data.bio, social_linkedin: data.social?.linkedin, social_twitter: data.social?.twitter };
                    if (isNew) {
                        const { data: newSpeaker, error } = await supabase.from('speakers').insert(dbData).select().single();
                        if (error) throw error;
                        setSpeakers(prev => [...prev, { ...data, id: newSpeaker.id, social: data.social || {} }]);
                    } else {
                        const { error } = await supabase.from('speakers').update(dbData).eq('id', data.id);
                        if (error) throw error;
                        setSpeakers(prev => prev.map(s => s.id === data.id ? data : s));
                    }
                    break;
                }
                case 'exhibitor': {
                    const { data: catData } = await supabase.from('exhibitor_categories').select('id').eq('name', data.category).single();
                    const dbData = { name: data.name, logo_url: data.logoUrl, description: data.description, contact: data.contact, website: data.website, stand_number: data.standNumber, category_id: catData?.id };
                    if (isNew) {
                        const { data: newExhibitor, error } = await supabase.from('exhibitors').insert(dbData).select().single();
                        if (error) throw error;
                        setExhibitors(prev => [...prev, { ...data, id: newExhibitor.id }]);
                    } else {
                        const { error } = await supabase.from('exhibitors').update(dbData).eq('id', data.id);
                        if (error) throw error;
                        setExhibitors(prev => prev.map(e => e.id === data.id ? data : e));
                    }
                    break;
                }
                case 'session': {
                    const speakerIds = typeof data.speakerIds === 'string' ? data.speakerIds.split(',').map(Number).filter(Boolean) : data.speakerIds;
                    const dbData = { title: data.title, start_time: data.startTime, end_time: data.endTime, room: data.room, description: data.description, day: data.day, track: data.track || null };
                    let sessionId = data.id;
                    if (isNew) {
                        const { data: newSession, error } = await supabase.from('agenda_sessions').insert(dbData).select().single();
                        if (error) throw error;
                        sessionId = newSession.id;
                        setAgendaSessions(prev => [...prev, { ...data, speakerIds, id: sessionId }]);
                    } else {
                        const { error } = await supabase.from('agenda_sessions').update(dbData).eq('id', data.id);
                        if (error) throw error;
                        await supabase.from('session_speakers').delete().eq('session_id', data.id);
                        setAgendaSessions(prev => prev.map(s => s.id === data.id ? { ...data, speakerIds } : s));
                    }
                    for (const sid of speakerIds) {
                        await supabase.from('session_speakers').insert({ session_id: sessionId, speaker_id: sid });
                    }
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
                            const { error } = await supabase.from('exhibitor_categories').update({ name: newCategoryName }).eq('name', oldName);
                            if (error) throw error;
                            setExhibitorCategories(prev => prev.map(c => c === oldName ? newCategoryName : c));
                            setExhibitors(prev => prev.map(e => e.category === oldName ? { ...e, category: newCategoryName } : e));
                        }
                    } else {
                        if (exhibitorCategories.includes(newCategoryName)) {
                            alert('Esta categoría ya existe.');
                            return;
                        }
                        const { error } = await supabase.from('exhibitor_categories').insert({ name: newCategoryName });
                        if (error) throw error;
                        setExhibitorCategories(prev => [...prev, newCategoryName]);
                    }
                    break;
                }
                case 'userAccount': {
                    // Call the Edge Function to create a user safely
                    const { data: edgeData, error } = await supabase.functions.invoke('manage-users', {
                        body: {
                            action: 'CREATE_STAFF',
                            payload: {
                                email: data.email,
                                password: data.password,
                                name: data.name,
                                role: data.role,
                                exhibitorId: data.role === 'exhibitor' ? parseInt(data.exhibitorId) : undefined,
                                maxDevices: parseInt(data.maxDevices) || (data.role === 'exhibitor' ? 3 : 1)
                            }
                        }
                    });

                    if (error) throw new Error(edgeData?.error || error.message);
                    if (edgeData?.error) throw new Error(edgeData.error);

                    alert(`¡Cuenta creada con éxito!\nPor favor, entrega estas credenciales al usuario:\n\nCorreo: ${data.email}\nContraseña: ${data.password}`);

                    // Manually inject the new user into the local contacts state so it shows up instantly
                    setContacts(prev => [...prev, {
                        id: edgeData.user.id,
                        name: data.name,
                        role: data.role as any,
                        track: 'General',
                        title: '',
                        company: '',
                        photoUrl: '',
                        interests: [],
                        points: 0,
                        maxDevices: parseInt(data.maxDevices) || (data.role === 'exhibitor' ? 3 : 1),
                        registeredDevices: []
                    }]);
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
                    await supabase.from('speakers').delete().eq('id', id);
                    setSpeakers(prev => prev.filter(item => item.id !== id));
                    break;
                case 'exhibitor':
                    await supabase.from('exhibitors').delete().eq('id', id);
                    setExhibitors(prev => prev.filter(item => item.id !== id));
                    break;
                case 'session':
                    await supabase.from('agenda_sessions').delete().eq('id', id);
                    setAgendaSessions(prev => prev.filter(item => item.id !== id));
                    break;
                case 'user':
                    setContacts(prev => prev.filter(item => item.id !== id));
                    break;
                case 'category':
                    const isUsed = exhibitors.some(e => e.category === id);
                    if (isUsed) {
                        alert('No se puede eliminar esta categoría porque hay expositores que la utilizan. Por favor, cambie la categoría de esos expositores primero.');
                        return;
                    }
                    await supabase.from('exhibitor_categories').delete().eq('name', id);
                    setExhibitorCategories(prev => prev.filter(c => c !== id));
                    break;
            }
        } catch (err: any) {
            alert('Error al eliminar en base de datos: ' + err.message);
        }
    };

    const handleUnlinkDevice = async (userId: string) => {
        if (!window.confirm('¿Desvincular dispositivo de este usuario? Podrá iniciar sesión en un nuevo dispositivo.')) return;

        try {
            const { error } = await supabase.from('profiles').update({ registered_devices: [] }).eq('id', userId);
            if (error) throw error;

            setContacts(prev => prev.map(u => u.id === userId ? { ...u, deviceId: undefined, registeredDevices: [] } : u));
            alert('Dispositivos reseteados con éxito.');
        } catch (err: any) {
            alert('Error al resetear dispositivos: ' + err.message);
        }
    };

    const renderForm = () => {
        if (!modalConfig.type) return null;

        const FormComponent = {
            speaker: SpeakerForm,
            exhibitor: (props: any) => <ExhibitorForm {...props} categories={exhibitorCategories} />,
            session: SessionForm,
            category: CategoryForm,
            userAccount: (props: any) => <UserAccountForm {...props} exhibitors={exhibitors} />
        }[modalConfig.type];

        return <FormComponent item={modalConfig.item} onSave={(data: any) => handleSave(modalConfig.type!, data)} onClose={closeModal} />;
    };

    return (
        <div className="p-4">
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

            <AdminSection title={`Usuarios y Dispositivos (${contacts.length})`}>
                <div className="mb-4">
                    <button onClick={() => openModal('userAccount')} className="flex items-center text-brand-accent mb-4 p-2 rounded hover:bg-gray-100">
                        <PlusCircleIcon /><span className="ml-2 font-semibold">Crear Cuenta (Staff)</span>
                    </button>
                    <p className="text-gray-500 text-sm mb-4">
                        Añade Administradores, Expositores o Ponentes. Se les asignará una contraseña única. También puedes revisar qué usuarios tienen dispositivos registrados.
                    </p>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {contacts.map(user => (
                        <div key={user.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div>
                                <span className={`font-medium px-2 py-0.5 rounded text-xs mr-2 ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'exhibitor' ? 'bg-blue-100 text-blue-800' : user.role === 'speaker' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                    {user.role.toUpperCase()}
                                </span>
                                <span className="text-gray-800 font-bold">{user.name}</span>
                                {user.company && <span className="text-xs text-gray-500 block">{user.company} - {user.title}</span>}
                                {user.registeredDevices && user.registeredDevices.length > 0 ? (
                                    <span className="text-xs text-brand-danger flex items-center mt-1">📱 {user.registeredDevices.length} / {user.maxDevices || 1} Disp. Vinculados</span>
                                ) : (
                                    <span className="text-xs text-gray-500 flex items-center mt-1">✓ Sin dispositivos limitantes aún</span>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                {(user.registeredDevices && user.registeredDevices.length > 0) && (
                                    <button onClick={() => handleUnlinkDevice(user.id)} className="text-white bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded text-xs font-bold" title="Borrar historial de dispositivos de esta cuenta">
                                        Resetear Dispositivos
                                    </button>
                                )}
                                <button onClick={() => handleDelete('user', user.id)} className="text-gray-400 hover:text-red-700 p-1">
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                    {contacts.length === 0 && <p className="text-gray-500 text-sm">No hay usuarios registrados.</p>}
                </div>
            </AdminSection>

            {modalConfig.type && renderForm()}
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

const SpeakerForm: React.FC<{ item?: Speaker, onSave: (data: any) => void, onClose: () => void }> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState(item || { name: '', title: '', company: '', bio: '', photoUrl: '' });
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Ponente' : 'Añadir Ponente'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <FormField label="Nombre" id="name" value={formData.name} onChange={handleChange} />
                <FormField label="Cargo" id="title" value={formData.title} onChange={handleChange} />
                <FormField label="Empresa" id="company" value={formData.company} onChange={handleChange} />
                <FormField label="URL de Foto" id="photoUrl" value={formData.photoUrl} onChange={handleChange} />
                <FormField label="Biografía" id="bio" value={formData.bio} onChange={handleChange} type="textarea" />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const ExhibitorForm: React.FC<{ item?: Exhibitor, categories: string[], onSave: (data: any) => void, onClose: () => void }> = ({ item, categories, onSave, onClose }) => {
    const [formData, setFormData] = useState(item || { name: '', description: '', contact: '', website: '', standNumber: '', category: categories.length > 0 ? categories[0] : '', logoUrl: '' });
    const handleChange = (e: React.ChangeEvent<any>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Expositor' : 'Añadir Expositor'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <FormField label="Nombre" id="name" value={formData.name} onChange={handleChange} />
                <FormField label="URL de Logo" id="logoUrl" value={formData.logoUrl} onChange={handleChange} />
                <FormField label="Descripción" id="description" value={formData.description} onChange={handleChange} type="textarea" />
                <FormField label="Contacto (email)" id="contact" value={formData.contact} onChange={handleChange} />
                <FormField label="Sitio Web" id="website" value={formData.website} onChange={handleChange} />
                <FormField label="Nº de Stand" id="standNumber" value={formData.standNumber} onChange={handleChange} />
                <FormField label="Categoría" id="category" value={formData.category} onChange={handleChange}>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </FormField>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};

const SessionForm: React.FC<{ item?: AgendaSession, onSave: (data: any) => void, onClose: () => void }> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState(item ? { ...item, speakerIds: item.speakerIds.join(', ') } : { title: '', description: '', room: '', day: 'Viernes', startTime: '', endTime: '', speakerIds: '', track: '' });
    const handleChange = (e: React.ChangeEvent<any>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Sesión' : 'Añadir Sesión'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <FormField label="Título" id="title" value={formData.title} onChange={handleChange} />
                <FormField label="Descripción" id="description" value={formData.description} onChange={handleChange} type="textarea" />
                <FormField label="Sala" id="room" value={formData.room} onChange={handleChange} />
                <FormField label="IDs de Ponentes (separados por coma)" id="speakerIds" value={String(formData.speakerIds)} onChange={handleChange} />
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

const UserAccountForm: React.FC<{ item?: any, exhibitors: Exhibitor[], onSave: (data: any) => void, onClose: () => void }> = ({ item, exhibitors, onSave, onClose }) => {
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
        role: 'speaker',
        password: generatePassword(),
        exhibitorId: '',
        maxDevices: '1' // Default based on role handled in handleChange optionally, or just default to 1
    });

    const handleChange = (e: React.ChangeEvent<any>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };
            // Auto-adjust default device limit hints if they just changed roles and haven't touched maxDevices (or if we just forcibly update it as a convenience)
            if (name === 'role') {
                next.maxDevices = value === 'exhibitor' ? '3' : (value === 'admin' ? '999' : '1');
            }
            return next;
        });
    };

    return (
        <Modal title={'Añadir Cuenta de Acceso (Staff)'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200 mb-4">
                    Las cuentas creadas aquí <b>podrán iniciar sesión</b> en la pestaña de Acceso Privilegiado. Por seguridad, copia la contraseña generada y entrégala al usuario junto a su correo electrónico.
                </div>

                <FormField label="Nombre Completo" id="name" value={formData.name} onChange={handleChange} />
                <FormField label="Correo Electrónico" id="email" type="email" value={formData.email} onChange={handleChange} />

                <FormField label="Rol" id="role" value={formData.role} onChange={handleChange}>
                    <option value="admin">Administrador General</option>
                    <option value="exhibitor">Expositor (Stand)</option>
                    <option value="speaker">Ponente / Conferencista</option>
                </FormField>

                {formData.role === 'exhibitor' && (
                    <FormField label="Vincular a Expositor" id="exhibitorId" value={formData.exhibitorId} onChange={handleChange} required={true}>
                        <option value="">-- Seleccionar --</option>
                        {exhibitors.map(ex => (
                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))}
                    </FormField>
                )}

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
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-gray-800 font-medium">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded font-medium hover:bg-blue-900">Crear Cuenta</button>
                </div>
            </form>
        </Modal>
    );
};