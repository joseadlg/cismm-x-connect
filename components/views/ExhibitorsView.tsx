import React, { useState, useMemo } from 'react';
import { Exhibitor } from '../../types';
import { Modal } from '../common/Modal';

interface ExhibitorsViewProps {
  exhibitors: Exhibitor[];
}

const ExhibitorCard: React.FC<{ exhibitor: Exhibitor; onClick: () => void; }> = ({ exhibitor, onClick }) => (
    <div className="bg-white rounded-lg shadow-md p-4 flex flex-col items-center cursor-pointer hover:shadow-xl transition-shadow" onClick={onClick}>
        <img src={exhibitor.logoUrl} alt={`${exhibitor.name} logo`} className="h-20 w-auto object-contain mb-4" />
        <h3 className="font-bold text-brand-primary text-center">{exhibitor.name}</h3>
    </div>
);

const ExhibitorDetail: React.FC<{ exhibitor: Exhibitor; onClose: () => void; }> = ({ exhibitor, onClose }) => (
    <Modal title={exhibitor.name} onClose={onClose}>
        <div className="p-4 text-left">
            <div className="text-center mb-4">
                 <img src={exhibitor.logoUrl} alt={`${exhibitor.name} logo`} className="h-24 w-auto object-contain mx-auto mb-4" />
            </div>
            <p className="text-gray-700 my-4">{exhibitor.description}</p>
            <div className="space-y-2 text-sm">
                <p><span className="font-semibold">Stand:</span> <span className="bg-brand-accent text-white px-2 py-1 rounded-full">{exhibitor.standNumber}</span></p>
                <p><span className="font-semibold">Categoría:</span> {exhibitor.category}</p>
                <p><span className="font-semibold">Contacto:</span> <a href={`mailto:${exhibitor.contact}`} className="text-blue-600">{exhibitor.contact}</a></p>
                <p><span className="font-semibold">Sitio Web:</span> <a href={exhibitor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">Visitar</a></p>
            </div>
        </div>
    </Modal>
);

export const ExhibitorsView: React.FC<ExhibitorsViewProps> = ({ exhibitors }) => {
  const [selectedExhibitor, setSelectedExhibitor] = useState<Exhibitor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(exhibitors.map(e => e.category)))];

  const filteredExhibitors = useMemo(() => {
    return exhibitors.filter(exhibitor => {
      const matchesSearch = exhibitor.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || exhibitor.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [exhibitors, searchTerm, selectedCategory]);

  return (
    <div className="p-4">
      <div className="mb-4 space-y-4">
        <input
          type="text"
          placeholder="Buscar expositor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent"
        />
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm font-semibold rounded-full whitespace-nowrap ${selectedCategory === category ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredExhibitors.map(exhibitor => (
          <ExhibitorCard key={exhibitor.id} exhibitor={exhibitor} onClick={() => setSelectedExhibitor(exhibitor)} />
        ))}
      </div>
      {selectedExhibitor && <ExhibitorDetail exhibitor={selectedExhibitor} onClose={() => setSelectedExhibitor(null)} />}
    </div>
  );
};
