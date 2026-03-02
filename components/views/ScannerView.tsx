import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseVCard } from '../../utils/vcardParser';

interface ScannerViewProps {
  onScanSuccess: (data: any) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({ onScanSuccess }) => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const scannerRef = useRef<any>(null);

  const processQR = (decodedText: string) => {
    try {
      let contactData: any;

      const vcard = parseVCard(decodedText);
      if (vcard) {
        contactData = {
          id: vcard.id || vcard.email || vcard.name,
          name: vcard.name || "Asistente " + (vcard.email || "Desconocido"),
          company: vcard.company || "",
          title: vcard.title || "",
          email: vcard.email || "",
          phone: vcard.phone || ""
        };
      } else {
        try {
          contactData = JSON.parse(decodedText);
        } catch {
          try {
            contactData = JSON.parse(atob(decodedText));
          } catch {
            throw new Error("Invalid format");
          }
        }
      }
      if (contactData.payload && contactData.signature) {
        onScanSuccess(contactData);
      } else if ((contactData.id && contactData.name) || contactData.exhibitorId) {
        onScanSuccess(contactData);
      } else {
        setError("Código QR no válido. No es un perfil de CISMM X Connect.");
      }
    } catch {
      setError("Error al procesar el código QR.");
    }
  };

  const startScanner = () => {
    setError(null);
    setScanResult(null);
    const qr = new Html5Qrcode("reader");
    scannerRef.current = qr;

    qr.start(
      { facingMode: "environment" },
      {
        fps: 15,
        // Use a FUNCTION so the library computes the box off the real viewfinder size
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const smaller = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(smaller * 0.9);
          return { width: size, height: size };
        },
        aspectRatio: 1.333, // 4:3 — best for QR scanning on mobile
        rememberLastUsedCamera: true,
      },
      (decodedText: string) => {
        setScanResult(decodedText);
        processQR(decodedText);
        qr.stop().catch(console.error);
      },
      () => { /* ignore per-frame errors */ }
    )
      .then(() => setIsStarted(true))
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
        Apunta la cámara al código QR de otro asistente o stand.
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
