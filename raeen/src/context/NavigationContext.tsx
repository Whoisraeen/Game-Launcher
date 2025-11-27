import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useGamepad } from '../hooks/useGamepad';

// A simple grid-based navigation system
// We'll register elements with coordinates (row, col) or simpler ID-based lists.
// For this prototype, we'll use a simple "focusable" registry.

interface NavigationContextType {
    focusedId: string | null;
    register: (id: string, section: string) => void;
    unregister: (id: string) => void;
    setFocus: (id: string) => void;
    activeSection: string; // 'menu', 'grid', 'details'
    setActiveSection: (section: string) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [elements, setElements] = useState<Map<string, string>>(new Map()); // id -> section
    const [activeSection, setActiveSection] = useState('grid');

    const register = useCallback((id: string, section: string) => {
        setElements(prev => new Map(prev).set(id, section));
    }, []);

    const unregister = useCallback((id: string) => {
        setElements(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
        });
    }, []);

    // Spatial navigation logic (Simplified for prototype)
    // In a real app, use something like 'lrud' library
    // Here we will just rely on the components to tell us "next" or use DOM order
    
    const moveFocus = (direction: 'Up' | 'Down' | 'Left' | 'Right') => {
        // This is a placeholder. Real spatial nav is complex.
        // Ideally, we dispatch a custom event 'nav-move' and let the active component handle it.
        window.dispatchEvent(new CustomEvent('nav-move', { detail: { direction, current: focusedId } }));
    };

    useGamepad({
        onButtonDown: (btn) => {
            if (['Up', 'Down', 'Left', 'Right'].includes(btn)) {
                moveFocus(btn as any);
            }
            if (btn === 'A') {
                if (focusedId) {
                    const el = document.getElementById(focusedId);
                    el?.click();
                }
            }
        }
    });

    return (
        <NavigationContext.Provider value={{ focusedId, register, unregister, setFocus: setFocusedId, activeSection, setActiveSection }}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) throw new Error('useNavigation must be used within NavigationProvider');
    return context;
};
