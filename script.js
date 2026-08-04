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

    try {
      const [config] = await Promise.all([this.loadConfig(), wait(BOOT_DELAY)]);
      this.config = config;
    } catch (err) {
      return this.fail(err);           // single source of truth: no bundled config copy
    }

    this.hydrate();
    this.bind();
    this.reveal();
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
    document.title = c.brand.name + ' — ' + c.variants[this.variant].headline;

    /* A/B headline */
    const v = c.variants[this.variant] || c.variants.A;
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
    set('[data-home-form]',  m.home.form);
    set('[data-away-name]',  m.away.name);
    set('[data-away-short]', m.away.short);
    set('[data-away-form]',  m.away.form);

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
    } else {
      this.el.matchRow.classList.add('is-static');
      this.el.pickBtns.forEach((btn) => { btn.disabled = true; btn.removeAttribute('aria-pressed'); });
    }
    $('.btn__label', this.el.sportsCta).textContent = s.cta;
    this.el.successTitle.textContent = s.success.title;
    this.el.successCta.textContent   = s.success.cta;

    this.el.range.value = String(this.line);
    this.updateBet();
  }

  /* one vault per configured prize — count is data-driven, not hard-coded */
  buildVaults(prizes) {
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
      tab.addEventListener('click', () => this.switchView(tab.dataset.view));
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

    this.isAnimating = false;                            // reveal complete
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
    requestAnimationFrame((now) => { el.textContent = pre + '0' + post; tick(now); });
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
    this.updateBet(true);
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

    if (bump) {
      const n = this.el.payoutOut;
      n.classList.remove('is-bumped');
      void n.offsetWidth;                                 // restart the keyframe
      n.classList.add('is-bumped');
    }

    /* a locked bet is final — changing the line or the winner leg reopens the flow */
    if (this.betLocked) {
      this.betLocked = false;
      this.el.success.hidden = true;
      this.el.sportsCta.disabled = false;
    }
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

    this.isAnimating = false;
  }
}

document.addEventListener('DOMContentLoaded', () => new LandingApp().init());
