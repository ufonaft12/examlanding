# Interactive Gaming Onboarding — Casino & Sportsbook

Mobile-first interactive landing page with two acquisition mechanics, built for the Entain technical assessment.
**Zero dependencies** — pure HTML5, modern CSS3 and ES6+ vanilla JS. No React, no jQuery, no GSAP, no Tailwind, no icon fonts, no web fonts.

**Live demo:** https://ufonaft12.github.io/examlanding/
Variant B of the A/B test: https://ufonaft12.github.io/examlanding/?variant=B

```
config.json   all copy, offers, odds, teams, A/B headlines    2.3 KB
index.html    document + inlined stylesheet                  26.2 KB   (7.2 KB gzipped)
script.js     LandingApp class: state, A/B, interactions     16.8 KB
                                        total ≈ 45 KB raw · ~13 KB gzipped
```

The stylesheet lives inside `index.html`. That is deliberate, not sloppiness — see [Performance notes](#performance-notes); it was the page's only render-blocking request. `git log -- style.css` has it as a standalone file if you would rather read it that way.

Run it locally over HTTP (the page fetches `config.json`, so `file://` won't work):

```bash
npx serve .          # → http://localhost:3000
# A/B variants:
#   http://localhost:3000/?variant=A   (default)
#   http://localhost:3000/?variant=B
```

---

## Strategy & Competitors

Both concepts answer the same question: **how do you get a cold paid-traffic visitor to invest something before you ask for an email address?**

What the market does today:

- **DraftKings & FanDuel** — the acquisition-gamification leaders (daily wheels, prediction prompts, mystery rewards), but their landing stacks carry React + animation libraries + heavy tracking, and mobile LCP pays for it. Engagement mechanics, taxed by JavaScript weight.
- **bet365** — the benchmark for speed and trust, but acquisition still leans on static text promo banners that casual mobile players scroll straight past.
- **Stake.com** — best-in-class fluid micro-interactions and instant gratification; proof that GPU-accelerated CSS feedback, not library weight, is what makes a page feel native.
- **BetMGM / Ladbrokes** — wheel-first: Spin-The-Wheel offers and AR Instant Spins as the standard random-reward promo surface.

The gap this build targets: **DraftKings-level interactivity at bet365-level weight** — the dopamine of a gamified offer, moved *in front of* the signup wall, shipped as ~43 KB of dependency-free code.

### 1. Casino — "The Mystery Vault Pick"

Three glowing vaults; one tap opens the chosen one, dims the others, and reveals a config-driven reward.

**Why not a spin wheel.** BetMGM's Spin-The-Wheel, Ladbrokes' AR Instant Spins and the sweepstakes-casino "Mystery Wheel" clones have made the wheel the default — and default means banner-blind. A wheel is also fundamentally *passive*: the player triggers randomness and watches. The vault pick gives the player a **decision** — same reward pool, materially different feeling of authorship over the outcome (perceived agency / autonomy bias, plus a touch of loss aversion about the two vaults they left closed).

**Why this is a safe bet for Entain specifically.** Entain already has a gamified-reward track record — Coral Coins evolving into LadBucks shows the group treats reward mechanics as a retention primitive, not a one-off promo skin. This concept is the acquisition-side sibling of that thinking: it is the same "earn → reveal → spend" loop, compressed into a single pre-registration tap.

**How it improves on the market**
- **No signup wall before the fun.** Competitors gate the wheel behind registration or a deposit; here the reveal is free and immediate, and the CTA arrives *after* the player owns a prize.
- **Instant reveal, no fake suspense.** The animation is ~1s end-to-end (shake → lid → coin). Wheels routinely burn 4–6s of spin time, which is where mobile users bail.
- **Reward pool is config, not code.** `casino.prizes[]` drives both the vault count and the reveal copy — marketing can swap offers per campaign with no deploy of JS.
- **Honest fineprint.** Wagering, min deposit and expiry sit under the CTA, from config, in the same card. Dark-pattern-free promos hold up better against UKGC/ASA scrutiny and reduce refund churn.

### 2. Sports — "Interactive Match Predictor" (two-leg mini bet-builder)

Real Madrid vs Barcelona. Tap a team card or the Draw chip to add a **match-winner (1X2)** leg, slide to set the **total goals** line, and the combined price and payout update live — then "Lock Prediction & Claim Bet".

**Inspiration and the delta.** FanDuel's real-time parlay builder and bet365's Bet Builder both proved that *constructing* a bet is more engaging than reading a price — but both live deep inside a logged-in app. I compressed the idea to two controls a thumb can operate on a bus, and put it on the landing page. The player leaves with a bet they built, not an offer they were shown.

**Why it converts.** By the time the CTA is tapped, the visitor has authored a selection and seen "their" payout — the endowment effect (commitment & consistency) makes abandoning it feel like giving something up. The signup then reads as *finishing* a bet rather than *starting* an account.

**How it improves on the market**
- **Transparent maths, no hidden margin theatre.** Every component of the price has its own row — winner leg, goals leg, combined odds, payout — so `2.10 × 1.85 = 3.89` is verifiable on screen rather than a single number to trust. Recalculated on every input event with 0ms perceived latency.
- **Odds are data.** `sports.oddsByLine` maps each goal line to a price, with a derived fallback (`baseOdds × 1.48^(line − 2.5)`) if a line is missing — the same shape a real pricing endpoint would return. `match.winnerOdds` prices the 1X2 leg.
- **The winner leg is optional by design.** With nothing selected the flow is exactly the single-market slider — same rows, same payout, no empty-state row. The second leg is an upsell the mechanic offers, never a gate it imposes: tapping the active pick again clears it, and the primary slider path is never blocked.
- **The bet survives the click.** The success box repeats the exact selection ("RMA & Over 3.5 @ 5.67 · $20.00 → $113.40") so the promise is unambiguous before registration.
- **Changing your mind is allowed.** Moving the slider *or* changing the winner pick after locking reopens the flow instead of leaving a stale payout on screen.
- **Graceful degradation.** Drop or under-specify `winnerOdds` in config and the team cards go inert (disabled, no `aria-pressed`, VS chip back to plain text) with the rest of the page untouched — the leg is a data-gated feature, not a code branch to maintain.

### Shared engineering decisions

- **`config.json` is the single source of truth** — brand, both variant headlines, social proof, prizes, teams, odds, CTA labels and every fineprint string. There is deliberately **no bundled copy of the config in JS**: if the fetch fails the page shows an "Offers unavailable / Try again" state rather than silently serving stale duplicated data.
- **Anti-abuse / edge cases** — a single `isAnimating` lock plus `pointer-events: none` on the vault grid, `disabled` + `aria-disabled` on unpicked vaults, `betLocked` state, and a busy button that cannot be re-fired. Rapid multi-tapping — on vaults, on team cards, on either CTA — produces exactly one reveal and one bet.
- **A/B framework** — `?variant=B` (case-insensitive, anything else falls back to `A`) swaps the H1 and subline from config, sets `<html data-variant>` for CSS/analytics hooks, and labels the hero badge so QA can see which cell is live.
- **Accessibility** — real `role="tablist"` product switch with `aria-selected`, `aria-pressed` toggle buttons for the 1X2 leg with descriptive `aria-label`s, `aria-live` on the reveal/payout/success regions, `<output>` for the slider value, 54px CTA targets, visible focus rings, `prefers-reduced-motion` guard that neutralises every animation. The page is `inert` behind the loader so the boot gate cannot be tabbed through, focus moves to the next CTA when locking a bet disables the current one, and every muted tone clears WCAG AA 4.5:1 against the darkest and lightest surface it sits on — including the T&C fineprint, which is exactly the text a player is entitled to be able to read.

---

## Performance notes

- **Animation budget:** only `transform` and `opacity` animate — the vault shake, the `rotateX` lid, the dimming, the spinner, the CTA pulse and the payout bump. No `width`/`top`/`box-shadow` transitions, so everything stays on the compositor at 60fps on mid-tier Android.
- **No forced layout on the hot path.** Dragging the slider fires `input` on every pointer move; the payout pop is replayed through the Web Animations API rather than by toggling a class, because the class trick needs an `offsetWidth` read to flush the removal — a synchronous style+layout per frame.
- **Idle cost:** the vaults' ambient breathing glow is switched off (`animation: none`) the moment a vault is opened, so a page left open after the reveal does no compositor work.
- **CLS ≈ 0:** the reveal, success and optional calc rows are the only DOM state changes, all below the fold in normal flow; the slider fill is a CSS custom property, not a layout change.
- **Nothing blocks the first paint.** The stylesheet is inlined, `script.js` is deferred, and there are no third-party requests, web fonts or icon fonts. A linked stylesheet costs ~150ms of render-blocking on throttled mobile and is the only branch in the critical path; inlined, the whole document is a single 7.2 KB gzipped response, inside the initial congestion window. The trade-off — CSS no longer separately cacheable — costs close to nothing here: this is a one-view landing page for paid traffic where repeat visits are rare, and GitHub Pages pins `Cache-Control` to 10 minutes regardless. At real scale the answer flips: content-hashed filenames behind a CDN with a one-year immutable TTL, and only the above-the-fold rules inlined.
- **No preload for `config.json`, on purpose.** The mandated 1.5s boot gate already overlaps the fetch (`Promise.all`), and the `cache: 'no-store'` freshness policy defeats preload reuse anyway — a preload here would only add a duplicate request and an unused-preload warning.

**Lighthouse** — measured on the live GitHub Pages URL, Chrome DevTools, mobile emulation with simulated throttling:

| Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- |
| **100** | **100** | **100** | **100** |

| FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- |
| 0.3 s | 0.3 s | 0 ms | 0 | 0.6 s |

The mandated 1.5s gate does **not** cost LCP, which is the interesting part: the loader is itself a contentful paint, so the largest element renders at 0.3s and the simulated latency plays out behind an already-painted screen. Blocking on `Promise.all([fetch, wait(1500)])` rather than chaining the two is what keeps the config fetch inside that window instead of after it.

One audit hint is left unactioned, because it is not mine to action: **"Use efficient cache lifetimes."** GitHub Pages serves every asset with a fixed 10-minute `Cache-Control` and exposes no way to override it. That is a property of the host, not of the code — on a real deployment it is one CDN rule.

---

## Next Steps

**Product**
1. **A third market** — the builder currently combines match winner × total goals; adding first scorer or both-teams-to-score (same optional-leg pattern, same client-side price multiplication) is the natural next increment, plus a "clear all legs" affordance once three markets are in play.
2. **In-flow registration** — put the email/phone field inside the winning state instead of redirecting; removing the redirect hop is typically worth double-digit FTD improvement.
3. **Responsible gambling interstitials** — deposit-limit prompt and reality-check copy woven into the claim flow, not buried in the footer. Also the right place for jurisdiction-aware messaging.
4. **Localisation** — the copy layer is already fully externalised; `config.{locale}.json` plus currency/odds-format switching (decimal ↔ fractional ↔ American) is a config change, not a rewrite.

**Technical**
5. **Real A/B measurement** — a variant *matrix* in config (headline × mechanic × CTA), deterministic bucketing by hashed visitor id, and a tiny `sendBeacon` event layer (`view`, `vault_open`, `pick_winner`, `slider_change`, `lock_bet`, `cta_click`) so the framework produces data instead of just rendering copy.
6. **Server-driven odds** — replace `oddsByLine` / `winnerOdds` with a `/odds` endpoint and optimistic UI: render the cached price instantly, reconcile on response, animate the diff. Real parlay pricing also applies a correlation margin rather than a straight multiplication.
7. **Service worker** — precache the shell and `config.json` with stale-while-revalidate for sub-100ms repeat visits and an offline-playable demo.
8. **Viewport-aware throttling** — pause the ambient glow and hero animations via `IntersectionObserver` when scrolled out of view, conserving battery on budget devices.
9. **WebP prize art with intrinsic dimensions** — each prize already accepts an `image` field; shipping WebP with explicit `width`/`height` keeps CLS at zero while replacing the CSS coin with real assets.

---

Demo build for assessment purposes — no real-money wagering. 18+. Gambling can be addictive; please play responsibly.
