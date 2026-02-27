
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
        const secureToken = await generateSecureToken({
          id: user.id,
          name: user.name,
          title: user.title,
          company: user.company,
          photoUrl: user.photoUrl,
          interests: user.interests
        });

        new QRious({
          element: qrRef.current,
          value: secureToken,
          size: 200,
          background: 'white',
          foreground: '#0D2A4C'
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
          <p className="text-sm text-gray-500 mb-2">Muestra este código para que otros te añadan.</p>
          <canvas ref={qrRef} className="mx-auto"></canvas>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-brand-primary mb-4">Mis Contactos ({contacts.length})</h3>
        <div className="space-y-4 max-h-60 overflow-y-auto">
          {contacts.length > 0 ? (
            contacts.map((contact) => (
              <div key={contact.id} className="flex items-center space-x-4">
                {contact.photoUrl ? (
                  <img src={contact.photoUrl} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold shrink-0">
                    {contact.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-brand-secondary">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.title}</p>
                </div>
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