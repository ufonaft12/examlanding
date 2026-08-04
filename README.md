# Interactive Gaming Onboarding — Casino & Sportsbook

Mobile-first interactive landing page with two acquisition mechanics, built for the Entain technical assessment.
**Zero dependencies** — pure HTML5, modern CSS3 and ES6+ vanilla JS. No React, no jQuery, no GSAP, no Tailwind, no icon fonts, no web fonts.

**Live demo:** https://ufonaft12.github.io/examlanding/
Variant B of the A/B test: https://ufonaft12.github.io/examlanding/?variant=B

```
config.json   all copy, offers, odds, teams, A/B headlines    2.3 KB
index.html    semantic, accessible document                   6.7 KB
style.css     dark iGaming theme + keyframes                 16.9 KB
script.js     LandingApp class: state, A/B, interactions     13.0 KB
                                        total ≈ 39 KB raw · ~12 KB gzipped
```

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

The gap this build targets: **DraftKings-level interactivity at bet365-level weight** — the dopamine of a gamified offer, moved *in front of* the signup wall, shipped as ~39 KB of dependency-free code.

### 1. Casino — "The Mystery Vault Pick"

Three glowing vaults; one tap opens the chosen one, dims the others, and reveals a config-driven reward.

**Why not a spin wheel.** BetMGM's Spin-The-Wheel, Ladbrokes' AR Instant Spins and the sweepstakes-casino "Mystery Wheel" clones have made the wheel the default — and default means banner-blind. A wheel is also fundamentally *passive*: the player triggers randomness and watches. The vault pick gives the player a **decision** — same reward pool, materially different feeling of authorship over the outcome (perceived agency / autonomy bias, plus a touch of loss aversion about the two vaults they left closed).

**Why this is a safe bet for Entain specifically.** Entain already has a gamified-reward track record — Coral Coins evolving into LadBucks shows the group treats reward mechanics as a retention primitive, not a one-off promo skin. This concept is the acquisition-side sibling of that thinking: it is the same "earn → reveal → spend" loop, compressed into a single pre-registration tap.

**How it improves on the market**
- **No signup wall before the fun.** Competitors gate the wheel behind registration or a deposit; here the reveal is free and immediate, and the CTA arrives *after* the player owns a prize.
- **Instant reveal, no fake suspense.** The animation is ~1s end-to-end (shake → lid → coin). Wheels routinely burn 4–6s of spin time, which is where mobile users bail.
- **Reward pool is config, not code.** `casino.prizes[]` drives both the vault count and the reveal copy — marketing can swap offers per campaign with no deploy of JS.
- **Honest fineprint.** Wagering, min deposit and expiry sit under the CTA, from config, in the same card. Dark-pattern-free promos hold up better against UKGC/ASA scrutiny and reduce refund churn.

### 2. Sports — "Interactive Match Predictor"

Real Madrid vs Barcelona, one slider (Over 0.5 → 5.5 goals), live odds and payout, then "Lock Prediction & Claim Bet".

**Inspiration and the delta.** FanDuel's real-time parlay builder and bet365's Bet Builder both proved that *constructing* a bet is more engaging than reading a price — but both live deep inside a logged-in app. I compressed the idea to a single control that a thumb can operate on a bus, and put it on the landing page. The player leaves with a bet they built, not an offer they were shown.

**Why it converts.** By the time the CTA is tapped, the visitor has authored a selection and seen "their" payout — the endowment effect (commitment & consistency) makes abandoning it feel like giving something up. The signup then reads as *finishing* a bet rather than *starting* an account.

**How it improves on the market**
- **Transparent maths, no hidden margin theatre.** Stake × odds = payout is shown as three explicit rows, recalculated on every input event with 0ms perceived latency.
- **Odds are data.** `sports.oddsByLine` maps each goal line to a price, with a derived fallback (`baseOdds × 1.48^(line − 2.5)`) if a line is missing — the same shape a real pricing endpoint would return.
- **The bet survives the click.** The success box repeats the exact selection ("Over 3.5 @ 2.70 · $20.00 → $54.00") so the promise is unambiguous before registration.
- **Changing your mind is allowed.** Moving the slider after locking reopens the flow instead of leaving a stale payout on screen.

### Shared engineering decisions

- **`config.json` is the single source of truth** — brand, both variant headlines, social proof, prizes, teams, odds, CTA labels and every fineprint string. There is deliberately **no bundled copy of the config in JS**: if the fetch fails the page shows an "Offers unavailable / Try again" state rather than silently serving stale duplicated data.
- **Anti-abuse / edge cases** — a single `isAnimating` lock plus `pointer-events: none` on the vault grid, `disabled` + `aria-disabled` on unpicked vaults, `betLocked` state, and a busy button that cannot be re-fired. Rapid multi-tapping produces exactly one reveal and one bet.
- **A/B framework** — `?variant=B` (case-insensitive, anything else falls back to `A`) swaps the H1 and subline from config, sets `<html data-variant>` for CSS/analytics hooks, and labels the hero badge so QA can see which cell is live.
- **Accessibility** — real `role="tablist"` product switch with `aria-selected`, `aria-live` on the reveal/payout/success regions, `<output>` for the slider value, 54px CTA targets, visible focus rings, `prefers-reduced-motion` guard that neutralises every animation.

---

## Performance notes

- **Animation budget:** only `transform` and `opacity` animate — the vault shake, the `rotateX` lid, the dimming, the spinner, the CTA pulse and the payout bump. No `width`/`top`/`box-shadow` transitions, so everything stays on the compositor at 60fps on mid-tier Android.
- **Idle cost:** the vaults' ambient breathing glow is switched off (`animation: none`) the moment a vault is opened, so a page left open after the reveal does no compositor work.
- **CLS ≈ 0:** the reveal and success panels are the only DOM insertions and both animate from `opacity`/`transform` in normal flow below the fold; the slider fill is a CSS custom property, not a layout change.
- **Zero third-party requests, no render-blocking JS.** Four same-origin files, `script.js` deferred. There is intentionally no `<link rel="preload">` for `config.json`: the mandated 1.5s boot gate already overlaps the fetch (`Promise.all`), and the `cache: 'no-store'` freshness policy would defeat preload reuse anyway — a preload here would only add an unused-preload warning.

**Lighthouse.** The brief mandates a 1.5s spinner before the page is revealed, which pins LCP by design — the largest element cannot paint before `BOOT_DELAY` elapses. On a local `npx serve` run (Chrome, mobile emulation, simulated throttling) the page lands around **90–95 Performance with LCP ≈ 1.6s**; setting `BOOT_DELAY = 0` in `script.js` moves it to **99–100 with LCP ≈ 0.4s**. Accessibility / Best Practices / SEO are unaffected by the gate. Re-run on your own hardware before reading too much into the absolute numbers — the point is that *the only thing standing between this page and a perfect score is a deliberate, one-line-configurable delay.*

---

## Next Steps

**Product**
1. **Multi-leg predictor** — stack 2–3 markets (goals + first scorer + both teams to score) into a mini bet-builder, with the combined price computed client-side. Higher perceived value per interaction and a natural bridge to the real Bet Builder post-signup.
2. **In-flow registration** — put the email/phone field inside the winning state instead of redirecting; removing the redirect hop is typically worth double-digit FTD improvement.
3. **Responsible gambling interstitials** — deposit-limit prompt and reality-check copy woven into the claim flow, not buried in the footer. Also the right place for jurisdiction-aware messaging.
4. **Localisation** — the copy layer is already fully externalised; `config.{locale}.json` plus currency/odds-format switching (decimal ↔ fractional ↔ American) is a config change, not a rewrite.

**Technical**
5. **Real A/B measurement** — a variant *matrix* in config (headline × mechanic × CTA), deterministic bucketing by hashed visitor id, and a tiny `sendBeacon` event layer (`view`, `vault_open`, `slider_change`, `lock_bet`, `cta_click`) so the framework produces data instead of just rendering copy.
6. **Server-driven odds** — replace `oddsByLine` with a `/odds` endpoint and optimistic UI: render the cached price instantly, reconcile on response, animate the diff.
7. **Service worker** — precache the shell and `config.json` with stale-while-revalidate for sub-100ms repeat visits and an offline-playable demo.
8. **Viewport-aware throttling** — pause the ambient glow and hero animations via `IntersectionObserver` when scrolled out of view, conserving battery on budget devices.
9. **WebP prize art with intrinsic dimensions** — each prize already accepts an `image` field; shipping WebP with explicit `width`/`height` keeps CLS at zero while replacing the CSS coin with real assets.

---

Demo build for assessment purposes — no real-money wagering. 18+. Gambling can be addictive; please play responsibly.
