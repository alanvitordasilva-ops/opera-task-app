import { MediaCategory, TaskAttachment } from '../types/index.ts';

const DB_NAME = 'operatask_media_store_v1';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

// Limites máximos por categoria em bytes
export const MEDIA_LIMITS = {
  image: {
    maxBytes: 25 * 1024 * 1024, // 25 MB
    label: '25 MB',
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  video: {
    maxBytes: 100 * 1024 * 1024, // 100 MB
    label: '100 MB',
    types: ['video/mp4', 'video/quicktime', 'video/webm'],
    extensions: ['.mp4', '.mov', '.webm'],
  },
  audio: {
    maxBytes: 15 * 1024 * 1024, // 15 MB
    label: '15 MB',
    types: [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/m4a',
      'audio/x-m4a',
      'audio/ogg',
      'audio/webm',
    ],
    extensions: ['.mp3', '.wav', '.m4a', '.ogg', '.webm'],
  },
};

// Formatação amigável de bytes
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Detecção da categoria do arquivo
export function detectMediaCategory(file: File): MediaCategory | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type.startsWith('image/') || MEDIA_LIMITS.image.extensions.some((ext) => name.endsWith(ext))) {
    return 'image';
  }
  if (type.startsWith('video/') || MEDIA_LIMITS.video.extensions.some((ext) => name.endsWith(ext))) {
    return 'video';
  }
  if (type.startsWith('audio/') || MEDIA_LIMITS.audio.extensions.some((ext) => name.endsWith(ext))) {
    return 'audio';
  }
  return 'document';
}

// Validação de tipo e tamanho antes do envio
export function validateMediaFile(file: File): {
  valid: boolean;
  error?: string;
  category?: MediaCategory;
} {
  const category = detectMediaCategory(file);

  if (!category || category === 'document') {
    return {
      valid: false,
      error: `Formato "${file.type || file.name.split('.').pop()}" não suportado. Envie fotos (JPG, PNG, WEBP, GIF), vídeos (MP4, MOV, WEBM) ou áudios (MP3, WAV, M4A, OGG).`,
    };
  }

  const limits = MEDIA_LIMITS[category];
  if (file.size > limits.maxBytes) {
    return {
      valid: false,
      error: `O arquivo "${file.name}" tem ${formatBytes(file.size)}, excedendo o limite de ${limits.label} para ${
        category === 'image' ? 'imagens' : category === 'video' ? 'vídeos' : 'áudios'
      }.`,
      category,
    };
  }

  return { valid: true, category };
}

// Compressão inteligente de imagens grandes no navegador
export async function compressImageIfNeeded(file: File): Promise<{ blob: Blob; wasCompressed: boolean }> {
  // GIFs não são comprimidos para manter animação
  if (file.type === 'image/gif' || file.size < 1.5 * 1024 * 1024) {
    return { blob: file, wasCompressed: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxWidth = 1920;
      const maxHeight = 1920;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ blob: file, wasCompressed: false });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve({ blob, wasCompressed: true });
          } else {
            resolve({ blob: file, wasCompressed: false });
          }
        },
        mime,
        0.85
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ blob: file, wasCompressed: false });
    };

    img.src = objectUrl;
  });
}

// Inicialização segura do IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Cache em memória de ObjectURLs criados para evitar memory leaks
const objectUrlCache = new Map<string, string>();

export const MediaStorageService = {
  // Salva blob no IndexedDB
  async saveMedia(id: string, blob: Blob): Promise<void> {
    try {
      const db = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(blob, id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao salvar no IndexedDB, fallback em memória:', e);
    }
  },

  // Recupera blob do IndexedDB
  async getMediaBlob(id: string): Promise<Blob | null> {
    try {
      const db = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve((req.result as Blob) || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  // Obtém uma URL funcional para reprodução/visualização
  async getMediaUrl(id: string, fallbackUrl?: string): Promise<string> {
    if (objectUrlCache.has(id)) {
      return objectUrlCache.get(id)!;
    }

    const blob = await this.getMediaBlob(id);
    if (blob) {
      const url = URL.createObjectURL(blob);
      objectUrlCache.set(id, url);
      return url;
    }

    return fallbackUrl || '';
  },

  // Exclui mídia do IndexedDB e revoga URL
  async deleteMedia(id: string): Promise<void> {
    if (objectUrlCache.has(id)) {
      const url = objectUrlCache.get(id);
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      objectUrlCache.delete(id);
    }

    try {
      const db = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Falha ao deletar mídia do IndexedDB:', e);
    }
  },

  // Registra um File diretamente e retorna o objeto TaskAttachment completo
  async processAndStoreFile(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<TaskAttachment> {
    const { valid, error, category } = validateMediaFile(file);
    if (!valid || !category) {
      throw new Error(error || 'Arquivo inválido');
    }

    onProgress?.(20);

    let processedBlob: Blob = file;
    let size = formatBytes(file.size);
    let bytes = file.size;

    if (category === 'image') {
      const compressionResult = await compressImageIfNeeded(file);
      processedBlob = compressionResult.blob;
      bytes = processedBlob.size;
      size = formatBytes(bytes);
    }

    onProgress?.(60);

    const attachmentId = `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    await this.saveMedia(attachmentId, processedBlob);

    const blobUrl = URL.createObjectURL(processedBlob);
    objectUrlCache.set(attachmentId, blobUrl);

    onProgress?.(100);

    return {
      id: attachmentId,
      name: file.name,
      url: blobUrl,
      size,
      bytes,
      type: file.type || 'application/octet-stream',
      mediaCategory: category,
      uploadedAt: new Date().toISOString(),
      thumbnailUrl: category === 'image' ? blobUrl : undefined,
    };
  },
};
