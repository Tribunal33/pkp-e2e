// Helpers for walk.js (U49 A6). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {T, sleep, flat, rel} = require('../older-version-tab-current-title/lib');
const {controls} = require('../chapter-page-dates-and-preview-notice/lib');

/**
 * The reader page's date block as a visitor sees it: the label ("Published",
 * "Posted"), the line under it, and the "Versions" list.
 */
async function readDates(page) {
    const data = await page
        .evaluate(() => {
            const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
            const block = document.querySelector('.item.date_published, .item.published');
            const main = block && [...block.querySelectorAll('.sub_item')].find((s) => !s.classList.contains('versions'));
            const versions = block ? block.querySelectorAll('.sub_item.versions li') : document.querySelectorAll('.sub_item.versions li');
            const body = document.body ? document.body.innerText : '';
            return {
                title: document.title,
                label: txt(main && main.querySelector('.label')),
                line: txt(main && main.querySelector('.value')),
                versions: [...versions].map((li) => txt(li)),
                versionLinks: [...document.querySelectorAll('a[href*="/version/"]')].map((a) => ({text: txt(a), href: a.getAttribute('href')})),
                updatedOnAnywhere: (body.match(/[^\n]*Updated on[^\n]*/g) || []).map((s) => s.trim()),
                notFound: /404 Not Found/.test(body),
            };
        })
        .catch((e) => ({error: String(e.message).slice(0, 200)}));
    return {url: rel(page.url()), ...data, versionLinks: (data.versionLinks || []).map((l) => ({...l, href: rel(l.href)}))};
}

/**
 * The header's "Publish" / "Post" / "Schedule For Publication", then each
 * window that follows ("Review Publishing Details" › "Confirm", the
 * confirmation's own button) until the publish call answers. Returns the
 * button pressed, each window's words and the answer.
 */
async function publishShown(page) {
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    let done = false;
    published.then(() => { done = true; }).catch(() => { done = true; });
    const header = controls(page).getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText()), windows: []};
    await header.click();
    for (let i = 0; i < 5 && !done; i++) {
        const btn = page.getByRole('dialog').last().getByRole('button', {name: /^(Confirm|Publish|Post|Schedule For Publication)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(600);
        out.windows.push(flat(await page.getByRole('dialog').last().innerText().catch(() => null), 300));
        await btn.click();
        await sleep(1200);
    }
    const r = await published.catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    out.publish = r ? r.status() : null;
    out.status = body.status;
    out.datePublished = body.datePublished;
    await idle(page).catch(() => {});
    await sleep(1000);
    return out;
}

/**
 * The shown version's entry page (main: the workflow address with the
 * entry's menu key, as the menu opens it; 3.5: the menu entry by label),
 * then "Publication Date" / "Date Published" typed and "Save".
 */
async function setVersionDate(page, frame, app, sid, publicationId, date) {
    const KEY = {ojs: 'issue', omp: 'catalogEntry', ops: 'preprintEntry'};
    const LABEL35 = {ojs: /^Issue$/, omp: /^Catalog Entry$/, ops: /^Preprint entry$/i};
    if (app.line === 'stable-3_5_0') {
        await frame.page.getByRole('link', {name: LABEL35[app.name]}).last().click();
    } else {
        await frame.gotoEditorial(sid, {menuKey: `publication_${publicationId}_${KEY[app.name]}`});
    }
    await idle(page).catch(() => {});
    const box = page.locator('input[name="datePublished"]').last();
    await box.waitFor({state: 'visible', timeout: T});
    await sleep(600);
    const form = page.locator('form').filter({has: box}).last();
    const label = flat(await form.locator(`label[for="${await box.getAttribute('id')}"]`).first().innerText().catch(() => null), 80);
    const before = await box.inputValue();
    await box.fill(date);
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const body = await r.json().catch(() => ({}));
    await idle(page).catch(() => {});
    await sleep(800);
    return {label, before, typed: date, save: r.status(), stored: body.datePublished, error: r.ok() ? undefined : flat(JSON.stringify(body), 300)};
}

module.exports = {readDates, publishShown, setVersionDate};
