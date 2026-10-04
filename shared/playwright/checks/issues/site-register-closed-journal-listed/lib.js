// Helpers of walk.js (U02 A4, joined to issue report docs/issues/U03-A4-closed-journal-listed-on-roles-tab.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses; page objects
// are required inside each function, after forEachApp has set the app's environment.
const {idle} = require('../../../probe');
const {WORDS: W} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/** The dataset's one context, by app, as the site-level page names it. */
const CONTEXT_NAME = {ojs: 'Journal of Public Knowledge', omp: 'Public Knowledge Press', ops: 'Public Knowledge Preprint Server'};

/** The two contexts the steps create, by app. */
function scratchNames(app) {
    const n = W[app.name].noun;
    return {
        closed: {name: `u02e Closed ${n}`, initials: 'U02EC', path: 'u02eclosed', email: 'u02e.closed@mailinator.com', enabled: true},
        hidden: {name: `u02e Hidden ${n}`, initials: 'U02EH', path: 'u02ehidden', email: 'u02e.hidden@mailinator.com', enabled: false},
    };
}

/**
 * Steps 1-2: Administration › Hosted … › "Create …", as `admin` (signed in), "Enable this … to
 * appear publicly on the site" set as `enabled` says. Returns the save's status.
 */
async function createContext(page, app, {name, initials, path: urlPath, email, enabled}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, W[app.name]);
    await page.goto(app.url(`/index.php/index${L(app)}/admin/contexts`));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
    await win.setBox(win.enableBox, enabled);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    return r.status();
}

/**
 * Step 4: the site-wide Register page, signed out. Per listed context: its name, the roles
 * legend, the boxes, and its consent line (present, shown on screen, its text).
 */
async function readSiteRegister(page, app) {
    const res = await page.goto(app.url(`/index.php/index${L(app)}/user/register`));
    await idle(page).catch(() => {});
    const data = await page.evaluate(() => {
        // on screen: laid out, not hidden, not moved off-screen (left: -9999px) or clipped to a
        // screen-reader-only pixel (.pkp_screen_reader)
        const shown = (el) => {
            if (!el || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            return r.right > 0 && r.width > 1 && r.height > 1;
        };
        const prompt = document.querySelector('fieldset[name="contexts"] > legend');
        const items = [...document.querySelectorAll('#contextOptinGroup li.context')].map((li) => {
            const legend = li.querySelector('fieldset.roles legend');
            const consent = li.querySelector('.context_privacy');
            return {
                name: ((li.querySelector('.name') || {}).innerText || '').trim(),
                legend: legend ? legend.textContent.trim() : null,
                legendShown: shown(legend),
                boxes: [...li.querySelectorAll('fieldset.roles label')].map((l) => l.innerText.trim()),
                consent: consent ? {shown: shown(consent), text: consent.textContent.replace(/\s+/g, ' ').trim()} : null,
                seen: li.innerText.replace(/\s+/g, ' ').trim(),
            };
        });
        return {h1: ((document.querySelector('h1') || {}).innerText || '').trim(), prompt: prompt ? prompt.innerText.trim() : null, items};
    });
    return {status: res && res.status(), ...data};
}

/** The dataset context's "Reader" box and consent line on the site-level page. */
function contextBlock(page, name) {
    return page.locator('form#register li.context').filter({has: page.locator('.name', {hasText: name})});
}

module.exports = {T, flat, L, CONTEXT_NAME, scratchNames, createContext, readSiteRegister, contextBlock};
