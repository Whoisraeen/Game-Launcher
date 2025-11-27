import { useEffect, useRef, useState } from 'react';

type GamepadButton = 'A' | 'B' | 'X' | 'Y' | 'LB' | 'RB' | 'LT' | 'RT' | 'Back' | 'Start' | 'LS' | 'RS' | 'Up' | 'Down' | 'Left' | 'Right' | 'Home';

const BUTTON_MAP: { [key: number]: GamepadButton } = {
    0: 'A', 1: 'B', 2: 'X', 3: 'Y',
    4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
    8: 'Back', 9: 'Start', 10: 'LS', 11: 'RS',
    12: 'Up', 13: 'Down', 14: 'Left', 15: 'Right',
    16: 'Home'
};

interface UseGamepadOptions {
    onButtonDown?: (button: GamepadButton) => void;
    threshold?: number;
    throttle?: number; // ms between inputs
}

export const useGamepad = ({ onButtonDown, threshold = 0.5, throttle = 150 }: UseGamepadOptions = {}) => {
    const [connected, setConnected] = useState(false);
    const lastInputTime = useRef<number>(0);
    const requestRef = useRef<number>();
    const onButtonDownRef = useRef(onButtonDown);

    // Keep ref updated to avoid stale closures in the loop
    useEffect(() => {
        onButtonDownRef.current = onButtonDown;
    }, [onButtonDown]);

    useEffect(() => {
        const scanGamepads = () => {
            const gamepads = navigator.getGamepads();
            let gp: Gamepad | null = null;
            
            // Find first active gamepad
            for (const g of gamepads) {
                if (g) {
                    gp = g;
                    break;
                }
            }

            if (gp) {
                if (!connected) setConnected(true);
                
                const now = Date.now();
                if (now - lastInputTime.current > throttle) {
                    // Check buttons
                    gp.buttons.forEach((b, i) => {
                        if (b.pressed) {
                            const buttonName = BUTTON_MAP[i];
                            if (buttonName && onButtonDownRef.current) {
                                onButtonDownRef.current(buttonName);
                                lastInputTime.current = now;
                            }
                        }
                    });

                    // Check Axes for D-pad emulation (Left Stick)
                    if (gp.axes[0] < -threshold) {
                        onButtonDownRef.current?.('Left');
                        lastInputTime.current = now;
                    } else if (gp.axes[0] > threshold) {
                        onButtonDownRef.current?.('Right');
                        lastInputTime.current = now;
                    }

                    if (gp.axes[1] < -threshold) {
                        onButtonDownRef.current?.('Up');
                        lastInputTime.current = now;
                    } else if (gp.axes[1] > threshold) {
                        onButtonDownRef.current?.('Down');
                        lastInputTime.current = now;
                    }
                }
            } else {
                if (connected) setConnected(false);
            }

            requestRef.current = requestAnimationFrame(scanGamepads);
        };

        const handleConnect = () => setConnected(true);
        const handleDisconnect = () => setConnected(false);

        window.addEventListener("gamepadconnected", handleConnect);
        window.addEventListener("gamepaddisconnected", handleDisconnect);

        requestRef.current = requestAnimationFrame(scanGamepads);

        return () => {
            window.removeEventListener("gamepadconnected", handleConnect);
            window.removeEventListener("gamepaddisconnected", handleDisconnect);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [connected, threshold, throttle]); // Removed onButtonDown from deps

    return { connected };
};
