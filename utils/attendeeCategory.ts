export type AttendeeCategory = 'general' | 'vip' | 'juez';

const CATEGORY_LABELS: Record<AttendeeCategory, string> = {
    general: 'General',
    vip: 'VIP',
    juez: 'Juez',
};

export const normalizeAttendeeCategory = (value: unknown): AttendeeCategory => {
    if (typeof value !== 'string') {
        return 'general';
    }

    const normalizedValue = value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    if (normalizedValue === 'vip') {
        return 'vip';
    }

    if (normalizedValue === 'juez' || normalizedValue === 'judge') {
        return 'juez';
    }

    return 'general';
};

export const resolveAttendeeCategory = (payload: Record<string, unknown>) => {
    const candidateKeys = [
        'attendeeCategory',
        'attendee_category',
        'category',
        'userType',
        'user_type',
        'badgeType',
        'badge_type',
        'segment',
        'role',
    ];

    for (const key of candidateKeys) {
        const candidate = payload[key];
        const normalizedCategory = normalizeAttendeeCategory(candidate);

        if (normalizedCategory !== 'general' || candidate === 'general') {
            return normalizedCategory;
        }
    }

    return 'general';
};

export const getAttendeeCategoryLabel = (category?: string | null) =>
    CATEGORY_LABELS[normalizeAttendeeCategory(category)];
