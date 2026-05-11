import axios from 'axios';
import log from 'electron-log';

export function getEpicClientId(): string {
  return (process.env.EPIC_OAUTH_CLIENT_ID || process.env.VITE_EPIC_OAUTH_CLIENT_ID || '').trim();
}

export function getEpicClientSecret(): string | undefined {
  const s = (process.env.EPIC_OAUTH_CLIENT_SECRET || '').trim();
  return s || undefined;
}

export function buildEpicAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL('https://www.epicgames.com/id/api/oauth/authorize');
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('scope', 'basic_profile');
  u.searchParams.set('state', opts.state);
  u.searchParams.set('code_challenge', opts.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  return u.toString();
}

export async function exchangeEpicAuthorizationCode(opts: {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number; accountId?: string }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
    scope: 'basic_profile',
    code_verifier: opts.codeVerifier,
    client_id: opts.clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (opts.clientSecret) {
    const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await axios.post('https://api.epicgames.dev/epic/oauth/v2/token', body.toString(), {
    headers,
    timeout: 30000,
  });

  const d = res.data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    account_id?: string;
  };

  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresIn: d.expires_in ?? 7200,
    accountId: d.account_id,
  };
}

export async function refreshEpicAccessToken(opts: {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: opts.refreshToken,
    scope: 'basic_profile',
    client_id: opts.clientId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (opts.clientSecret) {
    const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await axios.post('https://api.epicgames.dev/epic/oauth/v2/token', body.toString(), {
    headers,
    timeout: 30000,
  });
  const d = res.data as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? opts.refreshToken,
    expiresIn: d.expires_in ?? 7200,
  };
}

export interface EpicCatalogEntry {
  title: string;
  platformId: string;
  coverUrl?: string;
}

/** Requires launcher-capable OAuth scopes on your Epic client when Epic allows it. */
export async function fetchEpicOwnedCatalog(accessToken: string): Promise<EpicCatalogEntry[]> {
  try {
    const res = await axios.get(
      'https://library-service.live.use1a.on.epicgames.com/library/api/public/items?sortBy=recentPlatformLastPlayedDate&platform=WINDOWS',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        timeout: 45000,
      }
    );
    const raw = res.data as { records?: any[] } | any[];
    const elements = Array.isArray(raw) ? raw : raw.records || [];
    const out: EpicCatalogEntry[] = [];
    for (const item of elements) {
      const platformId = String(
        item?.artifact?.artifactId || item?.catalogItemId || item?.itemId || item?.id || ''
      ).trim();
      const title = String(
        item?.catalogNs?.title || item?.title || item?.sandboxId || platformId || ''
      ).trim();
      if (!title || !platformId) continue;
      const coverUrl =
        typeof item?.catalogNs?.coverUrl === 'string' ? item.catalogNs.coverUrl : undefined;
      out.push({ title, platformId, coverUrl });
    }
    log.info(`[OAuth Epic] Library service returned ${out.length} items`);
    return out;
  } catch (e: any) {
    log.warn(
      '[OAuth Epic] Library fetch failed — extend Epic client scopes or keep using local manifests:',
      e?.message || e
    );
    return [];
  }
}
