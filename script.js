/* VAULTBET — app controller. Vanilla ES6+, zero dependencies. */
'use strict';

const BOOT_DELAY = 1500;   // simulated config/KYC latency (spec: exactly 1.5s)
const SHAKE_MS   = 420;    // must match .vault.is-shaking keyframes
const OPEN_MS    = 620;    // lid rotation + prize fade
const BET_MS     = 800;    // button loading state before success box

const PICKS = ['home', 'draw', 'away'];

const wait  = (ms) => new Promise((res) => setTimeout(res, ms));
const money = (n) => '$' + n.toFixed(2);
const num   = (n) => Number(n).toLocaleString('en-US');
const $     = (sel, root = document) => root.querySelector(sel);
const $$    = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

class LandingApp {
  constructor() {
    /* ---- state ---- */
    this.config      = null;
    this.variant     = 'A';
    this.view        = 'casino';
    this.isAnimating = false;   // global input lock
    this.vaultOpened = false;
    this.betLocked   = false;
    this.line        = 2.5;
    this.pick        = null;    // optional 1X2 leg: 'home' | 'draw' | 'away'
    this.winnerOdds  = null;

    /* ---- dom ---- */
    this.el = {
      loader:      $('#loader'),
      app:         $('#app'),
      headline:    $('#headline'),
      subline:     $('#subline'),
      switchWrap:  $('.switch'),
      tabs:        $$('.switch__btn'),
      views:       $$('.view'),
      vaults:      $('#vaults'),
      vaultBtns:   [],
      reveal:      $('#casinoReveal'),
      prizeTitle:  $('#prizeTitle'),
      prizeDetail: $('#prizeDetail'),
      casinoCta:   $('#casinoCta'),
      range:       $('#goalsRange'),
      matchRow:    $('#matchRow'),
      matchBox:    $('.match'),
      matchHead:   $('#matchHead'),
      pickHint:    $('[data-pick-hint]'),
      pickBtns:    $$('[data-pick]'),
      winnerRow:   $('#winnerRow'),
      winnerName:  $('#winnerName'),
      winnerOddsOut:$('#winnerOddsOut'),
      combinedRow: $('#combinedRow'),
      combinedOut: $('#combinedOut'),
      lineOut:     $('#lineOut'),
      stakeOut:    $('#stakeOut'),
      oddsOut:     $('#oddsOut'),
      oddsLabel:   $('#oddsLabel'),
      payoutOut:   $('#payoutOut'),
      sportsCta:   $('#sportsCta'),
      ctaNote:     $('#ctaNote'),
      success:     $('#sportsSuccess'),
      successTitle:$('#successTitle'),
      successSummary:$('#successSummary'),
      successBody: $('#successBody'),
      successCta:  $('#successCta')
    };
  }

  /* ============ boot ============ */
  async init() {
    document.body.classList.add('is-locked');
    this.variant = this.readVariant();

    /* one failure path for a missing config AND a malformed one — no bundled copy
       to fall back on, so a hydrate error must not leave the loader spinning */
    try {
      const [config] = await Promise.all([this.loadConfig(), wait(BOOT_DELAY)]);
      this.config = config;
      this.hydrate();
      this.bind();
      this.reveal();
    } catch (err) {
      this.fail(err);
    }
  }

  /* config is the only hard dependency — surface the failure instead of faking data */
  fail(err) {
    document.body.classList.remove('is-locked');
    this.el.loader.innerHTML =
      '<p class="loader__text">Offers unavailable</p>' +
      '<p class="loader__hint"></p>' +
      '<button class="btn btn--gold" type="button" data-retry>Try again</button>';
    $('.loader__hint', this.el.loader).textContent = err.message || String(err);
    $('[data-retry]', this.el.loader).addEventListener('click', () => location.reload());
  }

  readVariant() {
    const v = (new URLSearchParams(location.search).get('variant') || 'A').trim().toUpperCase();
    return v === 'B' ? 'B' : 'A';
  }

  async loadConfig() {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('config.json — HTTP ' + res.status);
    return res.json();
  }

  reveal() {
    this.el.loader.classList.add('is-done');
    this.el.app.classList.add('is-ready');
    this.el.app.setAttribute('aria-busy', 'false');
    this.el.app.inert = false;          // opacity:0 alone still leaves it tabbable
    document.body.classList.remove('is-locked');
    setTimeout(() => { this.el.loader.hidden = true; }, 420);
  }

  /* ============ render config ============ */
  hydrate() {
    const c = this.config;
    const set = (sel, text) => { const n = $(sel); if (n) n.textContent = text; };

    /* brand */
    set('[data-brand-mark]', c.brand.mark);
    set('[data-brand-name]', c.brand.name);
    set('[data-brand-tagline]', c.brand.tagline);

    /* A/B headline — resolve the variant before anything reads it */
    const v = c.variants[this.variant] || c.variants.A;
    document.title = c.brand.name + ' — ' + v.headline;
    this.el.headline.textContent = v.headline;
    this.el.subline.textContent  = v.subline;
    set('[data-variant-label]', 'Variant ' + this.variant);
    document.documentElement.dataset.variant = this.variant;

    /* social proof */
    const proof = $('[data-social-proof]');
    const sp = c.social || {};
    if (proof) {
      if (sp.count) proof.textContent = num(sp.count) + ' ' + (sp.label || 'players claimed today');
      else proof.remove();
    }

    /* supporting argument for the desktop layout, where the offer has a column
       of its own — hidden on phones, where the job is to reach the mechanic */
    const points = $('[data-highlights]');
    if (points) {
      const items = c.highlights || [];
      if (!items.length) points.remove();
      else items.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        points.appendChild(li);
      });
    }

    /* casino */
    set('[data-casino-eyebrow]', c.casino.eyebrow);
    set('[data-casino-title]',   c.casino.title);
    set('[data-casino-sub]',     c.casino.subtitle);
    set('[data-casino-foot]',    c.casino.footnote);
    this.el.casinoCta.textContent = c.casino.cta;

    this.buildVaults(c.casino.prizes || []);

    /* warm the prize art so the reveal never pops in late */
    (c.casino.prizes || []).forEach((p) => { if (p.image) { const i = new Image(); i.src = p.image; } });

    /* sports */
    const s = c.sports, m = s.match;
    set('[data-sports-eyebrow]', s.eyebrow);
    set('[data-sports-title]',   s.title);
    set('[data-sports-sub]',     s.subtitle);
    set('[data-sports-foot]',    s.footnote);
    set('[data-comp]',    m.competition);
    set('[data-kickoff]', m.kickoff);
    set('[data-market]',  m.market);
    set('[data-home-name]',  m.home.name);
    set('[data-home-short]', m.home.short);
    set('[data-away-name]',  m.away.name);
    set('[data-away-short]', m.away.short);
    set('[data-winner-market]', m.winnerMarket || 'Match Winner');

    /* form as chips, and club colour on the crest — the two sides have to read
       as different entities, and no logo file ships with this build */
    this.paintTeam('home', m.home);
    this.paintTeam('away', m.away);

    /* optional match-winner leg — interactive only when config prices all three outcomes */
    const w = m.winnerOdds;
    this.winnerOdds = (w && PICKS.every((k) => typeof w[k] === 'number' && w[k] > 1)) ? w : null;
    if (this.winnerOdds) {
      this.shorts = { home: m.home.short, draw: 'Draw', away: m.away.short };
      const names = { home: m.home.name, draw: 'the draw', away: m.away.name };
      this.el.pickBtns.forEach((btn) => {
        const k = btn.dataset.pick;
        const cell = $('[data-odds-' + k + ']');
        if (cell) { cell.textContent = this.winnerOdds[k].toFixed(2); cell.hidden = false; }
        btn.setAttribute('aria-label', 'Add ' + names[k] + ' to win to your bet');
      });
      this.el.pickHint.textContent = m.pickHint || '';
    } else {
      /* the market cannot be priced, so it is removed rather than shown inert:
         the fixture above it still earns its place, three dead buttons do not */
      this.el.matchRow.hidden = true;
      this.el.matchHead.hidden = true;
      this.el.pickBtns.forEach((btn) => { btn.disabled = true; btn.removeAttribute('aria-pressed'); });
    }
    $('.btn__label', this.el.sportsCta).textContent = s.cta;
    this.el.successTitle.textContent = s.success.title;
    this.el.successCta.textContent   = s.success.cta;

    this.el.range.value = String(this.line);
    this.updateBet();
  }

  /* Club identity from config: the colour drives the crest stripes only, never
     a label, so a dark club colour cannot cost the text its contrast. Form
     becomes chips — the run reads as a shape before it reads as letters. */
  paintTeam(side, team) {
    const crest = $('[data-' + side + '-crest]');
    const hex = (v) => {
      const h = String(v || '').trim().replace('#', '');
      const f = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
      return /^[0-9a-f]{6}$/i.test(f) ? '#' + f : null;
    };
    /* one colour still works, and neither is required — the fallback is
       neutral steel, never a broken gradient */
    const c1 = hex(team.color);
    if (crest && c1) {
      crest.style.setProperty('--c1', c1);
      crest.style.setProperty('--c2', hex(team.color2) || c1);
    }

    const box = $('[data-' + side + '-form]');
    if (!box) return;
    box.textContent = '';
    const runs = String(team.form || '').split(/\s+/).filter(Boolean);
    if (!runs.length) return;
    /* the chips are decorative shapes to a screen reader; give it the run in
       words instead of five stray letters */
    box.setAttribute('aria-label', 'Recent form: ' + runs.join(', '));
    runs.forEach((r) => {
      const chip = document.createElement('b');
      chip.dataset.r = r.toUpperCase();
      chip.textContent = r.toUpperCase();
      box.appendChild(chip);
    });
  }

  /* one vault per configured prize — count is data-driven, not hard-coded */
  buildVaults(prizes) {
    /* no prizes priced means nothing to reveal: hide the grid rather than ship
       clickable vaults that would resolve to an undefined prize */
    if (!prizes.length) { this.el.vaults.hidden = true; return; }
    const n = Math.max(2, prizes.length);
    this.el.vaults.style.setProperty('--cols', n);
    this.el.vaults.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vault';
      btn.dataset.index = i;
      btn.setAttribute('aria-label', 'Open mystery vault ' + (i + 1));
      btn.innerHTML =
        '<span class="vault__glow" aria-hidden="true"></span>' +
        '<span class="vault__body">' +
          '<span class="vault__lid"><span class="vault__dial" aria-hidden="true"></span></span>' +
          '<span class="vault__face"><span class="vault__num">' + (i + 1) + '</span></span>' +
          '<span class="vault__prize" aria-hidden="true"></span>' +
        '</span>';
      this.el.vaults.appendChild(btn);
    }
    this.el.vaultBtns = $$('.vault', this.el.vaults);
  }

  /* ============ events ============ */
  bind() {
    this.el.tabs.forEach((tab) => {
      tab.tabIndex = tab.dataset.view === this.view ? 0 : -1;
      tab.addEventListener('click', () => this.switchView(tab.dataset.view));
    });

    /* role="tablist" carries an implicit keyboard contract: arrows move between
       tabs, Home/End jump to the ends. Without it the role is a lie to a screen
       reader, which announces "tab 1 of 2" and then finds the arrows do nothing. */
    this.el.switchWrap.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      const from = this.el.tabs.findIndex((t) => t.dataset.view === this.view);
      let to = null;

      if (step) to = (from + step + this.el.tabs.length) % this.el.tabs.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = this.el.tabs.length - 1;
      else return;

      e.preventDefault();                 // stop the arrows scrolling the page
      const tab = this.el.tabs[to];
      this.switchView(tab.dataset.view);
      /* follow focus only if the switch was allowed — during an animation lock
         switchView is a no-op, and moving focus would desync from aria-selected */
      if (this.view === tab.dataset.view) tab.focus();
    });

    this.el.vaultBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.openVault(btn));
    });

    this.el.range.addEventListener('input', () => {
      this.line = parseFloat(this.el.range.value);
      this.updateBet(true);
    });

    this.el.sportsCta.addEventListener('click', () => this.lockBet());

    this.el.pickBtns.forEach((btn) => {
      btn.addEventListener('click', () => this.togglePick(btn.dataset.pick));
    });

    [this.el.casinoCta, this.el.successCta].forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.add('is-busy');
        setTimeout(() => btn.classList.remove('is-busy'), 900);
      });
    });
  }

  /* ============ product toggle ============ */
  switchView(next) {
    if (this.isAnimating || next === this.view) return;
    this.view = next;
    this.el.switchWrap.dataset.active = next;

    this.el.tabs.forEach((tab) => {
      const on = tab.dataset.view === next;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
      /* roving tabindex: the tablist is one Tab stop, arrows move within it */
      tab.tabIndex = on ? 0 : -1;
    });

    this.el.views.forEach((section) => {
      const on = section.dataset.view === next;
      section.classList.toggle('is-active', on);
      section.hidden = !on;
    });
  }

  /* ============ casino: mystery vault ============ */
  async openVault(btn) {
    if (this.isAnimating || this.vaultOpened) return;
    this.isAnimating = true;
    this.vaultOpened = true;
    this.el.vaults.classList.add('is-locked', 'is-opened');   // pointer-events: none + idle glow off

    const prizes = this.config.casino.prizes;
    const prize  = prizes[Math.floor(Math.random() * prizes.length)];

    btn.classList.add('is-shaking');
    btn.setAttribute('aria-expanded', 'true');
    this.paintPrize(btn, prize);
    this.el.vaultBtns.forEach((v) => {
      if (v !== btn) { v.classList.add('is-dimmed'); v.disabled = true; v.setAttribute('aria-disabled', 'true'); }
    });

    await wait(SHAKE_MS);
    btn.classList.remove('is-shaking');
    btn.classList.add('is-picked');

    await wait(OPEN_MS);
    this.el.prizeDetail.textContent = prize.detail;
    this.el.reveal.hidden = false;
    this.countUp(this.el.prizeTitle, prize.title);
    /* target the button, not the panel: a panel taller than the viewport gets
       top-aligned, which puts the CTA back under the fold — and config copy
       decides how tall these panels are */
    this.bringIntoView(this.el.casinoCta);

    this.isAnimating = false;                            // reveal complete
  }

  /* A panel that opens below the fold is a reward the player never sees, and a
     CTA they have to hunt for. Scroll only when it is genuinely out of view, so
     nothing jumps on a desktop where it already fits. */
  /* What is actually on screen. iOS Safari's layout viewport runs underneath the
     browser toolbars, so innerHeight over-reports the visible area and anything
     aligned to its bottom edge ends up half-hidden behind the chrome.
     visualViewport reports the real thing. */
  visibleBand() {
    const vv = window.visualViewport;
    return vv
      ? { top: vv.offsetTop, height: vv.height }
      : { top: 0, height: window.innerHeight || document.documentElement.clientHeight };
  }

  bringIntoView(el) {
    const band = this.visibleBand();
    const box = el.getBoundingClientRect();
    if (box.top >= band.top && box.bottom <= band.top + band.height) return;  // already visible

    /* Let the engine decide where the scroll should land. Hand-rolled geometry
       gets this wrong: the views animate in, which makes them containing blocks,
       so an offsetTop chain under-measures — and a getBoundingClientRect taken
       mid-animation is skewed by the transform. scrollIntoView knows about all
       of it, and about the scroll-margin that keeps the CTA off the edge.
       The jump and the restore happen in one synchronous block, so the
       intermediate position is never painted. */
    const from = window.scrollY;
    el.scrollIntoView({ block: 'nearest' });
    let target = window.scrollY;
    window.scrollTo(0, from);

    /* the engine aligned to the layout viewport, which on iOS extends behind the
       toolbars — push on by however much of it is not really on screen */
    const hidden = Math.max(0, (window.innerHeight || 0) - band.height);
    if (hidden && target > from) target += hidden;

    /* and settle once the motion is over: the panel is still playing its entry
       animation while all of this is measured, so the first aim runs short */
    this.scrollWindowTo(target, target === from ? 0 : 420, () => {
      const now = this.visibleBand();
      const rect = el.getBoundingClientRect();
      const over = rect.bottom - (now.top + now.height);
      if (over > 1) window.scrollTo(0, window.scrollY + over + 16);
    });
  }

  /* Eased scroll driven by rAF rather than `behavior: 'smooth'`, which is a
     silent no-op in some engines and WebViews. Aborts the moment the player
     scrolls themselves — never fight the user for control of the viewport. */
  scrollWindowTo(top, ms = 420, onEnd) {
    const from = window.scrollY;
    const events = ['wheel', 'touchstart', 'keydown'];
    let finished = false;

    const cleanup = () => {
      clearTimeout(guard);
      events.forEach((e) => window.removeEventListener(e, cancel));
    };
    /* the player took over — leave the viewport where they put it */
    const cancel = () => { if (!finished) { finished = true; cleanup(); } };
    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup();
      window.scrollTo(0, top);
      if (onEnd) onEnd();
    };

    /* the easing never owns the final position: land it even if rAF is starved */
    const guard = setTimeout(finish, ms + 120);
    events.forEach((e) => window.addEventListener(e, cancel, { passive: true }));

    if (REDUCED || Math.abs(top - from) < 2) return finish();

    const t0 = performance.now();
    const step = (now) => {
      if (finished) return;
      const p = Math.min(1, (now - t0) / ms);
      if (p >= 1) return finish();
      window.scrollTo(0, from + (top - from) * (1 - Math.pow(1 - p, 3)));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* count the leading number of the prize up from zero (compositor-free, text only) */
  countUp(el, text, ms = 750) {
    const m = /^(.*?)(\d[\d,]*)(.*)$/.exec(text);
    if (!m || REDUCED || document.hidden) { el.textContent = text; return; }
    const pre = m[1], post = m[3];
    const target = parseInt(m[2].replace(/,/g, ''), 10);
    const t0 = performance.now();

    /* the animation never owns the final value: guarantee the end state even if
       rAF is throttled (backgrounded tab, prerender) */
    const settle = () => {
      el.textContent = text;
      clearTimeout(guard);
      document.removeEventListener('visibilitychange', settle);
    };
    const guard = setTimeout(settle, ms + 80);
    document.addEventListener('visibilitychange', settle);

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      if (p < 1) {
        el.textContent = pre + num(Math.round(target * (1 - Math.pow(1 - p, 3)))) + post;
        requestAnimationFrame(tick);
      } else {
        settle();
      }
    };
    /* seed synchronously: if rAF is starved the guard still settles it, but the
       placeholder must never survive into a painted frame */
    el.textContent = pre + '0' + post;
    requestAnimationFrame(tick);
  }

  /* prize art: config image when supplied, CSS coin otherwise */
  paintPrize(btn, prize) {
    const slot = $('.vault__prize', btn);
    if (!slot || !prize.image) return;
    slot.classList.add('has-img');
    const img = document.createElement('img');
    img.src = prize.image;
    img.alt = '';
    slot.appendChild(img);

    const art = document.createElement('img');
    art.className = 'reveal__art';
    art.src = prize.image;
    art.alt = '';
    this.el.reveal.prepend(art);
  }

  /* ============ sports: predictor ============ */
  /* tapping the active pick clears it — the winner leg is always optional */
  togglePick(key) {
    if (!this.winnerOdds || this.isAnimating) return;
    this.pick = this.pick === key ? null : key;
    this.el.pickBtns.forEach((btn) => {
      const on = btn.dataset.pick === this.pick;
      btn.classList.toggle('is-picked', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    this.el.matchRow.classList.toggle('has-pick', Boolean(this.pick));
    this.el.matchBox.classList.toggle('has-pick', Boolean(this.pick));
    this.updateBet(true);
    /* adding the leg pushes two rows into the calculator and the CTA down with
       them — on a phone that is enough to put it under the fold */
    this.bringIntoView(this.el.sportsCta);
  }

  oddsFor(line) {
    const table = this.config.sports.oddsByLine || {};
    const key   = line.toFixed(1);
    if (typeof table[key] === 'number') return table[key];
    /* derive from base odds if the line is missing from config */
    const base = this.config.sports.baseOdds || 1.85;
    return Math.max(1.01, +(base * Math.pow(1.48, line - 2.5)).toFixed(2));
  }

  updateBet(bump = false) {
    const s      = this.config.sports;
    const stake  = Number(s.stake) || 20;
    const over   = this.oddsFor(this.line);
    const leg    = this.pick && this.winnerOdds ? this.winnerOdds[this.pick] : 0;
    const odds   = leg ? Number((leg * over).toFixed(2)) : over;
    const label  = this.line.toFixed(1);
    this.betLabel = (leg ? this.shorts[this.pick] + ' & ' : '') + 'Over ' + label;
    this.odds = odds;
    this.stake = stake;

    /* paint slider fill without layout work */
    const min = parseFloat(this.el.range.min), max = parseFloat(this.el.range.max);
    this.el.range.style.setProperty('--fill', ((this.line - min) / (max - min) * 100).toFixed(1) + '%');

    this.el.lineOut.textContent   = label;
    this.el.stakeOut.textContent  = money(stake);
    this.el.oddsLabel.textContent = 'Over ' + label;
    this.el.oddsOut.textContent   = over.toFixed(2);   // the goals leg keeps its own price on screen
    this.el.payoutOut.textContent = money(stake * odds);

    /* state the bet on the button that commits it: the winner leg is optional,
       so with nothing picked the CTA would otherwise look live for no reason */
    if (this.el.ctaNote) {
      this.el.ctaNote.textContent = this.betLabel + ' · ' + money(stake * odds);
    }

    /* winner + combined rows exist only while the optional leg is active, so the
       player can verify winnerOdds × overOdds instead of trusting one number */
    if (leg) {
      this.el.winnerName.textContent    = this.shorts[this.pick];
      this.el.winnerOddsOut.textContent = leg.toFixed(2);
      this.el.combinedOut.textContent   = odds.toFixed(2);
      this.el.winnerRow.hidden   = false;
      this.el.combinedRow.hidden = false;
    } else {
      this.el.winnerRow.hidden   = true;
      this.el.combinedRow.hidden = true;
    }

    if (bump) this.bumpPayout();

    /* a locked bet is final — changing the line or the winner leg reopens the flow */
    if (this.betLocked) {
      this.betLocked = false;
      this.el.success.hidden = true;
      this.el.sportsCta.disabled = false;
    }
  }

  /* Replaying a CSS keyframe by toggling a class needs an offsetWidth read to flush
     the removal — a forced synchronous layout on every input event while dragging.
     WAAPI restarts the same transform-only pop with no style/layout round-trip. */
  bumpPayout() {
    const el = this.el.payoutOut;
    if (REDUCED || typeof el.animate !== 'function') return;
    el.getAnimations().forEach((a) => a.cancel());
    el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.09)', offset: .45 }, { transform: 'scale(1)' }],
      { duration: 300, easing: 'cubic-bezier(.2,.7,.2,1)' }
    );
  }

  async lockBet() {
    if (this.isAnimating || this.betLocked) return;
    this.isAnimating = true;

    const btn = this.el.sportsCta;
    btn.classList.add('is-busy');
    btn.setAttribute('aria-busy', 'true');
    this.el.range.disabled = true;

    await wait(BET_MS);

    btn.classList.remove('is-busy');
    btn.setAttribute('aria-busy', 'false');
    btn.disabled = true;
    this.el.range.disabled = false;
    this.betLocked = true;

    const tpl = this.config.sports.success.body || '';
    this.el.successBody.textContent = tpl.replace('{line}', this.line.toFixed(1));
    this.el.successSummary.textContent =
      this.betLabel + ' @ ' + this.odds.toFixed(2) +
      ' · ' + money(this.stake) + ' → ' + money(this.stake * this.odds);
    this.el.success.hidden = false;
    /* disabling the CTA drops focus to <body>; hand it to the next step instead.
       preventScroll, then scroll deliberately — focus() alone would slam the
       panel to the top edge with no easing and no regard for reduced motion. */
    this.el.successCta.focus({ preventScroll: true });
    this.bringIntoView(this.el.successCta);

    this.isAnimating = false;
  }
}

document.addEventListener('DOMContentLoaded', () => new LandingApp().init());
