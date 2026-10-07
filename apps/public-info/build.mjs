import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { pages } from './content.mjs';

const output = new URL('./dist/', import.meta.url);
await mkdir(output, { recursive: true });
const mark = await readFile(new URL('./brand-mark.svg', import.meta.url), 'utf8');
const brand = `<a class="brand" href="/" aria-label="Parish Pass help home">${mark}<span>parish pass<span class="brand-note">HELP & INFORMATION</span></span></a>`;
const navigation = Object.entries(pages)
  .map(([path, page]) => `<a href="/${path}.html">${page.title}</a>`)
  .join('');

for (const [path, page] of Object.entries(pages)) {
  const sections = [];
  const body = page.body.replace(/<h2>(.*?)<\/h2>/g, (_, title) => {
    const id = `section-${sections.length + 1}`;
    sections.push(`<a href="#${id}">${title}</a>`);
    return `<h2 id="${id}">${title}</h2>`;
  });
  await writeFile(
    new URL(`${path}.html`, output),
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${page.description}"><meta name="referrer" content="strict-origin-when-cross-origin">
<title>${page.title} | Parish Pass</title><link rel="stylesheet" href="/styles.css"></head>
<body><a class="skip" href="#main">Skip to content</a><header>${brand}<nav aria-label="Public information">${navigation.replace(`href="/${path}.html"`, `href="/${path}.html" aria-current="page"`)}</nav></header>
<main id="main"><p class="eyebrow">PARISH PASS · HELP & POLICIES</p><h1>${page.title}</h1><p class="date">Effective September 29, 2026</p>${sections.length > 2 ? `<details class="contents"><summary>On this page</summary><nav aria-label="Page sections">${sections.join('')}</nav></details>` : ''}${body}</main>
<footer><p>Parish Pass · StanfordDev</p><a href="mailto:stanforddevcontact@gmail.com">stanforddevcontact@gmail.com</a></footer></body></html>`,
  );
}
await writeFile(
  new URL('index.html', output),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Parish Pass | Help and policies</title><link rel="stylesheet" href="/styles.css"></head><body><a class="skip" href="#main">Skip to content</a><header>${brand}</header><main id="main"><p class="eyebrow">WE’RE HERE TO HELP</p><h1>Help and policies</h1><p>Information for Parish Pass customers and business owners.</p><nav class="cards" aria-label="Help and policies">${navigation}</nav><p>Need a hand? Email <a href="mailto:stanforddevcontact@gmail.com">stanforddevcontact@gmail.com</a>.</p></main><footer>Parish Pass · StanfordDev</footer></body></html>`,
);
await writeFile(
  new URL('styles.css', output),
  await readFile(new URL('./styles.css', import.meta.url), 'utf8'),
);
console.log(`Built ${Object.keys(pages).length + 1} public pages.`);
