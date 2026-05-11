import { useEffect, useState } from 'react';
import { FALLBACK_LAUNCHER_BG } from '../utils/backgroundAssetUrl';

/**
 * Resolve launcher wallpaper for <img src>. Local paths (safe-file / disk) are
 * loaded in the main process and returned as data URLs so CSP and custom
 * protocols cannot block the preview or main window background.
 */
export function useLauncherBackgroundSrc(stored?: string | null): string {
  const [src, setSrc] = useState<string>(FALLBACK_LAUNCHER_BG);

  useEffect(() => {
    let cancelled = false;
    const raw = stored?.trim() ?? '';

    if (!raw) {
      setSrc(FALLBACK_LAUNCHER_BG);
      return () => {
        cancelled = true;
      };
    }

    if (/^https?:\/\//i.test(raw)) {
      setSrc(raw);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const dataUrl = await window.ipcRenderer.invoke('settings:getBackgroundDataUrl', raw);
        if (!cancelled && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
          setSrc(dataUrl);
        } else if (!cancelled) {
          setSrc(FALLBACK_LAUNCHER_BG);
        }
      } catch {
        if (!cancelled) setSrc(FALLBACK_LAUNCHER_BG);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stored]);

  return src;
}
