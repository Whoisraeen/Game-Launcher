import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useSettingsStore } from '../stores/settingsStore';

export interface LaunchGameState {
  showHealthCheck: boolean;
  pendingGameId: string | null;
  pendingGameName: string | null;
}

export const useLaunchGame = () => {
  const { launchGame: storeLaunchGame, games } = useGameStore();
  const { settings } = useSettingsStore();
  const [launchState, setLaunchState] = useState<LaunchGameState>({
    showHealthCheck: false,
    pendingGameId: null,
    pendingGameName: null,
  });

  const initiateLaunch = (gameId: string) => {
    const game = games.find(g => g.id === gameId);
    const gameName = game?.title || 'Unknown Game';

    // BUG-022: signal launch start so UI animations (particles, etc.) pause.
    window.dispatchEvent(new CustomEvent('raeen:gamelaunch-pending'));

    // Check if health check is enabled in settings
    const healthCheckEnabled = settings?.gaming?.preGameHealthCheck !== false;

    if (healthCheckEnabled) {
      // Show health check modal first
      setLaunchState({
        showHealthCheck: true,
        pendingGameId: gameId,
        pendingGameName: gameName,
      });
    } else {
      // Launch directly without health check
      storeLaunchGame(gameId).finally(() => {
        window.dispatchEvent(new CustomEvent('raeen:gamelaunch-done'));
      });
    }
  };

  const continueLaunch = () => {
    if (launchState.pendingGameId) {
      storeLaunchGame(launchState.pendingGameId).finally(() => {
        window.dispatchEvent(new CustomEvent('raeen:gamelaunch-done'));
      });
    } else {
      window.dispatchEvent(new CustomEvent('raeen:gamelaunch-done'));
    }
    closeHealthCheck();
  };

  const closeHealthCheck = () => {
    setLaunchState({
      showHealthCheck: false,
      pendingGameId: null,
      pendingGameName: null,
    });
    // BUG-022: cancelled launch — let animations resume.
    window.dispatchEvent(new CustomEvent('raeen:gamelaunch-done'));
  };

  return {
    initiateLaunch,
    continueLaunch,
    closeHealthCheck,
    launchState,
  };
};
