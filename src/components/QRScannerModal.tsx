import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Upload, AlertCircle } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        scanFrames();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('No se pudo acceder a la cámara. Puedes subir una foto del código QR.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanFrames = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        let extracted = code.data.trim();
        // Support crossdiary://ABCD-1234 or crossdiary://link?code=ABCD-1234
        if (extracted.includes('code=')) {
          extracted = extracted.split('code=')[1].split('&')[0];
        } else if (extracted.includes('://')) {
          extracted = extracted.split('://')[1];
        }

        const clean = extracted.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (clean.length >= 8) {
          if ('vibrate' in navigator) {
            try { navigator.vibrate(100); } catch {}
          }
          stopCamera();
          onScanSuccess(clean);
          onClose();
          return;
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanFrames);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          let extracted = code.data.trim();
          if (extracted.includes('code=')) {
            extracted = extracted.split('code=')[1].split('&')[0];
          } else if (extracted.includes('://')) {
            extracted = extracted.split('://')[1];
          }
          const clean = extracted.toUpperCase().replace(/[^A-Z0-9-]/g, '');
          onScanSuccess(clean);
          onClose();
        } else {
          alert('No se detectó ningún código QR en la imagen seleccionada.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className="w-full max-w-sm rounded-[28px] border-2 overflow-hidden shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--bg-main)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2">
            <Camera size={16} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-display-brutal uppercase">Escanear Código QR</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full border hover:scale-105 active:scale-95"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle size={32} className="mx-auto text-amber-500" />
              <p className="text-xs text-white/80 leading-relaxed">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Scanning Target Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-dashed border-[var(--accent)] rounded-3xl relative animate-pulse">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[var(--accent)] rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[var(--accent)] rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[var(--accent)] rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[var(--accent)] rounded-br-xl" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer / Fallback file upload */}
        <div className="p-4 space-y-2.5 text-center" style={{ background: 'var(--bg-surface)' }}>
          <p className="text-[10px] opacity-75">
            Apunta la cámara al código QR de la otra pantalla para vincular al instante.
          </p>

          <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-transform active:scale-95" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <Upload size={13} style={{ color: 'var(--accent)' }} />
            <span>Subir imagen con QR</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
