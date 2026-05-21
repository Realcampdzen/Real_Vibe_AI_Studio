# Release Notes - v3.2.0 - 2026-05-21

## Summary

`v3.2.0` turns the Real Vibe AI Studio homepage into the current Android/PWA-ready product store and portfolio storefront. The release focuses on product positioning, real portfolio proof, mobile menu stability, and local preview reliability.

## Product Store

- Rebuilt `#portfolio` as an 8-card product storefront.
- Featured cards: Real Vibe Studio, GKS Delivery Platform, RealCampGuide.
- Small product cards: PolStan App, DOMINIA, DOMINIA Arena, Hermes Agent OS, Real Camp Planner.
- `freelance-showcase` is not a product card; it remains the GitHub/CV source for Stepan's profile.
- Open Design is not a product card; it remains a frontend/design workflow reference.

## Product Positioning

- RealCampGuide is presented as a Camp CRM / Pedagogy OS with category and home-screen visuals.
- PolStan App is presented as a mobile storefront / PWA-TWA for producer, freelancer, expert, or personal brand lead flow.
- DOMINIA points to the official URL: `https://www.dominia.info/`.
- DOMINIA Arena is positioned as a cyberpunk/esports version of the DOMINIA web experience.
- Hermes Agent OS uses sanitized public copy only.
- Real Camp Planner no longer links to the temporary Vercel app. It is described as a RealCampGuide/Putevoditel planning module and standalone AI agent for plan grids, camp days, activities, resources, and shift organization.

## Mobile UX

- Restored desktop hero CTA buttons as readable circular controls and removed the duplicated portfolio action from the hero row.
- Fixed mobile menu initialization in `file://` preview by making analytics transport failures non-blocking.
- Suppressed auth-cart `/api/...` calls during `file://`, `localhost`, and `127.0.0.1` static previews unless `window.__RV_ENABLE_LOCAL_API__` is set.
- Polished the hamburger menu into a full-screen modal overlay:
  - smooth backdrop fade;
  - glass panel entrance;
  - staggered content reveal;
  - hamburger-to-close animation;
  - scroll lock releases after close animation.

## Cache

- `index.html` cache marker: `2026-05-21-hero-cta-fit`.
- `css/style.css`: `v=20260521-hero-cta-fit`.
- `css/mobile-improvements.css`: `v=20260521-mobile-menu-motion-polish`.
- `js/script.js`: `v=20260521-mobile-menu-motion-polish`.
- `sw.js`: `v2.19-20260521-hero-cta-fit`.

## Verification

Commands:

```bash
npm run check
git diff --check
```

Browser checks:

- direct `file://` preview of `index.html`
- `http://127.0.0.1:3001/index.html`
- mobile menu open, close, reopen at `642x694`;
- mobile menu open, close, reopen at `390x844`;
- no console errors in the target flows;
- no horizontal overflow in the tested menu states;
- portfolio remains 8 cards;
- DOMINIA href is `https://www.dominia.info/`;
- Real Camp Planner has no public temporary Vercel href.

## Deploy Status

Deployed to production by VPS patch deploy after committing the intended release files. `npm run deploy:vps:patch` packages files from Git `HEAD`.
