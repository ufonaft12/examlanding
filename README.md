# Interactive Gaming Onboarding — Casino & Sportsbook

Mobile-first interactive landing page with two acquisition mechanics, built for the Entain technical assessment.
**Zero runtime dependencies** — pure HTML5, Sass-authored CSS and ES6+ vanilla JS. No React, no jQuery, no GSAP, no Tailwind, no icon fonts, no web fonts. The only tool in the project is the Sass compiler, and nothing it produces ships a library.

**Live demo:** https://ufonaft12.github.io/examlanding/
Variant B of the A/B test: https://ufonaft12.github.io/examlanding/?variant=B

```
src/               Sass sources — the stylesheet is authored here
  _tokens.scss       design tokens, emitted as CSS custom properties
  _base.scss         reset and document defaults          ┐
  _loader.scss       boot gate + the app's hidden state   ┘ critical
  _layout.scss       glow, wrap, header, hero, views, footer
  _card.scss         card shell, fineprint, prize reveal
  _button.scss       CTA, busy and disabled states
  _vault.scss        the 3D vault: lid, dial, prize, shake
  _match.scss        1X2 team cards and the draw chip
  _bet.scss          slider, range, calculator, success
  critical.scss      → inlined into index.html by build.js
  main.scss          → compiled to style.css
build.js           sass compile + critical-CSS injection
index.html         document + generated critical CSS      12.2 KB  (4.0 KB gz)
style.css          generated — deferred stylesheet        19.0 KB  (4.5 KB gz)
script.js          LandingApp: state, A/B, interactions   25.1 KB  (7.2 KB gz)
config.json        all copy, offers, odds, teams, A/B      2.7 KB  (1.2 KB gz)
                                        shipped: ~60 KB raw · ~18 KB gzipped
```

`index.html` and `style.css` are **generated and committed**, so the site serves straight from the repo with no install step. Edit the Sass, not the output:

```bash
npm install          # sass, the one devDependency
npm run build        # src/*.scss → style.css + critical CSS into index.html
npm run check        # CI gate: fails if the committed output is stale
npm run watch        # sass --watch while working

npx serve .          # → http://localhost:3000  (config.json is fetched, so file:// won't work)
# A/B variants:  ?variant=A  (default)  ·  ?variant=B
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
- **The winner leg is optional, and the page says so.** With nothing selected the flow is exactly the single-market slider — same rows, same payout, no empty-state row. But an untouched market sitting above a live CTA reads as an unanswered question, so the market is labelled optional and the button states what it will actually lock: `Over 2.5 · $37.00` before a pick, `RMA & Over 2.5 · $77.80` after one. **Nothing is pre-selected.** Defaulting a player into a wager they did not make is a dark pattern the regulators are alive to, and it would inflate the headline payout on a bet nobody built.
- **The 1X2 market is laid out the way a bookmaker lays one out** — three prices in a row tagged 1 / X / 2 — rather than as two team cards with the draw squeezed between them. The earlier shape read as "choose a side"; this one reads as a market you can take a position on, which is what it is. Crests are shields striped from `home.color` / `away.color` in config, and the form guide is chips rather than a run of letters: no logo files ship, real club marks are trademarked, and two stripes are enough to tell the sides apart.
- **The bet survives the click.** The success box repeats the exact selection ("RMA & Over 3.5 @ 5.67 · $20.00 → $113.40") so the promise is unambiguous before registration.
- **Changing your mind is allowed.** Moving the slider *or* changing the winner pick after locking reopens the flow instead of leaving a stale payout on screen.
- **Graceful degradation.** Drop or under-specify `winnerOdds` in config and the team cards go inert (disabled, no `aria-pressed`, VS chip back to plain text) with the rest of the page untouched — the leg is a data-gated feature, not a code branch to maintain.

### Shared engineering decisions

- **`config.json` is the single source of truth** — brand, both variant headlines, social proof, prizes, teams, odds, CTA labels and every fineprint string. There is deliberately **no bundled copy of the config in JS**: if the fetch fails the page shows an "Offers unavailable / Try again" state rather than silently serving stale duplicated data.
- **Anti-abuse / edge cases** — a single `isAnimating` lock plus `pointer-events: none` on the vault grid, `disabled` + `aria-disabled` on unpicked vaults, `betLocked` state, and a busy button that cannot be re-fired. Rapid multi-tapping — on vaults, on team cards, on either CTA — produces exactly one reveal and one bet.
- **A/B framework** — `?variant=B` (case-insensitive, anything else falls back to `A`) swaps the H1 and subline from config, sets `<html data-variant>` for CSS/analytics hooks, and labels the hero badge so QA can see which cell is live.
- **Accessibility** — a real `role="tablist"` product switch, which means honouring the keyboard contract that role implies: roving `tabindex`, arrows to move between tabs, Home/End to the ends. Without it the role is a lie to a screen reader, which announces "tab 1 of 2" and then finds the arrows do nothing. Plus `aria-selected`, `aria-pressed` toggle buttons for the 1X2 leg with descriptive `aria-label`s, `aria-live` on the reveal/payout/success regions, `<output>` for the slider value, 54px CTA targets, visible focus rings, `prefers-reduced-motion` guard that neutralises every animation. The page is `inert` behind the loader so the boot gate cannot be tabbed through, focus moves to the next CTA when locking a bet disables the current one, and every muted tone clears WCAG AA 4.5:1 against the darkest and lightest surface it sits on — including the T&C fineprint, which is exactly the text a player is entitled to be able to read.
- **The next step is always on screen.** On a phone the panels open under the fold: the player taps a vault, or adds a match-winner leg that pushes two more rows into the calculator, and the thing they are meant to press next is off screen. Three moments now scroll — vault reveal, leg selection, prediction locked — and only when the target is genuinely out of view, so nothing moves on desktop. The target is always the button, never the panel around it: a panel taller than the viewport gets top-aligned, which puts the CTA straight back under the fold — and config copy decides how tall these panels are.

Three details make it reliable rather than approximate:

- **The destination is computed by the engine.** `scrollIntoView({block: 'nearest'})` runs, the resulting position is read back, the scroll is restored, and the animation goes there instead. Hand-rolled geometry gets this wrong: the views animate in and become containing blocks, which breaks an `offsetTop` chain, while a `getBoundingClientRect` read mid-animation is skewed by the transform.
- **`visualViewport`, not `innerHeight`.** iOS Safari's layout viewport runs underneath the browser toolbars, so `innerHeight` over-reports what is on screen and the engine parks a bottom-aligned CTA behind the chrome — visible, but only half of it. The difference between the two is added to the target, and a settle pass after the motion corrects whatever the entry animation shifted.
- **The easing is hand-rolled** on `requestAnimationFrame`, because `behavior: 'smooth'` is a silent no-op in some engines — measured in the test rig, not assumed. A timer lands the final position if rAF is starved, and any real user scroll cancels the animation outright.

Verified in a fixed-size iframe rig at 393×660, 390×560, 360×480 and 360×340, against both the shipped copy and a deliberately long-copy config that makes the panels overflow the viewport.
- **Mobile-first, but not mobile-only.** Below 720px the page is a single column that gets out of the way of the mechanic. From 720px the supporting points set in two columns; from 960px the layout splits properly — the offer argues on the left, the thing you actually touch sits on the right at full size, and the left column is `sticky` so the pitch is still on screen when the player reaches the CTA at the bottom of a tall bet slip. That last part only works because `body` uses `overflow-x: clip` rather than `hidden`: `hidden` makes the body a scroll container, which cancels `position: sticky` for everything inside it. A separate rule for short-but-wide laptops (`min-width: 960px and max-height: 820px`) tightens the vertical rhythm so the sports card still clears the fold at 768px tall. Hover affordances — a CTA that lifts, outcome cards that light their border — are all inside `@media (hover: hover)`, so a tap on a phone never leaves an element stuck in its hover state.
- **`[hidden]` is forced to win.** Author rules out-rank the UA stylesheet whatever their specificity, so a component that sets `display` quietly defeats the attribute. That was not cosmetic: the calculator was showing a winner leg and a combined price, with placeholder numbers that contradicted the payout printed under them, on a bet nobody had built yet. The test suite now asserts computed `display` rather than the presence of the attribute — checking the markup is what let this through.
- **Styling is authored in Sass, not generated by it.** Tokens live in one map and are emitted as CSS custom properties rather than kept as Sass variables, because the runtime rebinds `--accent` per card (`.card--gold`, `.card--green`) and every descendant has to follow — a compile-time variable cannot do that. Partials are split by component, and the split between critical and deferred is a build concern, not something the author has to remember. `npm run check` fails the build if the committed output has drifted from the sources.

---

## Performance notes

- **Animation budget:** only `transform` and `opacity` animate — the vault shake, the `rotateX` lid, the dimming, the spinner, the CTA pulse and the payout bump. No `width`/`top`/`box-shadow` transitions, so everything stays on the compositor at 60fps on mid-tier Android.
- **No forced layout on the hot path.** Dragging the slider fires `input` on every pointer move; the payout pop is replayed through the Web Animations API rather than by toggling a class, because the class trick needs an `offsetWidth` read to flush the removal — a synchronous style+layout per frame.
- **Idle cost:** the vaults' ambient breathing glow is switched off (`animation: none`) the moment a vault is opened, so a page left open after the reveal does no compositor work.
- **CLS ≈ 0:** the reveal, success and optional calc rows are the only DOM state changes, all below the fold in normal flow; the slider fill is a CSS custom property, not a layout change.
- **Nothing blocks the first paint.** A plain `<link rel="stylesheet">` costs ~150ms of render-blocking on throttled mobile and is the only branch in the critical path. So the stylesheet is split: `critical.scss` — tokens, reset, loader, and the app's hidden state, ~2.7 KB — is inlined at build time, and everything else is fetched off the critical path with the `media="print"` / `onload` swap, with a `<noscript>` fallback. `script.js` is deferred; there are no third-party requests, web fonts or icon fonts.
- **The boot gate pays for the split.** The scope of "critical" is decided by one question — what is on screen before `.app.is-ready`? Only the loader. The deferred sheet then has the full mandated 1.5s to arrive while `#app` sits at `opacity: 0` and `inert`, so there is no window in which unstyled content can appear. The requirement to fake latency turns out to be the thing that makes deferring the stylesheet free.
- **No preload for `config.json`, on purpose.** The mandated 1.5s boot gate already overlaps the fetch (`Promise.all`), and the `cache: 'no-store'` freshness policy defeats preload reuse anyway — a preload here would only add a duplicate request and an unused-preload warning.

**Lighthouse**, run against the live GitHub Pages URL with mobile emulation and simulated throttling (`lighthouse --form-factor=mobile --screenEmulation.mobile`):

| Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- |
| **99** | **100** | **100** | **100** |

| FCP | LCP | TBT | CLS | Speed Index |
| --- | --- | --- | --- | --- |
| 1.1 s | 1.1 s | 10 ms | **0** | 3.2 s |

Served from a local static server instead — same build, no GitHub Pages TTFB — it is **100 across all four**. On an unthrottled desktop profile FCP and LCP land at 0.3 s.

Two things are worth reading off that table.

**The 1.5s gate costs no LCP.** FCP and LCP are the same moment because the loader is itself a contentful paint: the largest element renders as soon as the document does, and the simulated latency plays out behind an already-painted screen. Blocking on `Promise.all([fetch, wait(1500)])` instead of chaining the two is what keeps the config fetch inside that window rather than after it.

**Speed Index is the one metric the gate does cost**, and deliberately so. It measures how quickly the viewport reaches its final state, so a mandated hold at a spinner is exactly what it penalises. Removing it would buy roughly a point of Performance and break the brief; it stays.

The only remaining audit is **"Use efficient cache lifetimes"**, which is not mine to action: GitHub Pages serves every asset with a fixed 10-minute `Cache-Control` and exposes no override. That is a property of the host, not the code — on a real deployment it is one CDN rule.

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
