// Read-only release guard: HTML must reference immutable, matching assets.
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
for (const [extension, source] of [['css', 'styles.css'], ['js', 'script.js']]) {
  const match = html.match(new RegExp(`(?:href|src)="(assets/site-([a-f0-9]{12})\\.${extension})"`));
  assert(match, `Missing content-addressed ${extension} asset`);
  const content = fs.readFileSync(match[1]);
  assert(content.equals(fs.readFileSync(source)), `${source} changed: regenerate its release asset and update HTML`);
  assert.equal(crypto.createHash('sha256').update(content).digest('hex').slice(0,12), match[2]);
}
for (const [, file] of html.matchAll(/(?:href|src|poster|data-video-src|data-video-poster)="(assets\/[^"]+)"/g)) {
  assert(fs.existsSync(file), `Missing asset: ${file}`);
}
console.log('Release assets match source and content hashes; all referenced assets exist.');
