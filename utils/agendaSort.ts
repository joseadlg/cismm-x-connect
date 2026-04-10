import { AgendaSession } from '../types';

const DAY_ORDER: Record<AgendaSession['day'], number> = {
    Viernes: 0,
    Sábado: 1,
    Domingo: 2,
};

const toMinutes = (value?: string | null) => {
    if (!value || typeof value !== 'string') {
        return Number.MAX_SAFE_INTEGER;
    }

    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);

    if (!match) {
        return Number.MAX_SAFE_INTEGER;
    }

    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);

    return hours * 60 + minutes;
};

export const compareAgendaSessions = (a: AgendaSession, b: AgendaSession) => {
    const dayComparison = DAY_ORDER[a.day] - DAY_ORDER[b.day];

    if (dayComparison !== 0) {
        return dayComparison;
    }

    const startComparison = toMinutes(a.startTime) - toMinutes(b.startTime);

    if (startComparison !== 0) {
        return startComparison;
    }

    const endComparison = toMinutes(a.endTime) - toMinutes(b.endTime);

    if (endComparison !== 0) {
        return endComparison;
    }

    return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
};

export const sortAgendaSessions = (sessions: AgendaSession[]) =>
    [...sessions].sort(compareAgendaSessions);
