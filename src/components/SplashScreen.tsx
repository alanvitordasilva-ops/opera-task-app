import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 2500, // 2.5 segundos (entre 2 a 3 segundos conforme solicitado)
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Inicia a transição suave de fade out um pouco antes de finalizar
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 450, 1000));

    // Finaliza e redireciona para a tela de login/aplicação
    const finishTimer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 select-none transition-opacity duration-400 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Carregando OperaTask"
    >
      <div className="flex flex-col items-center justify-center max-w-sm sm:max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
        {/* Imagem Oficial OperaTask (Engrenagem + Check + Seta + OperaTask nas cores originais) */}
        <div className="w-full flex items-center justify-center p-4">
          <img
            src="/operatask-logo.jpeg"
            alt="OperaTask Logo"
            className="w-full max-w-[280px] sm:max-w-[340px] md:max-w-[380px] h-auto object-contain transition-transform duration-700 ease-out transform"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    </div>
  );
};
