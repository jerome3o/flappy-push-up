/**
 * Leaderboard API client
 * Communicates with the Cloudflare Worker backend
 */

// API base URL - Worker will be at this URL
const API_BASE = 'https://flappy-push-up-api.jerome3o.workers.dev';

export class LeaderboardAPI {
    constructor() {
        this.cachedLeaderboard = null;
        this.lastFetch = 0;
        this.cacheTimeout = 30000; // 30 seconds
    }

    /**
     * Fetch the current leaderboard
     * @returns {Promise<Array>} Array of {name, score, created_at}
     */
    async getLeaderboard(forceRefresh = false) {
        const now = Date.now();

        // Return cached if available and fresh
        if (!forceRefresh && this.cachedLeaderboard && (now - this.lastFetch) < this.cacheTimeout) {
            return this.cachedLeaderboard;
        }

        try {
            const response = await fetch(`${API_BASE}/api/leaderboard`);
            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await response.json();
            this.cachedLeaderboard = data.leaderboard || [];
            this.lastFetch = now;
            return this.cachedLeaderboard;

        } catch (error) {
            console.error('Leaderboard fetch error:', error);
            // Return cached data if available, even if stale
            return this.cachedLeaderboard || [];
        }
    }

    /**
     * Submit a score to the leaderboard
     * @param {string} name - Player name
     * @param {number} score - Player score
     * @returns {Promise<Object>} {madeLeaderboard, percentile, rank, leaderboard}
     */
    async submitScore(name, score) {
        try {
            const response = await fetch(`${API_BASE}/api/score`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, score })
            });

            if (!response.ok) {
                throw new Error('Failed to submit score');
            }

            const data = await response.json();

            // Update cache with fresh leaderboard
            if (data.leaderboard) {
                this.cachedLeaderboard = data.leaderboard;
                this.lastFetch = Date.now();
            }

            return data;

        } catch (error) {
            console.error('Score submit error:', error);
            return {
                madeLeaderboard: false,
                percentile: null,
                rank: null,
                leaderboard: this.cachedLeaderboard || [],
                error: error.message
            };
        }
    }

    /**
     * Get game stats
     * @returns {Promise<Object>} {totalGames, topScore}
     */
    async getStats() {
        try {
            const response = await fetch(`${API_BASE}/api/stats`);
            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }
            return await response.json();
        } catch (error) {
            console.error('Stats fetch error:', error);
            return { totalGames: 0, topScore: 0 };
        }
    }

    /**
     * Check if the API is available
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        try {
            const response = await fetch(`${API_BASE}/api/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
