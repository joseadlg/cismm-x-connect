import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseQrData } from '../../utils/qr';
import { buildQrScanConfig, createQrScanner, tuneQrScannerForDistance } from '../../utils/qrScanner';

interface ScannerViewProps {
  onScanSuccess: (data: any) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ onScanSuccess }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const processQR = async (decodedText: string) => {
    try {
      const qrResult = await parseQrData(decodedText);

      if (!qrResult.ok) {
        setError(
          qrResult.reason === 'invalid_security'
            ? "Código QR inválido o manipulado."
            : "Error al procesar el código QR."
        );
        return false;
      }

      const contactData = qrResult.data;

      if ((contactData.id && contactData.name) || contactData.exhibitorId) {
        setError(null);
        onScanSuccess(contactData);
        return true;
      } else {
        setError("Código QR no válido. No es un perfil de CISMM X Connect.");
        return false;
      }
    } catch {
      setError("Error al procesar el código QR.");
      return false;
    }
  };

  const startScanner = () => {
    setError(null);
    setScanResult(null);
    const qr = createQrScanner("reader");
    scannerRef.current = qr;

    qr.start(
      { facingMode: { ideal: "environment" } },
      buildQrScanConfig('general'),
      async (decodedText: string) => {
        if (!scannerRef.current) {
          return;
        }

        try {
          scannerRef.current.pause();
        } catch {
          // Ignore pause errors and continue processing.
        }

        const handled = await processQR(decodedText);

        if (handled) {
          setScanResult(decodedText);
          qr.stop().catch(console.error);
          return;
        }

        try {
          scannerRef.current.resume();
        } catch {
          // Ignore resume errors.
        }
      },
      () => { /* ignore per-frame errors */ }
    )
      .then(async () => {
        setIsStarted(true);
        await tuneQrScannerForDistance(qr);
      })
      .catch((err: any) => {
        setError("No se pudo iniciar la cámara. Por favor, otorga los permisos necesarios.");
        console.error(err);
      });
  };

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center text-center w-full">
      <h2 className="text-xl font-bold text-brand-primary mt-4 mb-1">Escanear Código QR</h2>
      <p className="text-gray-600 mb-3 text-sm px-4">
        Apunta la cámara al código QR de otro asistente o stand. La cámara intentará leerlo con más alcance, pero si ves que tarda, centra el código y dale un segundo.
      </p>

      {/* Reader fills full width — NO max-w cap so camera is as large as possible */}
      <div
        id="reader"
        className="w-full"
        style={{ maxHeight: '70vh' }}
      />

      {scanResult && !error && (
        <div className="mt-4 mx-4 p-4 bg-green-100 text-green-800 rounded-lg w-full max-w-lg">
          <h3 className="font-bold text-lg">¡Éxito!</h3>
          <p>Procesado correctamente.</p>
        </div>
      )}

      {error && (
        <div className="mt-4 mx-4 p-4 bg-red-100 text-red-800 rounded-lg w-full max-w-lg">
          <h3 className="font-bold">Error</h3>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={startScanner}
            className="mt-3 px-5 py-2 bg-brand-accent text-white rounded-full text-sm font-semibold hover:opacity-90"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
};
