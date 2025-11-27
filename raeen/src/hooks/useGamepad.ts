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
                            if (buttonName && onButtonDown) {
                                onButtonDown(buttonName);
                                lastInputTime.current = now;
                            }
                        }
                    });

                    // Check Axes for D-pad emulation (Left Stick)
                    // Axis 0: Left/Right (-1 to 1)
                    // Axis 1: Up/Down (-1 to 1)
                    if (gp.axes[0] < -threshold) {
                        onButtonDown?.('Left');
                        lastInputTime.current = now;
                    } else if (gp.axes[0] > threshold) {
                        onButtonDown?.('Right');
                        lastInputTime.current = now;
                    }

                    if (gp.axes[1] < -threshold) {
                        onButtonDown?.('Up');
                        lastInputTime.current = now;
                    } else if (gp.axes[1] > threshold) {
                        onButtonDown?.('Down');
                        lastInputTime.current = now;
                    }
                }
            } else {
                if (connected) setConnected(false);
            }

            requestRef.current = requestAnimationFrame(scanGamepads);
        };

        window.addEventListener("gamepadconnected", () => {
            console.log("Gamepad connected");
            setConnected(true);
        });

        window.addEventListener("gamepaddisconnected", () => {
            console.log("Gamepad disconnected");
            setConnected(false);
        });

        requestRef.current = requestAnimationFrame(scanGamepads);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [connected, onButtonDown, threshold, throttle]);

    return { connected };
};
