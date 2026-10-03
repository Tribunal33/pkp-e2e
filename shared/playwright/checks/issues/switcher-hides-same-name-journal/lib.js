// Helpers of walk.js (issue report docs/issues/U08-A21-switcher-hides-same-name-journal.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const ctxLib = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 15_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** Per-app words: the dataset context's name, the switcher's screen-reader name, an author of the dataset. */
const WORDS = {
    ojs: {datasetName: 'Journal of Public Knowledge', icon: 'Journals', author: 'ccorino', loneAuthor: 'amwandenga'},
    omp: {datasetName: 'Public Knowledge Press', icon: 'Presses', author: 'aclark', loneAuthor: 'afinkel'},
    ops: {datasetName: 'Public Knowledge Preprint Server', icon: 'Servers', author: 'ccorino', loneAuthor: 'ckwantes'},
};

/**
 * Open `path` and press the sitemap icon in the dark header bar. Returns
 * `{url, present, items: [{name, href}]}`; `present: false` when the page has no icon.
 * The dropdown is left as the press left it (a navigation follows).
 */
async function readSwitcher(page, app, path) {
    await page.goto(app.url(path));
    await idle(page).catch(() => {});
    const out = {url: rel(page.url()), present: false, items: []};
    const box = page.locator('header .app__contexts');
    if (!(await box.count())) return out;
    const button = box.getByRole('button', {name: WORDS[app.name].icon});
    out.present = await button.isVisible().catch(() => false);
    if (!out.present) return out;
    out.buttonName = flat(await button.innerText().catch(() => null));
    await button.click();
    const content = box.locator('.pkpDropdown__content');
    await content.waitFor({state: 'visible', timeout: T}).catch(() => {});
    out.opened = await content.isVisible().catch(() => false);
    out.listText = flat(await content.innerText().catch(() => null));
    const links = content.locator('a.pkpDropdown__action');
    for (let i = 0; i < (await links.count()); i++) {
        out.items.push({name: flat(await links.nth(i).innerText()), href: rel(await links.nth(i).getAttribute('href'))});
    }
    return out;
}

module.exports = {T, flat, rel, WORDS, readSwitcher, createContext: ctxLib.createContext, giveRole: ctxLib.giveRole};
