import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerViewProps {
  onScanSuccess: (data: any) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ onScanSuccess }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qrCodeScanner = new Html5Qrcode("reader");
    scannerRef.current = qrCodeScanner;

    const startScanner = () => {
      // Use 85% of the container width for the scan box, capped at 400px
      const containerWidth = containerRef.current?.offsetWidth || 320;
      const boxSize = Math.min(Math.floor(containerWidth * 0.85), 400);

      qrCodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: boxSize, height: boxSize },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          setScanResult(decodedText);
          try {
            let contactData;
            try {
              contactData = JSON.parse(decodedText);
            } catch (e) {
              // If JSON parse fails, try Base64 decode
              try {
                contactData = JSON.parse(atob(decodedText));
              } catch (e2) {
                throw new Error("Invalid format");
              }
            }

            if (contactData.payload && contactData.signature) {
              onScanSuccess(contactData);
            } else if ((contactData.id && contactData.name) || contactData.exhibitorId) {
              onScanSuccess(contactData);
            } else {
              setError("Código QR no válido. No es un perfil ni expositor de CISMM X Connect.");
            }
          } catch (e) {
            setError("Error al procesar el código QR.");
          }
          qrCodeScanner.stop().catch(console.error);
        },
        (_errorMessage: string) => {
          // Ignore "QR code not found" frame errors
        }
      ).catch((err: any) => {
        setError("No se pudo iniciar la cámara. Por favor, otorga los permisos necesarios.");
        console.error(err);
      });
    };

    // Small delay to let the DOM render and get accurate container width
    const timer = setTimeout(startScanner, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err: any) => {
          console.error("Failed to stop scanner:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center p-4 text-center">
      <h2 className="text-xl font-bold text-brand-primary mb-2">Escanear Código QR</h2>
      <p className="text-gray-600 mb-4 text-sm">
        Apunta la cámara al código QR de otro asistente para intercambiar contactos.
      </p>

      {/* Scanner container — full width on mobile */}
      <div
        ref={containerRef}
        className="w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-lg border-4 border-brand-accent"
      >
        <div id="reader" className="w-full" />
      </div>

      {scanResult && (
        <div className="mt-4 w-full max-w-lg p-4 bg-green-100 text-green-800 rounded-lg">
          <h3 className="font-bold text-lg">¡Éxito!</h3>
          <p>Contacto añadido a tu lista.</p>
        </div>
      )}
      {error && (
        <div className="mt-4 w-full max-w-lg p-4 bg-red-100 text-red-800 rounded-lg">
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 px-4 py-1 bg-red-200 rounded-full text-sm hover:bg-red-300"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
};
