import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envMatches = {
    url: envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1],
    key: envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]
};

const supabase = createClient(envMatches.url, envMatches.key);

const SPEAKERS = [
    { id: 1, name: 'Dra. Ana Torres', photo_url: 'https://picsum.photos/id/1027/200/200', title: 'Dermatóloga Estética', company: 'Clínica Dermavanza', bio: 'Experta en técnicas de rejuvenecimiento facial no invasivas con más de 15 años de experiencia.', social_linkedin: '#' },
    { id: 2, name: 'Marcos Vega', photo_url: 'https://picsum.photos/id/1005/200/200', title: 'Micropigmentador Profesional', company: 'Pigment Art Studio', bio: 'Reconocido internacionalmente por su técnica hiperrealista en cejas y labios.', social_twitter: '#' },
    { id: 3, name: 'Sofía Reyes', photo_url: 'https://picsum.photos/id/1011/200/200', title: 'CEO y Fundadora', company: 'Spa Harmony Tech', bio: 'Innovadora en la aplicación de tecnología para la gestión y experiencia en spas de lujo.', social_linkedin: '#', social_twitter: '#' },
];

const EXHIBITOR_CATEGORIES = ['Aparatología', 'Micropigmentación', 'Cosmética', 'Software'];

const EXHIBITORS = [
    { id: 1, name: 'Beauty Lasers Inc.', logo_url: 'https://picsum.photos/seed/laser/200/100', description: 'Líderes en aparatología láser para tratamientos estéticos.', contact: 'info@beautylasers.com', website: '#', stand_number: 'A12', category_name: 'Aparatología' },
    { id: 2, name: 'MicroInk Pro', logo_url: 'https://picsum.photos/seed/ink/200/100', description: 'Pigmentos y equipos de alta calidad para micropigmentación.', contact: 'sales@microink.com', website: '#', stand_number: 'B05', category_name: 'Micropigmentación' },
    { id: 3, name: 'SkinCare Solutions', logo_url: 'https://picsum.photos/seed/skin/200/100', description: 'Cosmética profesional formulada con ingredientes activos de última generación.', contact: 'contact@skincare.com', website: '#', stand_number: 'C01', category_name: 'Cosmética' },
];

const AGENDA_SESSIONS = [
    { id: 1, title: 'Últimas Tendencias en Rellenos Dérmicos', speaker_ids: [1], start_time: '09:00', end_time: '10:00', room: 'Sala Principal A', description: 'Un análisis profundo de los nuevos materiales y técnicas de aplicación para resultados naturales y duraderos.', day: 'Viernes', track: 'Medicina Estética' },
    { id: 8, title: 'Innovación en Rituales de Bienestar', speaker_ids: [3], start_time: '09:00', end_time: '10:00', room: 'Sala Principal B', description: 'Descubre las últimas tendencias en experiencias de spa que combinan tecnología y tradición para un bienestar integral.', day: 'Viernes', track: 'Spa' },
    { id: 2, title: 'El Arte de la Simetría en Micropigmentación', speaker_ids: [2], start_time: '09:00', end_time: '10:00', room: 'Sala Principal C', description: 'Técnicas avanzadas para lograr una simetría perfecta en cejas, ojos y labios, corrigiendo asimetrías faciales.', day: 'Viernes', track: 'PMU' },
    { id: 9, title: 'Coffee Break & Networking', speaker_ids: [], start_time: '10:00', end_time: '10:30', room: 'Área Común', description: 'Disfruta de un café y conecta con otros profesionales del sector.', day: 'Viernes' },
    { id: 10, title: 'Taller: Pigmentología Aplicada', speaker_ids: [2], start_time: '10:30', end_time: '11:30', room: 'Sala Principal C', description: 'Un taller práctico sobre la correcta elección y mezcla de pigmentos para diferentes fototipos de piel.', day: 'Viernes', track: 'PMU' },
    { id: 11, title: 'Mesa Redonda: Sinergia Médico-Estética', speaker_ids: [1, 3], start_time: '10:30', end_time: '11:30', room: 'Sala Principal A', description: 'Debate sobre cómo la colaboración entre dermatólogos y esteticistas puede potenciar los resultados para el paciente.', day: 'Viernes', track: 'Medicina Estética' },
    { id: 3, title: 'Digitalizando la Experiencia del Cliente en Spas', speaker_ids: [3], start_time: '11:30', end_time: '12:30', room: 'Sala Tech', description: 'Cómo implementar software y herramientas digitales para mejorar la gestión, fidelización y satisfacción del cliente.', day: 'Sábado' },
    { id: 4, title: 'Panel: El Futuro de la Medicina Estética', speaker_ids: [1, 3], start_time: '14:00', end_time: '15:00', room: 'Sala Principal', description: 'Un debate entre expertos sobre las tecnologías y tratamientos que marcarán la próxima década en el sector.', day: 'Sábado' },
    { id: 5, title: 'Taller Práctico: Marketing Digital para Clínicas', speaker_ids: [3], start_time: '16:00', end_time: '17:30', room: 'Sala Tech', description: 'Estrategias y herramientas clave para atraer y retener pacientes en el entorno digital.', day: 'Sábado' },
    { id: 6, title: 'Manejo de Complicaciones en Procedimientos Estéticos', speaker_ids: [1], start_time: '09:30', end_time: '10:30', room: 'Sala Principal', description: 'Protocolos de actuación y prevención de efectos adversos en los tratamientos más comunes.', day: 'Domingo' },
    { id: 7, title: 'Masterclass: Colorimetría Avanzada en Micropigmentación', speaker_ids: [2], start_time: '11:00', end_time: '12:30', room: 'Sala Micra', description: 'Profundiza en la teoría del color para la selección perfecta de pigmentos y corrección de trabajos anteriores.', day: 'Domingo' },
];

const DEMO_SESSIONS = [
    { id: 1, title: 'Demostración Láser CO2 Fraccionado', exhibitor_id: 1, time: '11:00', description: 'Vea en vivo el poder de nuestro nuevo equipo para resurfacing facial.' },
    { id: 2, title: 'Técnica de Powder Brows en Vivo', exhibitor_id: 2, time: '15:00', description: 'Aplicación de la técnica de cejas con efecto polvo por un artista invitado.' },
];

async function seed() {
    console.log('Seeding Database...');

    // 1. Speakers
    for (const s of SPEAKERS) {
        const { error } = await supabase.from('speakers').upsert(s, { onConflict: 'id' });
        if (error) console.error('Error inserting Speaker:', error);
    }

    // 2. Exhibitor Categories
    const categoryIds = {};
    for (const c of EXHIBITOR_CATEGORIES) {
        const { data, error } = await supabase.from('exhibitor_categories').upsert({ name: c }, { onConflict: 'name' }).select().single();
        if (error) console.error('Error inserting Category:', error);
        else categoryIds[c] = data.id;
    }

    // 3. Exhibitors
    for (const e of EXHIBITORS) {
        const { category_name, ...rest } = e;
        rest.category_id = categoryIds[category_name];
        const { error } = await supabase.from('exhibitors').upsert(rest, { onConflict: 'id' });
        if (error) console.error('Error inserting Exhibitor:', error);
    }

    // 4. Agenda Sessions
    for (const a of AGENDA_SESSIONS) {
        const { speaker_ids, ...sessionData } = a;
        const { data: session, error } = await supabase.from('agenda_sessions').upsert(sessionData, { onConflict: 'id' }).select().single();
        if (error) {
            console.error('Error inserting Session:', error);
            continue;
        }
        // Session Speakers pivot
        for (const sid of speaker_ids) {
            const { error: ssError } = await supabase.from('session_speakers').upsert({ session_id: session.id, speaker_id: sid });
            if (ssError) console.error('Error inserting Session Speaker:', ssError);
        }
    }

    // 5. Demo Sessions
    for (const d of DEMO_SESSIONS) {
        const { error } = await supabase.from('demo_sessions').upsert(d, { onConflict: 'id' });
        if (error) console.error('Error inserting Demo Session:', error);
    }

    console.log('Seed completed successfully!');
}

seed().catch(console.error);
