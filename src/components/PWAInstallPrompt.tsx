import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, Check, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallPromptProps {
  variant?: 'banner' | 'button' | 'badge';
  className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ variant = 'banner', className = '' }) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('taskflow_pwa_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('taskflow_pwa_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    const res = await promptInstall();
    if (res === 'manual_ios') {
      setShowIOSModal(true);
    }
  };

  // If already running as installed standalone app, or not installable, don't show
  if (isInstalled) {
    return null;
  }

  // Button variant (can be placed in Sidebar or Header or settings)
  if (variant === 'button') {
    if (!isInstallable && !isIOS) return null;
    return (
      <>
        <button
          onClick={handleInstallClick}
          className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 ${className}`}
          title="Instalar TaskFlow no celular ou computador"
        >
          <Download className="w-4 h-4" />
          <span>Instalar App</span>
        </button>

        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} />
        )}
      </>
    );
  }

  // Banner variant (top or bottom banner on mobile / tablet)
  if (!isInstallable || dismissed) {
    return null;
  }

  return (
    <>
      <aside aria-label="Instalar aplicativo" className={`relative z-40 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-4 py-3 shadow-md transition-all ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-md flex items-center justify-center shrink-0 p-1 overflow-hidden border border-white/20">
              <img src="/pwa-192x192.png" alt="OperaTask Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-sm">
                <span>Instale o TaskFlow no seu celular</span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/20 text-white">
                  PWA
                </span>
              </div>
              <p className="text-xs text-blue-100 hidden xs:block">
                Acesse mais rápido direto da sua tela de início, offline e sem barras de navegação.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 active:scale-95 rounded-lg shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Dispensar aviso de instalação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {showIOSModal && (
        <IOSInstallModal onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
};

const IOSInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-slideUp">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 dark:border-slate-750 flex items-center justify-center p-0.5 overflow-hidden shadow-xs shrink-0">
              <img src="/apple-touch-icon.png" alt="App Icon" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Instalar no iPhone / iPad
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          Para instalar o TaskFlow no seu iOS e usá-lo como um app de tela cheia sem lojas de aplicativos, siga 3 passos rápidos:
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              1
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              Toque no botão de <strong>Compartilhar</strong> na barra inferior do Safari (
              <Share2 className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" />
              ).
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              2
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              Role o menu para baixo e selecione <strong>"Adicionar à Tela de Início"</strong> (
              <PlusSquare className="inline w-3.5 h-3.5 text-blue-500 mx-0.5" />
              ).
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              3
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              Toque em <strong>"Adicionar"</strong> no canto superior direito para confirmar. O ícone aparecerá instantaneamente na sua tela de apps!
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          <span>Entendi</span>
        </button>
      </div>
    </div>
  );
};
