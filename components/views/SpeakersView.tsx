
import React, { useState } from 'react';
import { Speaker, AgendaSession } from '../../types';
import { Modal } from '../common/Modal';

interface SpeakersViewProps {
  speakers: Speaker[];
  agendaSessions: AgendaSession[];
}

const SpeakerCard: React.FC<{ speaker: Speaker; onClick: () => void; }> = ({ speaker, onClick }) => (
    <div className="bg-white rounded-lg shadow-md text-center p-4 cursor-pointer hover:shadow-xl transition-shadow" onClick={onClick}>
        <img src={speaker.photoUrl} alt={speaker.name} className="w-24 h-24 rounded-full mx-auto" />
        <h3 className="mt-2 font-bold text-brand-primary">{speaker.name}</h3>
        <p className="text-sm text-brand-secondary">{speaker.title}</p>
    </div>
);

const SpeakerDetail: React.FC<{ speaker: Speaker; onClose: () => void; agendaSessions: AgendaSession[] }> = ({ speaker, onClose, agendaSessions }) => {
    const speakerSessions = agendaSessions.filter(s => s.speakerIds.includes(speaker.id));

    return (
        <Modal title={speaker.name} onClose={onClose}>
            <div className="p-4 text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
                    <img src={speaker.photoUrl} alt={speaker.name} className="w-32 h-32 rounded-full mb-4 sm:mb-0 sm:mr-6" />
                    <div>
                        <h2 className="text-2xl font-bold text-brand-primary">{speaker.name}</h2>
                        <p className="text-lg text-brand-secondary">{speaker.title} en {speaker.company}</p>
                         <div className="flex justify-center sm:justify-start space-x-4 mt-2">
                            {speaker.social.linkedin && <a href={speaker.social.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>}
                            {speaker.social.twitter && <a href={speaker.social.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Twitter</a>}
                        </div>
                    </div>
                </div>
                <p className="text-gray-700 my-4">{speaker.bio}</p>
                
                <h3 className="text-xl font-bold text-brand-primary mt-6 mb-2">Conferencias</h3>
                <div className="space-y-2">
                    {speakerSessions.map(session => (
                        <div key={session.id} className="bg-gray-100 p-3 rounded-md">
                            <p className="font-semibold">{session.title}</p>
                            <p className="text-sm text-gray-500">{session.day} | {session.startTime} - {session.endTime} | {session.room}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export const SpeakersView: React.FC<SpeakersViewProps> = ({ speakers, agendaSessions }) => {
  const [selectedSpeaker, setSelectedSpeaker] = useState<Speaker | null>(null);

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {speakers.map(speaker => (
          <SpeakerCard key={speaker.id} speaker={speaker} onClick={() => setSelectedSpeaker(speaker)} />
        ))}
      </div>
      {selectedSpeaker && <SpeakerDetail speaker={selectedSpeaker} onClose={() => setSelectedSpeaker(null)} agendaSessions={agendaSessions} />}
    </div>
  );
};