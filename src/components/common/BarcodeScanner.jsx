import { useEffect, useRef, useState } from 'react';
import { FaCamera, FaTimes, FaKeyboard, FaCheck } from 'react-icons/fa';
import { playBarcodeBeep } from '../../utils/audio';
import './BarcodeScanner.css';

// Formatos de producto. El detector nativo usa nombres de la Shape Detection API;
// Quagga2 usa sus "readers".
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'];
const QUAGGA_READERS = ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader'];

// Pausa entre intentos de lectura (ms). Cada intento decodifica el cuadro completo.
const SCAN_INTERVAL_MS = 120;

const VIDEO_SIZE = { width: { ideal: 1280 }, height: { ideal: 720 } };

/**
 * Decodificador con la API nativa BarcodeDetector (Chrome/Edge en Android, macOS).
 * Devuelve null si el navegador no la tiene o no soporta códigos de producto.
 */
async function createNativeDecoder() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const supported = await window.BarcodeDetector.getSupportedFormats();
    const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
    if (!formats.includes('ean_13')) return null;
    const detector = new window.BarcodeDetector({ formats });
    return {
      name: 'nativo',
      // Lecturas nativas son fiables: basta una.
      confirmations: 1,
      decode: async (video) => {
        const codes = await detector.detect(video);
        return codes.length > 0 ? codes[0].rawValue : null;
      },
    };
  } catch {
    return null;
  }
}

/**
 * Decodificador de respaldo con Quagga2 (Safari/iOS, Firefox, escritorio).
 * Se carga bajo demanda para no inflar el bundle de quien tiene el nativo.
 */
async function createQuaggaDecoder() {
  const { default: Quagga } = await import('quagga');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let pass = 0;
  return {
    name: 'quagga',
    // Quagga puede confundir un dígito: se exige la misma lectura dos veces.
    confirmations: 2,
    decode: (video) => {
      // Se usa la resolución real del video, no el tamaño del visor en pantalla:
      // reducir el cuadro deja las barras de un EAN-13 más finas que un píxel.
      // Se alterna el cuadro completo (códigos cerca o desenfocados) con el
      // centro ampliado (códigos lejos o girados, donde apunta el visor).
      const fraction = pass++ % 2 === 0 ? 1 : 0.6;
      const sw = video.videoWidth * fraction;
      const sh = video.videoHeight * fraction;
      canvas.width = sw;
      canvas.height = sh;
      ctx.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, sw, sh);
      return new Promise((resolve) => {
        Quagga.decodeSingle(
          {
            src: canvas.toDataURL('image/jpeg', 0.9),
            numOfWorkers: 0,
            locate: true,
            inputStream: { size: Math.max(video.videoWidth, video.videoHeight) },
            locator: { patchSize: 'medium', halfSample: false },
            decoder: { readers: QUAGGA_READERS },
          },
          (result) => resolve(result?.codeResult?.code || null)
        );
      });
    },
  };
}

const BarcodeScanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const [cameras, setCameras] = useState([]);
  // Cámara pedida por el usuario; vacía = automática (trasera si existe).
  const [requestedCameraId, setRequestedCameraId] = useState('');
  const [activeCameraId, setActiveCameraId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Iniciando cámara...');

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let timer = null;

    const finish = (code) => {
      playBarcodeBeep('success');
      onScanRef.current(code);
      if (onCloseRef.current) onCloseRef.current();
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerStatus('La cámara requiere HTTPS y un navegador compatible');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            ...(requestedCameraId
              ? { deviceId: { exact: requestedCameraId } }
              : { facingMode: { ideal: 'environment' } }),
            ...VIDEO_SIZE,
            advanced: [{ focusMode: 'continuous' }],
          },
        });
      } catch (err) {
        console.warn('Error al abrir la cámara:', err);
        if (!cancelled) {
          setScannerStatus(
            err?.name === 'NotAllowedError'
              ? 'Permiso de cámara no concedido'
              : 'No se pudo abrir la cámara'
          );
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});

      // Con el permiso concedido ya hay nombres de cámara para el selector.
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) return;
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
      setActiveCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId || '');

      const decoder = (await createNativeDecoder()) || (await createQuaggaDecoder());
      if (cancelled) return;
      setScannerStatus('Alinea el código de barras en el recuadro');

      let lastCode = null;
      let hits = 0;
      const tick = async () => {
        if (cancelled) return;
        let code = null;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          try {
            code = await decoder.decode(video);
          } catch (err) {
            console.warn('Error decodificando cuadro:', err);
          }
        }
        if (cancelled) return;
        if (code) {
          hits = code === lastCode ? hits + 1 : 1;
          lastCode = code;
          if (hits >= decoder.confirmations) {
            finish(code);
            return;
          }
        }
        timer = setTimeout(tick, SCAN_INTERVAL_MS);
      };
      tick();
    };

    start();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [requestedCameraId]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playBarcodeBeep('success');
      onScan(manualCode.trim());
      if (onClose) onClose();
    }
  };

  return (
    <div className="modern-scanner-card">
      {/* Scanner Header */}
      <div className="scanner-top-bar">
        <div className="scanner-header-left">
          <FaCamera className="camera-icon" />
          <span className="scanner-title">Lector Óptico de Código de Barras</span>
        </div>

        <div className="scanner-header-right">
          {cameras.length > 1 && (
            <select
              className="camera-select-dropdown"
              value={activeCameraId}
              onChange={(e) => setRequestedCameraId(e.target.value)}
              title="Cambiar Cámara"
            >
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Cámara ${i + 1}`}
                </option>
              ))}
            </select>
          )}

          {onClose && (
            <button className="btn-close-scanner" onClick={onClose} title="Cerrar Lector">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport with Targeting Overlay */}
      <div className="scanner-camera-window">
        <div id="interactive-scanner-viewport">
          <video ref={videoRef} muted playsInline autoPlay />
        </div>

        {/* Viewfinder Overlay with Corner Brackets */}
        <div className="viewfinder-overlay">
          <div className="viewfinder-target-box">
            <span className="corner top-left"></span>
            <span className="corner top-right"></span>
            <span className="corner bottom-left"></span>
            <span className="corner bottom-right"></span>
            <div className="laser-scan-line"></div>
          </div>
        </div>

        <div className="scanner-status-pill">
          <span>{scannerStatus}</span>
        </div>
      </div>

      {/* Footer & Fallback manual input */}
      <div className="scanner-bottom-bar">
        <div className="supported-formats-pills">
          <span className="format-badge">EAN-13</span>
          <span className="format-badge">CODE-128</span>
          <span className="format-badge">UPC-A</span>
        </div>

        <button
          type="button"
          className="btn-toggle-manual"
          onClick={() => setShowManualInput(!showManualInput)}
        >
          <FaKeyboard />
          <span>{showManualInput ? 'Ocultar teclado' : 'Ingresar código manual'}</span>
        </button>
      </div>

      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="scanner-manual-input-form">
          <input
            type="text"
            placeholder="Escribe el código de barras numérico..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-confirm-manual" disabled={!manualCode.trim()}>
            <FaCheck /> Confirmar
          </button>
        </form>
      )}
    </div>
  );
};

export default BarcodeScanner;
