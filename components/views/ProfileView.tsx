import React, { useEffect, useRef, useState } from 'react';
import { Exhibitor, Speaker, UserProfile, View } from '../../types';
import { CameraIcon } from '../Icons';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getAcceptedImageTypes, getImageUploadHint, removePublicImage, uploadPublicImage } from '../../utils/storageImages';
import QRious from 'qrious';
import { generateSecureToken } from '../../utils/security';
import { getAttendeeCategoryLabel } from '../../utils/attendeeCategory';

interface ProfileViewProps {
  user: UserProfile;
  contacts: UserProfile[];
  setActiveView: (view: View) => void;
  speaker?: Speaker;
  exhibitor?: Exhibitor;
  refreshData: () => Promise<void>;
}

interface SpeakerFormState {
  name: string;
  photoUrl: string;
  title: string;
  company: string;
  bio: string;
  linkedin: string;
  twitter: string;
}

interface ExhibitorFormState {
  name: string;
  logoUrl: string;
  description: string;
  contact: string;
  website: string;
  standNumber: string;
}

interface ProfileFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}

const buildSpeakerFormState = (speaker: Speaker | undefined, user: UserProfile): SpeakerFormState => ({
  name: speaker?.name || user.name || '',
  photoUrl: speaker?.photoUrl || user.photoUrl || '',
  title: speaker?.title || user.title || '',
  company: speaker?.company || user.company || '',
  bio: speaker?.bio || '',
  linkedin: speaker?.social.linkedin || '',
  twitter: speaker?.social.twitter || '',
});

const buildExhibitorFormState = (exhibitor: Exhibitor | undefined, user: UserProfile): ExhibitorFormState => ({
  name: exhibitor?.name || user.company || user.name || '',
  logoUrl: exhibitor?.logoUrl || user.photoUrl || '',
  description: exhibitor?.description || '',
  contact: exhibitor?.contact || '',
  website: exhibitor?.website || '',
  standNumber: exhibitor?.standNumber || '',
});

const ProfileField: React.FC<ProfileFieldProps> = ({ id, label, value, onChange, placeholder, type = 'text', multiline = false }) => (
  <label htmlFor={id} className="block">
    <span className="mb-1 block text-sm font-semibold text-brand-primary">{label}</span>
    {multiline ? (
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
      />
    ) : (
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
      />
    )}
  </label>
);

export const ProfileView: React.FC<ProfileViewProps> = ({ user, contacts, setActiveView, speaker, exhibitor, refreshData }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const speakerImageInputRef = useRef<HTMLInputElement>(null);
  const exhibitorImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingLinkedImage, setIsUploadingLinkedImage] = useState(false);
  const [isSavingLinkedProfile, setIsSavingLinkedProfile] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [speakerForm, setSpeakerForm] = useState<SpeakerFormState>(() => buildSpeakerFormState(speaker, user));
  const [exhibitorForm, setExhibitorForm] = useState<ExhibitorFormState>(() => buildExhibitorFormState(exhibitor, user));
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const isSpeakerSelfEditor = user.role === 'speaker' && !!user.speakerId;
  const isExhibitorSelfEditor = user.role === 'exhibitor' && !!user.exhibitorId;
  const shouldUseLinkedEditor = isSpeakerSelfEditor || isExhibitorSelfEditor;

  useEffect(() => {
    setSpeakerForm(buildSpeakerFormState(speaker, user));
  }, [speaker, user]);

  useEffect(() => {
    setExhibitorForm(buildExhibitorFormState(exhibitor, user));
  }, [exhibitor, user]);

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      showToast('Optimizando y subiendo foto...', 'info');
      const { publicUrl } = await uploadPublicImage({
        bucket: 'avatars',
        file,
        entityKey: user.id,
        fileSlug: user.name,
      });

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw new Error('Error al actualizar el perfil: ' + updateError.message);

      await refreshProfile();
      await removePublicImage({ bucket: 'avatars', publicUrl: user.photoUrl });
      showToast('Foto de perfil actualizada exitosamente!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al actualizar foto de perfil', 'error');
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleLinkedImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    kind: 'speaker' | 'exhibitor'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLinkedImage(true);
    try {
      showToast('Optimizando y subiendo imagen pública...', 'info');
      const { publicUrl } = await uploadPublicImage({
        bucket: kind === 'speaker' ? 'speakers' : 'exhibitors',
        file,
        entityKey: kind === 'speaker'
          ? `speaker-${user.speakerId ?? user.id}`
          : `exhibitor-${user.exhibitorId ?? user.id}`,
        fileSlug: kind === 'speaker' ? (speakerForm.name || user.name) : (exhibitorForm.name || user.name),
      });

      if (kind === 'speaker') {
        setSpeakerForm(prev => ({ ...prev, photoUrl: publicUrl }));
      } else {
        setExhibitorForm(prev => ({ ...prev, logoUrl: publicUrl }));
      }

      showToast('Imagen lista. Guarda los cambios para publicarla.', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al subir la imagen pública', 'error');
    } finally {
      setIsUploadingLinkedImage(false);
      event.target.value = '';
    }
  };

  const handleSaveSpeakerProfile = async () => {
    const trimmedName = speakerForm.name.trim();

    if (!trimmedName) {
      showToast('El nombre del ponente es obligatorio.', 'error');
      return;
    }

    setIsSavingLinkedProfile(true);
    try {
      const previousPhotoUrl = speaker?.photoUrl || '';

      await invokeManageUsers('SELF_UPDATE_SPEAKER', {
        name: trimmedName,
        photoUrl: speakerForm.photoUrl,
        title: speakerForm.title,
        company: speakerForm.company,
        bio: speakerForm.bio,
        social: {
          linkedin: speakerForm.linkedin,
          twitter: speakerForm.twitter,
        },
      });

      await refreshData();
      await refreshProfile();

      if (previousPhotoUrl && previousPhotoUrl !== speakerForm.photoUrl) {
        await removePublicImage({ bucket: 'speakers', publicUrl: previousPhotoUrl });
      }

      showToast('Tu ficha de ponente se actualizó correctamente.', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al actualizar tu ficha de ponente', 'error');
    } finally {
      setIsSavingLinkedProfile(false);
    }
  };

  const handleSaveExhibitorProfile = async () => {
    const trimmedName = exhibitorForm.name.trim();

    if (!trimmedName) {
      showToast('El nombre del expositor es obligatorio.', 'error');
      return;
    }

    setIsSavingLinkedProfile(true);
    try {
      const previousLogoUrl = exhibitor?.logoUrl || '';

      await invokeManageUsers('SELF_UPDATE_EXHIBITOR', {
        name: trimmedName,
        logoUrl: exhibitorForm.logoUrl,
        description: exhibitorForm.description,
        contact: exhibitorForm.contact,
        website: exhibitorForm.website,
        standNumber: exhibitorForm.standNumber,
      });

      await refreshData();
      await refreshProfile();

      if (previousLogoUrl && previousLogoUrl !== exhibitorForm.logoUrl) {
        await removePublicImage({ bucket: 'exhibitors', publicUrl: previousLogoUrl });
      }

      showToast('Tu ficha de expositor se actualizó correctamente.', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al actualizar tu ficha de expositor', 'error');
    } finally {
      setIsSavingLinkedProfile(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const generateQR = async () => {
      if (!qrRef.current) {
        return;
      }

      try {
        const qrValue = user.role === 'exhibitor' && user.exhibitorId
          ? await generateSecureToken({ exhibitorId: user.exhibitorId, name: user.company || user.name })
          : await generateSecureToken({ id: user.id, name: user.name, attendeeCategory: user.attendeeCategory });

        if (isCancelled || !qrRef.current) {
          return;
        }

        new QRious({
          element: qrRef.current,
          value: qrValue,
          size: 250,
          background: 'white',
          foreground: '#0D2A4C',
          level: 'M',
          padding: 10,
        });
      } catch (error) {
        console.error('Error generating secure QR:', error);
      }
    };

    void generateQR();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 text-center relative">
        <div className="relative inline-block group">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name}
              className={`w-32 h-32 rounded-full mx-auto border-4 border-brand-accent object-cover ${isUploadingAvatar ? 'opacity-50' : ''}`}
            />
          ) : (
            <div className={`w-32 h-32 rounded-full mx-auto border-4 border-brand-accent bg-brand-primary flex items-center justify-center text-white text-4xl font-bold ${isUploadingAvatar ? 'opacity-50' : ''}`}>
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          )}

          {!shouldUseLinkedEditor && (
            <>
              <div
                className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => avatarInputRef.current?.click()}
              >
                <span className="text-white text-sm font-semibold">{isUploadingAvatar ? 'Subiendo...' : 'Cambiar Foto'}</span>
              </div>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept={getAcceptedImageTypes('avatars')}
                className="hidden"
              />
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-2">
          {shouldUseLinkedEditor ? 'Tu imagen pública se edita en la ficha de abajo.' : getImageUploadHint('avatars')}
        </p>
        <h2 className="text-2xl font-bold text-brand-primary mt-4">{user.name}</h2>
        <p className="text-lg text-brand-secondary">{user.title}</p>
        <p className="text-gray-600">{user.company}</p>
        {user.role === 'attendee' && (
          <div className="mt-3">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${user.attendeeCategory === 'vip' ? 'bg-amber-100 text-amber-800' : user.attendeeCategory === 'juez' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-700'}`}>
              Categoría: {getAttendeeCategoryLabel(user.attendeeCategory)}
            </span>
          </div>
        )}
        <div className="mt-4">
          <h3 className="font-semibold text-brand-primary mb-2">Mi Código QR</h3>
          <p className="text-sm text-gray-500 mb-2">
            {user.role === 'exhibitor'
              ? 'Muestra este código para que los asistentes registren su visita a tu stand.'
              : 'Muestra este código para que otros te añadan.'}
          </p>
          <canvas ref={qrRef} className="mx-auto"></canvas>
        </div>
      </div>

      {isSpeakerSelfEditor && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-brand-primary">Mi Ficha de Ponente</h3>
            <p className="text-sm text-gray-500 mt-1">Estos datos son los que verá la gente en la sección de ponentes y en tus conferencias.</p>
          </div>

          {!speaker ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tu cuenta sí está vinculada como ponente, pero no pudimos cargar tu ficha pública. Si esto sigue igual, pide al admin que revise el vínculo del ponente.
            </div>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  {speakerForm.photoUrl ? (
                    <img src={speakerForm.photoUrl} alt={speakerForm.name} className="mx-auto h-36 w-36 rounded-full object-cover border-4 border-white shadow-sm" />
                  ) : (
                    <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-brand-primary text-4xl font-bold text-white shadow-sm">
                      {speakerForm.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => speakerImageInputRef.current?.click()}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isUploadingLinkedImage || isSavingLinkedProfile}
                  >
                    <CameraIcon />
                    {isUploadingLinkedImage ? 'Subiendo...' : 'Cambiar Foto'}
                  </button>
                  <input
                    type="file"
                    ref={speakerImageInputRef}
                    onChange={(event) => handleLinkedImageUpload(event, 'speaker')}
                    accept={getAcceptedImageTypes('speakers')}
                    className="hidden"
                  />
                  <p className="mt-3 text-xs text-gray-500">{getImageUploadHint('speakers')}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileField
                    id="speaker-name"
                    label="Nombre"
                    value={speakerForm.name}
                    onChange={(event) => setSpeakerForm(prev => ({ ...prev, name: event.target.value }))}
                    placeholder="Nombre del ponente"
                  />
                  <ProfileField
                    id="speaker-title"
                    label="Cargo o especialidad"
                    value={speakerForm.title}
                    onChange={(event) => setSpeakerForm(prev => ({ ...prev, title: event.target.value }))}
                    placeholder="Ej. Médico estético"
                  />
                  <ProfileField
                    id="speaker-company"
                    label="Empresa"
                    value={speakerForm.company}
                    onChange={(event) => setSpeakerForm(prev => ({ ...prev, company: event.target.value }))}
                    placeholder="Empresa o clínica"
                  />
                  <ProfileField
                    id="speaker-linkedin"
                    label="LinkedIn"
                    type="url"
                    value={speakerForm.linkedin}
                    onChange={(event) => setSpeakerForm(prev => ({ ...prev, linkedin: event.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                  <ProfileField
                    id="speaker-twitter"
                    label="X / Twitter"
                    type="url"
                    value={speakerForm.twitter}
                    onChange={(event) => setSpeakerForm(prev => ({ ...prev, twitter: event.target.value }))}
                    placeholder="https://x.com/..."
                  />
                  <div className="md:col-span-2">
                    <ProfileField
                      id="speaker-bio"
                      label="Biografía"
                      value={speakerForm.bio}
                      onChange={(event) => setSpeakerForm(prev => ({ ...prev, bio: event.target.value }))}
                      placeholder="Comparte una breve descripción profesional."
                      multiline
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveSpeakerProfile}
                  disabled={isSavingLinkedProfile || isUploadingLinkedImage}
                  className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingLinkedProfile ? 'Guardando...' : 'Guardar Mi Ficha'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {isExhibitorSelfEditor && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-brand-primary">Mi Ficha de Expositor</h3>
            <p className="text-sm text-gray-500 mt-1">Aquí puedes mantener al día el logo, la descripción del stand y los datos que ve el asistente.</p>
          </div>

          {!exhibitor ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tu cuenta sí está vinculada como expositor, pero no pudimos cargar tu ficha pública. Si esto sigue igual, pide al admin que revise el vínculo del expositor.
            </div>
          ) : (
            <>
              <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
                  {exhibitorForm.logoUrl ? (
                    <img src={exhibitorForm.logoUrl} alt={exhibitorForm.name} className="mx-auto h-36 w-full object-contain rounded-xl bg-white p-4 shadow-sm" />
                  ) : (
                    <div className="mx-auto flex h-36 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-center text-2xl font-bold text-white shadow-sm">
                      {exhibitorForm.name || 'Logo'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => exhibitorImageInputRef.current?.click()}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isUploadingLinkedImage || isSavingLinkedProfile}
                  >
                    <CameraIcon />
                    {isUploadingLinkedImage ? 'Subiendo...' : 'Cambiar Logo'}
                  </button>
                  <input
                    type="file"
                    ref={exhibitorImageInputRef}
                    onChange={(event) => handleLinkedImageUpload(event, 'exhibitor')}
                    accept={getAcceptedImageTypes('exhibitors')}
                    className="hidden"
                  />
                  <p className="mt-3 text-xs text-gray-500">{getImageUploadHint('exhibitors')}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ProfileField
                    id="exhibitor-name"
                    label="Nombre del expositor"
                    value={exhibitorForm.name}
                    onChange={(event) => setExhibitorForm(prev => ({ ...prev, name: event.target.value }))}
                    placeholder="Nombre comercial"
                  />
                  <ProfileField
                    id="exhibitor-stand"
                    label="Stand"
                    value={exhibitorForm.standNumber}
                    onChange={(event) => setExhibitorForm(prev => ({ ...prev, standNumber: event.target.value }))}
                    placeholder="Ej. A-12"
                  />
                  <ProfileField
                    id="exhibitor-contact"
                    label="Correo de contacto"
                    type="email"
                    value={exhibitorForm.contact}
                    onChange={(event) => setExhibitorForm(prev => ({ ...prev, contact: event.target.value }))}
                    placeholder="contacto@empresa.com"
                  />
                  <ProfileField
                    id="exhibitor-website"
                    label="Sitio web"
                    type="url"
                    value={exhibitorForm.website}
                    onChange={(event) => setExhibitorForm(prev => ({ ...prev, website: event.target.value }))}
                    placeholder="https://tuempresa.com"
                  />
                  <div className="md:col-span-2">
                    <ProfileField
                      id="exhibitor-description"
                      label="Descripción"
                      value={exhibitorForm.description}
                      onChange={(event) => setExhibitorForm(prev => ({ ...prev, description: event.target.value }))}
                      placeholder="Describe brevemente tu marca, productos o servicios."
                      multiline
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveExhibitorProfile}
                  disabled={isSavingLinkedProfile || isUploadingLinkedImage}
                  className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingLinkedProfile ? 'Guardando...' : 'Guardar Mi Ficha'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-brand-primary mb-4">Mis Contactos ({contacts.length})</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <div
                key={contact.id}
                className="border rounded-lg overflow-hidden border-gray-100 hover:border-blue-100 transition-colors bg-gray-50/50"
              >
                <div
                  className="flex items-center space-x-4 p-3 cursor-pointer select-none"
                  onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}
                >
                  {contact.photoUrl ? (
                    <img src={contact.photoUrl} alt={contact.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold shrink-0">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-brand-secondary truncate">{contact.name}</p>
                    <p className="text-sm text-gray-500 truncate">{contact.title || contact.company || 'CISMM X CONNECT'}</p>
                  </div>
                  <div className="shrink-0 text-gray-400">
                    <svg className={`w-5 h-5 transition-transform duration-200 ${expandedContactId === contact.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {expandedContactId === contact.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
                    <div className="space-y-3 text-sm mt-2">
                      {contact.company && (
                        <div className="flex items-start text-gray-600">
                          <svg className="w-5 h-5 mr-2 text-brand-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                          <span className="truncate">{contact.company}</span>
                        </div>
                      )}

                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center text-blue-600 hover:underline">
                          <svg className="w-5 h-5 mr-2 text-brand-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                          <span className="truncate">{contact.email}</span>
                        </a>
                      )}

                      {contact.phone && (
                        <a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="flex items-center text-blue-600 hover:underline">
                          <svg className="w-5 h-5 mr-2 text-brand-accent/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                          {contact.phone}
                        </a>
                      )}

                      {!contact.email && !contact.phone && !contact.company && (
                        <p className="text-gray-400 italic text-center py-2">Sin detalles de contacto adicionales</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">Aún no has añadido ningún contacto. ¡Usa el escáner para empezar a conectar!</p>
          )}
        </div>
      </div>
    </div>
  );
};
