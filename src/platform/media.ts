/**
 * Platform-agnostic media picker
 * Web: Uses file input with capture attribute for camera access
 * Mobile: Implemented by the native shell (e.g., via Capacitor plugins)
 */

export interface MediaPickerOptions {
  mediaType?: 'photo' | 'video' | 'document' | 'all';
  multiple?: boolean;
  maxSize?: number; // in bytes
  quality?: number; // 0-1 for image compression
}

export interface MediaPickerResult {
  success: boolean;
  files?: File[];
  error?: string;
}

export interface MediaService {
  pickMedia: (options?: MediaPickerOptions) => Promise<MediaPickerResult>;
  takePicture: (options?: { quality?: number }) => Promise<MediaPickerResult>;
}

class WebMediaPicker implements MediaService {
  private createFileInput(options: MediaPickerOptions): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options.multiple ?? false;

    // Set accept attribute based on media type
    const acceptMap: Record<string, string> = {
      photo: 'image/*',
      video: 'video/*',
      document: '.pdf,.doc,.docx,.txt',
      all: '*/*',
    };

    input.accept = acceptMap[options.mediaType ?? 'all'];

    return input;
  }

  async pickMedia(options: MediaPickerOptions = {}): Promise<MediaPickerResult> {
    return new Promise(resolve => {
      const input = this.createFileInput(options);

      input.onchange = () => {
        const files = Array.from(input.files || []);

        // Validate file size if maxSize is specified
        if (options.maxSize) {
          const oversizedFiles = files.filter(f => f.size > options.maxSize!);
          if (oversizedFiles.length > 0) {
            resolve({
              success: false,
              error: `File size exceeds ${options.maxSize / 1024 / 1024}MB limit`,
            });
            return;
          }
        }

        resolve({ success: true, files });
      };

      input.oncancel = () => {
        resolve({ success: false, error: 'User cancelled' });
      };

      input.click();
    });
  }

  async takePicture(options: { quality?: number } = {}): Promise<MediaPickerResult> {
    // Web: Opens camera via file input
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera by default

      input.onchange = () => {
        const files = Array.from(input.files || []);
        resolve({ success: true, files });
      };

      input.oncancel = () => {
        resolve({ success: false, error: 'User cancelled' });
      };

      input.click();
    });
  }
}

export const platformMedia: MediaService = new WebMediaPicker();
