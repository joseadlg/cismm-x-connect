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
                <p className="text-gray-600">Centro de Convenciones Metropolitano</p>
                <p className="text-gray-600">Av. Principal 123, Ciudad Capital</p>
                 <div className="mt-4">
                    <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3153.086399999676!2d-122.4194156846814!3d37.77492957975904!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8085808c1b8f7e7b%3A0x1d5f2a1a2b2e8e!2sSan%20Francisco%20City%20Hall!5e0!3m2!1sen!2sus!4v1616000000000!5m2!1sen!2sus" 
                        width="100%" 
                        height="250" 
                        style={{border:0}} 
                        allowFullScreen={false} 
                        loading="lazy"
                        className="rounded-md"
                    ></iframe>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-md">
                 <h2 className="text-xl font-bold text-brand-primary p-4">Preguntas Frecuentes (FAQ)</h2>
                <FaqItem question="¿Hay Wi-Fi disponible?">
                    Sí, la red es "CISMM_X_WIFI" y la contraseña es "connect2024".
                </FaqItem>
                <FaqItem question="¿Dónde puedo recoger mi acreditación?">
                    En el mostrador de registro, ubicado en la entrada principal del centro de convenciones.
                </FaqItem>
                <FaqItem question="¿Habrá opciones de comida?">
                    Sí, hay una zona de restauración con varias opciones disponibles para almuerzo y snacks durante todo el día.
                </FaqItem>
            </div>
        </div>
    );
};
