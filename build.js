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
const START = '<!-- critical:start -->';
const END = '<!-- critical:end -->';

const render = (file) =>
  sass.compile(path.join(ROOT, 'src', file), { style: 'compressed' }).css.trim();

const critical = render('critical.scss');
const main = render('main.scss');

const htmlPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const from = html.indexOf(START);
const to = html.indexOf(END);
if (from === -1 || to === -1) {
  console.error(`build: ${START} / ${END} markers not found in index.html`);
  process.exit(1);
}

const block = `${START}\n<style>${critical}</style>\n`;
const next = html.slice(0, from) + block + html.slice(to);

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
