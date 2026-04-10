import { Html5Qrcode, Html5QrcodeCameraScanConfig, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const QR_SCAN_FORMATS = [Html5QrcodeSupportedFormats.QR_CODE];

const buildVideoConstraints = (): MediaTrackConstraints => ({
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
});

export const createQrScanner = (elementId: string) =>
    new Html5Qrcode(elementId, {
        formatsToSupport: QR_SCAN_FORMATS,
        useBarCodeDetectorIfSupported: true,
        verbose: false,
    });

export const buildQrScanConfig = (mode: 'login' | 'general'): Html5QrcodeCameraScanConfig => ({
    fps: mode === 'login' ? 12 : 10,
    disableFlip: false,
    qrbox: (width, height) => {
        const minSide = Math.min(width, height);
        const desiredSize = Math.floor(minSide * (mode === 'login' ? 0.58 : 0.54));
        const maxSize = mode === 'login' ? 250 : 230;
        const clampedSize = Math.max(170, Math.min(desiredSize, maxSize, minSide - 28));

        return {
            width: clampedSize,
            height: clampedSize,
        };
    },
    videoConstraints: buildVideoConstraints(),
});

export const tuneQrScannerForDistance = async (scanner: Html5Qrcode) => {
    try {
        const settings = scanner.getRunningTrackSettings();
        const currentWidth = typeof settings.width === 'number' ? settings.width : 0;

        if (currentWidth > 0 && currentWidth < 1280) {
            await scanner.applyVideoConstraints(buildVideoConstraints());
        }
    } catch {
        // Ignore unsupported constraint updates.
    }

    // Avoid forcing zoom by default. Some mobile cameras lose focus on close badges
    // when zoom is applied programmatically.
};
