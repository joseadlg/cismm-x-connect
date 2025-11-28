import React, { useEffect, useState, useRef } from 'react';
import { UserProfile } from '../../types';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerViewProps {
  onScanSuccess: (data: any) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ onScanSuccess }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    const qrCodeScanner = new Html5Qrcode("reader");
    scannerRef.current = qrCodeScanner;

    const startScanner = () => {
      qrCodeScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
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
        (errorMessage: string) => {
          // Ignore "QR code not found" messages
        }
      ).catch((err: any) => {
        setError("No se pudo iniciar la cámara. Por favor, otorga los permisos necesarios.");
        console.error(err);
      });
    }

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err: any) => {
          console.error("Failed to stop scanner:", err);
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold text-brand-primary mb-4">Escanear Código QR</h2>
      <p className="text-gray-600 mb-4">Apunta la cámara al código QR de otro asistente para intercambiar contactos.</p>
      <div id="reader" className="w-full max-w-sm mx-auto border-4 border-brand-accent rounded-lg overflow-hidden"></div>

      {scanResult && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg">
          <h3 className="font-bold">¡Éxito!</h3>
          <p>Contacto añadido a tu lista.</p>
        </div>
      )}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-lg">
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};
