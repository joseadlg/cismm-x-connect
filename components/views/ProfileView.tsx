
import React, { useEffect, useRef } from 'react';
import { UserProfile, View } from '../../types';
import { Cog6ToothIcon } from '../Icons';

import QRious from 'qrious';

interface ProfileViewProps {
  user: UserProfile;
  contacts: UserProfile[];
  setActiveView: (view: View) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, contacts, setActiveView }) => {
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrRef.current) {
      new QRious({
        element: qrRef.current,
        value: JSON.stringify({ id: user.id, name: user.name, title: user.title, company: user.company, photoUrl: user.photoUrl, interests: user.interests }),
        size: 200,
        background: 'white',
        foreground: '#0D2A4C'
      });
    }
  }, [user]);

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <img src={user.photoUrl} alt={user.name} className="w-32 h-32 rounded-full mx-auto border-4 border-brand-accent" />
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
                <img src={contact.photoUrl} alt={contact.name} className="w-12 h-12 rounded-full" />
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