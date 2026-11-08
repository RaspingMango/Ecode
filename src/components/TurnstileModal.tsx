import { useEffect, useState } from 'react';
import { X, SunMedium, Smartphone, Sparkles } from 'lucide-react';
import { generateQrDataUrl } from '../utils/qrRenderer';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface TurnstileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  rawContent: string;
  folderName?: string;
  lang?: Language;
}

export function TurnstileModal({
  isOpen,
  onClose,
  title,
  rawContent,
  folderName,
  lang = 'ru',
}: TurnstileModalProps) {
  const t = TRANSLATIONS[lang];
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !rawContent) return;

    generateQrDataUrl(rawContent, {
      fgColor: '#000000',
      bgColor: '#ffffff',
      ecc: 'H',
      margin: 2,
      width: 900,
    }).then(setDataUrl).catch(console.error);

    let wakeLock: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen')
        .then((lock: any) => {
          wakeLock = lock;
        })
        .catch(() => {});
    }

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isOpen, rawContent]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
      role="dialog"
      aria-label="Turnstile View"
    >
      {/* Top Bar with Dismiss and Brightness Reminder */}
      <div className="w-full max-w-md flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
          <SunMedium className="w-4 h-4 text-amber-600 animate-pulse" />
          <span>{t.turnstileTitle}</span>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition-transform text-slate-700 flex items-center justify-center focus:outline-none"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main QR Display Section */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm my-auto">
        {folderName && (
          <span className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-1.5 px-3 py-1 rounded-full bg-slate-100">
            {folderName}
          </span>
        )}
        <h2 className="text-xl sm:text-2xl font-black text-center text-slate-950 mb-4 px-2 leading-tight">
          {title}
        </h2>

        {/* Pure White Background Box with Pristine QR */}
        <div className="bg-white p-4 rounded-[32px] shadow-2xl border-4 border-slate-900/10 flex items-center justify-center">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={title}
              className="w-64 h-64 sm:w-80 sm:h-80 object-contain image-rendering-pixelated"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 text-center font-medium">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <span>{t.turnstileTip}</span>
        </div>
      </div>

      {/* Bottom Close Button */}
      <div className="w-full max-w-md pb-4">
        <button
          onClick={onClose}
          className="w-full py-4 px-6 rounded-full bg-slate-950 text-white font-bold text-sm hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{t.turnstileClose}</span>
        </button>
      </div>
    </div>
  );
}
