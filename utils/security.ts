
const SECRET_KEY = 'CISMM_CONNECT_SECURE_KEY_2025';

export const generateSecureToken = async (data: any): Promise<string> => {
    const timestamp = Date.now();
    const payload = { ...data, _ts: timestamp };
    const payloadString = JSON.stringify(payload);

    const encoder = new TextEncoder();
    const keyData = encoder.encode(SECRET_KEY);
    const dataData = encoder.encode(payloadString);

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        dataData
    );

    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const jsonString = JSON.stringify({
        payload,
        signature: signatureHex
    });

    return btoa(jsonString);
};

export const verifySecureToken = async (token: string | any): Promise<any | null> => {
    try {
        let tokenObj;
        if (typeof token === 'string') {
            try {
                tokenObj = JSON.parse(atob(token));
            } catch {
                try {
                    tokenObj = JSON.parse(token);
                } catch {
                    return null;
                }
            }
        } else {
            tokenObj = token;
        }

        const { payload, signature } = tokenObj;

        if (!payload || !signature) return null;

        const payloadString = JSON.stringify(payload);
        const encoder = new TextEncoder();
        const keyData = encoder.encode(SECRET_KEY);
        const dataData = encoder.encode(payloadString);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signatureBytes = new Uint8Array(
            signature.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
        );

        const isValid = await crypto.subtle.verify(
            'HMAC',
            key,
            signatureBytes,
            dataData
        );

        return isValid ? payload : null;
    } catch (e) {
        console.error('Token verification failed:', e);
        return null;
    }
};
