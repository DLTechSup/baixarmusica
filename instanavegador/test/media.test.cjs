const assert = require('node:assert/strict');
const { extract, extractFromBody, extractFromHtml, fileKey } = require('../electron/media.cjs');

const photo = {
  code: 'AAA111', taken_at: 1700000000, media_type: 1, user: { username: 'chico' }, caption: { text: 'Oi\n  mundo' },
  image_versions2: { candidates: [{ url: 'https://x.cdninstagram.com/v/a_big.jpg?e=1', width: 1080, height: 1350 }, { url: 'https://x.cdninstagram.com/v/a_small.jpg?e=1', width: 320, height: 400 }] },
};
const carousel = {
  code: 'BBB222', taken_at: 1700000100, media_type: 8, user: { username: 'chico' },
  carousel_media: [
    { media_type: 1, image_versions2: { candidates: [{ url: 'https://x.fbcdn.net/c1.jpg', width: 1000, height: 1000 }] } },
    { media_type: 2, image_versions2: { candidates: [{ url: 'https://x.fbcdn.net/c2.jpg', width: 500, height: 500 }] }, video_versions: [{ url: 'https://x.fbcdn.net/v_low.mp4', width: 360, height: 640 }, { url: 'https://x.fbcdn.net/v_hi.mp4', width: 720, height: 1280 }] },
  ],
};
const reel = {
  code: 'CCC333', taken_at: 1700000200, media_type: 2, product_type: 'clips', owner: { username: 'chico' },
  image_versions2: { candidates: [{ url: 'https://x.fbcdn.net/r.jpg', width: 400, height: 700 }] },
  video_versions: [{ url: 'https://x.fbcdn.net/reel.mp4', width: 720, height: 1280 }],
};

// resposta aninhada, como a API do feed
const feed = { items: [photo, carousel], data: { xdt: { edges: [{ node: { media: reel } }] } } };
const all = extract(feed);
assert.deepEqual(all.map((e) => e.id).sort(), ['AAA111', 'BBB222_1', 'BBB222_2', 'CCC333']);
const p = all.find((e) => e.id === 'AAA111');
assert.equal(p.url, 'https://x.cdninstagram.com/v/a_big.jpg?e=1');
assert.equal(p.thumb, 'https://x.cdninstagram.com/v/a_small.jpg?e=1');
assert.equal(p.caption, 'Oi mundo');
assert.deepEqual(p.keys, ['a_big.jpg', 'a_small.jpg']);
const v = all.find((e) => e.id === 'BBB222_2');
assert.equal(v.kind, 'video');
assert.equal(v.url, 'https://x.fbcdn.net/v_hi.mp4');
assert.equal(v.count, 2);
assert.equal(all.find((e) => e.id === 'CCC333').reel, true);
assert.equal(all.find((e) => e.id === 'CCC333').owner, 'chico');

// prefixo anti-XSSI e várias linhas
assert.equal(extractFromBody(`for (;;);${JSON.stringify(feed)}`).length, 4);
assert.equal(extractFromBody(`${JSON.stringify({ a: photo })}\n${JSON.stringify({ b: reel })}`).length, 2);
assert.equal(extractFromBody('<html>não é json</html>').length, 0);

// HTML com <script type="application/json">
const html = `<html><script type="application/json" data-sjs>${JSON.stringify({ require: [[{ x: photo }]] })}</script><script type="application/json">{"a":1}</script></html>`;
assert.equal(extractFromHtml(html).length, 1);

assert.equal(fileKey('https://a.com/v/t51/x_n.jpg?stp=1'), 'x_n.jpg');
console.log('media.test: ok');
