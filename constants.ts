
import { Speaker, Exhibitor, AgendaSession, UserProfile, DemoSession, LeaderboardEntry } from './types';

export const SPEAKERS: Speaker[] = [
  { id: 1, name: 'Dra. Ana Torres', photoUrl: 'https://picsum.photos/id/1027/200/200', title: 'Dermatóloga Estética', company: 'Clínica Dermavanza', bio: 'Experta en técnicas de rejuvenecimiento facial no invasivas con más de 15 años de experiencia.', social: { linkedin: '#' } },
  { id: 2, name: 'Marcos Vega', photoUrl: 'https://picsum.photos/id/1005/200/200', title: 'Micropigmentador Profesional', company: 'Pigment Art Studio', bio: 'Reconocido internacionalmente por su técnica hiperrealista en cejas y labios.', social: { twitter: '#' } },
  { id: 3, name: 'Sofía Reyes', photoUrl: 'https://picsum.photos/id/1011/200/200', title: 'CEO y Fundadora', company: 'Spa Harmony Tech', bio: 'Innovadora en la aplicación de tecnología para la gestión y experiencia en spas de lujo.', social: { linkedin: '#', twitter: '#' } },
];

export const EXHIBITORS: Exhibitor[] = [
  { id: 1, name: 'Beauty Lasers Inc.', logoUrl: 'https://picsum.photos/seed/laser/200/100', description: 'Líderes en aparatología láser para tratamientos estéticos.', contact: 'info@beautylasers.com', website: '#', standNumber: 'A12', category: 'Aparatología' },
  { id: 2, name: 'MicroInk Pro', logoUrl: 'https://picsum.photos/seed/ink/200/100', description: 'Pigmentos y equipos de alta calidad para micropigmentación.', contact: 'sales@microink.com', website: '#', standNumber: 'B05', category: 'Micropigmentación' },
  { id: 3, name: 'SkinCare Solutions', logoUrl: 'https://picsum.photos/seed/skin/200/100', description: 'Cosmética profesional formulada con ingredientes activos de última generación.', contact: 'contact@skincare.com', website: '#', standNumber: 'C01', category: 'Cosmética' },
];

export const AGENDA_SESSIONS: AgendaSession[] = [
  // Viernes
  { id: 1, title: 'Últimas Tendencias en Rellenos Dérmicos', speakerIds: [1], startTime: '09:00', endTime: '10:00', room: 'Sala Principal A', description: 'Un análisis profundo de los nuevos materiales y técnicas de aplicación para resultados naturales y duraderos.', day: 'Viernes', track: 'Medicina Estética' },
  { id: 8, title: 'Innovación en Rituales de Bienestar', speakerIds: [3], startTime: '09:00', endTime: '10:00', room: 'Sala Principal B', description: 'Descubre las últimas tendencias en experiencias de spa que combinan tecnología y tradición para un bienestar integral.', day: 'Viernes', track: 'Spa' },
  { id: 2, title: 'El Arte de la Simetría en Micropigmentación', speakerIds: [2], startTime: '09:00', endTime: '10:00', room: 'Sala Principal C', description: 'Técnicas avanzadas para lograr una simetría perfecta en cejas, ojos y labios, corrigiendo asimetrías faciales.', day: 'Viernes', track: 'PMU' },
  { id: 9, title: 'Coffee Break & Networking', speakerIds: [], startTime: '10:00', endTime: '10:30', room: 'Área Común', description: 'Disfruta de un café y conecta con otros profesionales del sector.', day: 'Viernes' },
  { id: 10, title: 'Taller: Pigmentología Aplicada', speakerIds: [2], startTime: '10:30', endTime: '11:30', room: 'Sala Principal C', description: 'Un taller práctico sobre la correcta elección y mezcla de pigmentos para diferentes fototipos de piel.', day: 'Viernes', track: 'PMU' },
  { id: 11, title: 'Mesa Redonda: Sinergia Médico-Estética', speakerIds: [1, 3], startTime: '10:30', endTime: '11:30', room: 'Sala Principal A', description: 'Debate sobre cómo la colaboración entre dermatólogos y esteticistas puede potenciar los resultados para el paciente.', day: 'Viernes', track: 'Medicina Estética' },

  // Sábado
  { id: 3, title: 'Digitalizando la Experiencia del Cliente en Spas', speakerIds: [3], startTime: '11:30', endTime: '12:30', room: 'Sala Tech', description: 'Cómo implementar software y herramientas digitales para mejorar la gestión, fidelización y satisfacción del cliente.', day: 'Sábado' },
  { id: 4, title: 'Panel: El Futuro de la Medicina Estética', speakerIds: [1, 3], startTime: '14:00', endTime: '15:00', room: 'Sala Principal', description: 'Un debate entre expertos sobre las tecnologías y tratamientos que marcarán la próxima década en el sector.', day: 'Sábado' },
  { id: 5, title: 'Taller Práctico: Marketing Digital para Clínicas', speakerIds: [3], startTime: '16:00', endTime: '17:30', room: 'Sala Tech', description: 'Estrategias y herramientas clave para atraer y retener pacientes en el entorno digital.', day: 'Sábado' },

  // Domingo
  { id: 6, title: 'Manejo de Complicaciones en Procedimientos Estéticos', speakerIds: [1], startTime: '09:30', endTime: '10:30', room: 'Sala Principal', description: 'Protocolos de actuación y prevención de efectos adversos en los tratamientos más comunes.', day: 'Domingo' },
  { id: 7, title: 'Masterclass: Colorimetría Avanzada en Micropigmentación', speakerIds: [2], startTime: '11:00', endTime: '12:30', room: 'Sala Micra', description: 'Profundiza en la teoría del color para la selección perfecta de pigmentos y corrección de trabajos anteriores.', day: 'Domingo' },
];

export const DEMO_SESSIONS: DemoSession[] = [
  { id: 1, title: 'Demostración Láser CO2 Fraccionado', exhibitorId: 1, time: '11:00', description: 'Vea en vivo el poder de nuestro nuevo equipo para resurfacing facial.' },
  { id: 2, title: 'Técnica de Powder Brows en Vivo', exhibitorId: 2, time: '15:00', description: 'Aplicación de la técnica de cejas con efecto polvo por un artista invitado.' },
];

export const CURRENT_USER: UserProfile = {
  id: 'user_12345',
  name: 'Carlos Gómez',
  title: 'Director de Spa',
  company: 'Oasis Wellness Center',
  photoUrl: 'https://picsum.photos/id/237/200/200',
  interests: ['Aparatología', 'Gestión de Spas', 'Cosmética'],
  isAdmin: true,
  role: 'admin',
  track: 'Spa',
};

export const ALL_ATTENDEES: UserProfile[] = [
  CURRENT_USER,
  { id: 'user_678', name: 'Laura Méndez', title: 'Esteticista', company: 'Belleza Integral', photoUrl: 'https://picsum.photos/id/238/200/200', interests: ['Cosmética', 'Micropigmentación'], track: 'PMU', role: 'attendee' },
  { id: 'user_910', name: 'Pedro Jiménez', title: 'Gerente de Compras', company: 'Medical Supplies Corp', photoUrl: 'https://picsum.photos/id/239/200/200', interests: ['Aparatología', 'Software'], track: 'Medicina Estética', role: 'attendee' },
];

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { rank: 1, name: 'Laura Méndez', points: 1250, photoUrl: 'https://picsum.photos/id/238/200/200' },
  { rank: 2, name: 'Pedro Jiménez', points: 1100, photoUrl: 'https://picsum.photos/id/239/200/200' },
  { rank: 3, name: 'Carlos Gómez', points: 950, photoUrl: 'https://picsum.photos/id/237/200/200' },
  { rank: 4, name: 'Ana Ruiz', points: 800, photoUrl: 'https://picsum.photos/id/240/200/200' },
  { rank: 5, name: 'Javier Solís', points: 720, photoUrl: 'https://picsum.photos/id/241/200/200' },
];
