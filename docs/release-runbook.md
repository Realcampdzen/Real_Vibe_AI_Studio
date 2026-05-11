# Real Vibe Studio Release Runbook

## Preflight

```bash
git status --short
npm run check
npm audit --omit=dev --json
git diff --check
```

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

## VPS Deploy

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
curl -fsS https://vps.real-vibe.studio/health
curl -i -H "Origin: http://localhost:3000" https://vps.real-vibe.studio/api/bots/status
curl -i -X POST https://vps.real-vibe.studio/chat -H "Content-Type: application/json" -d "{}"
curl -i -X POST https://vps.real-vibe.studio/api/webhook/smoke -H "Content-Type: application/json" -d '{"type":"smoke","data":{}}'
docker compose logs --tail=150 real-vibe-web
docker image ls real-vibe-studio-real-vibe-web
```

Expected results: `/health` 200, localhost CORS rejected in production, invalid chat rejected without OpenAI call, webhook forbidden without token, no secrets/request bodies in logs.

## Browser Smoke

- Homepage cold load, hero visible for 60 seconds, scroll to footer and back.
- Confirm `hero-reel-desktop.webm` is used and old source master videos are not requested.
- Service cards navigate to detail pages.
- `service-detail.html?id=0..7` and `ai-photo-detail.html` render without console errors.
- Chat widgets open, send invalid/limited requests gracefully, and stay visually usable.

## Rollback

```bash
ssh root@89.223.126.190
cd /srv/real-vibe-studio
git log --oneline -5
git checkout <previous-good-commit>
docker compose up -d --build
curl -fsS http://127.0.0.1:4300/health
```

After rollback, record the commit and the reason in `docs/` or the release notes.
