/**
 * Platform-agnostic clipboard operations
 * Web: Uses Clipboard API
 * Mobile: Would use Clipboard module
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

class WebClipboard {
  async copy(text: string): Promise<ClipboardResult> {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (error) {
      console.error('Clipboard copy error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Copy failed',
      };
    }
  }

  async paste(): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const text = await navigator.clipboard.readText();
      return { success: true, text };
    } catch (error) {
      console.error('Clipboard paste error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Paste failed',
      };
    }
  }
}

export const platformClipboard = new WebClipboard();
