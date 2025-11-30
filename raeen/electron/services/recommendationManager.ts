export interface Game {
    id: string;
    title: string;
    playtime: number;
    lastPlayed?: number;
    tags?: string[] | string;
    rating?: number;
    playStatus?: string;
    genre?: string;
    platform: string;
    cover?: string;
    hero?: string;
    isInstalled?: boolean;
    isHidden?: boolean;
    addedAt?: number;
}

export class RecommendationManager {

    /**
     * Returns a "Smart Random" game based on a specific criteria/mood.
     */
    getSmartSuggestion(games: Game[], criteria: 'backlog' | 'replay' | 'quick' | 'forgotten' | 'random', maxMinutes?: number): Game | null {
        const parsedGames = this.parseGames(games);
        let candidates: Game[] = [];

        // Helper to check if game fits time constraint
        // Without real HowLongToBeat data, we use genres as a proxy for "quick" sessions (< 30-60 mins)
        // or check if it's a game the user plays in short bursts (avg session duration - if we had it per game)
        // For now, we'll use the Genre proxy for strict time limits.
        const fitsTime = (g: Game) => {
            if (!maxMinutes) return true;
            if (maxMinutes >= 120) return true; // unlimited essentially

            const quickGenres = ['Arcade', 'Fighting', 'Racing', 'Platformer', 'Shooter', 'Sports', 'Indie', 'Puzzle'];
            const isQuickGenre = g.genre && quickGenres.some(q => g.genre?.includes(q));
            const isRoguelike = (g.tags as string[]).some(t => t.toLowerCase().includes('roguelike'));

            return isQuickGenre || isRoguelike;
        };

        switch (criteria) {
            case 'backlog':
                // Installed, < 2 hours played, not hidden/completed
                candidates = parsedGames.filter(g => 
                    g.isInstalled && 
                    !g.isHidden && 
                    (g.playtime || 0) < 120 && // < 2 hours
                    g.playStatus !== 'completed' && 
                    g.playStatus !== 'dropped' &&
                    fitsTime(g)
                );
                break;
            
            case 'replay':
                // High playtime or high rating, but not played recently
                const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
                candidates = parsedGames.filter(g => 
                    g.isInstalled && 
                    !g.isHidden && 
                    ((g.playtime || 0) > 600 || (g.rating || 0) >= 4) && // > 10 hours or highly rated
                    (!g.lastPlayed || g.lastPlayed < threeMonthsAgo) &&
                    fitsTime(g)
                );
                break;

            case 'quick':
                // "Pick up and play" genres (Arcade, Fighting, Racing, Platformer)
                // Or manually tagged "quick"
                const quickGenres = ['Arcade', 'Fighting', 'Racing', 'Platformer', 'Shooter', 'Sports', 'Indie'];
                candidates = parsedGames.filter(g => 
                    g.isInstalled && 
                    !g.isHidden &&
                    (
                        (g.genre && quickGenres.some(q => g.genre?.includes(q))) ||
                        ((g.tags as string[]).some(t => t.toLowerCase().includes('roguelike') || t.toLowerCase().includes('quick')))
                    )
                );
                break;

            case 'forgotten':
                // Added long ago (> 6 months), never played
                const sixMonthsAgo = Date.now() - (180 * 24 * 60 * 60 * 1000);
                candidates = parsedGames.filter(g => 
                    g.isInstalled && 
                    !g.isHidden && 
                    (g.playtime || 0) < 10 && // Almost zero playtime
                    (g.addedAt || 0) < sixMonthsAgo &&
                    fitsTime(g)
                );
                break;

            case 'random':
            default:
                candidates = parsedGames.filter(g => g.isInstalled && !g.isHidden && fitsTime(g));
                break;
        }

        if (candidates.length === 0) return null;
        
        // Return random from candidates
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    getRecommendations(games: Game[]): Game[] {
        const parsedGames = this.parseGames(games);

        // 1. Build User Profile (Tag & Genre Affinity)
        const tagScores = new Map<string, number>();
        const genreScores = new Map<string, number>();

        parsedGames.forEach(game => {
            // Weight factors
            const hours = (game.playtime || 0) / 60; // Playtime in hours
            const rating = game.rating || 0;
            
            // Base Score Calculation
            // - Playtime contributes (capped at 100 hours to avoid skew)
            const timeScore = Math.min(hours, 100);
            
            // - Rating contributes significantly (0-5 stars)
            const ratingScore = rating > 0 ? (rating * 20) : 0; 

            let score = timeScore + ratingScore;
            
            // - Recency Bonus (played in last 30 days)
            if (game.lastPlayed) {
                const daysSince = (Date.now() - game.lastPlayed) / (1000 * 60 * 60 * 24);
                if (daysSince < 30) score += 20;
            }

            // Apply scores to Tags
            if (game.tags && Array.isArray(game.tags)) {
                game.tags.forEach(tag => {
                    tagScores.set(tag, (tagScores.get(tag) || 0) + score);
                });
            }

            // Apply scores to Genre
            if (game.genre) {
                genreScores.set(game.genre, (genreScores.get(game.genre) || 0) + score);
            }
        });

        // 2. Score Unplayed/Backlog Games
        const recommendations = parsedGames
            .filter(g => {
                const hours = (g.playtime || 0) / 60;
                // Suggest games played less than 2 hours and not marked as completed/dropped
                // AND are installed (usually recommendations are for what to play NOW)
                return g.isInstalled && !g.isHidden && hours < 2 && g.playStatus !== 'completed' && g.playStatus !== 'dropped';
            })
            .map(game => {
                let score = 0;
                const tags = Array.isArray(game.tags) ? game.tags : [];
                
                // Tag match score (average score of matching tags)
                let tagMatchScore = 0;
                let tagCount = 0;
                tags.forEach(tag => {
                    if (tagScores.has(tag)) {
                        tagMatchScore += tagScores.get(tag)!;
                        tagCount++;
                    }
                });
                if (tagCount > 0) score += (tagMatchScore / tagCount);

                // Genre match score
                if (game.genre && genreScores.has(game.genre)) {
                    score += genreScores.get(game.genre)!;
                }

                // Personal Rating Boost (if user rated it highly but hasn't played it yet)
                if (game.rating) {
                    score += game.rating * 50;
                }

                // Random jitter to rotate suggestions slightly
                score += Math.random() * 10;

                return { game, score };
            });

        // 3. Sort by score descending and take top 5
        return recommendations
            .sort((a, b) => b.score - a.score)
            .map(item => item.game)
            .slice(0, 5);
    }

    getMoodRecommendations(games: Game[], mood: string, timeConstraint?: string): Game[] {
        const parsedGames = this.parseGames(games);
        
        // Define mood profiles (weighted keywords)
        const moodProfiles: Record<string, Record<string, number>> = {
            'Chill': { 'Casual': 1, 'Simulator': 1, 'Puzzle': 0.8, 'Relaxing': 1, 'Building': 0.7, 'Atmospheric': 0.6, 'Action': -0.5, 'Shooter': -0.5, 'Horror': -1 },
            'Action': { 'Action': 1, 'Shooter': 1, 'FPS': 1, 'Fighting': 0.9, 'Hack and Slash': 0.9, 'Fast-Paced': 0.8, 'Puzzle': -0.2 },
            'Story': { 'RPG': 1, 'Adventure': 0.8, 'Story Rich': 1, 'Visual Novel': 0.9, 'Cinematic': 0.8, 'Lore-Rich': 0.8, 'Multiplayer': -0.5 },
            'Challenge': { 'Souls-like': 1, 'Difficult': 1, 'Roguelike': 0.8, 'Strategy': 0.7, 'Platformer': 0.6, 'Casual': -1 },
            'Nostalgia': { 'Retro': 1, 'Pixel Graphics': 0.8, 'Classic': 0.9, 'Arcade': 0.7, 'Remake': 0.5 },
            'Social': { 'Multiplayer': 1, 'Co-op': 1, 'Party': 0.9, 'Online': 0.8, 'Competitive': 0.7, 'Singleplayer': -1 }
        };

        const profile = moodProfiles[mood];
        // if (!profile) return this.getRecommendations(games); // Fallback - Don't fallback immediately, let filtering happen

        // Time Constraint Logic
        const fitsTime = (g: Game) => {
            if (!timeConstraint || timeConstraint === 'Any') return true;
            
            // Heuristics based on genre/tags since we don't have exact HLTB data
            const quickGenres = ['Arcade', 'Fighting', 'Racing', 'Platformer', 'Shooter', 'Sports', 'Indie', 'Puzzle'];
            const isQuick = g.genre && quickGenres.some(q => g.genre?.includes(q));
            const isRoguelike = (g.tags as string[]).some(t => t.toLowerCase().includes('roguelike'));
            const isRPG = g.genre && (g.genre.includes('RPG') || g.genre.includes('Strategy') || g.genre.includes('Adventure'));

            switch (timeConstraint) {
                case 'Short': // < 30m
                    return isQuick || isRoguelike;
                case 'Medium': // 1-2h
                    return true; // Most games fit this
                case 'Long': // 3h+
                    return isRPG || (g.playtime || 0) > 600; // Existing fav or deep game
                default:
                    return true;
            }
        };

        // Score games against profile
        const scoredGames = parsedGames
            .filter(g => g.isInstalled && !g.isHidden && fitsTime(g))
            .map(game => {
                let score = 0;
                
                if (profile) {
                    const tags = Array.isArray(game.tags) ? game.tags : [];
                    
                    // Check Tags
                    tags.forEach(tag => {
                        Object.keys(profile).forEach(keyword => {
                            if (tag.toLowerCase().includes(keyword.toLowerCase())) {
                                score += profile[keyword];
                            }
                        });
                    });

                    // Check Genre
                    if (game.genre) {
                        Object.keys(profile).forEach(keyword => {
                            if (game.genre?.toLowerCase().includes(keyword.toLowerCase())) {
                                score += profile[keyword];
                            }
                        });
                    }
                } else {
                    // No mood profile? Give random base score
                    score = Math.random() * 5;
                }

                // Add some randomness to avoid stale results
                score += Math.random() * 0.5;

                return { game, score };
            });

        return scoredGames
            .sort((a, b) => b.score - a.score)
            .map(item => item.game)
            .slice(0, 10);
    }

    private parseGames(games: Game[]): Game[] {
        return games.map(g => ({
            ...g,
            tags: typeof g.tags === 'string' ? JSON.parse(g.tags || '[]') : (g.tags || [])
        }));
    }
}
