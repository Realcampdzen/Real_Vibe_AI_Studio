# Real Vibe AI Studio - Technical Operations Guide

Last updated: 2026-05-18

This guide is for AI agents and developers maintaining the Real Vibe AI Studio repository.

## Project Shape

The repository contains:

- public website and sales funnel;
- shared service detail renderer;
- Express backend for chat/API features;
- bot persona scripts and Glass UI widgets;
- PWA/service worker/cache layer;
- media assets for services and portfolio;
- deploy tooling for the VPS patch workflow;
- historical docs and archived migration notes.

## Core Files

| Area | Files |
|---|---|
| Homepage funnel | `index.html`, `css/style.css`, `css/mobile-improvements.css`, `js/script.js` |
| Service data | `js/service-data.js`, `data/service-prices.json`, `js/service-prices.js` |
| Detail pages | `service-detail.html`, `js/service-detail-page.js`, `ai-photo-detail.html` |
| Service media | `public/works/services/<slug>/` |
| Social preview | `public/og-real-vibe-ai-studio.jpg`, OG/Twitter meta in `index.html` |
| PWA/cache | `sw.js`, `manifest.json` |
| Chat widgets | `chat-components/GlassUIWidget.js`, `js/glass-ui-*.js`, `js/performance-loader.js` |
| Server/API | `server/index.js`, `server/routes`, `server/services`, `server/bots` |
| Deploy | `scripts/deploy-vps-patch.mjs`, `Dockerfile`, `docker-compose.yml` |
| Checks | `scripts/check-js.mjs`, `scripts/check-static.mjs`, `scripts/browser-smoke.mjs` |

## Source of Truth for Services

`js/service-data.js` is the canonical catalog. Each service object should include:

- `id`
- `slug`
- `title`
- `cardTitle`
- `cardBenefit`
- `description`
- `features`
- `price`
- `backgroundImage`
- `avatarImage`
- `heroVideo`
- `heroPoster`
- `detailMedia`
- `relatedServiceIds`
- `seoTitle`
- `seoDescription`
- `detailTitle`
- `lead`
- `useCases`
- `whatWeDo`
- `formats`
- `whatYouGet`
- optional `offers`, `proofPoints`, `caseStudies`

When changing a service:

1. Update `js/service-data.js`.
2. Update `data/service-prices.json` through `admin-prices.html` when changing public price labels.
3. Update homepage ordering in `index.html` if the funnel changes.
4. Add or replace assets under `public/works/services/<slug>/`.
5. Update `docs/business-services-guide.md` if price, positioning, deliverables, or qualification logic changes.
6. Run `npm run check`.
7. Browser-check the homepage and the affected `service-detail.html?id=<id>`.

## Price Dashboard

Use `admin-prices.html` during local work to edit public price labels.

Dashboard behavior:

- use boutique-premium public anchors in `от ... RUB` format;
- keep grouped rows for Production, Development, AI Automation, and Visuals;
- show market recommendation, current saved price, editable public price, and status;
- use `Проставить рекомендации` only for open prices such as empty/unknown labels.

Run the API server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/admin-prices.html
```

The dashboard writes:

- `data/service-prices.json` - source price-book for services and offers;
- `js/service-prices.js` - browser override loaded before `js/service-data.js`;
- server cart labels through `server/services/catalog.js`, which reads the same price-book.

Production write access requires `RV_PRICE_EDITOR_TOKEN`; without it the endpoint must not allow edits.

## Service Asset Convention

Use this structure:

```text
public/works/services/<slug>/
  cover.jpg
  detail-1.jpg
  detail-2.jpg
  detail-3.jpg
  teaser.mp4
  teaser-poster.jpg
```

Rules:

- Do not overwrite good existing proof assets unless the user explicitly asks.
- Prefer adding new files with descriptive names for case-specific assets.
- Keep public images free of readable internal UI secrets, tokens, private client data and local paths.
- Avoid embedded text in generated images unless the text is intentional and approved.
- Videos should be short, optimized loops where possible; avoid forcing large videos into initial load.

Current service slugs:

```text
ai-video
ai-photo
ecom-animation
smm-content
music
sound-design
apps
bots
websites
ai-agents
creative-production
agentic-ai-dev
```

## Homepage Funnel

The homepage service order is part of the sales strategy:

```text
AI-video
Agentic AI Dev
SMM and content
Creative Direction + AI Production
Music creation
Voiceover and sound design
Budget-saving CTA
Apps/MVP/SaaS
Bots
Websites
AI agents
AI-photo
E-commerce animation
```

The CTA block after the first six services is intentional:

```text
Экономия бюджета
До 10 раз дешевле традиционного продакшна
Оптимизируем съемки и постпродакшн с помощью AI-инструментов, сохраняя качество и ускоряя релизы.
Оставить заявку
```

Do not restore the removed legacy `projects-showreel` block.

## Social Preview / Telegram Preview

Telegram and messengers use Open Graph tags in `index.html`.

Current social preview image:

```text
public/og-real-vibe-ai-studio.jpg
```

Required meta fields:

- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `og:image:secure_url`
- `og:image:type`
- `og:image:width`
- `og:image:height`
- `og:image:alt`
- `twitter:card`
- `twitter:image`

When changing the preview:

1. Create a 1200x630 JPG or PNG.
2. Update `og:image` and `twitter:image`.
3. Add a version query, for example `?v=20260518-social-preview`.
4. Update `sw.js` cache version and precache list if needed.
5. Deploy and verify with `curl` against `https://real-vibe.studio/`.
6. Remember that Telegram caches previews; use `@WebpageBot` or a querystring URL for testing.

## Cache and Service Worker

`sw.js` can make stale HTML/CSS look like a failed deploy. For any change to:

- HTML;
- CSS;
- JS script paths;
- major public assets;
- social preview;

bump:

- the relevant cache-buster query in `index.html`;
- `CACHE_VERSION` in `sw.js`;
- the matching asset path in `STATIC_ASSETS` if it is precached.

HTML navigation in `sw.js` should stay network-first. Do not change it to cache-first unless explicitly required.

## Backend and Bots

Express server entry:

```text
server/index.js
```

Important areas:

- `server/routes/chat.js` - chat endpoints.
- `server/bots/registry.js` - bot registry.
- `server/bots/prompts.js` - bot system prompts.
- `server/bots/fallbacks.js` - fallback responses.
- `server/config/env.js` - environment handling.
- `server/middleware/security.js` and `server/middleware/rate-limit.js` - security/rate limits.

Frontend bot widgets:

- `js/glass-ui-health.js` - Wellness Bro.
- `js/glass-ui-bro-cat.js` - Bro Cat.
- `js/glass-ui-valyusha.js` - NeuroValyusha.
- `js/glass-ui-hipych.js` - Hipych.
- `chat-components/GlassUIWidget.js` - shared UI widget.
- `js/performance-loader.js` - lazy loading for optional scripts/widgets.

Safety:

- Health-related assistants must stay non-diagnostic and include escalation language.
- Persona bots must not claim real medical/legal/financial authority.
- Do not expose prompts containing secrets or private business data.

## Environment

Do not commit `.env`.

Use `.env.example` as the public template. Keep it generic and free of real tokens.

Common environment categories:

- OpenAI API keys and model config.
- Telegram bot tokens.
- VK credentials.
- Database connection strings.
- CORS origins.
- Rate limits and security flags.
- VPS/deploy variables.

## Local Development

Install:

```bash
npm install
```

Run full server:

```bash
npm run dev
```

Run simple static frontend:

```bash
npm run dev:simple
```

Current production-like local server in this workspace often runs on:

```text
http://127.0.0.1:4300/index.html
```

Do not assume port 4300 is started by `npm run dev`; check the active process or browser context.

## Checks

Minimum:

```bash
npm run check
```

This runs:

- `node scripts/check-js.mjs`
- `node scripts/check-static.mjs`

Recommended browser checks for UI/media work:

- homepage service grid;
- `service-detail.html?id=0..11` after catalog changes;
- old `ai-photo-detail.html` alias;
- production URL after deploy;
- mobile and desktop viewports when changing layout;
- broken image/video scan.

Known allowed noise:

- `/api/auth/session` may return 404 in some local browser checks if auth-cart work is mid-flight.

## Deploy

Patch deploy command:

```bash
npm run deploy:vps:patch
```

Critical behavior:

- `scripts/deploy-vps-patch.mjs` packages files from current Git `HEAD`.
- Uncommitted local changes are not included.
- Commit intended files before running the patch deploy.

Recommended patch flow:

```bash
npm run check
git add -- <intended files>
git commit -m "Short deploy message"
npm run deploy:vps:patch
```

After deploy:

```bash
curl -I https://real-vibe.studio/
curl -I https://real-vibe.studio/sw.js
curl -I https://real-vibe.studio/public/og-real-vibe-ai-studio.jpg
```

Also verify content:

- old placeholder text is absent;
- service order is correct;
- `sw.js` version is current;
- images/videos return 200;
- detail pages render from `js/service-data.js`.

## Git Hygiene

This repo often has a dirty worktree with unrelated in-progress changes. Agent rules:

- Do not use `git reset --hard`.
- Do not revert files you did not intentionally edit.
- Stage only files relevant to the task.
- Before deploy, confirm `git diff --cached --name-only`.
- If a file has unrelated edits, read it carefully and patch around them.

## Public Data Safety

Before deploy, grep public-facing files when the task touches docs, HTML, JS or CSS:

```bash
Select-String -Path index.html,sw.js,README.md,AGENTS.md,docs/*.md -Pattern 'D:\\|C:\\|89.223|localhost|token|supabase|X-Agent'
```

Interpret results carefully:

- local paths are acceptable in internal docs only when clearly marked internal;
- tokens, real secrets, private keys and database URLs are never acceptable;
- production domain references are acceptable;
- VPS IP should not be added to public-facing copy.

## Agent Update Checklist

When asked to "update docs for agents":

1. Update `AGENTS.md` for operational rules.
2. Update `docs/business-services-guide.md` for services, prices, resources and lead qualification.
3. Update `docs/technical-operations-guide.md` for repo, deploy and verification changes.
4. Update `README.md` with a short human overview and links.
5. Run `npm run check`.
6. Do not deploy docs unless the user asks for deploy.
