import { config } from './config';
import { supabase } from './supabaseClient';
import { ImageSet } from '../types';

/** Public Supabase Storage bucket created by database/schema.sql */
export const IMAGE_BUCKET = 'disc-images';

class StorageService {
  private static instance: StorageService;

  public static getInstance(): StorageService {
    if (!StorageService.instance) StorageService.instance = new StorageService();
    return StorageService.instance;
  }

  /**
   * Multi-size image upload. Generates Full (1200px), Medium (600px) and Thumb (200px)
   * versions in the browser, then uploads them to Supabase Storage.
   */
  public async processAndUploadDiscImage(
    userId: string,
    base64: string,
    slot: string,
    onProgress?: (progress: number) => void
  ): Promise<ImageSet> {
    this.validateBase64(base64);

    if (config.isMockEnabled) {
      // Local prototyping: keep the image inline
      onProgress?.(30);
      await new Promise((r) => setTimeout(r, 300));
      onProgress?.(100);
      return { full: base64, medium: base64, thumb: base64 };
    }

    onProgress?.(10);
    const [full, medium, thumb] = await Promise.all([
      this.resizeImage(base64, 1200, 0.8),
      this.resizeImage(base64, 600, 0.7),
      this.resizeImage(base64, 200, 0.6),
    ]);
    onProgress?.(40);

    const basePath = `${userId}/discs/${Date.now()}-${slot}`;
    const [fullUrl, mediumUrl, thumbUrl] = await Promise.all([
      this.uploadDataUrl(`${basePath}-full.jpg`, full),
      this.uploadDataUrl(`${basePath}-med.jpg`, medium),
      this.uploadDataUrl(`${basePath}-thumb.jpg`, thumb),
    ]);
    onProgress?.(100);

    return { full: fullUrl, medium: mediumUrl, thumb: thumbUrl };
  }

  /**
   * If `src` is a data: URL (fresh photo from the camera/file picker), resize it, upload it
   * and return the public URL. Anything else (an existing https URL, empty) is returned as-is.
   */
  public async uploadIfDataUrl(
    userId: string,
    src: string | undefined,
    folder: string
  ): Promise<string | undefined> {
    if (!src || !src.startsWith('data:image/') || config.isMockEnabled) return src;
    this.validateBase64(src);
    const resized = await this.resizeImage(src, 1600, 0.85);
    const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    return this.uploadDataUrl(path, resized);
  }

  private async uploadDataUrl(path: string, dataUrl: string): Promise<string> {
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  private validateBase64(base64: string) {
    const sizeInBytes =
      base64.length * (3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB (phone photos are often 3–8MB)

    if (sizeInBytes > MAX_SIZE) {
      throw new Error('File too large. Vault limit is 10MB per photo.');
    }

    if (!base64.startsWith('data:image/')) {
      throw new Error('Invalid file format. Only JPEG, PNG, and WebP are authorized.');
    }
  }

  /** Resize with the Canvas API; always outputs JPEG. */
  private async resizeImage(base64: string, maxWidth: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Could not read that image file.'));
      img.src = base64;
    });
  }

  /** Legacy support method */
  public async uploadDiscImage(userId: string, base64: string, slot: string): Promise<string> {
    const set = await this.processAndUploadDiscImage(userId, base64, slot);
    return set.full;
  }
}

export const storage = StorageService.getInstance();
