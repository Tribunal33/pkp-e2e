// Helpers for walk.js (U69 A15). Requiring this file runs nothing.
const {screen, record, idle, rawKeys} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/**
 * A book's or a chapter's page as a reader sees it: the side column's
 * labels in screen order, the "Versions" lines, the file links and every
 * raw code (`##key##`) on the page.
 */
async function readPage(page, label) {
    await idle(page).catch(() => {});
    record(label, await screen(page));
    const data = await page.evaluate(() => {
        const t = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
        return {
            tab: document.title,
            heading: t(document.querySelector('.page h1, h1')),
            labels: [...document.querySelectorAll('.entry_details .label, .main_entry .label')].map(t).filter(Boolean),
            hidden: [...document.querySelectorAll('.obj_monograph_full .pkp_screen_reader')].map(t).filter(Boolean),
            versions: [...document.querySelectorAll('.sub_item.versions li')].map(t),
            fileLinks: [...document.querySelectorAll('a.cmp_download_link')].map(t),
            text: t(document.querySelector('.obj_monograph_full') || document.body),
        };
    });
    const keys = await rawKeys(page).catch((e) => `rawKeys failed: ${e.message}`);
    return {url: rel(page.url()), ...data, text: flat(data.text, 6000), rawKeys: keys};
}

/** A file's view page: the browser tab and the header bar's return arrow and title. */
async function readViewPage(page, label) {
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await idle(page).catch(() => {});
    record(label, await screen(page));
    const data = await page.evaluate(() => {
        const t = (el) => (el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null);
        return {tab: document.title, returnArrow: t(document.querySelector('header a.return, .header_view a.return')), barTitle: t(document.querySelector('header a.title, .header_view a.title'))};
    });
    const keys = await rawKeys(page).catch((e) => `rawKeys failed: ${e.message}`);
    return {url: rel(page.url()), ...data, rawKeys: keys};
}

module.exports = {flat, rel, readPage, readViewPage};
