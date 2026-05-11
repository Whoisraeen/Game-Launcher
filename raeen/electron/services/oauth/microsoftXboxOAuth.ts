import axios from 'axios';
import crypto from 'crypto';
import log from 'electron-log';

export function randomState(): string {
  return base64url(crypto.randomBytes(16));
}

export function pkceChallengePair(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function getMicrosoftClientId(): string {
  return (process.env.MICROSOFT_OAUTH_CLIENT_ID || process.env.VITE_MICROSOFT_OAUTH_CLIENT_ID || '').trim();
}

export function getMicrosoftClientSecret(): string | undefined {
  const s = (process.env.MICROSOFT_OAUTH_CLIENT_SECRET || '').trim();
  return s || undefined;
}

export function buildMicrosoftAuthorizeUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const u = new URL('https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize');
  u.searchParams.set('client_id', opts.clientId);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('redirect_uri', opts.redirectUri);
  u.searchParams.set('scope', 'XboxLive.signin offline_access openid profile');
  u.searchParams.set('state', opts.state);
  u.searchParams.set('code_challenge', opts.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('response_mode', 'query');
  return u.toString();
}

export async function exchangeMicrosoftAuthorizationCode(opts: {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
    scope: 'XboxLive.signin offline_access openid profile',
  });
  if (opts.clientSecret) body.set('client_secret', opts.clientSecret);

  const res = await axios.post('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });
  const d = res.data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresIn: d.expires_in || 3600,
  };
}

export async function refreshMicrosoftAccessToken(opts: {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    grant_type: 'refresh_token',
    refresh_token: opts.refreshToken,
    scope: 'XboxLive.signin offline_access openid profile',
  });
  if (opts.clientSecret) body.set('client_secret', opts.clientSecret);

  const res = await axios.post('https://login.microsoftonline.com/consumers/oauth2/v2.0/token', body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });
  const d = res.data as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token ?? opts.refreshToken,
    expiresIn: d.expires_in || 3600,
  };
}

export interface XboxLiveIdentity {
  userHash: string;
  xstsToken: string;
  xuid: string;
  gamertag?: string;
}

/** RPS → User token → XSTS for retail Xbox Live (consumer Title Hub). */
export async function authenticateXboxLive(msAccessToken: string): Promise<XboxLiveIdentity> {
  const rpsBody = {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${msAccessToken}`,
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT',
  };

  const userAuth = await axios.post('https://user.auth.xboxlive.com/user/authenticate', rpsBody, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-xbl-contract-version': '1',
    },
    timeout: 30000,
  });

  const userToken = (userAuth.data as { Token?: string }).Token;
  if (!userToken) throw new Error('Xbox user authentication failed (no user token).');

  const xstsBody = {
    Properties: {
      SandboxId: 'RETAIL',
      UserTokens: [userToken],
    },
    RelyingParty: 'http://xboxlive.com',
    TokenType: 'JWT',
  };

  const xstsRes = await axios.post('https://xsts.auth.xboxlive.com/xsts/token', xstsBody, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-xbl-contract-version': '1',
    },
    timeout: 30000,
  });

  const xstsData = xstsRes.data as {
    Token?: string;
    DisplayClaims?: { xui?: Array<{ uhs?: string; xid?: string; gtg?: string }> };
  };
  const xstsToken = xstsData.Token;
  const xui = xstsData.DisplayClaims?.xui?.[0];
  const userHash = xui?.uhs;
  const xuid = xui?.xid;
  const gamertag = xui?.gtg;
  if (!xstsToken || !userHash || !xuid) throw new Error('XSTS token response incomplete.');

  return { userHash, xstsToken, xuid, gamertag };
}

export interface XboxCatalogEntry {
  title: string;
  platformId: string;
  coverUrl?: string;
}

export async function fetchXboxTitleHistory(identity: XboxLiveIdentity): Promise<XboxCatalogEntry[]> {
  const url = `https://titlehub.xboxlive.com/users/xuid(${identity.xuid})/titles/titlehistory/decoration/GamePass,detail,image,availability`;
  const res = await axios.get(url, {
    headers: {
      Accept: 'application/json',
      'x-xbl-contract-version': '2',
      Authorization: `XBL3.0 x=${identity.userHash};${identity.xstsToken}`,
    },
    timeout: 45000,
  });

  const titles = (res.data as { titles?: any[] }).titles || [];
  const out: XboxCatalogEntry[] = [];
  for (const t of titles) {
    const name = t?.name as string | undefined;
    const pfns = t?.pfn as string | undefined;
    const titleId = t?.titleId != null ? String(t.titleId) : '';
    const pid = pfns || titleId;
    if (!name || !pid) continue;
    let coverUrl: string | undefined;
    try {
      const uri = t?.detail?.image?.tile?.uri;
      if (typeof uri === 'string') coverUrl = uri;
    } catch {
      /* ignore */
    }
    out.push({ title: name, platformId: pid, coverUrl });
  }
  log.info(`[OAuth Xbox] Title Hub returned ${out.length} titles`);
  return out;
}
