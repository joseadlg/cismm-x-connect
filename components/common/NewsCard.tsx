import React from 'react';
import { NewsPost } from '../../types';
import { TrashIcon } from '../Icons';

interface NewsCardProps {
    post: NewsPost;
    canDelete: boolean;
    onDelete: (id: number) => void;
}

const categoryColors = {
    promotion: 'bg-green-100 text-green-800 border-green-300',
    announcement: 'bg-blue-100 text-blue-800 border-blue-300',
    alert: 'bg-red-100 text-red-800 border-red-300',
    general: 'bg-gray-100 text-gray-800 border-gray-300',
};

const categoryLabels = {
    promotion: 'Promoción',
    announcement: 'Anuncio',
    alert: 'Alerta',
    general: 'General',
};

export const NewsCard: React.FC<NewsCardProps> = ({ post, canDelete, onDelete }) => {
    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className={`bg-white rounded-lg shadow-md p-4 mb-4 border-l-4 ${categoryColors[post.category]}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${categoryColors[post.category]}`}>
                            {categoryLabels[post.category]}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(post.timestamp)}</span>
                    </div>
                    <h3 className="text-lg font-bold text-brand-primary">{post.title}</h3>
                </div>
                {canDelete && (
                    <button
                        onClick={() => onDelete(post.id)}
                        className="text-red-600 hover:text-red-800 p-1 ml-2"
                        title="Eliminar"
                    >
                        <TrashIcon />
                    </button>
                )}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>
            <div className="flex items-center text-sm text-gray-600">
                <span className="font-semibold">{post.authorName}</span>
                <span className="mx-2">•</span>
                <span className="capitalize">{post.authorRole === 'admin' ? 'Administrador' : 'Expositor'}</span>
            </div>
        </div>
    );
};
