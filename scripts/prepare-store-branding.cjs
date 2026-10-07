// Render existing selected Parish Pass vector branding for store uploads.
// Pass the path to a Sharp installation as the first argument.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'apps/mobile/assets/branding/parish-pass');
const output = path.join(root, 'docs/store-listing/assets');

async function main() {
  await fs.mkdir(output, { recursive: true });
  const light = await fs.readFile(path.join(brand, 'native-icon-light.svg'), 'utf8');
  const dark = await fs.readFile(path.join(brand, 'native-icon-dark.svg'), 'utf8');
  for (const [name, svg, size] of [
    ['app-icon-apple-1024', light, 1024],
    ['app-icon-google-512', light, 512],
    ['subscription-essentials-1024', light, 1024],
    ['subscription-growth-1024', dark, 1024],
    ['subscription-pro-1024', light.replaceAll('#F4F2E9', '#89C9A2').replaceAll('fill="#89C9A2"/></svg>', 'fill="#F4F2E9"/></svg>'), 1024],
  ]) {
    await sharp(Buffer.from(svg)).resize(size, size).flatten().removeAlpha().withMetadata({ density: 72 }).png().toFile(path.join(output, `${name}.png`));
  }
  const emblem = light.match(/<svg x="187"[\s\S]*<\/svg><\/svg>/)[0]
    .replace('<svg x="187" y="187" width="650" height="650"', '<svg x="132" y="126" width="240" height="248"')
    .replace(/<\/svg>$/, '')
    .replaceAll('#102D25', '#F4F2E9');
  const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
<rect width="1024" height="500" fill="#102D25"/>
<g fill="none" stroke="#89C9A2" stroke-opacity=".18" stroke-width="2"><path d="M-80 400 Q160 50 512 250 T1100 110"/><path d="M-80 450 Q160 100 512 300 T1100 160"/><circle cx="970" cy="460" r="185"/><circle cx="70" cy="10" r="160"/></g>
${emblem}
<text x="430" y="210" font-family="Segoe UI,Arial,sans-serif" font-size="62" font-weight="700" fill="#F4F2E9">Parish Pass</text>
<text x="432" y="270" font-family="Segoe UI,Arial,sans-serif" font-size="29" font-weight="600" fill="#F4F2E9">Local businesses.</text>
<text x="432" y="311" font-family="Segoe UI,Arial,sans-serif" font-size="29" font-weight="600" fill="#F4F2E9">Community connections.</text>
<text x="512" y="426" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="23" fill="#89C9A2">Discover businesses, events and rewards</text>
</svg>`;
  await fs.writeFile(path.join(output, 'google-feature-graphic.svg'), feature);
  await sharp(Buffer.from(feature)).flatten().removeAlpha().withMetadata({ density: 72 }).png().toFile(path.join(output, 'google-feature-graphic-1024x500.png'));
  for (const name of (await fs.readdir(output)).filter(name => name.endsWith('.png'))) {
    const full = path.join(output, name);
    const m = await sharp(full).metadata();
    console.log(JSON.stringify({ name, width: m.width, height: m.height, hasAlpha: m.hasAlpha, density: m.density, bytes: (await fs.stat(full)).size }));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
