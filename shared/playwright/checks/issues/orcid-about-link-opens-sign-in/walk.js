// Issue report U04 A4: the "What is ORCID?" link beside the ORCID connect button, on the
// profile's Identity tab and on the registration page, opens ORCID's sign-in popup instead
// of the "What is ORCID?" page it names. Steps: the report's "Steps to reproduce".
// Runs on PKP's default test dataset (a dataset fleet, reset before each walk).
//
//   MODE=steps (default)  the report's steps: ORCID on (Settings › Users & Roles › ORCID),
//                         rvaca's profile: "Create or Connect your ORCID iD" (control), then
//                         "What is ORCID?"; signed out, Register: "What is ORCID?"; the About
//                         page by its address (control).
//   MODE=nb               the neighbour: the connect button itself, on the profile and on
//                         the registration page, must keep opening ORCID's sign-in popup
//                         (fix in and out). Turns ORCID on itself when it is off.
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u04r3 [MODE=nb] [PROBE_RUN=…] \
//     node bin/probe.js all shared/playwright/checks/issues/orcid-about-link-opens-sign-in/walk.js
//
// orcid.org is answered locally in the browser (shared/playwright/support/orcid.js), so a
// popup to ORCID's site is recorded by the address the app gave it, not by ORCID's content.
const {forEachApp, launch, signIn, signOut, record, screen, shot, idle, loc} = require('../../../probe');
const {stubOrcidSite} = require('../../../support/orcid.js');
const {setOrcidMember} = require('../publish-without-issue-orcid-contributor-error/lib.js');

const MODE = process.env.MODE || 'steps';
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Press a control and record what it opened: a popup (its address once it has one), whether
 * the page itself navigated, and where it now is. Never throws.
 */
async function pressAndRead(page, control) {
    const before = page.url();
    const out = {before};
    try {
        out.control = {
            text: flat(await control.innerText()),
            href: await control.getAttribute('href'),
            onclick: await control.getAttribute('onclick'),
            target: await control.getAttribute('target'),
            tag: await control.evaluate((el) => el.tagName.toLowerCase()),
        };
        const popupP = page.waitForEvent('popup', {timeout: 10_000}).catch(() => null);
        const navP = page.waitForEvent('framenavigated', {timeout: 5_000}).catch(() => null);
        await control.click();
        const popup = await popupP;
        await navP;
        if (popup) {
            await popup.waitForLoadState('domcontentloaded', {timeout: 15_000}).catch(() => {});
            out.popup = {url: popup.url(), title: await popup.title().catch(() => null)};
            out.popup.heading = flat(await popup.locator('h1').first().innerText({timeout: 3_000}).catch(() => null));
            await popup.close().catch(() => {});
        } else {
            out.popup = null;
        }
        await idle(page).catch(() => {});
        out.after = page.url();
        out.pageNavigated = out.after !== before;
        out.pageHeading = flat(await page.locator('h1').first().innerText({timeout: 3_000}).catch(() => null));
    } catch (e) {
        out.error = flat(e.message, 400);
    }
    return out;
}

async function ensureOrcidOn(page, app, facts) {
    await signIn(page, 'rvaca');
    facts.orcidSettings = await setOrcidMember(page, app, {apiType: 'publicProduction'}, {prefix: `a4-${MODE}-`});
    delete facts.orcidSettings.screen; // the tab's text is in the shot; keep the save and the stored rows
}

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset};
    const {page, close} = await launch(app);
    try {
        await stubOrcidSite(page.context());
        await ensureOrcidOn(page, app, facts);

        // Profile, Identity tab (rvaca, no iD).
        await page.goto(app.url(`/index.php/${ctx}/user/profile`));
        const form = page.locator('form#identityForm');
        await form.waitFor({state: 'visible', timeout: 30_000});
        await idle(page);
        const connect = form.locator('#connect-orcid-button');
        const about = form.getByRole('link', {name: 'What is ORCID?'});
        await connect.waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
        await loc(page, 'profile: Create or Connect your ORCID iD', connect);
        await loc(page, 'profile: What is ORCID? link', about);
        facts.profile = {screen: await screen(page)};
        await shot(page, `a4-${MODE}-profile`);
        facts.profile.connect = await pressAndRead(page, connect);
        if (MODE === 'steps') {
            facts.profile.about = await pressAndRead(page, about);
        }

        // Registration page, signed out.
        await signOut(page);
        await page.goto(app.url(`/index.php/${ctx}/user/register`));
        const reg = page.locator('form#register');
        await reg.waitFor({state: 'visible', timeout: 30_000});
        await idle(page);
        const regConnect = reg.locator('#connect-orcid-button');
        const regAbout = reg.getByRole('link', {name: 'What is ORCID?'});
        await loc(page, 'register: Create or Connect your ORCID iD', regConnect);
        await loc(page, 'register: What is ORCID? link', regAbout);
        facts.register = {screen: await screen(page)};
        await shot(page, `a4-${MODE}-register`);
        if (MODE === 'steps') {
            facts.register.about = await pressAndRead(page, regAbout);
        } else {
            facts.register.connect = await pressAndRead(page, regConnect);
        }

        if (MODE === 'steps') {
            // Control: the About page by its address.
            const res = await page.goto(app.url(`/index.php/${ctx}/orcid/about`));
            await idle(page);
            facts.aboutByAddress = {status: res ? res.status() : null, url: page.url(), screen: await screen(page)};
            await shot(page, `a4-${MODE}-about-by-address`);
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 1200);
    } finally {
        record(`a4-${MODE}`, facts);
        await close();
    }
});
