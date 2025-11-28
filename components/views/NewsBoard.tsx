import React, { useState } from 'react';
import { NewsPost, UserRole } from '../../types';
import { NewsCard } from '../common/NewsCard';
import { NewsForm } from '../common/NewsForm';
import { PlusCircleIcon } from '../Icons';

interface NewsBoardProps {
    posts: NewsPost[];
    userRole: UserRole;
    currentUserName: string;
    onCreatePost: (data: { title: string; content: string; category: string }) => void;
    onDeletePost: (id: number) => void;
}

export const NewsBoard: React.FC<NewsBoardProps> = ({
    posts,
    userRole,
    currentUserName,
    onCreatePost,
    onDeletePost,
}) => {
    const [showForm, setShowForm] = useState(false);

    const canPost = userRole === 'admin' || userRole === 'exhibitor';

    const handleSave = (data: { title: string; content: string; category: string }) => {
        onCreatePost(data);
        setShowForm(false);
    };

    const canDeletePost = (post: NewsPost) => {
        return userRole === 'admin' || post.authorName === currentUserName;
    };

    // Sort posts by timestamp (newest first)
    const sortedPosts = [...posts].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return (
        <div className="p-4">
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-brand-primary">Tablero de Noticias</h2>
                        <p className="text-gray-600 text-sm mt-1">
                            Mantente informado sobre promociones, anuncios y novedades del evento
                        </p>
                    </div>
                    {canPost && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
                        >
                            <PlusCircleIcon />
                            <span className="font-semibold">Crear Anuncio</span>
                        </button>
                    )}
                </div>
            </div>

            {sortedPosts.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-500">No hay anuncios publicados aún.</p>
                    {canPost && (
                        <p className="text-gray-400 text-sm mt-2">
                            ¡Sé el primero en publicar un anuncio!
                        </p>
                    )}
                </div>
            ) : (
                <div>
                    {sortedPosts.map((post) => (
                        <NewsCard
                            key={post.id}
                            post={post}
                            canDelete={canDeletePost(post)}
                            onDelete={onDeletePost}
                        />
                    ))}
                </div>
            )}

            {showForm && <NewsForm onSave={handleSave} onClose={() => setShowForm(false)} />}
        </div>
    );
};
