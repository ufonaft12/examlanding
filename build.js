/**
 * Build: SCSS -> CSS, and critical CSS -> inlined into index.html.
 *
 *   node build.js            compile and inject
 *   node build.js --check    verify index.html is already up to date (CI gate)
 *
 * Sass is the only dependency and it is a build-time compiler — nothing it
 * produces ships a runtime library. The built artefacts (index.html, style.css)
 * are committed so the site can be served straight from the repo with no
 * install step.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sass = require('sass');

const ROOT = __dirname;

const render = (file) =>
  sass.compile(path.join(ROOT, 'src', file), { style: 'compressed' }).css.trim();

const critical = render('critical.scss');
const main = render('main.scss');

/** Replaces everything between a marker pair, leaving the markers in place. */
const between = (html, name, body) => {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = html.indexOf(start);
  const to = html.indexOf(end);
  if (from === -1 || to === -1) {
    console.error(`build: ${start} / ${end} markers not found in index.html`);
    process.exit(1);
  }
  return html.slice(0, from) + `${start}\n${body}\n` + html.slice(to);
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Share card and search metadata, baked from config.
 *
 * These cannot be hydrated at runtime like the rest of the copy: the crawlers
 * behind Facebook, Twitter/X, Slack, WhatsApp and Google do not execute the
 * page's JavaScript, so a title set in script.js is a title they never see.
 * Generating them here keeps config.json the single source anyway.
 */
function metaBlock(cfg) {
  const site = cfg.site || {};
  const v = (cfg.variants && cfg.variants.A) || {};
  const brand = (cfg.brand && cfg.brand.name) || '';
  const title = brand && v.headline ? `${brand} — ${v.headline}` : brand || v.headline || '';
  // search copy is its own job: the hero subline is written to be read on the
  // page, a description is written to be read in a result list
  const desc = site.description || v.subline || '';
  const url = site.url || '';
  const image = url && site.image ? new URL(site.image, url).href : site.image || '';

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}">`
  ];
  if (url) tags.push(`<link rel="canonical" href="${esc(url)}">`);

  tags.push(
    '',
    '<meta property="og:type" content="website">',
    `<meta property="og:site_name" content="${esc(brand)}">`,
    `<meta property="og:locale" content="${esc(site.locale || 'en_GB')}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`
  );
  if (url) tags.push(`<meta property="og:url" content="${esc(url)}">`);
  if (image) {
    tags.push(
      `<meta property="og:image" content="${esc(image)}">`,
      '<meta property="og:image:type" content="image/png">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${esc(site.imageAlt || title)}">`
    );
  }

  tags.push(
    '',
    // summary_large_image is the only card type that shows the 1200x630 art
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`
  );
  if (image) {
    tags.push(
      `<meta name="twitter:image" content="${esc(image)}">`,
      `<meta name="twitter:image:alt" content="${esc(site.imageAlt || title)}">`
    );
  }

  return tags.join('\n');
}

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));

const htmlPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

let next = between(html, 'critical', `<style>${critical}</style>`);
next = between(next, 'meta', metaBlock(config));

const check = process.argv.includes('--check');
const cssPath = path.join(ROOT, 'style.css');
const cssCurrent = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : null;

if (check) {
  const stale = next !== html || cssCurrent !== main;
  console.log(stale ? 'build: OUT OF DATE — run `node build.js`' : 'build: up to date');
  process.exit(stale ? 1 : 0);
}

fs.writeFileSync(cssPath, main);
fs.writeFileSync(htmlPath, next);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(1) + ' KB';
console.log(`critical  ${kb(critical)}  inlined into index.html`);
console.log(`deferred  ${kb(main)}  written to style.css`);
