import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Monitor,
  Image as ImageIcon,
  Zap,
  RefreshCw,
  Upload,
  Clipboard,
  AlertCircle,
  Play,
  Square,
  Sparkles,
  HelpCircle,
  Check,
} from 'lucide-react';
import { scanImageData, scanImageFile } from '../utils/qrScanner';
import { playScanSuccessSound, playTapSound, triggerHaptic } from '../utils/audio';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface ScannerViewProps {
  onQrDetected: (rawText: string, source: 'camera' | 'screen' | 'file') => void;
  lang?: Language;
}

type ScanMode = 'camera' | 'screen' | 'file';

export function ScannerView({ onQrDetected, lang = 'ru' }: ScannerViewProps) {
  const t = TRANSLATIONS[lang];
  const [mode, setMode] = useState<ScanMode>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScanTimestampRef = useRef<number>(0);

  // Stop active video media streams
  const stopCurrentStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchEnabled(false);
    setHasTorch(false);
  }, []);

  // Frame processing loop
  const processVideoFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
      return;
    }

    const now = performance.now();
    if (now - lastScanTimestampRef.current > 90) {
      lastScanTimestampRef.current = now;

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        const maxDimension = 960;
        let scale = 1;
        if (video.videoWidth > maxDimension || video.videoHeight > maxDimension) {
          scale = Math.min(maxDimension / video.videoWidth, maxDimension / video.videoHeight);
        }

        canvas.width = Math.floor(video.videoWidth * scale);
        canvas.height = Math.floor(video.videoHeight * scale);

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = scanImageData(imageData);
        if (result && result.data) {
          playScanSuccessSound();
          triggerHaptic([40, 30, 80]);
          stopCurrentStream();
          onQrDetected(result.data, mode === 'screen' ? 'screen' : 'camera');
          return;
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
  }, [mode, onQrDetected, stopCurrentStream]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    stopCurrentStream();
    setErrorMsg(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      }

      setIsScanning(true);
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      let msg: string = t.cameraNotFound;
      if (err.name === 'NotAllowedError') {
        msg = lang === 'ru' 
          ? 'Разрешение на использование камеры отклонено. Разрешите доступ или воспользуйтесь режимом захвата экрана.'
          : 'Camera permission was denied. Allow access or use Screen Capture.';
      }
      setErrorMsg(msg);
      setIsScanning(false);
    }
  }, [facingMode, lang, processVideoFrame, stopCurrentStream, t.cameraNotFound]);

  // Start Screen Capture Stream
  const startScreenCapture = useCallback(async () => {
    stopCurrentStream();
    setErrorMsg(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      setErrorMsg(lang === 'ru'
        ? 'Захват экрана не поддерживается браузером. Попробуйте загрузить скриншот из файла или буфера.'
        : 'Screen capture is not supported by your browser. Try uploading a screenshot.'
      );
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' } as any,
        audio: false,
      });

      streamRef.current = displayStream;

      displayStream.getVideoTracks()[0].onended = () => {
        stopCurrentStream();
      };

      if (videoRef.current) {
        videoRef.current.srcObject = displayStream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      animFrameIdRef.current = requestAnimationFrame(processVideoFrame);
    } catch (err: any) {
      console.warn('Screen capture error:', err);
      if (err.name !== 'NotAllowedError') {
        setErrorMsg((lang === 'ru' ? 'Не удалось запустить захват экрана: ' : 'Failed to start screen capture: ') + (err.message || 'Error'));
      }
      setIsScanning(false);
    }
  }, [lang, processVideoFrame, stopCurrentStream]);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else if (mode === 'screen') {
      stopCurrentStream();
    } else if (mode === 'file') {
      stopCurrentStream();
    }

    return () => {
      stopCurrentStream();
    };
  }, [mode, startCamera, stopCurrentStream]);

  const toggleTorch = async () => {
    playTapSound();
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchEnabled;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchEnabled(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  const flipCamera = () => {
    playTapSound();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFileScan = async (file: File) => {
    playTapSound();
    setIsProcessingFile(true);
    setErrorMsg(null);
    try {
      const result = await scanImageFile(file);
      if (result && result.data) {
        playScanSuccessSound();
        triggerHaptic([40, 30, 80]);
        onQrDetected(result.data, 'file');
      } else {
        setErrorMsg(lang === 'ru'
          ? 'QR-код на изображении не найден. Убедитесь, что код виден четко и не обрезан.'
          : 'No QR code was detected in the image. Please make sure the code is clear and not cropped.'
        );
      }
    } catch (err: any) {
      setErrorMsg((lang === 'ru' ? 'Ошибка чтения изображения: ' : 'Image read error: ') + (err.message || ''));
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    playTapSound();
    setIsProcessingFile(true);
    setErrorMsg(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        setErrorMsg(lang === 'ru'
          ? 'Чтение буфера не поддерживается. Нажмите Ctrl+V или выберите файл скриншота.'
          : 'Clipboard read is not supported. Press Ctrl+V or upload a screenshot file.'
        );
        setIsProcessingFile(false);
        return;
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], 'clipboard-screenshot.png', { type });
            await handleFileScan(file);
            return;
          }
        }
      }
      setErrorMsg(lang === 'ru'
        ? 'В буфере обмена нет изображения. Сделайте скриншот с QR-кодом и нажмите кнопку снова.'
        : 'No image found in clipboard. Take a screenshot with a QR code and try again.'
      );
    } catch (err: any) {
      setErrorMsg((lang === 'ru' ? 'Не удалось прочитать буфер обмена: ' : 'Failed to read clipboard: ') + (err.message || ''));
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleTestSample = (sampleType: 'ticket' | 'loyalty' | 'wifi') => {
    playTapSound();
    let text = '';
    if (sampleType === 'ticket') {
      text = 'TICKET:AEROFLOT:SU-1120:GATE-14B:SEAT-03A:CONF-992019';
    } else if (sampleType === 'loyalty') {
      text = 'LOYALTY:X5-CLUB:8839201948123019';
    } else {
      text = 'WIFI:S:Guest_Cafe_Free;T:WPA;P:CoffeeAndCake2026;;';
    }
    playScanSuccessSound();
    triggerHaptic();
    onQrDetected(text, 'file');
  };

  return (
    <div className="flex flex-col h-full w-full max-w-xl mx-auto px-4 py-2 space-y-4">
      {/* Material You 3 Segmented Button for Mode Selection */}
      <div className="flex items-center p-1 rounded-full bg-[#1e1f23] border border-white/[0.04]">
        <button
          onClick={() => {
            playTapSound();
            setMode('camera');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            mode === 'camera'
              ? 'bg-[#394738] text-[#a8f09b] shadow-sm font-bold'
              : 'text-[#8e918f] hover:text-[#e3e2e6]'
          }`}
          aria-label={t.modeCamera}
        >
          {mode === 'camera' ? <Check className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
          <span>{t.modeCamera}</span>
        </button>

        <button
          onClick={() => {
            playTapSound();
            setMode('screen');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            mode === 'screen'
              ? 'bg-[#394738] text-[#a8f09b] shadow-sm font-bold'
              : 'text-[#8e918f] hover:text-[#e3e2e6]'
          }`}
          aria-label={t.modeScreen}
        >
          {mode === 'screen' ? <Check className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
          <span>{t.modeScreen}</span>
        </button>

        <button
          onClick={() => {
            playTapSound();
            setMode('file');
          }}
          className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            mode === 'file'
              ? 'bg-[#394738] text-[#a8f09b] shadow-sm font-bold'
              : 'text-[#8e918f] hover:text-[#e3e2e6]'
          }`}
          aria-label={t.modeScreenshot}
        >
          {mode === 'file' ? <Check className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          <span>{t.modeScreenshot}</span>
        </button>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 min-h-[360px] sm:min-h-[430px] bg-[#1a1b1f] rounded-[28px] overflow-hidden border border-white/[0.04] shadow-xl flex flex-col items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isScanning ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* --- CAMERA & ACTIVE SCREEN STREAM OVERLAY --- */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
            <div className="px-4 py-1.5 rounded-full bg-[#1e1f23]/90 backdrop-blur-md border border-white/[0.08] flex items-center gap-2 text-xs font-semibold text-[#a8f09b]">
              <span className="w-2 h-2 rounded-full bg-[#a8f09b] animate-ping" />
              <span>
                {mode === 'camera' ? t.scanningCamera : t.scanningScreen}
              </span>
            </div>

            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#a8f09b] rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#a8f09b] rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#a8f09b] rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#a8f09b] rounded-br-2xl" />

              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#a8f09b] to-transparent absolute shadow-[0_0_15px_#a8f09b] animate-pulse transition-all duration-75 top-1/2 -translate-y-1/2" />
            </div>

            <div className="pointer-events-auto flex items-center gap-3">
              {mode === 'camera' && (
                <>
                  {hasTorch && (
                    <button
                      onClick={toggleTorch}
                      className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                        torchEnabled
                          ? 'bg-[#a8f09b] text-[#0b3810] shadow-md'
                          : 'bg-[#1e1f23]/80 text-[#e3e2e6] hover:bg-[#282a2f]'
                      }`}
                      aria-label="Torch"
                    >
                      <Zap className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={flipCamera}
                    className="w-12 h-12 rounded-full bg-[#1e1f23]/80 backdrop-blur-md text-[#e3e2e6] hover:bg-[#282a2f] active:rotate-180 flex items-center justify-center transition-all"
                    aria-label="Switch camera"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}

              {mode === 'screen' && (
                <button
                  onClick={() => {
                    playTapSound();
                    stopCurrentStream();
                  }}
                  className="px-5 py-3 rounded-full bg-[#93000a] text-[#ffdad6] font-bold text-xs flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  <Square className="w-4 h-4 fill-[#ffdad6]" />
                  <span>{t.stopScreenCapture}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* --- SCREEN CAPTURE INACTIVE STATE --- */}
        {mode === 'screen' && !isScanning && (
          <div className="p-6 flex flex-col items-center text-center max-w-sm space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#244927] flex items-center justify-center text-[#a8f09b] shadow-md">
              <Monitor className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg text-[#e3e2e6]">
                {t.screenModeTitle}
              </h3>
              <p className="text-xs text-[#8e918f] leading-relaxed">
                {t.screenModeDesc}
              </p>
            </div>

            <button
              onClick={() => {
                playTapSound();
                startScreenCapture();
              }}
              className="w-full py-3.5 px-6 rounded-full bg-[#a8f09b] hover:brightness-105 active:scale-95 text-[#0b3810] font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-4 h-4 fill-[#0b3810]" />
              <span>{t.startScreenCapture}</span>
            </button>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#282a2f]/80 text-xs text-[#c4c7c5] text-left">
              <HelpCircle className="w-4 h-4 text-[#a8f09b] shrink-0 mt-0.5" />
              <span>{t.screenModeTip}</span>
            </div>
          </div>
        )}

        {/* --- FILE / SCREENSHOT / CLIPBOARD MODE --- */}
        {mode === 'file' && (
          <div className="p-6 flex flex-col items-center text-center w-full max-w-md space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#233549] flex items-center justify-center text-[#a8c7fa] shadow-md">
              <ImageIcon className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-lg text-[#e3e2e6]">
                {t.screenshotTitle}
              </h3>
              <p className="text-xs text-[#8e918f] leading-relaxed">
                {t.screenshotDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              <label className="py-3 px-4 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] active:scale-95 text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                <Upload className="w-4 h-4 text-[#a8f09b]" />
                <span>{t.chooseFromGallery}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileScan(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </label>

              <button
                onClick={handlePasteFromClipboard}
                disabled={isProcessingFile}
                className="py-3 px-4 rounded-2xl bg-[#282a2f] hover:bg-[#33353a] active:scale-95 text-[#e3e2e6] text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Clipboard className="w-4 h-4 text-[#d0bcff]" />
                <span>{t.pasteScreenshot}</span>
              </button>
            </div>

            {isProcessingFile && (
              <div className="flex items-center gap-2 text-xs text-[#a8f09b] py-1 font-medium animate-pulse">
                <div className="w-3.5 h-3.5 border-2 border-[#a8f09b] border-t-transparent rounded-full animate-spin" />
                <span>{t.analyzingImage}</span>
              </div>
            )}
          </div>
        )}

        {/* Camera fallback */}
        {mode === 'camera' && !isScanning && (
          <div className="p-6 flex flex-col items-center text-center max-w-sm space-y-3">
            <Camera className="w-12 h-12 text-[#8e918f] mb-2" />
            <p className="text-xs text-[#8e918f]">
              {t.cameraDisabled}
            </p>
            <button
              onClick={() => {
                playTapSound();
                startCamera();
              }}
              className="py-2.5 px-6 rounded-full bg-[#a8f09b] text-[#0b3810] font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow-sm"
            >
              {t.enableCamera}
            </button>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-[#371e1d] text-[#ffdad6] text-xs flex items-start gap-2.5 border border-[#ffb4ab]/20">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#ffb4ab] mt-0.5" />
          <div className="flex-1 leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* M3 Assist Chips for Demo Testing */}
      <div className="bg-[#1e1f23] rounded-[24px] p-3.5 space-y-2 border border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#c4c7c5] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#a8f09b]" />
            {t.quickScanTest}
          </span>
          <span className="text-[10px] text-[#8e918f]">
            {t.testWithoutCamera}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleTestSample('ticket')}
            className="py-2 px-2.5 rounded-full bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] text-[11px] font-semibold transition-all active:scale-95 text-center truncate border border-white/[0.04]"
          >
            {t.sampleTicket}
          </button>
          <button
            onClick={() => handleTestSample('loyalty')}
            className="py-2 px-2.5 rounded-full bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] text-[11px] font-semibold transition-all active:scale-95 text-center truncate border border-white/[0.04]"
          >
            {t.sampleLoyalty}
          </button>
          <button
            onClick={() => handleTestSample('wifi')}
            className="py-2 px-2.5 rounded-full bg-[#282a2f] hover:bg-[#33353a] text-[#e3e2e6] text-[11px] font-semibold transition-all active:scale-95 text-center truncate border border-white/[0.04]"
          >
            {t.sampleWifi}
          </button>
        </div>
      </div>
    </div>
  );
}
