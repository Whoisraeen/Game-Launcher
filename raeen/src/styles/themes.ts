export const themes = {
    dark: {
        '--bg-primary': '#0f172a', // Slate 900
        '--bg-secondary': '#1e293b', // Slate 800
        '--accent': '#8b5cf6', // Violet 500
        '--text-primary': '#f8fafc', // Slate 50
        '--glass-border': 'rgba(255, 255, 255, 0.1)',
        '--glass-bg': 'rgba(15, 23, 42, 0.6)'
    },
    light: {
        '--bg-primary': '#f8fafc', // Slate 50
        '--bg-secondary': '#ffffff', // White
        '--accent': '#6366f1', // Indigo 500
        '--text-primary': '#0f172a', // Slate 900
        '--glass-border': 'rgba(0, 0, 0, 0.1)',
        '--glass-bg': 'rgba(255, 255, 255, 0.8)'
    },
    cyberpunk: {
        '--bg-primary': '#000000',
        '--bg-secondary': '#12001f',
        '--accent': '#facc15', // Yellow
        '--text-primary': '#00ff9f', // Neon Green/Cyan
        '--glass-border': 'rgba(250, 204, 21, 0.3)',
        '--glass-bg': 'rgba(18, 0, 31, 0.8)'
    },
    midnight: {
        '--bg-primary': '#020617', // Slate 950
        '--bg-secondary': '#0f172a',
        '--accent': '#38bdf8', // Sky 400
        '--text-primary': '#e2e8f0',
        '--glass-border': 'rgba(56, 189, 248, 0.1)',
        '--glass-bg': 'rgba(2, 6, 23, 0.7)'
    }
};

export type ThemeName = keyof typeof themes;
