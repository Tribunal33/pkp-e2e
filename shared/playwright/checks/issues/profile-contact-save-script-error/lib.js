// Helpers of walk.js (issue report docs/issues/U03-A24-profile-contact-save-script-error.md).
// Requiring this file runs nothing. Page objects are required inside each function, after
// forEachApp has set the app's environment.
const {idle} = require('../../../probe');
const {createContext, WORDS} = require('../section-editors-not-assigned-second-journal/lib.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Page errors with the top of their stack (the file and function that threw), kept in `list`. */
function watchErrors(page, list, phase) {
    page.on('pageerror', (e) => list.push({
        phase: phase.name,
        at: new Date().toISOString(),
        message: e.message,
        stack: String(e.stack || '').split('\n').slice(1, 18).map((l) => l.trim().replace(/https?:\/\/[^/]+/, '')),
    }));
}

/** Deeper stacks for the page's own scripts (set before any script runs). */
async function deepStacks(page) {
    await page.addInitScript(() => { Error.stackTraceLimit = 40; });
}

/** Each rich-text box of the Contact form: its editor, whether it is ready, its loading indicator. */
async function editors(page) {
    return page.evaluate(() => {
        const out = {};
        document.querySelectorAll('#contactForm textarea').forEach((ta) => {
            const ed = window.tinymce && tinymce.get(ta.id);
            if (!ed) return;
            const c = ed.getContainer();
            const thr = c && c.querySelector('.tox-throbber');
            out[ta.id.replace(/-[0-9a-f]{8,}$/, '')] = {
                initialized: !!ed.initialized,
                loading: !!(thr && getComputedStyle(thr).display !== 'none'),
                busy: !!(c && c.getAttribute('aria-busy') === 'true'),
            };
        });
        return out;
    });
}

/** Steps 4-5: replace "Email", "Save", wait two seconds; what the tab then shows. */
async function saveNewEmail(page, profile, address) {
    await profile.email().fill(address);
    // admin's profile has no country, and the tab requires one
    if (!(await profile.country().inputValue())) await profile.country().selectOption({label: 'Canada'});
    await profile.save();
    await sleep(2000);
    await idle(page).catch(() => {});
    return {
        pending: flat(await profile.pendingEmailNotice().innerText().catch(() => null)),
        editors: await editors(page),
    };
}

/** Step 6: the notice's "Cancel"; what the tab then shows. */
async function cancelRequest(page, profile) {
    await profile.cancelPendingEmail();
    await sleep(2000);
    return {
        email: await profile.email().inputValue().catch(() => null),
        editors: await editors(page),
    };
}

/** Step 2: Administration › Hosted Journals › "Create Journal" (signed in as admin). */
async function createSecondContext(page, app) {
    const n = WORDS[app.name].noun;
    return createContext(page, app, {name: `h15d Second ${n}`, initials: 'H15D', path: 'h15d', email: 'h15d.second@mailinator.com'});
}

/** The Signature field's language indicator: the classes of its popover container. */
async function signatureIndicator(page) {
    return page.evaluate(() => {
        const pop = document.querySelector('#contactForm [id^="signature-localization-popover-container"]');
        return pop ? pop.className : null;
    });
}

/** Type into one language's Signature box (the popover opens on the English box's focus). */
async function typeSignature(page, lang, text) {
    // the other languages' boxes show once the English box has the focus
    if (lang !== 'en') await page.frameLocator('#contactForm iframe[id^="signature-en"]').locator('body').click();
    const body = page.frameLocator(`#contactForm iframe[id^="signature-${lang}"]`).locator('body');
    await body.click();
    await body.fill(text);
}

module.exports = {sleep, flat, watchErrors, deepStacks, editors, saveNewEmail, cancelRequest, createSecondContext, signatureIndicator, typeSignature, WORDS};
