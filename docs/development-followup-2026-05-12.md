# Development Follow-up - 2026-05-12

## Baseline

- Branch: `codex/vps-migration`
- Previous production release: `8f78be7`
- Active VPS release before this batch: `/srv/real-vibe-studio/releases/20260511-223728-8f78be7-observeux`
- Container: `real-vibe-web`, health endpoint expected on `127.0.0.1:4300`

## Production Observe Sample

Sampled Docker logs for the last 24 hours after `8f78be7`.

Findings:

- `/health` traffic is normal.
- Production smoke traffic is present: localhost CORS reject, invalid `/chat` reject, webhook `403`, old hero master `404`.
- Static and detail page requests are normal for `/`, `service-detail.html`, and `ai-photo-detail.html`.
- Scanner noise observed for `/.git/config` with `404`.
- No first-party CSP violations were visible in the sampled logs.
- No raw user message, AI reply, request body, cookie, owner token, or webhook token was visible in the sampled logs.

## Implemented In This Batch

- Split the active chat runtime into a lightweight `js/chat-client.js` used only for shared headers and response parsing.
- Replaced `js/chat.js` with a compatibility-only lightweight client, removing legacy overlay DOM runtime from the active path.
- Removed hidden legacy `#chat-overlay` markup from `index.html`.
- Kept Glass chat widgets as the public chat UX and removed their dependency on the legacy overlay.
- Stopped detail pages from eagerly loading chat widgets; detail pages now load chat extras only on user interaction.
- Removed duplicate bottom CTA/service grids from `service-detail.html` and `ai-photo-detail.html`.
- Added smoke guards for legacy chat overlay removal and active `chat-client` usage.
- Added `npm run deploy:vps:patch` to formalize the patch-tar symlink deploy flow.
- Updated the release runbook with patch deploy, health, symlink, and rollback steps.

## Local Verification Results

- `npm run quality:release`: passed, production dependency audit has 0 vulnerabilities.
- `git diff --check`: passed; Git only reported expected local line-ending warnings.
- Local production-mode server on `127.0.0.1:4313`: `/health` returned `200`.
- `smoke:api`: passed against local production-mode server.
- `smoke:browser`: passed against local production-mode server with hero wait reduced to 10 seconds for local iteration. Covered legacy overlay removal, Glass chat rate-limit and network fallback, service card navigation, detail `id=0..7`, AI photo detail, CTA links, mobile CTA overlap, and no eager detail chat/media runtime.
- `perf:desktop`: passed locally. Results: `1440x900 p95=17ms, p99=17.3ms, longTasks=0`; `1920x1080 p95=16.8ms, p99=17ms, longTasks=0`.

## Verification Plan

Required before release:

```bash
npm run quality:release
npm run check:security
git diff --check
NODE_ENV=production PORT=4313 BIND_HOST=127.0.0.1 ALLOWED_ORIGINS=https://vps.real-vibe.studio,https://real-vibe.studio,https://www.real-vibe.studio RV_WEBHOOK_TOKEN=local-webhook-token PROXY_AUTH_TOKEN=local-proxy-token CHAT_QUOTA_STORE_PATH=data/local-chat-quotas.json node server/index.js
API_SMOKE_BASE_URL=http://127.0.0.1:4313 API_SMOKE_EXPECT_PROD_CORS=true npm run smoke:api
BROWSER_SMOKE_BASE_URL=http://127.0.0.1:4313 npm run smoke:browser
PERF_PROBE_BASE_URL=http://127.0.0.1:4313 npm run perf:desktop
```

Production checks after deploy:

```bash
npm run smoke:prod
BROWSER_SMOKE_BASE_URL=https://vps.real-vibe.studio npm run smoke:browser
PERF_PROBE_BASE_URL=https://vps.real-vibe.studio npm run perf:desktop
ssh root@89.223.126.190 "readlink -f /srv/real-vibe-studio/current; docker ps --filter name=real-vibe-web; docker logs --tail=150 real-vibe-web"
```

## Remaining Backlog

| Priority | Area | Next Work |
| --- | --- | --- |
| P1 | Product UX | Review homepage to detail to CTA path after duplicate removal and tune text/spacing if conversion suffers. |
| P2 | Frontend runtime | Continue splitting homepage/detail/mobile code so `js/script.js` becomes homepage-only. |
| P2 | Ops | Add a CI artifact check for patch archives without enabling auto-deploy. |
| P2 | Dependencies | Plan safe minor/patch updates, then separate major upgrade testing. |
| P3 | Dead CSS | Remove legacy chat overlay styles after one more production release confirms no old markup is needed. |
