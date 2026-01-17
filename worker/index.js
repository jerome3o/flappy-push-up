/**
 * Flappy Push-up Leaderboard API
 * Cloudflare Worker with D1 database
 */

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

// Max leaderboard entries
const MAX_LEADERBOARD = 100;
// Max score we track individually (scores above this go in one bucket)
const MAX_TRACKED_SCORE = 200;

export default {
	async fetch(request, env) {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: CORS_HEADERS });
		}

		const url = new URL(request.url);
		const path = url.pathname;

		try {
			// Route requests
			if (path === '/api/leaderboard' && request.method === 'GET') {
				return await getLeaderboard(env);
			}

			if (path === '/api/score' && request.method === 'POST') {
				return await submitScore(request, env);
			}

			if (path === '/api/stats' && request.method === 'GET') {
				return await getStats(env);
			}

			// Health check
			if (path === '/api/health') {
				return jsonResponse({ status: 'ok' });
			}

			return jsonResponse({ error: 'Not found' }, 404);

		} catch (error) {
			console.error('Error:', error);
			return jsonResponse({ error: 'Internal server error' }, 500);
		}
	}
};

/**
 * Get top 100 leaderboard entries
 */
async function getLeaderboard(env) {
	const results = await env.DB.prepare(`
		SELECT name, score, created_at
		FROM leaderboard
		ORDER BY score DESC, created_at ASC
		LIMIT ?
	`).bind(MAX_LEADERBOARD).all();

	return jsonResponse({
		leaderboard: results.results || []
	});
}

/**
 * Submit a score
 * Returns: percentile, whether they made leaderboard, current leaderboard
 */
async function submitScore(request, env) {
	const body = await request.json();
	const { name, score } = body;

	// Validate input
	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		return jsonResponse({ error: 'Name is required' }, 400);
	}
	if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
		return jsonResponse({ error: 'Valid score is required' }, 400);
	}

	const cleanName = name.trim().slice(0, 20); // Limit name length
	const clampedScore = Math.min(score, MAX_TRACKED_SCORE);

	// Update histogram (for percentile calculation)
	await env.DB.prepare(`
		INSERT INTO score_histogram (score, count)
		VALUES (?, 1)
		ON CONFLICT(score) DO UPDATE SET count = count + 1
	`).bind(clampedScore).run();

	// Calculate percentile
	const percentile = await calculatePercentile(env, score);

	// Check if score makes the leaderboard
	const lowestEntry = await env.DB.prepare(`
		SELECT score FROM leaderboard
		ORDER BY score ASC
		LIMIT 1
	`).first();

	const currentCount = await env.DB.prepare(`
		SELECT COUNT(*) as count FROM leaderboard
	`).first();

	let madeLeaderboard = false;

	// Add to leaderboard if: less than 100 entries OR score beats lowest
	if (currentCount.count < MAX_LEADERBOARD || (lowestEntry && score > lowestEntry.score)) {
		// Insert the new score
		await env.DB.prepare(`
			INSERT INTO leaderboard (name, score, created_at)
			VALUES (?, ?, datetime('now'))
		`).bind(cleanName, score).run();

		// If over limit, remove the lowest
		if (currentCount.count >= MAX_LEADERBOARD) {
			await env.DB.prepare(`
				DELETE FROM leaderboard WHERE id = (
					SELECT id FROM leaderboard
					ORDER BY score ASC, created_at DESC
					LIMIT 1
				)
			`).run();
		}

		madeLeaderboard = true;
	}

	// Get updated leaderboard
	const leaderboard = await env.DB.prepare(`
		SELECT name, score, created_at
		FROM leaderboard
		ORDER BY score DESC, created_at ASC
		LIMIT ?
	`).bind(MAX_LEADERBOARD).all();

	// Find player's rank if they made it
	let rank = null;
	if (madeLeaderboard) {
		const rankResult = await env.DB.prepare(`
			SELECT COUNT(*) + 1 as rank FROM leaderboard WHERE score > ?
		`).bind(score).first();
		rank = rankResult?.rank || null;
	}

	return jsonResponse({
		madeLeaderboard,
		percentile,
		rank,
		leaderboard: leaderboard.results || []
	});
}

/**
 * Calculate what percentile a score is in
 * Returns 0-100 (percentage of players this score beats)
 */
async function calculatePercentile(env, score) {
	// Get total plays and plays with lower scores
	const stats = await env.DB.prepare(`
		SELECT
			SUM(count) as total,
			SUM(CASE WHEN score < ? THEN count ELSE 0 END) as below
		FROM score_histogram
	`).bind(score).first();

	if (!stats || !stats.total || stats.total === 0) {
		return 50; // First player, you're average!
	}

	const percentile = Math.round((stats.below / stats.total) * 100);
	return percentile;
}

/**
 * Get overall stats
 */
async function getStats(env) {
	const stats = await env.DB.prepare(`
		SELECT SUM(count) as totalGames FROM score_histogram
	`).first();

	const topScore = await env.DB.prepare(`
		SELECT MAX(score) as topScore FROM leaderboard
	`).first();

	return jsonResponse({
		totalGames: stats?.totalGames || 0,
		topScore: topScore?.topScore || 0
	});
}

/**
 * Helper to return JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...CORS_HEADERS
		}
	});
}
