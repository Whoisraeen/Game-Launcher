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
}

export class RecommendationManager {
    getRecommendations(games: Game[]): Game[] {
        // Parse tags if needed (handle string JSON from DB)
        const parsedGames = games.map(g => ({
            ...g,
            tags: typeof g.tags === 'string' ? JSON.parse(g.tags || '[]') : (g.tags || [])
        }));

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
            // If rated > 3, it's a positive signal. If < 3, negative?
            // Let's assume rating is 0 if not rated.
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
                return hours < 2 && g.playStatus !== 'completed' && g.playStatus !== 'dropped';
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
}
