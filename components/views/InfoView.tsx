import React, { useState } from 'react';
import { ChevronDownIcon } from '../Icons';

const FaqItem: React.FC<{ question: string; children: React.ReactNode }> = ({ question, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left p-4">
                <span className="font-semibold text-brand-primary">{question}</span>
                <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}><ChevronDownIcon /></span>
            </button>
            {isOpen && <div className="p-4 bg-gray-50 text-gray-700">{children}</div>}
        </div>
    );
};

export const InfoView: React.FC = () => {
    return (
        <div className="p-4 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-brand-primary mb-2">Horarios del Evento</h2>
                <p className="text-gray-600">Registro: 08:00 - 09:00</p>
                <p className="text-gray-600">Conferencias: 09:00 - 18:00</p>
                <p className="text-gray-600">Área de Expositores: 09:00 - 19:00</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-brand-primary mb-2">Ubicación</h2>
                <p className="text-gray-600">Cintermex</p>
                <p className="text-gray-600">Av. Fundidora No. 501, Col. Obrera, Monterrey, Nuevo León, México, C.P. 64010</p>
                <div className="mt-4">
                    <iframe
                        src="https://maps.google.com/maps?q=Cintermex%20Monterrey&t=&z=15&ie=UTF8&iwloc=&output=embed"
                        width="100%"
                        height="250"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        className="rounded-md"
                    ></iframe>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-brand-primary p-4">Preguntas Frecuentes (FAQ)</h2>
                <FaqItem question="¿Hay Wi-Fi disponible?">
                    No hay redes wifi públicas disponibles.
                </FaqItem>
                <FaqItem question="¿Dónde puedo recoger mi acreditación?">
                    Esta se les enviará a su número y correo proporcionado en el momento de su inscripción.
                </FaqItem>
                <FaqItem question="¿Habrá opciones de comida?">
                    Sí, hay una zona de comidas con varias opciones disponibles para almuerzo y snacks durante todo el día.
                </FaqItem>
            </div>
        </div>
    );
};
