
import React, { useState } from 'react';
import { Speaker, Exhibitor, AgendaSession, LeaderboardEntry, UserProfile } from '../../types';
import { ChevronDownIcon, PlusCircleIcon, PencilIcon, TrashIcon, LockOpenIcon } from '../Icons';
import { Modal } from '../common/Modal';

interface AdminViewProps {
    speakers: Speaker[];
    exhibitors: Exhibitor[];
    agendaSessions: AgendaSession[];
    setSpeakers: (value: Speaker[] | ((prevState: Speaker[]) => Speaker[])) => void;
    setExhibitors: (value: Exhibitor[] | ((prevState: Exhibitor[]) => Exhibitor[])) => void;
    setAgendaSessions: (value: AgendaSession[] | ((prevState: AgendaSession[]) => AgendaSession[])) => void;
    leaderboard: LeaderboardEntry[];
    setLeaderboard: (value: LeaderboardEntry[] | ((prevState: LeaderboardEntry[]) => LeaderboardEntry[])) => void;
    contacts: UserProfile[];
    setContacts: (value: UserProfile[] | ((prevState: UserProfile[]) => UserProfile[])) => void;
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

export const AdminView: React.FC<AdminViewProps> = ({ speakers, exhibitors, agendaSessions, setSpeakers, setExhibitors, setAgendaSessions, leaderboard, setLeaderboard, contacts, setContacts }) => {
    const [modalConfig, setModalConfig] = useState<{ type: 'speaker' | 'exhibitor' | 'session' | 'leaderboard' | null, item?: any }>({ type: null });

    const openModal = (type: 'speaker' | 'exhibitor' | 'session' | 'leaderboard', item?: any) => {
        setModalConfig({ type, item: item || null });
    };

    const closeModal = () => {
        setModalConfig({ type: null });
    };

    const handleSave = (type: 'speaker' | 'exhibitor' | 'session' | 'leaderboard', data: any) => {
        const isNew = !data.id;
        const newId = Date.now(); // Simple ID generation

        switch (type) {
            case 'speaker':
                setSpeakers(prev => isNew ? [...prev, { ...data, id: newId, social: {} }] : prev.map(s => s.id === data.id ? data : s));
                break;
            case 'exhibitor':
                setExhibitors(prev => isNew ? [...prev, { ...data, id: newId }] : prev.map(e => e.id === data.id ? data : e));
                break;
            case 'session':
                const sessionData = {
                    ...data,
                    speakerIds: data.speakerIds.split(',').map(Number).filter(Boolean),
                    track: data.track || undefined // Convert empty string to undefined
                };
                setAgendaSessions(prev => isNew ? [...prev, { ...sessionData, id: newId }] : prev.map(s => s.id === sessionData.id ? sessionData : s));
                break;
            case 'leaderboard':
                const entryData = { ...data, points: Number(data.points), rank: Number(data.rank) };
                // For leaderboard, we use 'rank' as a pseudo-id for editing if needed, but better to use name or add an ID. 
                // The current type doesn't have ID. Let's assume we match by name or rank for now, or just replace.
                // Actually, let's treat 'rank' as the unique key for simplicity in this MVP, or add an ID to the type later.
                // For now, let's just map by rank if it exists, or add new.
                // Ideally we should refactor LeaderboardEntry to have an ID.
                // Let's assume the user edits by passing the whole object.

                // To keep it simple and consistent with other handlers:
                setLeaderboard(prev => {
                    const exists = prev.some(p => p.rank === entryData.rank);
                    if (exists && !isNew) {
                        return prev.map(p => p.rank === entryData.rank ? entryData : p).sort((a, b) => b.points - a.points).map((p, i) => ({ ...p, rank: i + 1 }));
                    }
                    return [...prev, entryData].sort((a, b) => b.points - a.points).map((p, i) => ({ ...p, rank: i + 1 }));
                });
                break;
        }
        closeModal();
    };

    const handleDelete = (type: 'speaker' | 'exhibitor' | 'session' | 'leaderboard' | 'user', id: any) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;
        switch (type) {
            case 'speaker': setSpeakers(prev => prev.filter(item => item.id !== id)); break;
            case 'exhibitor': setExhibitors(prev => prev.filter(item => item.id !== id)); break;
            case 'session': setAgendaSessions(prev => prev.filter(item => item.id !== id)); break;
            case 'leaderboard': setLeaderboard(prev => prev.filter(item => item.rank !== id).map((p, i) => ({ ...p, rank: i + 1 }))); break;
            case 'user': setContacts(prev => prev.filter(item => item.id !== id)); break;
        }
    };

    const handleUnlinkDevice = (userId: string) => {
        if (!window.confirm('¿Desvincular dispositivo de este usuario? Podrá iniciar sesión en un nuevo dispositivo.')) return;
        setContacts(prev => prev.map(u => u.id === userId ? { ...u, deviceId: undefined } : u));
    };

    const renderForm = () => {
        if (!modalConfig.type) return null;

        const FormComponent = {
            speaker: SpeakerForm,
            exhibitor: ExhibitorForm,
            session: SessionForm,
            leaderboard: LeaderboardForm
        }[modalConfig.type];

        return <FormComponent item={modalConfig.item} onSave={(data) => handleSave(modalConfig.type!, data)} onClose={closeModal} />;
    };

    return (
        <div className="p-4">
            <AdminSection title={`Ponentes (${speakers.length})`}>
                <ManagementList type="speaker" items={speakers} onEdit={openModal} onDelete={handleDelete} displayField="name" />
            </AdminSection>

            <AdminSection title={`Expositores (${exhibitors.length})`}>
                <ManagementList type="exhibitor" items={exhibitors} onEdit={openModal} onDelete={handleDelete} displayField="name" />
            </AdminSection>

            <AdminSection title={`Agenda (${agendaSessions.length})`}>
                <ManagementList type="session" items={agendaSessions} onEdit={openModal} onDelete={handleDelete} displayField="title" />
            </AdminSection>

            <AdminSection title={`Tabla de Líderes (${leaderboard.length})`}>
                <ManagementList type="leaderboard" items={leaderboard} onEdit={openModal} onDelete={handleDelete} displayField="name" idField="rank" />
            </AdminSection>

            <AdminSection title={`Usuarios Registrados (${contacts.length})`}>
                <div className="space-y-2">
                    {contacts.map(user => (
                        <div key={user.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                            <div>
                                <span className="text-gray-800 font-medium">{user.name}</span>
                                <span className="text-xs text-gray-500 block">{user.company} - {user.title}</span>
                                {user.deviceId ? (
                                    <span className="text-xs text-green-600 flex items-center">📱 Dispositivo Vinculado</span>
                                ) : (
                                    <span className="text-xs text-yellow-600">⚠️ Sin vincular</span>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                {user.deviceId && (
                                    <button onClick={() => handleUnlinkDevice(user.id)} className="text-orange-600 hover:text-orange-800 p-1" title="Desvincular Dispositivo">
                                        <LockOpenIcon />
                                    </button>
                                )}
                                <button onClick={() => handleDelete('user', user.id)} className="text-brand-danger hover:text-red-700 p-1">
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    ))}
                    {contacts.length === 0 && <p className="text-gray-500 text-sm">No hay usuarios registrados (escanea QRs para añadir).</p>}
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
                    <span className="text-gray-800">{item[displayField]} {type === 'leaderboard' ? `(${item.points} pts)` : ''}</span>
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

const ExhibitorForm: React.FC<{ item?: Exhibitor, onSave: (data: any) => void, onClose: () => void }> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState(item || { name: '', description: '', contact: '', website: '', standNumber: '', category: 'Aparatología', logoUrl: '' });
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
                    <option>Aparatología</option>
                    <option>Micropigmentación</option>
                    <option>Cosmética</option>
                    <option>Software</option>
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

const LeaderboardForm: React.FC<{ item?: LeaderboardEntry, onSave: (data: any) => void, onClose: () => void }> = ({ item, onSave, onClose }) => {
    const [formData, setFormData] = useState(item || { name: '', points: 0, photoUrl: '', rank: 0 });
    const handleChange = (e: React.ChangeEvent<any>) => setFormData({ ...formData, [e.target.name]: e.target.value });
    return (
        <Modal title={item ? 'Editar Entrada' : 'Añadir Entrada'} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="p-4 space-y-4">
                <FormField label="Nombre" id="name" value={formData.name} onChange={handleChange} />
                <FormField label="Puntos" id="points" value={String(formData.points)} onChange={handleChange} type="number" />
                <FormField label="URL de Foto" id="photoUrl" value={formData.photoUrl} onChange={handleChange} />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-accent text-white rounded">Guardar</button>
                </div>
            </form>
        </Modal>
    );
};