import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

export type PublicImageBucket = 'avatars' | 'speakers' | 'exhibitors';

const STORAGE_PUBLIC_PREFIX = '/storage/v1/object/public/';

const bucketConfig: Record<PublicImageBucket, {
    maxSizeMB: number;
    maxWidthOrHeight: number;
    acceptedMimeTypes: string[];
    preferredFormat: 'image/webp' | null;
}> = {
    avatars: {
        maxSizeMB: 0.12,
        maxWidthOrHeight: 512,
        acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        preferredFormat: 'image/webp',
    },
    speakers: {
        maxSizeMB: 0.15,
        maxWidthOrHeight: 640,
        acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        preferredFormat: 'image/webp',
    },
    exhibitors: {
        maxSizeMB: 0.08,
        maxWidthOrHeight: 1200,
        acceptedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        preferredFormat: 'image/webp',
    },
};

const sanitizeStorageSegment = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'asset';

const getFileExtension = (mimeType: string) => {
    if (mimeType === 'image/svg+xml') return 'svg';
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
};

const buildStorageObjectPath = (entityKey: string, fileSlug: string, mimeType: string) =>
    `${sanitizeStorageSegment(entityKey)}/${Date.now()}-${sanitizeStorageSegment(fileSlug)}.${getFileExtension(mimeType)}`;

export const getAcceptedImageTypes = (bucket: PublicImageBucket) => bucketConfig[bucket].acceptedMimeTypes.join(',');

export const getImageUploadHint = (bucket: PublicImageBucket) => {
    if (bucket === 'avatars') return 'Se optimiza a 512px y ~120 KB.';
    if (bucket === 'speakers') return 'Se optimiza a 640px y ~150 KB.';
    return 'SVG ideal; si es raster se optimiza a 1200px y ~80 KB.';
};

const compressImageForBucket = async (bucket: PublicImageBucket, file: File) => {
    const config = bucketConfig[bucket];

    if (!config.acceptedMimeTypes.includes(file.type)) {
        throw new Error('Formato de imagen no permitido para este tipo de archivo.');
    }

    if (file.type === 'image/svg+xml') {
        return file;
    }

    const compressed = await imageCompression(file, {
        maxSizeMB: config.maxSizeMB,
        maxWidthOrHeight: config.maxWidthOrHeight,
        useWebWorker: true,
        initialQuality: 0.82,
        fileType: config.preferredFormat ?? file.type,
    });

    const nextMimeType = compressed.type || config.preferredFormat || file.type;
    const fileName = `${sanitizeStorageSegment(file.name.replace(/\.[^.]+$/, ''))}.${getFileExtension(nextMimeType)}`;

    return new File([compressed], fileName, {
        type: nextMimeType,
        lastModified: Date.now(),
    });
};

const extractStoragePathFromPublicUrl = (bucket: PublicImageBucket, publicUrl?: string | null) => {
    if (!publicUrl) return null;

    try {
        const parsedUrl = new URL(publicUrl);
        const bucketPrefix = `${STORAGE_PUBLIC_PREFIX}${bucket}/`;
        const pathIndex = parsedUrl.pathname.indexOf(bucketPrefix);

        if (pathIndex === -1) return null;

        return decodeURIComponent(parsedUrl.pathname.slice(pathIndex + bucketPrefix.length));
    } catch {
        return null;
    }
};

export const uploadPublicImage = async ({
    bucket,
    file,
    entityKey,
    fileSlug,
}: {
    bucket: PublicImageBucket;
    file: File;
    entityKey: string;
    fileSlug: string;
}) => {
    const processedFile = await compressImageForBucket(bucket, file);
    const objectPath = buildStorageObjectPath(entityKey, fileSlug, processedFile.type);

    const { error } = await supabase.storage.from(bucket).upload(objectPath, processedFile, {
        cacheControl: '31536000',
        upsert: false,
        contentType: processedFile.type,
    });

    if (error) {
        throw new Error('Error al subir la imagen: ' + error.message);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return {
        publicUrl: data.publicUrl,
        objectPath,
    };
};

export const removePublicImage = async ({
    bucket,
    publicUrl,
}: {
    bucket: PublicImageBucket;
    publicUrl?: string | null;
}) => {
    const objectPath = extractStoragePathFromPublicUrl(bucket, publicUrl);

    if (!objectPath) {
        return;
    }

    const { error } = await supabase.storage.from(bucket).remove([objectPath]);

    if (error) {
        console.warn(`No se pudo eliminar el archivo anterior de ${bucket}:`, error.message);
    }
};
