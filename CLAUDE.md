# Flappy Push-up - Claude Agent Guide

## Project Overview

A browser-based Flappy Bird clone where the player's push-up movements (detected via webcam) control the bird. Uses MediaPipe Pose for real-time pose detection, runs 100% client-side.

**Live site:** https://flappy-push-up.pages.dev
**Repo:** https://github.com/jerome3o/flappy-push-up

## Architecture

```
/flappy-push-up
├── index.html          # Entry point, loads MediaPipe from CDN
├── style.css           # Fullscreen layout, video/canvas positioning
├── js/
│   ├── main.js         # Game loop, state machine, initialization
│   ├── pose.js         # MediaPipe Pose setup, shoulder tracking
│   ├── game.js         # Bird, pipes, collision, scoring logic
│   └── renderer.js     # Canvas drawing (video, skeleton, game elements)
├── assets/             # (empty, sprites could go here)
└── .github/workflows/
    └── deploy.yml      # Cloudflare Pages deployment
```

**No build step** - ES modules loaded directly, MediaPipe from CDN.

## Key Technical Details

- **Pose detection:** MediaPipe Pose tracks 33 body landmarks; we use shoulder Y-position
- **Bird control:** Direct mapping - shoulder height → bird Y position (smoothed)
- **Video mirroring:** Video drawn mirrored onto canvas, game elements drawn normal (so text is readable)
- **Game states:** WAITING → PLAYING → GAME_OVER (movement triggers transitions)
- **Storage:** High score saved to localStorage

## Local Development

```bash
cd /home/jerome/source/flappy-push-up
python3 -m http.server 8000
# Open http://localhost:8000
```

For phone testing: use your local IP (e.g., `http://192.168.x.x:8000`), phone must be on same network.

## Deployment

**Hosted on Cloudflare Pages** - auto-deploys on push to `main`.

### IMPORTANT: No CLI access to secrets

You likely do NOT have access to `gh` CLI or `wrangler` CLI with authentication. All operations requiring secrets (Cloudflare API, etc.) must go through **GitHub Actions**.

**Available secrets in GitHub Actions:**
- `CLOUDFLARE_API_TOKEN` - Has Cloudflare Workers/Pages edit permissions
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account identifier

### Adding backend functionality (Workers)

The Cloudflare token has **Workers permissions**, so you can deploy Cloudflare Workers for backend logic. To do this:

1. Create worker code (e.g., `workers/api.js`)
2. Add a `wrangler.toml` if needed
3. Update `.github/workflows/deploy.yml` to deploy the worker
4. The GitHub Action has access to the secrets - use them there

Example worker deployment step to add to workflow:
```yaml
- name: Deploy Worker
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  run: wrangler deploy workers/api.js --name flappy-push-up-api
```

## Making Changes

1. Edit files locally
2. Test with local server
3. Commit and push to `main`
4. GitHub Action auto-deploys to Cloudflare Pages

## IMPORTANT: Keep This File Updated

When you make significant changes to the project:
- **Add new files/modules:** Document them in the Architecture section
- **Add new features:** Describe how they work in Key Technical Details
- **Change deployment:** Update the Deployment section
- **Add new secrets/services:** Document them and how to use via GitHub Actions
- **Change project structure:** Update the file tree

Future agents depend on this file being accurate. Update it as part of your work.

## Ideas for Future Development

- Leaderboard (would need a Worker + KV storage)
- Different game modes (speed run, endurance)
- Customizable bird sprites
- Sound effects
- Rep counter / workout stats
- PWA manifest for install-to-homescreen
