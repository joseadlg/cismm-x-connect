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
    aspectRatio: 1,
    disableFlip: false,
    qrbox: (width, height) => {
        const minSide = Math.min(width, height);
        const desiredSize = Math.floor(minSide * (mode === 'login' ? 0.9 : 0.82));
        const clampedSize = Math.max(220, Math.min(desiredSize, minSide - 12));

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

    try {
        const zoomFeature = scanner.getRunningTrackCameraCapabilities().zoomFeature();

        if (!zoomFeature.isSupported()) {
            return;
        }

        const minZoom = zoomFeature.min();
        const maxZoom = zoomFeature.max();
        const zoomRange = maxZoom - minZoom;

        if (!Number.isFinite(zoomRange) || zoomRange <= 0.35) {
            return;
        }

        const suggestedZoom = Math.min(maxZoom, Math.max(minZoom + (zoomRange * 0.28), 1.15));
        await zoomFeature.apply(Number(suggestedZoom.toFixed(2)));
    } catch {
        // Ignore zoom tuning when the device/browser does not expose it.
    }
};
