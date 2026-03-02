export interface ParsedVCard {
    id?: string;
    name?: string;
    company?: string;
    title?: string;
    email?: string;
    phone?: string;
}

export const parseVCard = (vcardStr: string): ParsedVCard | null => {
    if (!vcardStr || !vcardStr.toUpperCase().includes('BEGIN:VCARD')) {
        return null;
    }

    const lines = vcardStr.split(/\r?\n/);
    const result: ParsedVCard = {};

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Handle unfolding
        while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
            line += lines[i + 1].substring(1);
            i++;
        }

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const fullKey = line.substring(0, colonIndex).toUpperCase();
        const value = line.substring(colonIndex + 1).trim();

        // Extract base key (ignore properties like ;TYPE=INTERNET)
        const key = fullKey.split(';')[0];

        switch (key) {
            case 'FN':
                result.name = value;
                break;
            case 'ORG':
                result.company = value;
                break;
            case 'TITLE':
                result.title = value;
                break;
            case 'EMAIL':
                result.email = value;
                break;
            case 'TEL':
                if (!result.phone) result.phone = value; // Keep first phone number
                break;
            case 'UID':
                result.id = value.replace('urn:uuid:', '');
                break;
            default:
                break;
        }
    }

    // If no name is provided, try to construct one from the 'N' property if we want,
    // but usually FN is present.

    // If we couldn't find an ID but we have an email, use the email as a fallback ID
    // or generate a deterministic one. We'll simply let caller handle missing IDs.

    return Object.keys(result).length > 0 ? result : null;
};
