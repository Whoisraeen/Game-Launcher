import React, { useEffect, useRef, useMemo } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
    fadeDirection: number;
}

const PARTICLE_COUNT = 40;

const ParticleBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);

    const particles = useMemo(() => {
        const arr: Particle[] = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            arr.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.15,
                speedY: (Math.random() - 0.5) * 0.1 - 0.05,
                opacity: Math.random() * 0.5 + 0.1,
                fadeDirection: Math.random() > 0.5 ? 1 : -1,
            });
        }
        return arr;
    }, []);

    useEffect(() => {
        particlesRef.current = particles;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        };
        resize();
        window.addEventListener('resize', resize);

        // BUG-022: pause the animation loop when:
        //   • the window/tab is hidden,
        //   • a game launch is in progress (custom 'raeen:gamelaunch-pending'/'raeen:gamelaunch-done' events).
        // This keeps the main thread free during the moments that most
        // affect input responsiveness without requiring a full OffscreenCanvas
        // + Worker rewrite.
        let paused = document.visibilityState !== 'visible';
        let launching = false;

        const animate = () => {
            if (!paused && !launching) {
                const w = canvas.offsetWidth;
                const h = canvas.offsetHeight;
                ctx.clearRect(0, 0, w, h);

                for (const p of particlesRef.current) {
                    p.x += p.speedX;
                    p.y += p.speedY;
                    p.opacity += p.fadeDirection * 0.003;

                    if (p.opacity >= 0.6) p.fadeDirection = -1;
                    if (p.opacity <= 0.05) p.fadeDirection = 1;

                    if (p.x < -5) p.x = 105;
                    if (p.x > 105) p.x = -5;
                    if (p.y < -5) p.y = 105;
                    if (p.y > 105) p.y = -5;

                    const px = (p.x / 100) * w;
                    const py = (p.y / 100) * h;

                    ctx.beginPath();
                    ctx.arc(px, py, p.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                    ctx.fill();
                }
            }
            animRef.current = requestAnimationFrame(animate);
        };

        const onVisibility = () => { paused = document.visibilityState !== 'visible'; };
        const onLaunchStart = () => { launching = true; };
        const onLaunchEnd = () => { launching = false; };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('raeen:gamelaunch-pending', onLaunchStart);
        window.addEventListener('raeen:gamelaunch-done', onLaunchEnd);

        animRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('raeen:gamelaunch-pending', onLaunchStart);
            window.removeEventListener('raeen:gamelaunch-done', onLaunchEnd);
        };
    }, [particles]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
            style={{ opacity: 0.6 }}
        />
    );
};

export default ParticleBackground;
