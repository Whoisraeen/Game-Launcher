import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, ArrowRight, LayoutGrid, ShoppingBag, Heart, Users, MessagesSquare, Newspaper,
  BarChart2, Trophy, Wrench, Package, Camera, Video, Cpu, AlertTriangle, Download, Settings as SettingsIcon,
  ListTodo, Target, Calendar, Zap, HardDrive, MonitorSmartphone, Crosshair as CrosshairIcon, HeartPulse,
  BrainCircuit, Folder, Sparkles, Activity, MonitorPlay, Shuffle,
} from 'lucide-react';
import Fuse from 'fuse.js';
import { useGameStore } from '../stores/gameStore';
import { CachedImage } from './CachedImage';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
  onToggleBigPicture: () => void;
  onToggleOverlay: () => void;
}

interface PaletteAction {
  id: string;
  type: 'page' | 'action' | 'game';
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string;
  shortcut?: string;
  onRun: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onNavigate, onToggleBigPicture, onToggleOverlay }) => {
  const { games, launchGame, setSelectedCollectionId } = useGameStore();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const go = (page: string) => { setSelectedCollectionId(null); onNavigate(page); onClose(); };

  const pageActions: PaletteAction[] = useMemo(() => [
    { id: 'p:Library',        type: 'page', label: 'Library',         hint: 'All Games',         icon: <LayoutGrid size={16} />,        onRun: () => go('Library') },
    { id: 'p:Collections',    type: 'page', label: 'Collections',     icon: <Folder size={16} />,            onRun: () => go('Collections') },
    { id: 'p:Wishlist',       type: 'page', label: 'Wishlist',        icon: <Heart size={16} />,             onRun: () => go('Wishlist') },
    { id: 'p:Store',          type: 'page', label: 'Store',           icon: <ShoppingBag size={16} />,       onRun: () => go('Store') },
    { id: 'p:Backlog',        type: 'page', label: 'Backlog',         icon: <ListTodo size={16} />,          onRun: () => go('Backlog') },
    { id: 'p:Goals',          type: 'page', label: 'Playtime Goals',  icon: <Target size={16} />,            onRun: () => go('Goals') },
    { id: 'p:Rotation',       type: 'page', label: 'Rotation',        icon: <Calendar size={16} />,          onRun: () => go('Rotation') },
    { id: 'p:Friends',        type: 'page', label: 'Friends',         icon: <Users size={16} />,             onRun: () => go('Friends') },
    { id: 'p:SocialHub',      type: 'page', label: 'Social Hub',      icon: <MessagesSquare size={16} />,    onRun: () => go('SocialHub') },
    { id: 'p:Reviews',        type: 'page', label: 'Reviews',         icon: <Sparkles size={16} />,          onRun: () => go('Reviews') },
    { id: 'p:News',           type: 'page', label: 'News',            icon: <Newspaper size={16} />,         onRun: () => go('News') },
    { id: 'p:Analytics',      type: 'page', label: 'Analytics',       icon: <BarChart2 size={16} />,         onRun: () => go('Analytics') },
    { id: 'p:Achievements',   type: 'page', label: 'Achievements',    icon: <Trophy size={16} />,            onRun: () => go('Achievements') },
    { id: 'p:SmartDashboard', type: 'page', label: 'Smart Dashboard', icon: <BrainCircuit size={16} />,      onRun: () => go('SmartDashboard') },
    { id: 'p:Widgets',        type: 'page', label: 'Widgets',         icon: <LayoutGrid size={16} />,        onRun: () => go('Widgets') },
    { id: 'p:Mods',           type: 'page', label: 'Mods',            icon: <Wrench size={16} />,            onRun: () => go('Mods') },
    { id: 'p:DLCManager',     type: 'page', label: 'DLC Manager',     icon: <Package size={16} />,           onRun: () => go('DLCManager') },
    { id: 'p:Screenshots',    type: 'page', label: 'Screenshots',     icon: <Camera size={16} />,            onRun: () => go('Screenshots') },
    { id: 'p:Studio',         type: 'page', label: 'Studio',          icon: <Video size={16} />,             onRun: () => go('Studio') },
    { id: 'p:SaveManager',    type: 'page', label: 'Save Manager',    icon: <Download size={16} />,          onRun: () => go('SaveManager') },
    { id: 'p:AimTrainer',     type: 'page', label: 'Aim Trainer',     icon: <Zap size={16} />,               onRun: () => go('AimTrainer') },
    { id: 'p:Crosshair',      type: 'page', label: 'Crosshair',       icon: <CrosshairIcon size={16} />,     onRun: () => go('Crosshair') },
    { id: 'p:Wellness',       type: 'page', label: 'Wellness',        icon: <HeartPulse size={16} />,        onRun: () => go('Wellness') },
    { id: 'p:HardwareLab',    type: 'page', label: 'Hardware Lab',    icon: <Cpu size={16} />,               onRun: () => go('HardwareLab') },
    { id: 'p:ShaderCache',    type: 'page', label: 'Shader Cache',    icon: <HardDrive size={16} />,         onRun: () => go('ShaderCache') },
    { id: 'p:Drivers',        type: 'page', label: 'Drivers',         icon: <MonitorSmartphone size={16} />, onRun: () => go('Drivers') },
    { id: 'p:Troubleshooter', type: 'page', label: 'Fix Issues',      icon: <AlertTriangle size={16} />,     onRun: () => go('Troubleshooter') },
    { id: 'p:Settings',       type: 'page', label: 'Settings',        icon: <SettingsIcon size={16} />, shortcut: 'Ctrl+,', onRun: () => go('Settings') },
  ], []);

  const builtinActions: PaletteAction[] = useMemo(() => [
    { id: 'a:bigpicture',   type: 'action', label: 'Toggle Big Picture Mode',  icon: <MonitorPlay size={16} />, onRun: () => { onToggleBigPicture(); onClose(); } },
    { id: 'a:overlay',      type: 'action', label: 'Toggle Performance Overlay', icon: <Activity size={16} />,  onRun: () => { onToggleOverlay(); onClose(); } },
    { id: 'a:randomgame',   type: 'action', label: 'Quick Play (random game)',   icon: <Shuffle size={16} />,
      onRun: () => {
        const playable = games.filter(g => !g.isHidden);
        if (!playable.length) return;
        const pick = playable[Math.floor(Math.random() * playable.length)];
        launchGame(pick.id); onClose();
      } },
    { id: 'a:decisionhelper', type: 'action', label: 'Decision Helper (what to play)', icon: <Sparkles size={16} />,
      onRun: () => { window.dispatchEvent(new CustomEvent('open-decision-helper')); onClose(); } },
  ], [games, launchGame, onToggleBigPicture, onToggleOverlay, onClose]);

  const gameActions: PaletteAction[] = useMemo(() =>
    games.slice(0, 500).map<PaletteAction>(g => ({
      id: `g:${g.id}`,
      type: 'game',
      label: g.title,
      hint: g.platform,
      icon: g.cover ? <img src={g.cover} alt="" className="w-7 h-9 rounded object-cover" /> : <Play size={16} />,
      keywords: `${g.title} ${g.platform} ${(g.tags || []).join(' ')} ${g.genre || ''}`,
      onRun: () => { launchGame(g.id); onClose(); },
    })),
    [games, launchGame, onClose]
  );

  const allActions = useMemo(() => [...pageActions, ...builtinActions, ...gameActions], [pageActions, builtinActions, gameActions]);

  const fuse = useMemo(() => new Fuse(allActions, {
    keys: ['label', 'hint', 'keywords'],
    threshold: 0.4,
    ignoreLocation: true,
  }), [allActions]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // Default: pages then top actions
      return [...pageActions.slice(0, 8), ...builtinActions];
    }
    return fuse.search(query).slice(0, 30).map(r => r.item);
  }, [query, fuse, pageActions, builtinActions]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(results.length - 1, i + 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(0, i - 1)); }
      if (e.key === 'Enter')     { e.preventDefault(); results[activeIndex]?.onRun(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: -8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#0b1220]/95 border border-white/10 rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/5"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
              <Search size={16} className="text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search pages, games, actions…"
                className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-sm"
              />
              <kbd className="text-[10px] font-mono text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
            </div>

            <div className="max-h-[55vh] overflow-y-auto custom-scrollbar py-1">
              {results.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-gray-500">No matches.</div>
              ) : (
                results.map((item, i) => (
                  <button
                    key={item.id}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => item.onRun()}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIndex ? 'bg-white/[0.06] text-white' : 'text-gray-300 hover:bg-white/[0.03]'}`}
                  >
                    <span className="w-7 h-7 rounded-md bg-white/5 flex items-center justify-center text-gray-300 flex-shrink-0">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      {item.hint && <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">{item.hint}</div>}
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 mr-2">
                      {item.type === 'page' ? 'Go to' : item.type === 'action' ? 'Action' : 'Launch'}
                    </span>
                    {item.shortcut && <kbd className="text-[10px] font-mono text-gray-500 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{item.shortcut}</kbd>}
                    <ArrowRight size={12} className={`${i === activeIndex ? 'text-white' : 'text-gray-600'}`} />
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
              <div className="flex items-center gap-3">
                <span><kbd className="bg-white/5 border border-white/10 px-1 rounded">↑↓</kbd> navigate</span>
                <span><kbd className="bg-white/5 border border-white/10 px-1 rounded">↵</kbd> open</span>
                <span><kbd className="bg-white/5 border border-white/10 px-1 rounded">esc</kbd> close</span>
              </div>
              <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
