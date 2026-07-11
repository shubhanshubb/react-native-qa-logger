import { Share } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

// Optional override so hosts can supply their own clipboard implementation.
let customClipboard: { setString: (value: string) => void } | null = null;

// Register a custom clipboard (falls back to the bundled one when not set).
export function setClipboard(
  clipboard: { setString: (value: string) => void } | null
): void {
  customClipboard = clipboard;
}

// Prefer a registered override, otherwise use the bundled clipboard.
function resolveClipboard(): { setString: (value: string) => void } | null {
  if (customClipboard && typeof customClipboard.setString === 'function') {
    return customClipboard;
  }
  if (Clipboard && typeof Clipboard.setString === 'function') {
    return Clipboard;
  }
  return null;
}

// Copy text to the clipboard; returns true on success, false if unavailable.
export function copyToClipboard(text: string): boolean {
  const clipboard = resolveClipboard();
  if (clipboard) {
    clipboard.setString(text);
    return true;
  }
  return false;
}

// Share text via the native share sheet.
export async function shareText(text: string, title?: string): Promise<void> {
  try {
    await Share.share({ message: text, title });
  } catch {
    // User dismissed the share sheet or sharing is unavailable.
  }
}

// Copy to clipboard, falling back to the share sheet; returns true if copied.
export async function copyOrShare(text: string, title?: string): Promise<boolean> {
  if (copyToClipboard(text)) {
    return true;
  }
  await shareText(text, title);
  return false;
}
