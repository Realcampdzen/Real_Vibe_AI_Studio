# Real Vibe Studio Release Runbook

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

The current VPS uses `/srv/real-vibe-studio/current` as a release symlink. For a full checkout-based deploy, use the commands below only if `/srv/real-vibe-studio` is a Git worktree:

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
ssh root@89.223.126.190 "docker ps --filter name=real-vibe-web --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"
ssh root@89.223.126.190 "docker image ls current-real-vibe-web --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'"
ssh root@89.223.126.190 "docker logs --tail=150 real-vibe-web"
```

Expected results: `/health` 200, localhost CORS rejected in production, invalid chat rejected without OpenAI call, webhook forbidden without token, CSP headers present, hero WebM served with range support, old hero master unavailable, no secrets/request bodies in logs.
The Docker image should stay under the current budget of `1.5GB`; public media larger than `80MB` must be excluded from the runtime image by `.dockerignore`.
Enforced CSP must include `script-src 'self'`, `style-src-attr 'none'`, and no `unsafe-inline` in `style-src` or `style-src-elem`.

## Browser Smoke

- Homepage cold load, hero visible for 60 seconds, scroll to footer and back.
- Confirm `hero-reel-desktop.webm` is used and old source master videos are not requested.
- Service cards navigate to detail pages.
- `service-detail.html?id=0..7` and `ai-photo-detail.html` render without console errors.
- Chat widgets open, send invalid/limited requests gracefully, and stay visually usable.
- CSP report-only violations can be sampled in logs, but they must not include raw request bodies, cookies, tokens, full URLs with query strings, or user messages.
- Detail CTA blocks expose working Telegram, phone, and email links.

## CI Gate

The `Site Quality Gate` workflow runs:

- `npm ci`
- `npx playwright install --with-deps chromium`
- `npm run quality:release`
- local production server smoke through `npm run smoke:api`
- `npm run smoke:browser` with a mocked chat response, so CI does not call OpenAI

Keep VPS deployment manual until the release symlink flow and secret handling are explicitly automated.

## Rollback

```bash
ssh root@89.223.126.190
ls -dt /srv/real-vibe-studio/releases/*
ln -sfn /srv/real-vibe-studio/releases/<previous-good-release> /srv/real-vibe-studio/current
cd /srv/real-vibe-studio/current
docker compose -p current up -d --build
curl -fsS http://127.0.0.1:4300/health
```

After rollback, record the commit and the reason in `docs/` or the release notes.
