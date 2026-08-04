/* ============================================================
   VAULTBET — app controller
   Vanilla ES6+. No dependencies.
   ============================================================ */
'use strict';

const BOOT_DELAY = 1500;   // simulated config/KYC latency (spec: exactly 1.5s)
const SHAKE_MS   = 420;    // must match .vault.is-shaking keyframes
const OPEN_MS    = 620;    // lid rotation + prize fade
const BET_MS     = 800;    // button loading state before success box

/* Offline fallback so the demo never renders empty if config.json is blocked */
const FALLBACK_CONFIG = {
  brand: { name: 'VAULTBET', mark: 'VB', tagline: 'Play smart. 18+ only.' },
  variants: {
    A: { headline: 'Claim Your Exclusive Welcome Package', subline: 'Two ways to start. Pick a vault or build a prediction.' },
    B: { headline: 'Unlock Your Instant $500 Bonus Today', subline: "No promo code needed. Your reward applies to your first deposit." }
  },
  casino: {
    eyebrow: 'Casino · Mystery Vault Pick', title: 'Pick 1 of 3 Vaults',
    subtitle: 'One tap. One reward.', cta: 'CLAIM BONUS NOW', footnote: '',
    prizes: [
      { title: '100 Free Spins', detail: '+ $50 Bonus' },
      { title: '$50 Cash Bonus', detail: 'Instantly credited' },
      { title: '200% Deposit Match', detail: 'Up to $500' }
    ]
  },
  sports: {
    eyebrow: 'Sports · Match Predictor', title: 'Build Your First Bet',
    subtitle: 'Slide to set the goals line.', cta: 'Lock Prediction & Claim Bet', footnote: '',
    match: {
      competition: 'La Liga', name: 'El Clásico', kickoff: 'Sat 21:00 CET',
      market: 'Total Goals — Over',
      home: { name: 'Real Madrid', short: 'RMA', form: 'W W D W L' },
      away: { name: 'Barcelona', short: 'BAR', form: 'W W W D W' }
    },
    stake: 20, baseOdds: 1.85,
    oddsByLine: { '0.5': 1.12, '1.5': 1.44, '2.5': 1.85, '3.5': 2.7, '4.5': 4.1, '5.5': 6.5 },
    success: {
      title: 'Prediction Locked In',
      body: 'Your Over {line} goals selection is saved. Finish sign-up and we will match it with a $20 free bet.',
      cta: 'Create Account & Bet'
    }
  }
};

const wait  = (ms) => new Promise((res) => setTimeout(res, ms));
const money = (n) => '$' + n.toFixed(2);
const $     = (sel, root = document) => root.querySelector(sel);
const $$    = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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
      vaultBtns:   $$('.vault'),
      reveal:      $('#casinoReveal'),
      prizeTitle:  $('#prizeTitle'),
      prizeDetail: $('#prizeDetail'),
      casinoCta:   $('#casinoCta'),
      range:       $('#goalsRange'),
      lineOut:     $('#lineOut'),
      stakeOut:    $('#stakeOut'),
      oddsOut:     $('#oddsOut'),
      oddsLabel:   $('#oddsLabel'),
      payoutOut:   $('#payoutOut'),
      sportsCta:   $('#sportsCta'),
      success:     $('#sportsSuccess'),
      successTitle:$('#successTitle'),
      successBody: $('#successBody'),
      successCta:  $('#successCta')
    };
  }

  /* ============ boot ============ */
  async init() {
    document.body.classList.add('is-locked');
    this.variant = this.readVariant();

    const [config] = await Promise.all([this.loadConfig(), wait(BOOT_DELAY)]);
    this.config = config;

    this.hydrate();
    this.bind();
    this.reveal();
  }

  readVariant() {
    const v = (new URLSearchParams(location.search).get('variant') || 'A').trim().toUpperCase();
    return v === 'B' ? 'B' : 'A';
  }

  async loadConfig() {
    try {
      const res = await fetch('config.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.warn('[VAULTBET] config.json unavailable, using fallback:', err.message);
      return FALLBACK_CONFIG;
    }
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

    /* casino */
    set('[data-casino-eyebrow]', c.casino.eyebrow);
    set('[data-casino-title]',   c.casino.title);
    set('[data-casino-sub]',     c.casino.subtitle);
    set('[data-casino-foot]',    c.casino.footnote);
    this.el.casinoCta.textContent = c.casino.cta;

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
    $('.btn__label', this.el.sportsCta).textContent = s.cta;
    this.el.successTitle.textContent = s.success.title;
    this.el.successCta.textContent   = s.success.cta;

    this.el.range.value = String(this.line);
    this.updateBet();
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

    [this.el.casinoCta, this.el.successCta].forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.classList.add('is-busy');
        setTimeout(() => btn.classList.remove('is-busy'), 900);
        console.log('[VAULTBET] CTA → registration', { variant: this.variant, view: this.view });
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
    this.el.vaults.classList.add('is-locked');          // pointer-events: none

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
    this.el.prizeTitle.textContent  = prize.title;
    this.el.prizeDetail.textContent = prize.detail;
    this.el.reveal.hidden = false;

    this.isAnimating = false;                            // reveal complete
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
    const odds   = this.oddsFor(this.line);
    const label  = this.line.toFixed(1);

    /* paint slider fill without layout work */
    const min = parseFloat(this.el.range.min), max = parseFloat(this.el.range.max);
    this.el.range.style.setProperty('--fill', ((this.line - min) / (max - min) * 100).toFixed(1) + '%');

    this.el.lineOut.textContent   = label;
    this.el.stakeOut.textContent  = money(stake);
    this.el.oddsOut.textContent   = odds.toFixed(2);
    this.el.oddsLabel.textContent = 'Over ' + label;
    this.el.payoutOut.textContent = money(stake * odds);

    if (bump) {
      const n = this.el.payoutOut;
      n.classList.remove('is-bumped');
      void n.offsetWidth;                                 // restart the keyframe
      n.classList.add('is-bumped');
    }

    /* a locked bet is final — changing the line reopens the flow */
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
    this.el.success.hidden = false;

    this.isAnimating = false;
  }
}

document.addEventListener('DOMContentLoaded', () => new LandingApp().init());
