import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getDb } from '../database';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://trjmieefpmhkuimajvrk.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyam1pZWVmcG1oa3VpbWFqdnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTI4MzIsImV4cCI6MjA4MDE4ODgzMn0.UjxXCma4iojMYRKDVwx3gKa1m-u4gwXeoetdpAWbGKk';

export interface CloudProfile {
  userId: string;
  username: string;
  email: string;
  avatar?: string;
  settings: any;
  stats: {
    totalGames: number;
    totalPlaytime: number;
    achievementsUnlocked: number;
  };
  lastSynced: number;
}

export interface CloudSaveGame {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  platform: string;
  fileName: string;
  fileSize: number;
  filePath: string;
  cloudUrl: string;
  uploadedAt: number;
  lastModified: number;
  deviceName: string;
}

export interface CloudScreenshot {
  id: string;
  userId: string;
  gameId: string;
  gameName: string;
  fileName: string;
  cloudUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  fileSize: number;
  uploadedAt: number;
  isPublic: boolean;
  likes: number;
  caption?: string;
  tags: string[];
}

export class SupabaseService {
  private client: SupabaseClient;
  private currentUser: User | null = null;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.restoreSession();
  }

  /**
   * Restore previous session if exists
   */
  private async restoreSession() {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      if (session) {
        this.currentUser = session.user;
        console.log('Restored Supabase session for user:', this.currentUser.email);
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, username: string) {
    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) throw error;

      this.currentUser = data.user;

      // Create profile in database
      if (this.currentUser) {
        await this.client.from('profiles').insert({
          user_id: this.currentUser.id,
          username,
          email,
          created_at: new Date().toISOString()
        });
      }

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign in existing user
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      this.currentUser = data.user;
      console.log('Signed in user:', this.currentUser.email);

      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;

      this.currentUser = null;
      return { success: true };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Sync local profile to cloud
   */
  async syncProfileToCloud() {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const db = getDb();

      // Get local settings
      const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
      const settings: any = {};
      settingsRows.forEach(row => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      });

      // Get local stats
      const games = db.prepare('SELECT COUNT(*) as count FROM games').get() as any;
      const playtime = db.prepare('SELECT SUM(playtime_seconds) as total FROM games').get() as any;
      const achievements = db.prepare('SELECT COUNT(*) as count FROM achievements WHERE unlocked = 1').get() as any;

      const profile: CloudProfile = {
        userId: this.currentUser.id,
        username: settings.account?.username || 'Player',
        email: this.currentUser.email!,
        avatar: settings.account?.avatar,
        settings,
        stats: {
          totalGames: games.count || 0,
          totalPlaytime: playtime.total || 0,
          achievementsUnlocked: achievements.count || 0
        },
        lastSynced: Date.now()
      };

      // Upload to Supabase
      const { error } = await this.client
        .from('profiles')
        .upsert({
          user_id: this.currentUser.id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          settings: profile.settings,
          stats: profile.stats,
          last_synced: new Date(profile.lastSynced).toISOString()
        });

      if (error) throw error;

      return { success: true, profile };
    } catch (error: any) {
      console.error('Failed to sync profile to cloud:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync cloud profile to local
   */
  async syncProfileFromCloud() {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error) throw error;
      if (!data) return { success: false, error: 'Profile not found' };

      // Update local database
      const db = getDb();

      if (data.settings) {
        for (const [key, value] of Object.entries(data.settings)) {
          db.prepare(`
            INSERT INTO settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = excluded.value,
              updated_at = excluded.updated_at
          `).run(key, JSON.stringify(value), Date.now());
        }
      }

      return { success: true, profile: data };
    } catch (error: any) {
      console.error('Failed to sync profile from cloud:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload save game to cloud
   */
  async uploadSaveGame(gameId: string, gameName: string, platform: string, filePath: string) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const fileName = path.basename(filePath);
      const fileSize = fileBuffer.length;

      // Upload to Supabase Storage
      const storagePath = `saves/${this.currentUser.id}/${gameId}/${fileName}`;
      const { data: uploadData, error: uploadError } = await this.client.storage
        .from('game-saves')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/octet-stream',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.client.storage
        .from('game-saves')
        .getPublicUrl(storagePath);

      // Save metadata to database
      const saveGame: CloudSaveGame = {
        id: `save_${gameId}_${Date.now()}`,
        userId: this.currentUser.id,
        gameId,
        gameName,
        platform,
        fileName,
        fileSize,
        filePath,
        cloudUrl: urlData.publicUrl,
        uploadedAt: Date.now(),
        lastModified: Date.now(),
        deviceName: require('os').hostname()
      };

      const { error: dbError } = await this.client
        .from('cloud_saves')
        .upsert({
          id: saveGame.id,
          user_id: saveGame.userId,
          game_id: saveGame.gameId,
          game_name: saveGame.gameName,
          platform: saveGame.platform,
          file_name: saveGame.fileName,
          file_size: saveGame.fileSize,
          cloud_url: saveGame.cloudUrl,
          uploaded_at: new Date(saveGame.uploadedAt).toISOString(),
          last_modified: new Date(saveGame.lastModified).toISOString(),
          device_name: saveGame.deviceName
        });

      if (dbError) throw dbError;

      return { success: true, saveGame };
    } catch (error: any) {
      console.error('Failed to upload save game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download save game from cloud
   */
  async downloadSaveGame(saveId: string, destinationPath: string) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Get save metadata
      const { data: saveData, error: fetchError } = await this.client
        .from('cloud_saves')
        .select('*')
        .eq('id', saveId)
        .eq('user_id', this.currentUser.id)
        .single();

      if (fetchError) throw fetchError;
      if (!saveData) throw new Error('Save not found');

      // Extract storage path from URL
      const storagePath = `saves/${this.currentUser.id}/${saveData.game_id}/${saveData.file_name}`;

      // Download from Supabase Storage
      const { data: fileData, error: downloadError } = await this.client.storage
        .from('game-saves')
        .download(storagePath);

      if (downloadError) throw downloadError;

      // Save to local file
      const buffer = Buffer.from(await fileData.arrayBuffer());
      await fs.writeFile(destinationPath, buffer);

      return { success: true };
    } catch (error: any) {
      console.error('Failed to download save game:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all cloud saves for a game
   */
  async getGameCloudSaves(gameId: string): Promise<CloudSaveGame[]> {
    if (!this.currentUser) return [];

    try {
      const { data, error } = await this.client
        .from('cloud_saves')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .eq('game_id', gameId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        gameId: s.game_id,
        gameName: s.game_name,
        platform: s.platform,
        fileName: s.file_name,
        fileSize: s.file_size,
        filePath: '',
        cloudUrl: s.cloud_url,
        uploadedAt: new Date(s.uploaded_at).getTime(),
        lastModified: new Date(s.last_modified).getTime(),
        deviceName: s.device_name
      }));
    } catch (error) {
      console.error('Failed to get game cloud saves:', error);
      return [];
    }
  }

  /**
   * Upload screenshot to cloud
   */
  async uploadScreenshot(screenshot: {
    gameId: string;
    gameName: string;
    filePath: string;
    width: number;
    height: number;
    caption?: string;
    tags?: string[];
    isPublic?: boolean;
  }) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Read file
      const fileBuffer = await fs.readFile(screenshot.filePath);
      const fileName = path.basename(screenshot.filePath);
      const fileSize = fileBuffer.length;

      // Upload to Supabase Storage
      const storagePath = `screenshots/${this.currentUser.id}/${screenshot.gameId}/${fileName}`;
      const { error: uploadError } = await this.client.storage
        .from('screenshots')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = this.client.storage
        .from('screenshots')
        .getPublicUrl(storagePath);

      // Save metadata to database
      const cloudScreenshot: CloudScreenshot = {
        id: `screenshot_${Date.now()}`,
        userId: this.currentUser.id,
        gameId: screenshot.gameId,
        gameName: screenshot.gameName,
        fileName,
        cloudUrl: urlData.publicUrl,
        width: screenshot.width,
        height: screenshot.height,
        fileSize,
        uploadedAt: Date.now(),
        isPublic: screenshot.isPublic || false,
        likes: 0,
        caption: screenshot.caption,
        tags: screenshot.tags || []
      };

      const { error: dbError } = await this.client
        .from('cloud_screenshots')
        .insert({
          id: cloudScreenshot.id,
          user_id: cloudScreenshot.userId,
          game_id: cloudScreenshot.gameId,
          game_name: cloudScreenshot.gameName,
          file_name: cloudScreenshot.fileName,
          cloud_url: cloudScreenshot.cloudUrl,
          width: cloudScreenshot.width,
          height: cloudScreenshot.height,
          file_size: cloudScreenshot.fileSize,
          uploaded_at: new Date(cloudScreenshot.uploadedAt).toISOString(),
          is_public: cloudScreenshot.isPublic,
          likes: 0,
          caption: cloudScreenshot.caption,
          tags: cloudScreenshot.tags
        });

      if (dbError) throw dbError;

      return { success: true, screenshot: cloudScreenshot };
    } catch (error: any) {
      console.error('Failed to upload screenshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's cloud screenshots
   */
  async getMyCloudScreenshots(): Promise<CloudScreenshot[]> {
    if (!this.currentUser) return [];

    try {
      const { data, error } = await this.client
        .from('cloud_screenshots')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        gameId: s.game_id,
        gameName: s.game_name,
        fileName: s.file_name,
        cloudUrl: s.cloud_url,
        thumbnailUrl: s.thumbnail_url,
        width: s.width,
        height: s.height,
        fileSize: s.file_size,
        uploadedAt: new Date(s.uploaded_at).getTime(),
        isPublic: s.is_public,
        likes: s.likes || 0,
        caption: s.caption,
        tags: s.tags || []
      }));
    } catch (error) {
      console.error('Failed to get cloud screenshots:', error);
      return [];
    }
  }

  /**
   * Get public screenshots (community feed)
   */
  async getPublicScreenshots(limit: number = 50): Promise<CloudScreenshot[]> {
    try {
      const { data, error } = await this.client
        .from('cloud_screenshots')
        .select('*')
        .eq('is_public', true)
        .order('likes', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        userId: s.user_id,
        gameId: s.game_id,
        gameName: s.game_name,
        fileName: s.file_name,
        cloudUrl: s.cloud_url,
        thumbnailUrl: s.thumbnail_url,
        width: s.width,
        height: s.height,
        fileSize: s.file_size,
        uploadedAt: new Date(s.uploaded_at).getTime(),
        isPublic: s.is_public,
        likes: s.likes || 0,
        caption: s.caption,
        tags: s.tags || []
      }));
    } catch (error) {
      console.error('Failed to get public screenshots:', error);
      return [];
    }
  }

  /**
   * Like a screenshot
   */
  async likeScreenshot(screenshotId: string) {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Increment likes count
      const { data, error } = await this.client.rpc('increment_screenshot_likes', {
        screenshot_id: screenshotId
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Failed to like screenshot:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync achievements to cloud
   */
  async syncAchievementsToCloud() {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const db = getDb();
      const achievements = db.prepare('SELECT * FROM achievements WHERE unlocked = 1').all() as any[];

      const cloudAchievements = achievements.map(a => ({
        user_id: this.currentUser!.id,
        game_id: a.game_id,
        platform: a.platform,
        platform_achievement_id: a.platform_achievement_id,
        name: a.name,
        description: a.description,
        icon_url: a.icon_url,
        unlocked: true,
        unlock_time: new Date(a.unlock_time).toISOString(),
        rarity_percent: a.rarity_percent
      }));

      const { error } = await this.client
        .from('cloud_achievements')
        .upsert(cloudAchievements, {
          onConflict: 'user_id,game_id,platform_achievement_id'
        });

      if (error) throw error;

      return { success: true, count: achievements.length };
    } catch (error: any) {
      console.error('Failed to sync achievements to cloud:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cloud storage usage
   */
  async getStorageUsage() {
    if (!this.currentUser) return { used: 0, limit: 0 };

    try {
      // Get saves size
      const { data: saves } = await this.client
        .from('cloud_saves')
        .select('file_size')
        .eq('user_id', this.currentUser.id);

      // Get screenshots size
      const { data: screenshots } = await this.client
        .from('cloud_screenshots')
        .select('file_size')
        .eq('user_id', this.currentUser.id);

      const savesSize = (saves || []).reduce((sum: number, s: any) => sum + (s.file_size || 0), 0);
      const screenshotsSize = (screenshots || []).reduce((sum: number, s: any) => sum + (s.file_size || 0), 0);

      return {
        used: savesSize + screenshotsSize,
        saves: savesSize,
        screenshots: screenshotsSize,
        limit: 5 * 1024 * 1024 * 1024 // 5GB limit
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, limit: 0 };
    }
  }
}
