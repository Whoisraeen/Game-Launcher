import { ipcMain, shell } from 'electron';
import log from 'electron-log';
import type { GameManager } from './gameManager';
import type { SettingsManager } from './settingsManager';
import { startOAuthRedirectListener } from './oauth/oauthRedirectServer';
import {
  loadOAuthBundle,
  saveOAuthBundle,
  clearOAuthBundle,
} from './oauth/platformOAuthStore';
import {
  buildMicrosoftAuthorizeUrl,
  exchangeMicrosoftAuthorizationCode,
  refreshMicrosoftAccessToken,
  authenticateXboxLive,
  fetchXboxTitleHistory,
  getMicrosoftClientId,
  getMicrosoftClientSecret,
  pkceChallengePair,
  randomState,
} from './oauth/microsoftXboxOAuth';
import {
  buildEpicAuthorizeUrl,
  exchangeEpicAuthorizationCode,
  refreshEpicAccessToken,
  fetchEpicOwnedCatalog,
  getEpicClientId,
  getEpicClientSecret,
} from './oauth/epicStoreOAuth';

/** Registers IPC for Playnite-style OAuth (Microsoft/Xbox + Epic web OAuth). */
export class PlatformOAuthCoordinator {
  constructor(
    private readonly gameManager: GameManager,
    private readonly settingsManager: SettingsManager
  ) {
    this.register();
  }

  private register() {
    ipcMain.handle('oauth:platformStatus', () => this.status());

    ipcMain.handle('oauth:microsoft:login', () => this.microsoftLogin());
    ipcMain.handle('oauth:microsoft:logout', () => this.microsoftLogout());
    ipcMain.handle('oauth:microsoft:syncLibrary', () => this.microsoftSyncLibrary());

    ipcMain.handle('oauth:epic:login', () => this.epicLogin());
    ipcMain.handle('oauth:epic:logout', () => this.epicLogout());
    ipcMain.handle('oauth:epic:syncLibrary', () => this.epicSyncLibrary());
  }

  private status() {
    return {
      microsoft: !!loadOAuthBundle('microsoft_xbox'),
      epic: !!loadOAuthBundle('epic_store'),
      microsoftClientConfigured: !!getMicrosoftClientId(),
      epicClientConfigured: !!getEpicClientId(),
    };
  }

  private async microsoftLogin(): Promise<{ ok: boolean; error?: string }> {
    const clientId = getMicrosoftClientId();
    if (!clientId) {
      return {
        ok: false,
        error:
          'Set MICROSOFT_OAUTH_CLIENT_ID in your .env (Azure Portal → register app → mobile/desktop redirect http://127.0.0.1:18749/callback).',
      };
    }

    const clientSecret = getMicrosoftClientSecret();
    const state = randomState();
    const { verifier, challenge } = pkceChallengePair();

    let listener: Awaited<ReturnType<typeof startOAuthRedirectListener>> | null = null;
    try {
      listener = await startOAuthRedirectListener(state);
      const authUrl = buildMicrosoftAuthorizeUrl({
        clientId,
        redirectUri: listener.redirectUri,
        state,
        codeChallenge: challenge,
      });
      await shell.openExternal(authUrl);
      const { code } = await listener.waitForCallback();

      const tok = await exchangeMicrosoftAuthorizationCode({
        clientId,
        clientSecret,
        redirectUri: listener.redirectUri,
        code,
        codeVerifier: verifier,
      });

      let meta: Record<string, unknown> = {};
      try {
        const identity = await authenticateXboxLive(tok.accessToken);
        meta = {
          xuid: identity.xuid,
          gamertag: identity.gamertag,
        };
        const settings = this.settingsManager.getAllSettings();
        const gamertag = identity.gamertag || identity.xuid;
        if (gamertag) {
          this.settingsManager.updateSetting('integrations', {
            ...settings.integrations,
            xboxId: String(gamertag),
          });
        }
      } catch (e) {
        log.warn('[OAuth Microsoft] Xbox chain deferred until sync:', e);
      }

      saveOAuthBundle('microsoft_xbox', {
        accessToken: tok.accessToken,
        refreshToken: tok.refreshToken,
        expiresAtMs: Date.now() + tok.expiresIn * 1000 - 60_000,
        meta,
      });

      return { ok: true };
    } catch (e: any) {
      log.error('[OAuth Microsoft] login failed', e);
      return { ok: false, error: e?.message || String(e) };
    } finally {
      listener?.dispose();
    }
  }

  private microsoftLogout(): { ok: boolean } {
    clearOAuthBundle('microsoft_xbox');
    const settings = this.settingsManager.getAllSettings();
    this.settingsManager.updateSetting('integrations', {
      ...settings.integrations,
      xboxId: '',
    });
    return { ok: true };
  }

  private async ensureMicrosoftAccessToken(): Promise<string> {
    const bundle = loadOAuthBundle('microsoft_xbox');
    if (!bundle?.refreshToken && !bundle?.accessToken) {
      throw new Error('Microsoft/Xbox not connected — sign in from Integrations first.');
    }
    const clientId = getMicrosoftClientId();
    const clientSecret = getMicrosoftClientSecret();
    if (bundle.refreshToken && Date.now() >= bundle.expiresAtMs) {
      const tok = await refreshMicrosoftAccessToken({
        clientId,
        clientSecret,
        refreshToken: bundle.refreshToken,
      });
      saveOAuthBundle('microsoft_xbox', {
        accessToken: tok.accessToken,
        refreshToken: tok.refreshToken,
        expiresAtMs: Date.now() + tok.expiresIn * 1000 - 60_000,
        meta: bundle.meta,
      });
      return tok.accessToken;
    }
    return bundle.accessToken;
  }

  private async microsoftSyncLibrary(): Promise<{ ok: boolean; upserted?: number; error?: string }> {
    try {
      const msToken = await this.ensureMicrosoftAccessToken();
      const identity = await authenticateXboxLive(msToken);
      const titles = await fetchXboxTitleHistory(identity);
      const bundle = loadOAuthBundle('microsoft_xbox');
      saveOAuthBundle('microsoft_xbox', {
        accessToken: bundle!.accessToken,
        refreshToken: bundle!.refreshToken,
        expiresAtMs: bundle!.expiresAtMs,
        meta: {
          ...bundle?.meta,
          xuid: identity.xuid,
          gamertag: identity.gamertag,
        },
      });
      const settings = this.settingsManager.getAllSettings();
      if (identity.gamertag || identity.xuid) {
        this.settingsManager.updateSetting('integrations', {
          ...settings.integrations,
          xboxId: String(identity.gamertag || identity.xuid),
        });
      }
      const { upserted } = await this.gameManager.mergeCatalogEntries(
        titles.map((t) => ({
          title: t.title,
          platform: 'xbox',
          platformId: t.platformId,
          coverUrl: t.coverUrl,
        }))
      );
      return { ok: true, upserted };
    } catch (e: any) {
      log.error('[OAuth Microsoft] sync failed', e);
      return { ok: false, error: e?.message || String(e) };
    }
  }

  private async epicLogin(): Promise<{ ok: boolean; error?: string }> {
    const clientId = getEpicClientId();
    if (!clientId) {
      return {
        ok: false,
        error:
          'Set EPIC_OAUTH_CLIENT_ID in .env (Epic Developer Portal → OAuth client for Epic Account Services; redirect http://127.0.0.1:18749/callback).',
      };
    }

    const clientSecret = getEpicClientSecret();
    const state = randomState();
    const { verifier, challenge } = pkceChallengePair();

    let listener: Awaited<ReturnType<typeof startOAuthRedirectListener>> | null = null;
    try {
      listener = await startOAuthRedirectListener(state);
      const authUrl = buildEpicAuthorizeUrl({
        clientId,
        redirectUri: listener.redirectUri,
        state,
        codeChallenge: challenge,
      });
      await shell.openExternal(authUrl);
      const { code } = await listener.waitForCallback();

      const tok = await exchangeEpicAuthorizationCode({
        clientId,
        clientSecret,
        redirectUri: listener.redirectUri,
        code,
        codeVerifier: verifier,
      });

      const meta: Record<string, unknown> = {};
      if (tok.accountId) meta.accountId = tok.accountId;

      saveOAuthBundle('epic_store', {
        accessToken: tok.accessToken,
        refreshToken: tok.refreshToken,
        expiresAtMs: Date.now() + tok.expiresIn * 1000 - 60_000,
        meta,
      });

      const settings = this.settingsManager.getAllSettings();
      if (tok.accountId) {
        this.settingsManager.updateSetting('integrations', {
          ...settings.integrations,
          epicId: String(tok.accountId),
        });
      }

      return { ok: true };
    } catch (e: any) {
      log.error('[OAuth Epic] login failed', e);
      return { ok: false, error: e?.message || String(e) };
    } finally {
      listener?.dispose();
    }
  }

  private epicLogout(): { ok: boolean } {
    clearOAuthBundle('epic_store');
    const settings = this.settingsManager.getAllSettings();
    this.settingsManager.updateSetting('integrations', {
      ...settings.integrations,
      epicId: '',
    });
    return { ok: true };
  }

  private async ensureEpicAccessToken(): Promise<string> {
    const bundle = loadOAuthBundle('epic_store');
    if (!bundle?.refreshToken && !bundle?.accessToken) {
      throw new Error('Epic not connected — sign in from Integrations first.');
    }
    const clientId = getEpicClientId();
    const clientSecret = getEpicClientSecret();
    if (bundle.refreshToken && Date.now() >= bundle.expiresAtMs) {
      const tok = await refreshEpicAccessToken({
        clientId,
        clientSecret,
        refreshToken: bundle.refreshToken,
      });
      saveOAuthBundle('epic_store', {
        accessToken: tok.accessToken,
        refreshToken: tok.refreshToken,
        expiresAtMs: Date.now() + tok.expiresIn * 1000 - 60_000,
        meta: bundle.meta,
      });
      return tok.accessToken;
    }
    return bundle.accessToken;
  }

  private async epicSyncLibrary(): Promise<{ ok: boolean; upserted?: number; error?: string }> {
    try {
      const access = await this.ensureEpicAccessToken();
      const items = await fetchEpicOwnedCatalog(access);
      const { upserted } = await this.gameManager.mergeCatalogEntries(
        items.map((t) => ({
          title: t.title,
          platform: 'epic',
          platformId: t.platformId,
          coverUrl: t.coverUrl,
        }))
      );
      return { ok: true, upserted };
    } catch (e: any) {
      log.error('[OAuth Epic] sync failed', e);
      return { ok: false, error: e?.message || String(e) };
    }
  }
}
