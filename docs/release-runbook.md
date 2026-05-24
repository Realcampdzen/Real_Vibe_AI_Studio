# Real Vibe Studio Release Runbook

Last updated: 2026-05-21

## Current Release

Release: `v3.2.0` / `2026-05-21-product-store`.

Scope:

- homepage converted into the current Android/PWA product store and portfolio storefront;
- `#portfolio` stabilized at 8 cards with Real Vibe Studio, GKS Delivery Platform, RealCampGuide, PolStan App, DOMINIA, DOMINIA Arena, Hermes Agent OS, and Real Camp Planner;
- RealCampGuide promoted to a featured Camp CRM / Pedagogy OS card;
- small portfolio cards received stronger screenshots, proof copy, tags and CTAs;
- DOMINIA public links point to `https://www.dominia.info/`;
- Real Camp Planner no longer links to the temporary Vercel app and is positioned as a RealCampGuide/Putevoditel planning module plus standalone AI planning agent;
- `freelance-showcase` stays a GitHub/CV source, not a product card;
- Open Design stays a workflow/tooling reference, not a product card;
- desktop hero CTA buttons stay readable circular buttons without the duplicated portfolio action;
- mobile hamburger menu now opens as a polished modal overlay and works in `file://` and local static preview;
- homepage local preview suppresses analytics/auth-cart API noise in `file://`, `localhost`, and `127.0.0.1` contexts.

Release cache markers:

- `index.html` cache comment: `2026-05-21-hero-cta-fit`;
- `css/style.css`: `v=20260521-hero-cta-fit`;
- `css/mobile-improvements.css`: `v=20260521-mobile-menu-motion-polish`;
- `js/script.js`: `v=20260521-mobile-menu-motion-polish`;
- `sw.js` cache version: `v2.19-20260521-hero-cta-fit`.

Local verification already run for this release:

```bash
npm run check
git diff --check
```

Browser verification covered:

- direct `file://` preview of `index.html`;
- `http://127.0.0.1:3001/index.html`;
- mobile menu open/close/reopen at `642x694` and `390x844`;
- portfolio DOM checks for 8 cards, DOMINIA `www` href, and no public Real Camp Planner Vercel href.

Deploy status: deployed by VPS patch deploy after committing the intended release files. The patch deploy script packages Git `HEAD`.

## Preflight

```bash
git status --short
npm run quality:release
npm run check
npm run check:security
npm audit --omit=dev --json
git diff --check
```

GitHub Actions now runs the same quality gate on pushes and PRs through `.github/workflows/ci.yml`.
The workflow is intentionally CI-only; it does not deploy production or GitHub Pages.

Before a security release, confirm production `.env` has any required secrets without printing them:

```bash
ssh root@89.223.126.190 "grep -E '^(CHAT_OWNER_TOKEN|RV_WEBHOOK_TOKEN|PROXY_AUTH_TOKEN)=' /srv/real-vibe-studio/.env | sed 's/=.*/=<set>/'"
```

## Commit And Push

```bash
git add <release files>
git commit -m "<type>: <summary>"
git push origin codex/vps-migration
```

Do not stage local artifacts such as `agent log.md`, `deploy-ready.zip`, `output/`, or dirty nested repos.

## Local Smoke

Run these against a local production-mode server:

```bash
API_SMOKE_BASE_URL=http://127.0.0.1:4313 API_SMOKE_EXPECT_PROD_CORS=true npm run smoke:api
BROWSER_SMOKE_BASE_URL=http://127.0.0.1:4313 npm run smoke:browser
PERF_PROBE_BASE_URL=http://127.0.0.1:4313 npm run perf:desktop
```

For CI-like local runs, set dummy production secrets before starting the server:

```bash
NODE_ENV=production PORT=4313 BIND_HOST=127.0.0.1 \
ALLOWED_ORIGINS=https://vps.real-vibe.studio,https://real-vibe.studio,https://www.real-vibe.studio \
RV_WEBHOOK_TOKEN=local-webhook-token PROXY_AUTH_TOKEN=local-proxy-token \
CHAT_QUOTA_STORE_PATH=data/local-chat-quotas.json node server/index.js
```

## VPS Deploy

The current VPS uses `/srv/real-vibe-studio/current` as a release symlink. Patch releases should use the scripted tar/symlink flow:

```bash
DRY_RUN=true npm run deploy:vps:patch
npm run deploy:vps:patch
```

Defaults:

- `VPS_HOST=root@89.223.126.190`
- `VPS_BASE=/srv/real-vibe-studio`
- `VPS_KEY=%USERPROFILE%/.ssh/realcampguide_timeweb_ed25519` on Windows or `$HOME/.ssh/realcampguide_timeweb_ed25519`
- `VPS_HEALTH_URL=http://127.0.0.1:4300/health`
- `RELEASE_LABEL=patch`
- `VPS_RELEASE_RETENTION=1`

The script builds a patch archive from the current commit, creates a new release from the current symlink target, applies changed/deleted files, links production `.env` and `data`, builds the Docker image, switches `/srv/real-vibe-studio/current`, and runs the health check. If health fails, it switches the symlink back and restarts the previous release. After a successful health check, it prunes old release directories according to `VPS_RELEASE_RETENTION`; the default keeps only the active release on disk.

For a full checkout-based deploy, use the commands below only if `/srv/real-vibe-studio` is a Git worktree:

```bash
ssh root@89.223.126.190
cd /srv/real-vibe-studio
git fetch origin codex/vps-migration
git checkout codex/vps-migration
git pull --ff-only origin codex/vps-migration
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:4300/health
```

The app must bind to `127.0.0.1:4300`; Nginx owns public TLS/host routing.

## Production Smoke

```bash
npm run smoke:prod
BROWSER_SMOKE_BASE_URL=https://vps.real-vibe.studio npm run smoke:browser
PERF_PROBE_BASE_URL=https://vps.real-vibe.studio npm run perf:desktop
curl -s https://real-vibe.studio/ | grep -E 'interactive-widget|android-keyboard|mobile'
curl -s https://real-vibe.studio/sw.js | grep -E 'CACHE_VERSION|android-keyboard|mobile'
ssh root@89.223.126.190 "readlink -f /srv/real-vibe-studio/current"
ssh root@89.223.126.190 "docker ps --filter name=real-vibe-web --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"
ssh root@89.223.126.190 "docker image ls current-real-vibe-web --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'"
ssh root@89.223.126.190 "docker logs --tail=150 real-vibe-web"
```

Expected results: `/health` 200, localhost CORS rejected in production, invalid chat rejected without OpenAI call, webhook forbidden without token, CSP headers present, hero WebM served with range support, old hero master unavailable, no secrets/request bodies in logs.
The Docker image should stay under the current budget of `1.5GB`; public media larger than `80MB` must be excluded from the runtime image by `.dockerignore`.
Enforced CSP must include `script-src 'self'`, `style-src-attr 'none'`, and no `unsafe-inline` in `style-src` or `style-src-elem`.

## Browser Smoke

- Homepage cold load, hero visible for 60 seconds, scroll to footer and back.
- Mobile menu opens and closes smoothly: `aria-expanded`, `aria-hidden`, `.mobile-nav.active`, scroll lock, and overlay visibility all update correctly.
- Confirm `hero-reel-desktop.webm` is used and old source master videos are not requested.
- Confirm portfolio has 8 cards in the release order and does not show `freelance-showcase` or Open Design as products.
- Confirm DOMINIA card/media links use `https://www.dominia.info/`.
- Confirm Real Camp Planner has no public temporary Vercel href.
- Service cards navigate to detail pages.
- `service-detail.html?id=0..7` and `ai-photo-detail.html` render without console errors.
- Chat widgets open, send invalid/limited requests gracefully, and stay visually usable.
- Mobile chat widgets on Android-sized viewports open without autofocus; after focusing `.glass-message-input`, `rv-chat-keyboard-open` is set, the input stays inside the reduced viewport, and the bottom rail/cookie/banner/floating buttons are hidden.
- Installed Android PWA launches with `display-mode: standalone`; a normal Chrome tab may still show browser UI, but the page must not create a white bottom gap or resize flicker around it.
- CSP report-only violations can be sampled in logs, but they must not include raw request bodies, cookies, tokens, full URLs with query strings, or user messages.
- Detail CTA blocks expose working Telegram, phone, and email links.

## Mobile PWA / Android Keyboard Smoke

Use this additional smoke for releases touching `manifest.json`, `sw.js`, mobile CSS, `js/pwa-chrome.js`, `js/performance-loader.js`, or `chat-components/GlassUIWidget.js`.

Expected behavior:

- `meta viewport` includes `viewport-fit=cover` and `interactive-widget=resizes-content`.
- `manifest.json` remains installable with `display: "standalone"`, dark theme/background colors, and 192/512/maskable icons.
- `sw.js` and all HTML entry points use the same current cache-buster.
- Opening a mobile chat widget does not focus the input immediately.
- Focusing the input toggles `rv-chat-keyboard-open` on `<html>` and `<body>`.
- With a reduced viewport such as `390x560`, the active chat widget stays fully visible; horizontal overflow remains `0`.
- The bottom rail pseudo-element, cookie banner, back-to-top button, and floating bot dock are hidden while the keyboard is open.
- The service worker controller URL contains the current `sw.js?v=<cache-buster>`.

Useful manual production checks:

```bash
curl -I https://real-vibe.studio/
curl -s https://real-vibe.studio/manifest.json | grep -E 'standalone|display_override|theme_color|background_color'
curl -s https://real-vibe.studio/sw.js | grep -E 'CACHE_VERSION'
```

## CI Gate

The `Site Quality Gate` workflow runs:

- `npm ci`
- `npx playwright install --with-deps chromium`
- `npm run quality:release`
- local production server smoke through `npm run smoke:api`
- `npm run smoke:browser` with a mocked chat response, so CI does not call OpenAI

Keep VPS deployment manually triggered; GitHub Actions must not auto-deploy production without a separate approval flow and secret review.

## Rollback

With the default `VPS_RELEASE_RETENTION=1`, successful deploys do not keep older release directories on the VPS. To keep local rollback directories for a specific deploy, run it with a higher retention value, for example `VPS_RELEASE_RETENTION=2 npm run deploy:vps:patch`.

```bash
ssh root@89.223.126.190
ls -dt /srv/real-vibe-studio/releases/*
ln -sfn /srv/real-vibe-studio/releases/<previous-good-release> /srv/real-vibe-studio/current
cd /srv/real-vibe-studio/current
docker compose -p current up -d --build
curl -fsS http://127.0.0.1:4300/health
```

After rollback, record the commit and the reason in `docs/` or the release notes.
