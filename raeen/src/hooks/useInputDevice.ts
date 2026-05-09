import { useEffect, useState, useRef, useCallback } from 'react';

export type InputDeviceType = 'keyboard' | 'playstation' | 'xbox';

export interface ButtonGlyphs {
    confirm: string;
    back: string;
    options: string;
    menu: string;
    navigate: string;
    lb: string;
    rb: string;
}

const GLYPH_MAP: Record<InputDeviceType, ButtonGlyphs> = {
    keyboard: {
        confirm: 'Enter',
        back: 'Esc',
        options: 'Tab',
        menu: 'M',
        navigate: '← →',
        lb: 'Q',
        rb: 'E',
    },
    playstation: {
        confirm: '✕',
        back: '○',
        options: 'OPTIONS',
        menu: '△',
        navigate: 'D-Pad',
        lb: 'L1',
        rb: 'R1',
    },
    xbox: {
        confirm: 'A',
        back: 'B',
        options: '☰',
        menu: 'Y',
        navigate: 'D-Pad',
        lb: 'LB',
        rb: 'RB',
    },
};

const PS_VENDOR_IDS = ['054c', '0ce6', '2dc8'];
const XBOX_VENDOR_IDS = ['045e', '0738', '0e6f', '1532', '24c6'];

function detectControllerType(gamepad: Gamepad): InputDeviceType {
    const id = gamepad.id.toLowerCase();

    if (id.includes('playstation') || id.includes('dualsense') || id.includes('dualshock') || id.includes('ps5') || id.includes('ps4') || id.includes('ps3')) {
        return 'playstation';
    }
    if (id.includes('xbox') || id.includes('xinput') || id.includes('microsoft')) {
        return 'xbox';
    }

    for (const vid of PS_VENDOR_IDS) {
        if (id.includes(vid)) return 'playstation';
    }
    for (const vid of XBOX_VENDOR_IDS) {
        if (id.includes(vid)) return 'xbox';
    }

    // Default to Xbox layout for unknown controllers (most common on PC)
    return 'xbox';
}

export const useInputDevice = () => {
    const [deviceType, setDeviceType] = useState<InputDeviceType>('keyboard');
    const [controllerName, setControllerName] = useState<string | null>(null);
    const lastInputRef = useRef<InputDeviceType>('keyboard');

    const switchTo = useCallback((type: InputDeviceType) => {
        if (lastInputRef.current !== type) {
            lastInputRef.current = type;
            setDeviceType(type);
        }
    }, []);

    useEffect(() => {
        const onKeyboard = () => switchTo('keyboard');

        const onGamepadConnected = (e: GamepadEvent) => {
            const type = detectControllerType(e.gamepad);
            setControllerName(e.gamepad.id);
            switchTo(type);
        };

        const onGamepadDisconnected = () => {
            setControllerName(null);
            switchTo('keyboard');
        };

        window.addEventListener('keydown', onKeyboard);
        window.addEventListener('gamepadconnected', onGamepadConnected);
        window.addEventListener('gamepaddisconnected', onGamepadDisconnected);

        // Poll for gamepad input to detect switching mid-session
        let rafId: number;
        const poll = () => {
            const gamepads = navigator.getGamepads();
            for (const gp of gamepads) {
                if (!gp) continue;
                const hasInput = gp.buttons.some(b => b.pressed) ||
                    Math.abs(gp.axes[0]) > 0.3 || Math.abs(gp.axes[1]) > 0.3;
                if (hasInput) {
                    const type = detectControllerType(gp);
                    setControllerName(gp.id);
                    switchTo(type);
                    break;
                }
            }
            rafId = requestAnimationFrame(poll);
        };
        rafId = requestAnimationFrame(poll);

        // Check if a gamepad is already connected on mount
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (gp) {
                const type = detectControllerType(gp);
                setControllerName(gp.id);
                switchTo(type);
                break;
            }
        }

        return () => {
            window.removeEventListener('keydown', onKeyboard);
            window.removeEventListener('gamepadconnected', onGamepadConnected);
            window.removeEventListener('gamepaddisconnected', onGamepadDisconnected);
            cancelAnimationFrame(rafId);
        };
    }, [switchTo]);

    return {
        deviceType,
        glyphs: GLYPH_MAP[deviceType],
        controllerName,
        isController: deviceType !== 'keyboard',
    };
};
