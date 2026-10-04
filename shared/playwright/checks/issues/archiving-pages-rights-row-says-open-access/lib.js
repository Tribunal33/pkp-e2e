// Helpers of walk.js (issue report docs/issues/U67-A2-archiving-pages-rights-row-says-open-access.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, record} = require('../../../probe');
const A1 = require('../archiving-pages-copyright-row-license-terms/lib.js');
const {requireSubscriptions} = require('../oai-jats-list-refused-for-one-subscription-article/lib.js');

const {flat, step, switchOnLockssClockss, readSiteLists, noSurface} = A1;

/** Words of the default "Rights" text, English and French, as a person would search for them. */
const RIGHTS_WORDS = ['immediate open access', 'libre accès immédiat'];
/** Words the dataset or step 5 put into a settings form ("Description", "About the Journal"): the search's control. */
const CONTROL_WORDS = ['peer-reviewed quarterly publication', 'u67a This journal requires'];

/** One manifest page: its "Metadata" rows, the "Rights" row, and the closing lines. */
async function readManifest(page, app, network, name) {
    const {ManifestPage} = require('../../../pages/ArchivingPages.js');
    const m = new ManifestPage(page, app.contextPath, network);
    const resp = await m.goto();
    await idle(page);
    const rows = await m.rows();
    const row = rows.find((r) => r[0] === 'Rights');
    const text = flat(await m.root().innerText());
    if (name) record(`${name}-${network}`, await screen(page));
    return {
        status: resp ? resp.status() : null,
        url: page.url(),
        labels: rows.map((r) => r[0]),
        rows,
        rights: row ? {present: true, value: flat(row[1] || '')} : {present: false},
        closing: text.slice(-260),
    };
}

/** The LOCKSS page, then the CLOCKSS page. */
async function readBoth(page, app, name) {
    return {lockss: await readManifest(page, app, 'lockss', name), clockss: await readManifest(page, app, 'clockss', name)};
}

/** Settings › Journal › "Masthead": "About the Journal" typed, "Save". */
async function setAboutJournal(page, app, text) {
    const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
    const s = new SettingsPages(page, app.contextPath);
    const form = await s.openJournalTab('Masthead');
    await form.typeRich('masthead-about-control', text);
    const r = await form.save();
    return {status: r.status(), about: await form.richContent('masthead-about-control')};
}

/**
 * Every top tab of one Settings page: whether the "Rights" words show on screen, and whether the
 * page as served (its forms' values included, every tab's) holds them anywhere.
 */
async function searchSettingsPage(page, app, which) {
    const {SettingsPages} = require('../../../pages/ContextIdentityPages.js');
    const s = new SettingsPages(page, app.contextPath);
    await s.goto(which);
    await idle(page);
    const html = await page.content();
    const tabs = (await s.topTabs.allInnerTexts()).map(flat);
    const shown = {};
    for (let i = 0; i < tabs.length; i++) {
        await s.topTabs.nth(i).click();
        await idle(page);
        const text = flat(await page.getByRole('main').innerText());
        const values = await page.evaluate(() => {
            const out = [...document.querySelectorAll('main input, main textarea')].map((e) => e.value || '');
            for (const ed of (window.tinymce && window.tinymce.get()) || []) out.push(ed.getContent() || '');
            return out.join('\n');
        });
        shown[tabs[i]] = RIGHTS_WORDS.some((w) => text.includes(w) || values.includes(w));
        record(`s7-${which}-${i}`, await screen(page));
    }
    return {
        which, url: page.url(), tabs, inServedPage: RIGHTS_WORDS.filter((w) => html.includes(w)), shownOnTab: shown,
        controlInServedPage: CONTROL_WORDS.filter((w) => html.includes(w)),
    };
}

/** The journal's "About the Journal" page: whether it holds the Rights words or the given text. */
async function readAboutPage(page, app, mine) {
    await page.goto(app.url(`/index.php/${app.contextPath}/about`));
    await idle(page);
    const text = flat(await page.getByRole('main').innerText());
    record('s7-about', await screen(page));
    return {url: page.url(), rightsWords: RIGHTS_WORDS.filter((w) => text.includes(w)), mine: text.includes(mine)};
}

module.exports = {
    flat, step, RIGHTS_WORDS, CONTROL_WORDS, switchOnLockssClockss, readSiteLists, noSurface, requireSubscriptions,
    readManifest, readBoth, setAboutJournal, searchSettingsPage, readAboutPage,
};
