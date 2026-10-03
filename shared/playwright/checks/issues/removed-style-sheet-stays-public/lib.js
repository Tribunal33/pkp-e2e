// Helpers of walk.js (U10 A5: a removed style sheet's file stays public at its old address).
// Requiring this file runs nothing. The Appearance tab helpers are A7's (refused-upload-locks-box/lib.js).
const fs = require('fs');
const path = require('path');
const A7 = require('../refused-upload-locks-box/lib');

const FIXTURES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');

/** The walk's files under <dir>/files: the style sheet, a second one (the neighbour's replacement) and a PNG favicon. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const css = path.join(d, 'u10c-style.css');
    const css2 = path.join(d, 'u10c-style-2.css');
    const png = path.join(d, 'u10c-favicon.png');
    fs.writeFileSync(css, 'h2 { color: red; }\n');
    fs.writeFileSync(css2, 'h2 { color: blue; }\n');
    fs.copyFileSync(path.join(FIXTURES, 'profile-image-400.png'), png);
    return {css, css2, png};
}

/** The addresses the "Advanced" tab shows for the stored files: the style sheet box's link, the favicon box's picture. */
async function storedAddresses(page) {
    const css = A7.box(page, 'appearanceAdvanced', 'styleSheet', null);
    const fav = A7.box(page, 'appearanceAdvanced', 'favicon', 'en');
    const cssLink = css.field.locator('a[href]').first();
    const favImg = fav.field.locator('img').first();
    return {
        styleSheet: (await cssLink.count()) ? {text: (await cssLink.innerText()).trim(), href: await cssLink.getAttribute('href')} : null,
        favicon: (await favImg.count()) ? {src: await favImg.getAttribute('src')} : null,
    };
}

/** Open `url` in the page as a visitor would; its status, content type and the first 200 characters of the body. */
async function openAddress(page, url) {
    if (!url) return null;
    const res = await page.goto(url).catch((e) => ({error: String(e.message).split('\n')[0]}));
    if (!res || res.error) return {url, error: res && res.error};
    const type = res.headers()['content-type'] || null;
    const body = /text|css/.test(type || '') ? (await res.text()).slice(0, 200) : `(${(await res.body()).length} bytes)`;
    return {url: url.replace(/^https?:\/\/[^/]+/, ''), status: res.status(), type, body};
}

/** Press the field's "Remove" (the style sheet's or the favicon's box). */
async function pressRemove(b) {
    const btn = b.field.getByRole('button', {name: 'Remove', exact: true}).first();
    if (!(await btn.count())) return {pressed: false};
    await btn.click();
    await A7.sleep(500);
    return {pressed: true};
}

/** Press the form's "Save" and wait for the context's save; its status. */
async function save(page, b) {
    const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: A7.T}).catch(() => null);
    await b.save.click();
    const r = await saved;
    await A7.sleep(1000);
    return {saveStatus: r ? r.status() : null};
}

module.exports = {...A7, makeFiles, storedAddresses, openAddress, pressRemove, save};
