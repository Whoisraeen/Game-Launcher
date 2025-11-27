import { useCallback } from 'react';

// Simple synthesized sound effects using Web Audio API
// No external assets required.

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const useSound = () => {
    
    const playTone = useCallback((freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }, []);

    const playMove = useCallback(() => {
        // Subtle "woosh" / click
        playTone(200, 'sine', 0.1, 0.05);
    }, [playTone]);

    const playSelect = useCallback(() => {
        // High pitch "confirm"
        playTone(400, 'sine', 0.15, 0.05);
        setTimeout(() => playTone(600, 'sine', 0.2, 0.05), 50);
    }, [playTone]);

    const playBack = useCallback(() => {
        // Lower pitch "cancel"
        playTone(300, 'triangle', 0.15, 0.05);
        setTimeout(() => playTone(200, 'triangle', 0.2, 0.05), 50);
    }, [playTone]);

    return { playMove, playSelect, playBack };
};
