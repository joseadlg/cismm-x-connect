import fs from 'fs';
import { parseVCard } from './utils/vcardParser.ts'; // Cannot import TS easily natively, let's just copy the logic

const vcardStr = `BEGIN:VCARD
VERSION:3.0
N:Aguilar De la Garza;Jose Carlos
FN:Jose Carlos Aguilar De la Garza
TITLE:Audiovisual
ORG:Universidad Kirei
URL:www.kirei.edu.mx
EMAIL;TYPE=INTERNET:jose.aguilar@universidadkirei.edu.mx
TEL;TYPE=voice,work,pref:8187782883
TEL;TYPE=voice,home,pref:8187782883
END:VCARD`;

const parseSim = (vcardStr) => {
    const lines = vcardStr.split(/\r?\n/);
    const result = {};

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
            line += lines[i + 1].substring(1);
            i++;
        }

        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const fullKey = line.substring(0, colonIndex).toUpperCase();
        const value = line.substring(colonIndex + 1).trim();
        const key = fullKey.split(';')[0];

        switch (key) {
            case 'FN': result.name = value; break;
            case 'ORG': result.company = value; break;
            case 'TITLE': result.title = value; break;
            case 'EMAIL': result.email = value; break;
            case 'TEL': if (!result.phone) result.phone = value; break;
            case 'UID': result.id = value.replace('urn:uuid:', ''); break;
        }
    }
    return result;
};

const vcard = parseSim(vcardStr);
console.log('Parsed vCard:', vcard);

const contactData = {
    id: vcard.id || vcard.email || vcard.name,
    name: vcard.name || "Asistente " + (vcard.email || "Desconocido")
};
console.log('Mapped contactData:', contactData);

const rawUserId = contactData.id || contactData.exhibitorId || contactData.email;
const userId = String(rawUserId).replace(/\s+/g, '').trim();
const userName = contactData.name || "Asistente " + userId;

console.log('Final userId:', userId);
console.log('Final userName:', userName);

const autoEmail = userId.includes('@')
    ? userId.toLowerCase()
    : `${userId.toLowerCase()}@asistente.cismm.com`;

const autoPassword = `cismm-${userId}-secret`;
console.log('Supabase Email:', autoEmail);
console.log('Supabase Password:', autoPassword);
