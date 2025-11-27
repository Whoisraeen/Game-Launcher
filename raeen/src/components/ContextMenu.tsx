import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Adjust position to keep menu within viewport
    const style: React.CSSProperties = {
        top: y,
        left: x,
    };

    // Simple adjustment logic (can be enhanced)
    if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            style.left = x - rect.width;
        }
        if (y + rect.height > window.innerHeight) {
            style.top = y - rect.height;
        }
    }

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[220px] bg-[#1a1b26] border border-white/10 rounded-lg shadow-xl py-1 text-sm text-gray-200 animate-in fade-in zoom-in-95 duration-100"
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>,
        document.body
    );
};

interface ContextMenuItemProps {
    icon?: React.ReactNode;
    label: string;
    shortcut?: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
    hasSubmenu?: boolean;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
    icon,
    label,
    shortcut,
    onClick,
    danger,
    disabled,
    hasSubmenu
}) => {
    return (
        <button
            onClick={() => {
                if (!disabled) {
                    onClick();
                }
            }}
            disabled={disabled}
            className={`w-full px-3 py-2 flex items-center justify-between group transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
                ${danger ? 'text-red-400 hover:text-red-300' : ''}
            `}
        >
            <div className="flex items-center gap-3">
                {icon && <span className="text-gray-400 group-hover:text-white transition-colors">{icon}</span>}
                <span>{label}</span>
            </div>
            {shortcut && <span className="text-xs text-gray-500">{shortcut}</span>}
            {hasSubmenu && <span className="text-gray-500">›</span>}
        </button>
    );
};

export const ContextMenuSeparator: React.FC = () => (
    <div className="h-px bg-white/10 my-1 mx-2" />
);

export const ContextMenuHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
    </div>
);
