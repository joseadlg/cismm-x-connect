import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../../types';

interface ExhibitorDashboardProps {
    user: UserProfile;
}

export const ExhibitorDashboard: React.FC<ExhibitorDashboardProps> = ({ user }) => {
    // In a real app, this would be the exhibitor's actual ID linked to their profile
    // For this demo, we'll use a mock ID if not present, or the user's ID
    const exhibitorData = {
        exhibitorId: user.exhibitorId || 999,
        name: user.company || user.name,
    };

    const qrValue = JSON.stringify(exhibitorData);

    return (
        <div className="p-4 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                <h2 className="text-2xl font-bold text-brand-primary mb-2">Mi Stand</h2>
                <p className="text-gray-600 mb-6">Muestra este código QR a los asistentes para que registren su visita y ganen puntos.</p>

                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white border-4 border-brand-accent rounded-xl shadow-inner">
                        <QRCodeSVG value={qrValue} size={200} />
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-left">
                    <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">Datos del QR:</p>
                    <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {JSON.stringify(exhibitorData, null, 2)}
                    </pre>
                </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-blue-700">
                            Recuerda que cada visita única otorga <strong>50 puntos</strong> al asistente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
