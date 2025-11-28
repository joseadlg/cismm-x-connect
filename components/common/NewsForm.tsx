import React, { useState } from 'react';
import { Modal } from './Modal';

interface NewsFormProps {
    onSave: (data: { title: string; content: string; category: string }) => void;
    onClose: () => void;
}

export const NewsForm: React.FC<NewsFormProps> = ({ onSave, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'general',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal title="Crear Anuncio" onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        Título
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        placeholder="Ej: ¡Descuento especial en nuestro stand!"
                    />
                </div>

                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Categoría
                    </label>
                    <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    >
                        <option value="general">General</option>
                        <option value="promotion">Promoción</option>
                        <option value="announcement">Anuncio</option>
                        <option value="alert">Alerta</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                        Contenido
                    </label>
                    <textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        required
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        placeholder="Escribe el contenido de tu anuncio..."
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-brand-accent text-white rounded-md hover:bg-opacity-90"
                    >
                        Publicar
                    </button>
                </div>
            </form>
        </Modal>
    );
};
