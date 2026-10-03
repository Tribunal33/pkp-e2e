// Helpers of walk.js (issue report docs/issues/U07-A9-for-readers-privacy-link-opens-submissions.md):
// a journal or press created on screen with "Enable this journal to appear publicly on the site"
// ticked, and a public page read as a reader lands on it (heading, address, whether a section's
// heading is in view).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {WORDS} = require('../french-default-texts-stored-as-codes/lib');

const T = 30_000;
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Administration › Hosted … › "Create …", English, enabled publicly. Returns the save's status. */
async function createEnabledContext(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, WORDS[app.name]);
    await page.goto(app.url('/index.php/index/en/admin/contexts'));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) await win.setBox(win.languageBox('en'), true);
    if (await win.primaryChoice('en').count()) await win.setBox(win.primaryChoice('en'), true);
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/** Where the reader stands: address, status, page heading, and whether `#<anchor>`'s heading is in view. */
async function landing(page, anchor) {
    await idle(page).catch(() => {});
    const h1 = flat(await page.locator('h1').first().innerText().catch(() => ''));
    const view = await page.evaluate((id) => {
        const el = id && document.getElementById(id);
        if (!el) return {anchorFound: false, scrollY: window.scrollY};
        const r = el.getBoundingClientRect();
        return {anchorFound: true, scrollY: window.scrollY, anchorTop: Math.round(r.top), inView: r.top >= 0 && r.top < window.innerHeight,
            anchorHeading: (el.querySelector('h2') || el).innerText.trim().slice(0, 80)};
    }, anchor || null);
    return {url: page.url(), title: await page.title(), h1, ...view};
}

/** The hrefs of the links in the Information page's content, by link text. */
async function contentLinks(page) {
    return page.locator('.page_information .description a').evaluateAll((as) =>
        [...new Map(as.map((a) => [a.textContent.trim(), a.getAttribute('href')])).entries()].map(([text, href]) => ({text, href})));
}

module.exports = {T, flat, createEnabledContext, landing, contentLinks};
