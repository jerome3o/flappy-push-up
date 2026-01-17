# Flappy Push-up - Claude Agent Guide

## Communicating with Users

**The user is likely NOT a software developer.** When talking to them:
- Explain what you're doing in plain language
- Avoid unnecessary technical jargon
- Focus on what the change does for them, not implementation details
- If something goes wrong, explain it simply and what you'll do to fix it
- When done, tell them how to see/use the result (e.g., "refresh the page" or "it's live at [URL]")

If the user *is* technical, they'll let you know - then you can be more detailed.

## Project Overview

A browser-based Flappy Bird clone where the player's push-up movements (detected via webcam) control the bird. Uses MediaPipe Pose for real-time pose detection. Frontend runs client-side, with a Cloudflare Worker backend for leaderboard.

**Live site:** https://flappy-push-up.pages.dev
**API:** https://flappy-push-up-api.jeromeswannack.workers.dev
**Repo:** https://github.com/jerome3o/flappy-push-up

## Architecture

```
/flappy-push-up
├── index.html          # Entry point, loads MediaPipe from CDN
├── style.css           # Fullscreen layout, video/canvas, modal styling
├── js/
│   ├── main.js         # Game loop, state machine, leaderboard integration
│   ├── pose.js         # MediaPipe Pose setup, shoulder tracking
│   ├── game.js         # Bird, pipes, collision, scoring logic
│   ├── renderer.js     # Canvas drawing (video, skeleton, game elements, leaderboard)
│   └── leaderboard.js  # API client for leaderboard backend
├── worker/
│   ├── index.js        # Cloudflare Worker - leaderboard API
│   ├── wrangler.toml   # Worker configuration (D1 binding)
│   └── schema.sql      # D1 database schema
├── assets/             # (empty, sprites could go here)
└── .github/workflows/
    └── deploy.yml      # Deploys both Pages (frontend) and Worker (API)
```

**No build step** - ES modules loaded directly, MediaPipe from CDN.

## Key Technical Details

### Frontend
- **Pose detection:** MediaPipe Pose tracks 33 body landmarks; we use shoulder Y-position
- **Bird control:** Direct mapping - shoulder height → bird Y position (smoothed)
- **Video mirroring:** Video drawn mirrored onto canvas, game elements drawn normal (so text is readable)
- **Game states:** WAITING → PLAYING → GAME_OVER (movement triggers transitions)
- **Local storage:** Personal high score, player name (for leaderboard)

### Backend (Cloudflare Worker + D1)
- **Leaderboard:** Top 100 scores stored with names
- **Percentile calculation:** Score histogram tracks how many times each score (0-200) occurred, enabling "You beat X% of players" without unbounded storage
- **API endpoints:**
  - `GET /api/leaderboard` - Fetch top 100 scores
  - `POST /api/score` - Submit score, returns percentile + updated leaderboard
  - `GET /api/stats` - Total games played, top score
  - `GET /api/health` - Health check

### Database Tables (D1)
- `leaderboard` - id, name, score, created_at (max 100 rows)
- `score_histogram` - score, count (max ~200 rows, never grows)

## Local Development

```bash
cd /home/jerome/source/flappy-push-up
python3 -m http.server 8000
# Open http://localhost:8000
```

For phone testing: use your local IP (e.g., `http://192.168.x.x:8000`), phone must be on same network.

**Note:** Leaderboard features require the Worker to be deployed - they won't work locally unless you run `wrangler dev` in the worker directory (requires wrangler auth).

## Deployment

**Hosted on Cloudflare:**
- **Pages** (frontend): https://flappy-push-up.pages.dev
- **Worker** (API): https://flappy-push-up-api.jeromeswannack.workers.dev
- **D1 Database**: `flappy-push-up-db`

Auto-deploys on push to `main` via GitHub Actions.

### IMPORTANT: No CLI access to secrets

You likely do NOT have access to `gh` CLI or `wrangler` CLI with authentication. All operations requiring secrets (Cloudflare API, etc.) must go through **GitHub Actions**.

**Available secrets in GitHub Actions:**
- `CLOUDFLARE_API_TOKEN` - Has Cloudflare Workers/Pages/D1 edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier

### Current Workflow Steps

The `.github/workflows/deploy.yml` does:
1. Create D1 database if not exists
2. Apply schema.sql to D1
3. Deploy the Worker
4. Deploy Pages (frontend)

### Adding more backend functionality

To add new Worker features:
1. Edit `worker/index.js` to add routes/logic
2. If new D1 tables needed, update `worker/schema.sql`
3. Push to main - GitHub Action handles deployment

## Making Changes

1. Edit files locally
2. Test with local server (frontend) or `wrangler dev` (worker, if you have auth)
3. Commit and push to `main`
4. GitHub Action auto-deploys everything

## IMPORTANT: Keep This File Updated

When you make significant changes to the project:
- **Add new files/modules:** Document them in the Architecture section
- **Add new features:** Describe how they work in Key Technical Details
- **Change deployment:** Update the Deployment section
- **Add new secrets/services:** Document them and how to use via GitHub Actions
- **Change project structure:** Update the file tree
- **Add API endpoints:** Document them in the Backend section

Future agents depend on this file being accurate. Update it as part of your work.

## Ideas for Future Development

- ~~Leaderboard~~ ✅ Done!
- Different game modes (speed run, endurance)
- Customizable bird sprites
- Sound effects
- Rep counter / workout stats
- PWA manifest for install-to-homescreen
- Social sharing (share score to Twitter/etc)
