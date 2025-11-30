import React from 'react';
import {
    Play, Download, Trash2, Edit, EyeOff, Eye,
    Folder, Share2, Heart, Link
} from 'lucide-react';
import { Game } from '../types';
import { useGameStore } from '../stores/gameStore';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator, ContextMenuHeader } from './ContextMenu';

interface GameContextMenuProps {
    game: Game;
    x: number;
    y: number;
    onClose: () => void;
    onEdit: () => void;
    onMerge: () => void;
}

export const GameContextMenu: React.FC<GameContextMenuProps> = ({ game, x, y, onClose, onEdit, onMerge }) => {
    const store = useGameStore();

    const handleAction = async (action: () => Promise<void> | void) => {
        onClose();
        await action();
    };

    return (
        <ContextMenu x={x} y={y} onClose={onClose}>
            {/* 1. Play / Install */}
            {game.status === 'installed' ? (
                <ContextMenuItem
                    icon={<Play size={16} />}
                    label="Play"
                    onClick={() => handleAction(() => store.launchGame(game.id))}
                    shortcut="Enter"
                />
            ) : (
                <ContextMenuItem
                    icon={<Download size={16} />}
                    label="Install"
                    onClick={() => handleAction(() => store.launchGame(game.id))} // Launching uninstalled game usually triggers install flow
                />
            )}

            <ContextMenuSeparator />

            {/* 2. Edit */}
            <ContextMenuItem
                icon={<Edit size={16} />}
                label="Edit..."
                onClick={() => {
                    onClose();
                    onEdit();
                }}
                shortcut="F3"
            />
            <ContextMenuItem
                icon={<Link size={16} />}
                label="Merge..."
                onClick={() => {
                    onClose();
                    onMerge();
                }}
            />

            <ContextMenuSeparator />

            {/* 3. Remove / Hide */}
            <ContextMenuItem
                icon={game.isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                label={game.isHidden ? "Unarchive" : "Archive"}
                onClick={() => handleAction(() => store.toggleHidden(game.id, !game.isHidden))}
            />
            <ContextMenuItem
                icon={<Trash2 size={16} />}
                label="Uninstall"
                danger
                disabled={game.status !== 'installed'}
                onClick={() => handleAction(() => store.uninstallGame(game.id))}
            />

            <ContextMenuSeparator />

            {/* 4. Categorize / Favorite */}
            <ContextMenuItem
                icon={<Heart size={16} className={game.isFavorite ? "fill-current" : ""} />}
                label={game.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                onClick={() => handleAction(() => store.toggleFavorite(game.id, !game.isFavorite))}
            />

            <ContextMenuSeparator />

            {/* 5. Desktop Shortcut */}
            <ContextMenuItem
                icon={<Share2 size={16} />}
                label="Create Desktop Shortcut"
                onClick={() => handleAction(() => store.createShortcut(game.id))}
            />

            <ContextMenuSeparator />

            {/* 6. Open... */}
            <ContextMenuHeader title="Open" />
            <ContextMenuItem
                icon={<Folder size={16} />}
                label="Installation Folder"
                disabled={!game.installPath}
                onClick={() => handleAction(() => store.openInstallFolder(game.id))}
            />
        </ContextMenu>
    );
};
