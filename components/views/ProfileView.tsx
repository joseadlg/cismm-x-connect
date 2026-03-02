
import React, { useEffect, useRef, useState } from 'react';
import { UserProfile, View } from '../../types';
import { Cog6ToothIcon, CameraIcon } from '../Icons'; // Assume CameraIcon is available or use emoji for now, we'll see
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import imageCompression from 'browser-image-compression';
import { useToast } from '../../contexts/ToastContext';

import QRious from 'qrious';
import { generateSecureToken } from '../../utils/security';

interface ProfileViewProps {
  user: UserProfile;
  contacts: UserProfile[];
  setActiveView: (view: View) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, contacts, setActiveView }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Compress image client-side to save bandwidth
      const options = {
        maxSizeMB: 0.1, // 100 KB max
        maxWidthOrHeight: 400,
        useWebWorker: true,
      };
      showToast('Comprimiendo imagen...', 'info');
      const compressedFile = await imageCompression(file, options);

      // 2. Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      showToast('Subiendo foto...', 'info');

      // 3. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw new Error('Error al subir la imagen: ' + uploadError.message);

      // 4. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      // 5. Update user profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw new Error('Error al actualizar el perfil: ' + updateError.message);

      // 6. Refresh Auth Context to show new photo instantly
      await refreshProfile();
      showToast('Foto de perfil actualizada exitosamente!', 'success');

    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Error al actualizar foto de perfil', 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const generateQR = async () => {
      if (qrRef.current) {
        let qrValue = '';

        if (user.role === 'exhibitor' && user.exhibitorId) {
          // Exhibitor QR: minimal data for stand check-in
          qrValue = JSON.stringify({ exhibitorId: user.exhibitorId, name: user.company || user.name });
        } else {
          // Attendee/Speaker QR: just id + name — keeps QR simple and scannable
          qrValue = JSON.stringify({ id: user.id, name: user.name });
        }

        new QRious({
          element: qrRef.current,
          value: qrValue,
          size: 250,
          background: 'white',
          foreground: '#0D2A4C',
          level: 'M', // Medium error correction — balances reliability vs density
          padding: 10,
        });
      }
    };
    generateQR();
  }, [user]);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 text-center relative">
        <div className="relative inline-block group">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt={user.name}
              className={`w-32 h-32 rounded-full mx-auto border-4 border-brand-accent object-cover ${isUploading ? 'opacity-50' : ''}`}
            />
          ) : (
            <div className={`w-32 h-32 rounded-full mx-auto border-4 border-brand-accent bg-brand-primary flex items-center justify-center text-white text-4xl font-bold ${isUploading ? 'opacity-50' : ''}`}>
              {user.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div
            className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="text-white text-sm font-semibold">{isUploading ? 'Subiendo...' : 'Cambiar Foto'}</span>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
          />
        </div>
        <h2 className="text-2xl font-bold text-brand-primary mt-4">{user.name}</h2>
        <p className="text-lg text-brand-secondary">{user.title}</p>
        <p className="text-gray-600">{user.company}</p>
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

                {/* Expanded Details Section */}
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