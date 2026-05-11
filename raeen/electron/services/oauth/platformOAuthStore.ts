import { getDb } from '../../database';

export type OAuthProviderId = 'microsoft_xbox' | 'epic_store';

export interface StoredOAuthBundle {
  accessToken: string;
  refreshToken?: string;
  expiresAtMs: number;
  meta?: Record<string, unknown>;
}

export function saveOAuthBundle(provider: OAuthProviderId, bundle: StoredOAuthBundle): void {
  const db = getDb();
  const metaJson = JSON.stringify(bundle.meta || {});
  db.prepare(
    `
    INSERT INTO platform_oauth_tokens (provider, access_token, refresh_token, expires_at, meta_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(excluded.refresh_token, platform_oauth_tokens.refresh_token),
      expires_at = excluded.expires_at,
      meta_json = excluded.meta_json,
      updated_at = excluded.updated_at
  `
  ).run(
    provider,
    bundle.accessToken,
    bundle.refreshToken ?? null,
    bundle.expiresAtMs,
    metaJson,
    Date.now()
  );
}

export function loadOAuthBundle(provider: OAuthProviderId): StoredOAuthBundle | null {
  const db = getDb();
  const row = db
    .prepare('SELECT access_token, refresh_token, expires_at, meta_json FROM platform_oauth_tokens WHERE provider = ?')
    .get(provider) as
    | {
        access_token: string;
        refresh_token: string | null;
        expires_at: number;
        meta_json: string | null;
      }
    | undefined;
  if (!row) return null;
  let meta: Record<string, unknown> | undefined;
  try {
    meta = row.meta_json ? (JSON.parse(row.meta_json) as Record<string, unknown>) : undefined;
  } catch {
    meta = undefined;
  }
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token || undefined,
    expiresAtMs: row.expires_at,
    meta,
  };
}

export function clearOAuthBundle(provider: OAuthProviderId): void {
  const db = getDb();
  db.prepare('DELETE FROM platform_oauth_tokens WHERE provider = ?').run(provider);
}
