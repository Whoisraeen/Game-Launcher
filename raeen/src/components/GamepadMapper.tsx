import React from 'react';
import { useGamepad } from '../hooks/useGamepad';

interface GamepadMapperProps {
    onToggleBigPicture?: () => void;
}

const GamepadMapper: React.FC<GamepadMapperProps> = ({ onToggleBigPicture }) => {
    useGamepad({
        onButtonDown: (btn) => {
            // 0. Handle Global Shortcuts
            if (btn === 'Home') {
                onToggleBigPicture?.();
                return;
            }

            // 1. Dispatch Custom Event for Big Picture Mode
            const navEvent = new CustomEvent('nav-move', { detail: { direction: btn } });
            window.dispatchEvent(navEvent);

            // 2. Simulate Keyboard Events for Standard UI
            // We map gamepad buttons to standard keyboard keys
            let key: string | null = null;

            switch (btn) {
                case 'Up': key = 'ArrowUp'; break;
                case 'Down': key = 'ArrowDown'; break;
                case 'Left': key = 'ArrowLeft'; break;
                case 'Right': key = 'ArrowRight'; break;
                case 'A': key = 'Enter'; break;
                case 'B': key = 'Escape'; break;
                // We can add more mappings (LB/RB for Tab/Shift+Tab?)
            }

            if (key) {
                const activeElement = document.activeElement as HTMLElement;
                
                // Create and dispatch keydown event
                const event = new KeyboardEvent('keydown', {
                    key: key,
                    code: key,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                
                // If nothing is focused, or body is focused, try to dispatch to window/document
                if (!activeElement || activeElement === document.body) {
                    document.dispatchEvent(event);
                } else {
                    activeElement.dispatchEvent(event);
                }

                // Special handling for 'B' (Back/Escape) to blur inputs if focused
                if (btn === 'B' && activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    activeElement.blur();
                }
            }
        },
        throttle: 100 // Faster response for navigation
    });

    return null;
};

export default GamepadMapper;
