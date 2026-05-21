# Real Vibe AI Studio - Agent Guide

This repository is the production workspace for Real Vibe AI Studio. Use this file as the first stop for any AI agent or developer working in the repo.

## Business Context

Real Vibe AI Studio sells AI production and agentic development services for business and creative projects.

Primary positioning:

- AI-video, SMM, music, voice/sound, and creative direction for content production.
- Agentic full-stack development: VPS Launchpad on Timeweb, MVP, SaaS, Android/PWA apps, delivery/CRM platforms, Telegram Mini Apps, AI bots, sites, custom GPTs, 1C-ready automations, and stabilization of AI-generated code.
- Frontend/design quality loop: Open Design with Codex and GPT Pro for fast design-system based prototypes, sandbox previews, and cleaner design-to-code handoff.
- The public site is an Android/PWA-ready sales funnel, a portfolio/product store, and a live demo of AI assistants.

Key person:

- Stepan Ivanov
- Agentic Full-Stack Developer / Vibe Coder
- Stack: TypeScript, React, Next.js, Python FastAPI/Django, Node.js, PostgreSQL, Supabase, Vercel, Docker, OpenAI API, Telegram Bot API, Open Design, Codex, GPT Pro.

Primary docs:

- [Business and Services Guide](docs/business-services-guide.md)
- [Technical Operations Guide](docs/technical-operations-guide.md)
- [Release Runbook](docs/release-runbook.md)
- [Current Release Notes](docs/release-notes-2026-05-21-v3.2.0.md)

## Source of Truth

Use these files before changing copy, services, media, or behavior:

- `js/service-data.js` - canonical service catalog for cards, detail pages, SEO copy, related services, and media.
- `data/service-prices.json` and `js/service-prices.js` - editable price-book and browser price overrides.
- `admin-prices.html` - local price dashboard for changing public price labels.
- `index.html` - homepage funnel, hero, service order, CTA blocks, SEO/social meta.
- `service-detail.html` and `js/service-detail-page.js` - shared detail page renderer.
- `public/works/services/<slug>/` - service covers, detail media, posters, and video loops.
- `public/works/portfolio/` - product portfolio screenshots used by the homepage portfolio/store section.
- `sw.js` - service worker cache version and precache list.
- `README.md`, `AGENTS.md`, `docs/business-services-guide.md`, `docs/technical-operations-guide.md` - agent-facing docs.

## Current Homepage Funnel

At the start of the homepage, the service order is intentionally:

1. AI-video
2. Vibe coding / Agentic AI Dev
3. SMM and content
4. Creative Direction + AI Production
5. Music creation
6. Voiceover and sound design
7. Budget-saving CTA
8. MVP/SaaS/apps, bots, websites, AI agents, AI-photo, e-commerce animation
9. Agentic Dev showcase and portfolio/product store with live/Vercel links

Do not reintroduce the old `projects-showreel` section with demo cards such as "AI-video for brand", "Click play", or repeated placeholder videos. That block was intentionally removed from the sales funnel.

The portfolio/product store section should show real products and proof-of-work, not placeholders. Current products include Real Vibe Studio, GKS Delivery Platform, PolStan App, DOMINIA, DOMINIA Arena, Hermes Agent OS, RealCampGuide, and Real Camp Planner. Do not show `freelance-showcase` as a product; it is the GitHub/CV profile source. Do not show Open Design as a product; it is a frontend/design workflow used by the studio.

Current release is `v3.2.0` / `2026-05-21-product-store`. Preserve these public rules:

- DOMINIA links use `https://www.dominia.info/`.
- Real Camp Planner has no public temporary Vercel href; describe it as a RealCampGuide/Putevoditel planning module and standalone AI planning agent.
- The mobile menu must open as a smooth modal overlay and work in `file://` plus `http://127.0.0.1:3001` static preview.
- Current storefront cache marker is `2026-05-21-hero-cta-circles`; current service worker cache version is `v2.18-20260521-hero-cta-circles`.

## Service Catalog Snapshot

| ID | Slug | Service | Public price anchor |
|---:|---|---|---|
| 0 | `ai-video` | AI-video and advertising reels | from 80,000 RUB |
| 11 | `agentic-ai-dev` | Vibe coding / Agentic AI Dev | development from 30,000 RUB; VPS Launchpad from 30,000 RUB |
| 3 | `smm-content` | SMM and content | from 40,000 RUB |
| 10 | `creative-production` | Creative Direction + AI Production | from 150,000 RUB |
| 4 | `music` | Music creation | from 20,000 RUB |
| 5 | `sound-design` | Voiceover and sound design | from 15,000 RUB |
| 6 | `apps` | MVP, SaaS, apps with AI functions | from 50,000 RUB for MVP module |
| 7 | `bots` | Telegram bots with AI, DB, admin panel | from 10,000 RUB |
| 8 | `websites` | Sites and web services with AI functions | from 70,000 RUB |
| 9 | `ai-agents` | AI agents and GPT assistants | from 25,000 RUB |
| 1 | `ai-photo` | AI-photo for e-commerce and key visual | from 20,000 RUB per set |
| 2 | `ecom-animation` | AI animation and e-commerce infographics | from 35,000 RUB |

Detailed descriptions, qualification questions, and deliverables are in [docs/business-services-guide.md](docs/business-services-guide.md).

Agentic AI Dev includes `VPS Launchpad`: help the client rent and configure a Timeweb VPS, domain, SSL and deploy contour as a base for a site, web app, bots, AI agents, cabinet, cart, payments and future vibe-coding work. It also includes Android/PWA app shells, delivery/CRM modules, 1C-ready automation adapters, and portfolio/product-store apps. Position it as an owned product platform, not a generic hosting task.

## Operating Rules

- Keep business copy in sync with `js/service-data.js` and public prices in sync with `data/service-prices.json`.
- If changing service order, update both the homepage and the docs.
- If changing CSS, HTML, JS, or media paths, bump the relevant cache-buster and `sw.js` cache version.
- If changing social preview, update `og:image`, `twitter:image`, image dimensions, and deploy the new asset.
- Never commit `.env`, API keys, tokens, database URLs, Supabase keys, VPS IPs in public-facing docs, or private customer data.
- Do not revert dirty files you did not change. This workspace often contains parallel changes.

## Verification

Minimum before finishing:

```bash
npm run check
```

For homepage or detail-page changes, also run a browser check with Playwright or an equivalent script:

- `index.html`
- mobile menu open/close when header/menu JS or mobile CSS changes
- `service-detail.html?id=0..11` when service data changes
- production URL after deploy
- social preview meta when OG tags change

## Deploy Notes

Patch deploy:

```bash
npm run deploy:vps:patch
```

Important: the patch deploy script packages files from the current Git `HEAD`, not arbitrary unstaged workspace changes. Commit the intended files first, then run the deploy.

After deploy, verify production directly:

```bash
curl -I https://real-vibe.studio/
curl -I https://real-vibe.studio/public/og-real-vibe-ai-studio.jpg
```

Do not assume the in-app browser or Telegram preview has the newest cache.
