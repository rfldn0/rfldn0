// Builds the Pixel HUD README panels into img/hud/*.svg.
// GitHub strips inline styles and web fonts from README HTML, so each section
// is rendered as a self-contained SVG with fonts, the hero animation, avatar and icons inlined.
// img/hud/car.webp is the car GIF (img/Car Pixel Art GIF by Raw Fury.gif) shrunk to 390px / 12fps.
// Run: node scripts/build-hud.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const OUT = new URL('../img/hud/', import.meta.url);
const W = 860;
const INK = '#232323', MUTED = '#5d5b55', FAINT = '#7a776f', GOLD = '#f2c230', SCREEN = '#1d1d1f', PAPER = '#fbf9f3', TAB = '#f7f4ec';
const CARD = '#ffffff', AVATAR_BG = '#f1eee5', ACCENT = '#2f6fd6';
// Night mode (the "night" theme of the Pixel HUD design): each light color above is swapped for its
// night color when the OS is in dark mode, by matching the exact fill/stroke attribute value.
// SCREEN and GOLD stay the same in both themes.
const NIGHT = {
  [INK]: '#e6e1d6', [MUTED]: '#a7a397', [FAINT]: '#8b877d', [ACCENT]: '#6b9cf5',
  [PAPER]: '#161b22', [TAB]: '#1c2129', [CARD]: '#0f141a', [AVATAR_BG]: '#1c2129',
};
const nightCss = `@media (prefers-color-scheme:dark){` +
  Object.entries(NIGHT).map(([l, d]) => `[fill="${l}"]{fill:${d}}[stroke="${l}"]{stroke:${d}}`).join('') + `}`;

const FONTS = {
  silk700: 'https://fonts.gstatic.com/s/silkscreen/v6/m8JUjfVPf62XiF7kO-i9aAhAfmyi2A.woff2',
  mono: 'https://fonts.gstatic.com/s/robotomono/v31/L0x5DF4xlVMF-BfR8bXMIjhLq38.woff2',
};
const CAR = new URL('car.webp', OUT);
const AVATAR = 'https://github.com/rfldn0.png?size=240';
const sk = (i) => `https://skillicons.dev/icons?i=${i}`;
const ITEMS = [
  { name: 'canva', src: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/canva/canva-original.svg', size: 28 },
  { name: 'html5', src: sk('html') }, { name: 'css3', src: sk('css') },
  { name: 'js', src: sk('js') }, { name: 'python', src: sk('py') },
  { name: 'c', src: sk('c') }, { name: 'java', src: sk('java') },
  { name: 'django', src: sk('django') }, { name: 'flask', src: sk('flask') },
  { name: '—' }, { name: '—' }, { name: '—' },
];
const WARPS = [
  { id: 'instagram', label: 'INSTAGRAM', handle: '@rfldno_' },
  { id: 'x', label: 'X', handle: '@rfldno' },
  { id: 'linkedin', label: 'LINKEDIN', handle: 'victor-rifaldino-tabuni' },
  { id: 'tiktok', label: 'TIKTOK', handle: '@rfldno_' },
];

async function dataUri(url, fallbackType) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const type = (res.headers.get('content-type') || fallbackType).split(';')[0];
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function svg(w, h, body, { fonts, css = '' }) {
  const faces = [
    fonts.silk700 && `@font-face{font-family:Silk;font-weight:700;src:url(${fonts.silk700}) format('woff2')}`,
    fonts.mono && `@font-face{font-family:Mono;src:url(${fonts.mono}) format('woff2')}`,
  ].filter(Boolean).join('');
  const base = `.px{font-family:Silk,monospace;font-weight:700}.mono{font-family:Mono,monospace}` +
    `@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}.blink{animation:blink 1.1s steps(1) infinite}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<style>${faces}${base}${nightCss}${css}</style>${body}</svg>\n`;
}

// Pixel glyphs drawn as shapes so they don't depend on fallback fonts.
const heart = (x, y, c) => `<path fill="${c}" transform="translate(${x} ${y})" d="M1 0h3v1h1V0h3v1h1v4H8v1H7v1H6v1H5v1H4V8H3V7H2V6H1V5H0V1h1z"/>`;
const arrowRight = (x, y, c) => `<path fill="${c}" d="M${x} ${y}h2v2h2v2h2v2h-2v2h-2v2h-2z"/>`;
const arrowDown = (x, y, c) => `<path fill="${c}" d="M${x} ${y}h10v2h-2v2h-2v2h-2v-2h-2v-2h-2z"/>`;

// Label chip that reads on both GitHub light and dark backgrounds. textLength pins the
// Silkscreen run to a known width so the chip can be sized without font metrics.
function chip(x, y, text, { fill = PAPER, color = INK, fs = 13, extra = '' } = {}) {
  const tw = Math.round(text.length * fs * 0.82), w = tw + 24, h = fs + 16;
  return `<rect x="${x + 3}" y="${y + 3}" width="${w}" height="${h}" rx="3" fill="${INK}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${INK}" stroke-width="2"/>` +
    `<text x="${x + 12}" y="${y + h / 2 + fs * 0.42}" class="px ${extra}" font-size="${fs}" fill="${color}" textLength="${tw}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`;
}

function title(text, meta, fonts) {
  const m = meta ? `<text x="${W - 2}" y="22" text-anchor="end" class="mono" font-size="12" fill="${FAINT}">${esc(meta)}</text>` : '';
  return svg(W, 36, chip(1, 1, text) + m, { fonts });
}

function hero({ fonts, car }) {
  const H = 528, cardY = 38, pad = 32, px = 1 + pad, pw = W - 12 - 2 * pad;
  const py = cardY + pad, barH = 38, gifH = 220, gifW = Math.round(gifH * 390 / 219), cx = px + pw / 2;
  const panelH = barH + 26 + 64 + 18 + gifH + 50;
  const body =
    `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="6" height="8" fill="#2a2a2d"/><rect x="6" width="2" height="8" fill="#232326"/></pattern>` +
    `<clipPath id="panel"><rect x="${px}" y="${py}" width="${pw}" height="${panelH}" rx="6"/></clipPath></defs>` +
    // window tab
    `<path d="M1 ${cardY}V10a9 9 0 0 1 9-9h${W - 26}a9 9 0 0 1 9 9v${cardY - 10}" fill="${TAB}" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="17" y="15" width="10" height="10" fill="${INK}"/>` +
    `<text x="37" y="24" class="mono" font-size="12" font-weight="500" fill="${INK}">rfldn0 / README.md</text>` +
    // card + hard shadow
    `<rect x="7" y="${cardY + 6}" width="${W - 12}" height="${H - cardY - 10}" rx="6" fill="${INK}"/>` +
    `<rect x="1" y="${cardY}" width="${W - 12}" height="${H - cardY - 10}" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="2"/>` +
    // screen
    `<g clip-path="url(#panel)"><rect x="${px}" y="${py}" width="${pw}" height="${panelH}" fill="${SCREEN}"/>` +
    `<rect x="${px}" y="${py}" width="${pw}" height="${barH}" fill="url(#hatch)"/>` +
    `<rect x="${px}" y="${py + barH - 2}" width="${pw}" height="2" fill="${INK}"/></g>` +
    `<rect x="${px}" y="${py}" width="${pw}" height="${panelH}" rx="6" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `<g class="px" font-size="11" letter-spacing="1" fill="#ecebe4">` +
    `<text x="${px + 16}" y="${py + 24}">1UP</text>` +
    `<text x="${cx}" y="${py + 24}" text-anchor="middle">WORLD 1-1</text>` +
    `<text x="${px + pw - 16 - 3 * 12}" y="${py + 24}" text-anchor="end">LIVES</text></g>` +
    [0, 1, 2].map((i) => heart(px + pw - 16 - 3 * 12 + 6 + i * 12, py + 15, '#e85a5a')).join('') +
    `<text x="${cx}" y="${py + barH + 26 + 60}" text-anchor="middle" class="px" font-size="78" letter-spacing="3" fill="#ecebe4">RFLDN0</text>` +
    `<image href="${car}" x="${cx - gifW / 2}" y="${py + barH + 26 + 64 + 18}" width="${gifW}" height="${gifH}" style="image-rendering:pixelated"/>` +
    `<text x="${cx}" y="${py + panelH - 22}" text-anchor="middle" class="px blink" font-size="13" letter-spacing="2" fill="${GOLD}">PRESS START</text>`;
  return svg(W, H, body, { fonts });
}

function player({ fonts, avatar }) {
  const H = 166, bw = W - 6, bh = 158, a = 120, x0 = 19 + a + 24, vx = x0 + 82;
  const row = (y, label, value) =>
    `<text x="${x0}" y="${y}" class="px" font-size="11" fill="${MUTED}">${label}</text>` +
    (value ? `<text x="${vx}" y="${y}" class="mono" font-size="13" fill="${INK}">${esc(value)}</text>` : '');
  const body =
    `<defs><clipPath id="av"><rect x="19" y="19" width="${a}" height="${a}" rx="4"/></clipPath></defs>` +
    `<rect x="5" y="5" width="${bw}" height="${bh}" rx="6" fill="${INK}"/>` +
    `<rect x="1" y="1" width="${bw}" height="${bh}" rx="6" fill="${CARD}" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="19" y="19" width="${a}" height="${a}" fill="${AVATAR_BG}"/>` +
    `<image href="${avatar}" x="19" y="19" width="${a}" height="${a}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice" style="image-rendering:pixelated"/>` +
    `<rect x="19" y="19" width="${a}" height="${a}" rx="4" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `<text x="${x0}" y="42" class="px" font-size="20" fill="${INK}">PLAYER 1</text>` +
    `<text x="${bw - 18}" y="42" text-anchor="end" class="mono" font-size="12" fill="${MUTED}">@rfldn0</text>` +
    `<rect x="${x0}" y="56" width="${bw - x0 - 18}" height="2" fill="${INK}" opacity=".12"/>` +
    row(84, 'CLASS', 'Pixel art enthusiast, star wars, sci-fi, and builder.') +
    row(110, 'STATUS', 'Plateau, still thinking and expanding, back to basics.') +
    row(136, 'XP') +
    `<defs><pattern id="xp" width="10" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${ACCENT}"/></pattern></defs>` +
    `<rect x="${vx + 1}" y="125" width="198" height="12" fill="none" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="${vx + 4}" y="128" width="${Math.round(192 * 0.64)}" height="6" fill="url(#xp)" class="fill"/>` +
    `<text x="${vx + 214}" y="136" class="mono" font-size="12" fill="${MUTED}">LV 64 · still grinding</text>`;
  const css = `.fill{transform-box:fill-box;transform-origin:left;animation:fill 2s steps(10) both}@keyframes fill{from{transform:scaleX(0)}}`;
  return svg(W, H, body, { fonts, css });
}

function dialogue({ fonts }) {
  const H = 100, w = W - 2, h = H - 2;
  const body =
    `<rect x="1" y="1" width="${w}" height="${h}" rx="4" fill="${SCREEN}" stroke="${INK}" stroke-width="2"/>` +
    `<rect x="7" y="7" width="${w - 12}" height="${h - 12}" fill="none" stroke="#ecebe4" stroke-width="2"/>` +
    `<text x="24" y="36" class="px" font-size="11" fill="${GOLD}">OLD HERMIT</text>` +
    `<text x="24" y="66" class="mono" font-size="15" fill="#ecebe4">"May the force be with you."</text>` +
    `<g class="blink">${arrowDown(W - 34, 76, '#ecebe4')}</g>`;
  return svg(W, H, body, { fonts });
}

function inventory({ fonts, icons }) {
  const cols = 6, gap = 10, pad = 12, sw = (W - 4 - 2 * pad - (cols - 1) * gap) / cols, sh = 84;
  const rows = Math.ceil(icons.length / cols), H = 2 * pad + rows * sh + (rows - 1) * gap + 4;
  const slots = icons.map((it, i) => {
    const x = 2 + pad + (i % cols) * (sw + gap), y = 2 + pad + Math.floor(i / cols) * (sh + gap), cx = x + sw / 2;
    const s = it.size || 40;
    return `<rect x="${x}" y="${y}" width="${sw}" height="${sh}" rx="3" fill="${CARD}" stroke="${INK}" stroke-width="2"/>` +
      `<path d="M${x + sw - 4} ${y + 2}h3v${sh - 3}H${x + 2}v-3h${sw - 6}z" fill="${INK}" opacity=".12"/>` +
      `<rect x="${cx - 20}" y="${y + 12}" width="40" height="40" rx="9" fill="#242938"/>` +
      (it.uri ? `<image href="${it.uri}" x="${cx - s / 2}" y="${y + 32 - s / 2}" width="${s}" height="${s}"/>` : '') +
      `<text x="${cx}" y="${y + 70}" text-anchor="middle" class="px" font-size="10" fill="${MUTED}">${esc(it.name)}</text>`;
  }).join('');
  const body =
    `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect x="6" width="2" height="8" fill="${INK}" opacity=".08"/></pattern></defs>` +
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="6" fill="${TAB}"/>` +
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="6" fill="url(#hatch)" stroke="${INK}" stroke-width="2"/>` + slots;
  return svg(W, H, body, { fonts });
}

function warp({ fonts }, { label, handle }) {
  const w = 190, h = 62;
  const body =
    `<rect x="5" y="5" width="${w}" height="${h}" rx="5" fill="${INK}"/>` +
    `<rect x="1" y="1" width="${w}" height="${h}" rx="5" fill="${CARD}" stroke="${INK}" stroke-width="2"/>` +
    arrowRight(16, 17, INK) +
    `<text x="30" y="28" class="px" font-size="13" fill="${INK}">${esc(label)}</text>` +
    `<text x="16" y="49" class="mono" font-size="11" fill="${MUTED}">${esc(handle)}</text>`;
  return svg(w + 6, h + 6, body, { fonts });
}

function footer({ fonts }) {
  const cw = (t) => Math.round(t.length * 12 * 0.82) + 24, a = 'GAME SAVED', b = 'CONTINUE? Y / N';
  const x = (W - cw(a) - 16 - cw(b)) / 2;
  const body = chip(x, 8, a, { fs: 12 }) + chip(x + cw(a) + 16, 8, b, { fs: 12, fill: SCREEN, color: GOLD, extra: 'blink' });
  return svg(W, 44, body, { fonts });
}

const [silk700, mono, car, avatar, ...iconUris] = await Promise.all([
  dataUri(FONTS.silk700, 'font/woff2'), dataUri(FONTS.mono, 'font/woff2'),
  readFile(CAR).then((b) => `data:image/webp;base64,${b.toString('base64')}`), dataUri(AVATAR, 'image/png'),
  ...ITEMS.map((it) => (it.src ? dataUri(it.src, 'image/svg+xml') : null)),
]);
const px = { silk700 }, both = { silk700, mono };
const icons = ITEMS.map((it, i) => ({ ...it, uri: iconUris[i] }));

await mkdir(OUT, { recursive: true });
const files = {
  'hero.svg': hero({ fonts: both, car }),
  'title-player.svg': title('PLAYER SELECT', '', both),
  'player.svg': player({ fonts: both, avatar }),
  'dialogue.svg': dialogue({ fonts: both }),
  'title-inventory.svg': title('INVENTORY', '9 / 12 slots', both),
  'inventory.svg': inventory({ fonts: px, icons }),
  'title-warp.svg': title('WARP ZONES', '', px),
  ...Object.fromEntries(WARPS.map((w) => [`warp-${w.id}.svg`, warp({ fonts: both }, w)])),
  'title-minigame.svg': title('MINIGAME', 'snake.exe', both),
  'footer.svg': footer({ fonts: px }),
};
for (const [name, content] of Object.entries(files)) {
  await writeFile(new URL(name, OUT), content);
  console.log(`${name.padEnd(22)} ${(content.length / 1024).toFixed(1)} KB`);
}
