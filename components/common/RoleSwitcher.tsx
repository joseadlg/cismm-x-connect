import React from 'react';
import { UserRole } from '../../types';
import { UserCircleIcon } from '../Icons';

interface RoleSwitcherProps {
    currentRole: UserRole;
    onRoleChange: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onRoleChange }) => {
    const roles: { id: UserRole; label: string }[] = [
        { id: 'attendee', label: 'Asistente' },
        { id: 'exhibitor', label: 'Expositor' },
        { id: 'admin', label: 'Administrador' },
    ];

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center mb-3">
                <UserCircleIcon />
                <h3 className="font-bold text-gray-700">Modo de Usuario (Demo)</h3>
            </div>
            <div className="flex space-x-2">
                {roles.map((role) => (
                    <button
                        key={role.id}
                        onClick={() => onRoleChange(role.id)}
                        className={`flex-1 py-2 px-3 rounded text-sm font-semibold transition-colors ${currentRole === role.id
                            ? 'bg-brand-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        {role.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
