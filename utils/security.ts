type SecureTokenPayload = Record<string, unknown> & {
    _ts?: number;
};

type LegacySecureToken = {
    payload: SecureTokenPayload;
    signature: string;
};

type EncryptedSecureToken = {
    version: 2;
    iv: string;
    encrypted: string;
    signature: string;
};

type SecureToken = LegacySecureToken | EncryptedSecureToken;

const SECURE_TOKEN_VERSION = 2;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let hmacKeyPromise: Promise<CryptoKey> | null = null;
let encryptionKeyPromise: Promise<CryptoKey> | null = null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isLegacySecureToken = (value: unknown): value is LegacySecureToken =>
    isRecord(value) &&
    isRecord(value.payload) &&
    typeof value.signature === 'string';

const isEncryptedSecureToken = (value: unknown): value is EncryptedSecureToken =>
    isRecord(value) &&
    value.version === SECURE_TOKEN_VERSION &&
    typeof value.iv === 'string' &&
    typeof value.encrypted === 'string' &&
    typeof value.signature === 'string';

const getSecretKey = (): string => {
    const secretKey = import.meta.env.VITE_HMAC_SECRET?.trim();

    if (!secretKey) {
        throw new Error(
            'Missing VITE_HMAC_SECRET environment variable. Create .env.local and set VITE_HMAC_SECRET.'
        );
    }

    return secretKey;
};

const getEncryptionSecret = (): string => {
    const encryptionSecret = import.meta.env.VITE_ENCRYPTION_KEY?.trim();

    if (!encryptionSecret) {
        throw new Error(
            'Missing VITE_ENCRYPTION_KEY environment variable. Create .env.local and set VITE_ENCRYPTION_KEY.'
        );
    }

    return encryptionSecret;
};

const toHex = (buffer: ArrayBuffer): string =>
    Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');

const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';

    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary);
};

const base64ToBytes = (value: string): Uint8Array => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
};

const fromHex = (hex: string): Uint8Array | null => {
    const bytes = hex.match(/.{1,2}/g);

    if (!bytes) {
        return null;
    }

    return new Uint8Array(bytes.map((byte) => Number.parseInt(byte, 16)));
};

const createEncryptedSignaturePayload = (token: Pick<EncryptedSecureToken, 'version' | 'iv' | 'encrypted'>): string =>
    JSON.stringify({
        version: token.version,
        iv: token.iv,
        encrypted: token.encrypted
    });

const getHmacKey = (): Promise<CryptoKey> => {
    if (!hmacKeyPromise) {
        hmacKeyPromise = crypto.subtle.importKey(
            'raw',
            textEncoder.encode(getSecretKey()),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign', 'verify']
        );
    }

    return hmacKeyPromise;
};

const getEncryptionKey = (): Promise<CryptoKey> => {
    if (!encryptionKeyPromise) {
        encryptionKeyPromise = crypto.subtle
            .digest('SHA-256', textEncoder.encode(getEncryptionSecret()))
            .then((digest) =>
                crypto.subtle.importKey(
                    'raw',
                    digest,
                    { name: 'AES-GCM' },
                    false,
                    ['encrypt', 'decrypt']
                )
            );
    }

    return encryptionKeyPromise;
};

const signString = async (value: string): Promise<string> => {
    const key = await getHmacKey();
    const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(value));

    return toHex(signature);
};

const verifySignature = async (value: string, signature: string): Promise<boolean> => {
    const signatureBytes = fromHex(signature);

    if (!signatureBytes) {
        return false;
    }

    const key = await getHmacKey();

    return crypto.subtle.verify('HMAC', key, signatureBytes, textEncoder.encode(value));
};

const parseSecureToken = (token: string | unknown): SecureToken | null => {
    if (typeof token !== 'string') {
        if (isLegacySecureToken(token) || isEncryptedSecureToken(token)) {
            return token;
        }

        return null;
    }

    try {
        const parsedToken = JSON.parse(atob(token)) as unknown;

        if (isLegacySecureToken(parsedToken) || isEncryptedSecureToken(parsedToken)) {
            return parsedToken;
        }
    } catch {
        // Fall through to plain JSON parsing.
    }

    try {
        const parsedToken = JSON.parse(token) as unknown;

        if (isLegacySecureToken(parsedToken) || isEncryptedSecureToken(parsedToken)) {
            return parsedToken;
        }
    } catch {
        return null;
    }

    return null;
};

export const isSecureTokenLike = (token: string | unknown): boolean =>
    parseSecureToken(token) !== null;

export const generateSecureToken = async (data: SecureTokenPayload): Promise<string> => {
    const payload = { ...data, _ts: Date.now() };
    const payloadString = JSON.stringify(payload);
    const encryptionKey = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        textEncoder.encode(payloadString)
    );

    const tokenPayload: EncryptedSecureToken = {
        version: SECURE_TOKEN_VERSION,
        iv: bytesToBase64(iv),
        encrypted: bytesToBase64(new Uint8Array(encrypted)),
        signature: ''
    };

    tokenPayload.signature = await signString(createEncryptedSignaturePayload(tokenPayload));

    const jsonString = JSON.stringify(tokenPayload);

    return btoa(jsonString);
};

export const verifySecureToken = async (token: string | SecureToken): Promise<SecureTokenPayload | null> => {
    try {
        const tokenObj = parseSecureToken(token);

        if (!tokenObj) {
            return null;
        }

        if (isLegacySecureToken(tokenObj)) {
            const payloadString = JSON.stringify(tokenObj.payload);
            const isValid = await verifySignature(payloadString, tokenObj.signature);

            return isValid ? tokenObj.payload : null;
        }

        const isValid = await verifySignature(
            createEncryptedSignaturePayload(tokenObj),
            tokenObj.signature
        );

        if (!isValid) {
            return null;
        }

        const encryptionKey = await getEncryptionKey();
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: base64ToBytes(tokenObj.iv) },
            encryptionKey,
            base64ToBytes(tokenObj.encrypted)
        );

        return JSON.parse(textDecoder.decode(decrypted)) as SecureTokenPayload;
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
};
