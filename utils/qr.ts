import { isSecureTokenLike, verifySecureToken } from './security';
import { normalizeAttendeeCategory } from './attendeeCategory';
import { parseVCard } from './vcardParser';

type ParsedQrData = Record<string, unknown>;

type ParsedQrResult =
    | { ok: true; data: ParsedQrData; source: 'vcard' | 'json' | 'secure-token' }
    | { ok: false; reason: 'invalid_format' | 'invalid_security' };

const isRecord = (value: unknown): value is ParsedQrData =>
    typeof value === 'object' && value !== null;

const parseJsonCandidate = (value: string): unknown | null => {
    try {
        return JSON.parse(value);
    } catch {
        try {
            return JSON.parse(atob(value));
        } catch {
            return null;
        }
    }
};

export const parseQrData = async (decodedText: string): Promise<ParsedQrResult> => {
    const vcard = parseVCard(decodedText);

    if (vcard) {
        return {
            ok: true,
            source: 'vcard',
            data: {
                id: vcard.id || vcard.email || vcard.name,
                name: vcard.name || `Asistente ${vcard.email || 'Desconocido'}`,
                company: vcard.company || '',
                title: vcard.title || '',
                email: vcard.email || '',
                phone: vcard.phone || '',
                attendeeCategory: normalizeAttendeeCategory(vcard.attendeeCategory)
            }
        };
    }

    const parsedCandidate = parseJsonCandidate(decodedText);
    const secureTokenCandidate = parsedCandidate ?? decodedText;

    if (isSecureTokenLike(secureTokenCandidate)) {
        const payload = await verifySecureToken(secureTokenCandidate);

        if (!payload) {
            return { ok: false, reason: 'invalid_security' };
        }

        return {
            ok: true,
            source: 'secure-token',
            data: payload
        };
    }

    if (isRecord(parsedCandidate)) {
        return {
            ok: true,
            source: 'json',
            data: parsedCandidate
        };
    }

    return { ok: false, reason: 'invalid_format' };
};
