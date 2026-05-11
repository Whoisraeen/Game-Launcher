/** Change this if your issue tracker lives elsewhere (env override for forks). */
export const BUG_REPORT_URL =
  (typeof import.meta.env.VITE_BUG_REPORT_URL === 'string' && import.meta.env.VITE_BUG_REPORT_URL) ||
  'https://github.com/woisr/Game-Launcher/issues/new';
