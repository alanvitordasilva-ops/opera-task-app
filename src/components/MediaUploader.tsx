import React, { useState, useRef } from 'react';
import { TaskAttachment } from '../types/index.ts';
import { MediaStorageService, validateMediaFile } from '../services/mediaStorage.ts';
import { UploadCloud, Image, Film, Music, AlertCircle, Loader2, Check } from 'lucide-react';

interface MediaUploaderProps {
  onAttachmentAdded: (attachment: TaskAttachment) => void;
  className?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ onAttachmentAdded, className = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);

    const fileArray = Array.from(files);
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      setUploadStatus(`Processando ${i + 1} de ${fileArray.length}: ${file.name}...`);

      const { valid, error } = validateMediaFile(file);
      if (!valid) {
        errors.push(error || `Erro ao validar ${file.name}`);
        continue;
      }

      try {
        const attachment = await MediaStorageService.processAndStoreFile(file, (percent) => {
          const stepBase = (i / fileArray.length) * 100;
          const stepWeight = 100 / fileArray.length;
          setUploadProgress(Math.round(stepBase + (percent / 100) * stepWeight));
        });

        onAttachmentAdded(attachment);
        successCount++;
      } catch (err: any) {
        errors.push(err.message || `Falha no upload de ${file.name}`);
      }
    }

    setIsUploading(false);
    setUploadProgress(100);

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
    } else {
      setUploadStatus(`${successCount} anexo${successCount > 1 ? 's enviados' : ' enviado'} com sucesso!`);
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Redefine para permitir selecionar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
            <UploadCloud className="w-5 h-5" />
          </div>

          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Arraste fotos, vídeos ou áudios aqui, ou{' '}
            <span className="text-blue-600 dark:text-blue-400 hover:underline">procure no dispositivo</span>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
            Fotos (JPG, PNG, GIF até 25 MB) · Vídeos (MP4, MOV, WEBM até 100 MB) · Áudios (MP3, WAV, M4A até 15 MB)
          </p>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-medium">
            <span className="flex items-center gap-1">
              <Image className="w-3.5 h-3.5 text-blue-500" /> Fotos
            </span>
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5 text-purple-500" /> Vídeos
            </span>
            <span className="flex items-center gap-1">
              <Music className="w-3.5 h-3.5 text-emerald-500" /> Áudios
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso durante Upload */}
      {isUploading && (
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-1.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900 dark:text-blue-300">
            <span className="flex items-center gap-1.5 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              {uploadStatus}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mensagem de Erro de Validação */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Aviso de validação:</span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Feedback de Conclusão */}
      {uploadStatus && !isUploading && !errorMessage && (
        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{uploadStatus}</span>
        </div>
      )}
    </div>
  );
};
