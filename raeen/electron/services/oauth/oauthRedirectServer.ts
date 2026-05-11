import http from 'node:http';
import { URL } from 'node:url';

export interface OAuthListenResult {
  port: number;
  redirectUri: string;
  waitForCallback: () => Promise<{ code: string; state: string }>;
  dispose: () => void;
}

/**
 * Loopback OAuth redirect (Playnite-style). Register the printed redirect URI in your Azure / Epic app.
 */
export async function startOAuthRedirectListener(
  expectedState: string,
  timeoutMs = 5 * 60 * 1000
): Promise<OAuthListenResult> {
  const basePort = Number(process.env.OAUTH_LOOPBACK_PORT || 18749);

  const server = http.createServer();
  let settled = false;

  const dispose = () => {
    try {
      server.close();
    } catch {
      /* ignore */
    }
  };

  let listenPort = basePort;
  let bound = false;
  for (let p = basePort; p < basePort + 12 && !bound; p++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const onErr = (e: Error) => reject(e);
        server.once('error', onErr);
        server.listen(p, '127.0.0.1', () => {
          server.removeListener('error', onErr);
          resolve();
        });
      });
      listenPort = p;
      bound = true;
    } catch (e: any) {
      if (e?.code !== 'EADDRINUSE') throw e;
    }
  }
  if (!bound) throw new Error('Could not bind OAuth loopback port (18749–18760 in use).');

  const waitForCallback = (): Promise<{ code: string; state: string }> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        dispose();
        reject(new Error('OAuth timed out — try again.'));
      }, timeoutMs);

      server.on('request', (req, res) => {
        if (settled) return;
        try {
          const u = new URL(req.url || '/', `http://127.0.0.1`);
          if (u.pathname !== '/callback') {
            res.writeHead(404);
            res.end();
            return;
          }
          const code = u.searchParams.get('code');
          const state = u.searchParams.get('state');
          const err = u.searchParams.get('error_description') || u.searchParams.get('error');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(
            '<!DOCTYPE html><html><body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
              '<p>You can return to the launcher.</p></body></html>'
          );

          settled = true;
          clearTimeout(timer);
          dispose();

          if (err) reject(new Error(String(err)));
          else if (!code || !state) reject(new Error('OAuth callback missing code or state'));
          else if (state !== expectedState) reject(new Error('OAuth state mismatch (possible CSRF). Retry.'));
          else resolve({ code, state });
        } catch (e) {
          settled = true;
          clearTimeout(timer);
          dispose();
          reject(e);
        }
      });
    });

  return {
    port: listenPort,
    redirectUri: `http://127.0.0.1:${listenPort}/callback`,
    waitForCallback,
    dispose,
  };
}
