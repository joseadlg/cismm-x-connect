export interface ParsedVCard {
    id?: string;
    name?: string;
    company?: string;
    title?: string;
    email?: string;
    phone?: string;
    attendeeCategory?: string;
}

const unwrapVCardLines = (vcardStr: string) => {
    const rawLines = vcardStr.split(/\r?\n/);
    const lines: string[] = [];

    for (const rawLine of rawLines) {
        if (!lines.length) {
            lines.push(rawLine);
            continue;
        }

        if (rawLine.startsWith(' ') || rawLine.startsWith('\t')) {
            lines[lines.length - 1] += rawLine.substring(1);
            continue;
        }

        if (lines[lines.length - 1].endsWith('=')) {
            lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}${rawLine}`;
            continue;
        }

        lines.push(rawLine);
    }

    return lines;
};

const decodeQuotedPrintable = (value: string) => {
    const bytes: number[] = [];
    const normalizedValue = value.replace(/=\r?\n/g, '');
    const encoder = new TextEncoder();

    for (let index = 0; index < normalizedValue.length; index++) {
        const currentCharacter = normalizedValue[index];
        const maybeHexPair = normalizedValue.slice(index + 1, index + 3);

        if (currentCharacter === '=' && /^[A-F0-9]{2}$/i.test(maybeHexPair)) {
            bytes.push(parseInt(maybeHexPair, 16));
            index += 2;
            continue;
        }

        bytes.push(...encoder.encode(currentCharacter));
    }

    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
};

const decodeVCardValue = (fullKey: string, value: string) => {
    const decodedValue = /ENCODING=QUOTED-PRINTABLE/i.test(fullKey)
        ? decodeQuotedPrintable(value)
        : value;

    return decodedValue
        .replace(/\\n/gi, '\n')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
        .trim();
};

const normalizePropertyKey = (fullKey: string) =>
    fullKey
        .split(';')[0]
        .split('.')
        .pop()
        ?.toUpperCase() ?? '';

const buildNameFromStructuredValue = (value: string) => {
    const [lastName, firstName, middleName, honorificPrefix, honorificSuffix] = value
        .split(';')
        .map(part => part.trim())
        .filter(Boolean);

    return [honorificPrefix, firstName, middleName, lastName, honorificSuffix]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const extractPotentialBadgeId = (value: string) => {
    const candidateTokens = value
        .toUpperCase()
        .split(/[\s,;|]+/)
        .map(token => token.trim())
        .filter(Boolean);

    for (const token of candidateTokens) {
        const compactToken = token.replace(/[^A-Z0-9-]/g, '');

        if (compactToken.length < 4 || compactToken.length > 18) {
            continue;
        }

        if (!/[A-Z]/.test(compactToken) || !/\d/.test(compactToken)) {
            continue;
        }

        return compactToken;
    }

    return undefined;
};

const extractCategoryFromFreeText = (value: string) => {
    const normalizedValue = value.toLowerCase();

    if (normalizedValue.includes('vip')) {
        return 'vip';
    }

    if (normalizedValue.includes('juez') || normalizedValue.includes('judge')) {
        return 'juez';
    }

    if (normalizedValue.includes('general')) {
        return 'general';
    }

    return undefined;
};

export const parseVCard = (vcardStr: string): ParsedVCard | null => {
    if (!vcardStr || !vcardStr.toUpperCase().includes('BEGIN:VCARD')) {
        return null;
    }

    const lines = unwrapVCardLines(vcardStr);
    const result: ParsedVCard = {};

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const rawKey = line.substring(0, colonIndex);
        const fullKey = rawKey.toUpperCase();
        const value = decodeVCardValue(fullKey, line.substring(colonIndex + 1));
        const key = normalizePropertyKey(fullKey);

        switch (key) {
            case 'FN':
                result.name = value;
                break;
            case 'N':
                if (!result.name) {
                    result.name = buildNameFromStructuredValue(value);
                }
                break;
            case 'ORG':
                result.company = value.split(';').filter(Boolean).join(' ');
                break;
            case 'TITLE':
                result.title = value;
                break;
            case 'EMAIL':
                if (!result.email) {
                    result.email = value;
                }
                break;
            case 'TEL':
                if (!result.phone) {
                    result.phone = value;
                }
                break;
            case 'UID':
            case 'X-CISMM-ID':
            case 'X-UID':
                if (!result.id) {
                    result.id = value.replace(/^urn:uuid:/i, '');
                }
                break;
            case 'CATEGORIES':
            case 'CATEGORY':
            case 'X-CISMM-CATEGORY':
            case 'X-ATTENDEE-CATEGORY':
                if (!result.attendeeCategory) {
                    result.attendeeCategory = value.split(',')[0]?.trim();
                }
                break;
            case 'NOTE':
                if (!result.id) {
                    result.id = extractPotentialBadgeId(value);
                }
                if (!result.attendeeCategory) {
                    result.attendeeCategory = extractCategoryFromFreeText(value);
                }
                break;
            default:
                break;
        }
    }

    return Object.keys(result).length > 0 ? result : null;
};
