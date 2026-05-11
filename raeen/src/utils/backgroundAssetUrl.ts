/** Default hero when no custom background is set */
export const FALLBACK_LAUNCHER_BG =
  'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1716740/library_hero.jpg';

/**
 * Turn stored settings values into a URL the renderer can load under CSP.
 * - HTTPS URLs pass through
 * - file:// → safe-file:// (registered in main process)
 * - Bare Windows absolute paths → safe-file:// (legacy / mis-saved values)
 */
export function resolveBackgroundUrl(src?: string | null): string {
  if (!src || String(src).trim() === '') return FALLBACK_LAUNCHER_BG;
  const s = String(src).trim();
  if (s.startsWith('file://')) {
    return 'safe-file:///' + s.replace(/^file:\/+/, '');
  }
  if (/^[a-zA-Z]:[\\/]/.test(s)) {
    return 'safe-file:///' + s.replace(/\\/g, '/');
  }
  return s;
}
