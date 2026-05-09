interface TitleHistoryEntry {
    title: string;
    gameName: string;
    mood: string;
    style: string;
    createdAt: string;
}

const MOOD_PHRASES: Record<string, string[]> = {
    chill: [
        'Vibes Only', 'Cozy Hours', 'Relaxing Session', 'No Stress Zone',
        'Calm & Collected', 'Laid Back Gameplay', 'Sunday Energy', 'Peaceful Gaming',
        'Comfort Zone', 'Good Vibes Gaming', 'Wind-down Session', 'Easy Mode Life'
    ],
    competitive: [
        'Ranked Grind', 'Going Hard', 'Tryhard Mode ON', 'Road to Top',
        'No Mercy', 'Sweat Session', 'Win or Rage', 'Climbing the Ladder',
        'Full Send', 'Locked In', 'Built Different', 'All Gas No Brakes'
    ],
    'first-time': [
        'Blind Playthrough', 'First Impressions', 'New Game Who Dis', 'Day One Adventure',
        'Fresh Eyes', 'Learning the Ropes', 'Never Played Before', 'Going In Blind',
        'First Timer', 'Discovering Something New', 'Reaction Stream', 'Zero Experience'
    ],
    speedrun: [
        'PB Attempts', 'Speed Demon', 'Going Fast', 'WR Pace?!',
        'Frame Perfect', 'Optimized Route', 'Gotta Go Fast', 'Sub-Hour Attempts',
        'RNG Prayers', 'Skip Found?!', 'Reset City', 'Time to Grind'
    ],
    funny: [
        'Chaos Mode', 'Meme Run', 'Things Will Go Wrong', 'Comedy Gaming',
        'Fail Compilation Live', 'Clown Hours', 'Entertainment Only', 'Brain Off',
        'Maximum Chaos', 'What Could Go Wrong', 'Unhinged Gameplay', 'Laughs Guaranteed'
    ],
    horror: [
        'Jump Scare Warning', 'Lights Off', 'Don\'t Watch Alone', 'Heart Rate Monitor',
        'Screaming Guaranteed', 'Nightmare Fuel', 'Send Help', 'I\'m Scared',
        'Horror Night', 'No Sleep Tonight', 'Pure Terror', 'Courage Test'
    ],
    grinding: [
        'Long Session', 'Infinite Grind', 'AFK Brain', 'Numbers Go Up',
        'XP Farm', 'No Life Mode', 'Marathon Stream', 'The Grind Never Stops',
        'Autopilot Mode', 'Progress Check', 'Loot & Repeat', 'Endgame Push'
    ]
};

const STYLE_TEMPLATES: Record<string, string[]> = {
    energetic: [
        '🔥 {mood_phrase} {game} 🔥',
        '{game} | {mood_phrase} | !commands',
        '⚡ {mood_phrase} - {game} ⚡',
        '{game} 🎮 {mood_phrase}'
    ],
    minimal: [
        '{game} - {mood_phrase}',
        '{mood_phrase} | {game}',
        '{game} stream',
        '{mood_phrase} [{game}]'
    ],
    professional: [
        '{game} | {mood_phrase} | Day {day}',
        '[LIVE] {game} - {mood_phrase}',
        '{game} Gameplay | {mood_phrase}',
        '{mood_phrase} - Playing {game}'
    ],
    clickbait: [
        '🚨 {mood_phrase}!! {game} 🚨 (!socials)',
        'CAN WE {mood_phrase}?! | {game} 😱',
        '{game} but {mood_phrase} 🤯',
        '⚠️ {mood_phrase} ⚠️ {game} | !donate'
    ]
};

export class StreamHelperService {
    private titleHistory: TitleHistoryEntry[] = [];

    generateTitle(gameName: string, mood: string, style: string): string {
        const moodKey = mood.toLowerCase();
        const styleKey = style.toLowerCase();

        const phrases = MOOD_PHRASES[moodKey] || MOOD_PHRASES['chill'];
        const templates = STYLE_TEMPLATES[styleKey] || STYLE_TEMPLATES['minimal'];

        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        const template = templates[Math.floor(Math.random() * templates.length)];

        const day = Math.floor(Math.random() * 30) + 1;
        const title = template
            .replace(/{game}/g, gameName)
            .replace(/{mood_phrase}/g, phrase)
            .replace(/{day}/g, String(day));

        this.titleHistory.unshift({
            title,
            gameName,
            mood,
            style,
            createdAt: new Date().toISOString()
        });

        if (this.titleHistory.length > 50) {
            this.titleHistory = this.titleHistory.slice(0, 50);
        }

        return title;
    }

    getTitleHistory(): TitleHistoryEntry[] {
        return this.titleHistory;
    }

    getMoods(): string[] {
        return Object.keys(MOOD_PHRASES);
    }

    getStyles(): string[] {
        return Object.keys(STYLE_TEMPLATES);
    }
}
