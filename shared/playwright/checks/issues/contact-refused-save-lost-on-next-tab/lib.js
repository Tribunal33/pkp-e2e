// Helpers for the U03 A17 walk (walk.js) and its neighbour (neighbour.js).
// Requiring this file runs nothing. The Profile page object is required
// inside each function, after forEachApp has set the app's environment.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Record every browser dialog and answer it as `state.answer` says
 * ('dismiss' = Cancel, 'accept' = OK); a page-leave question is accepted.
 * The script's own listener decides alone (patterns.md "Probe kit").
 */
function dialogRecorder(page) {
    const state = {answer: 'dismiss', seen: []};
    page.on('dialog', async (d) => {
        const entry = {type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : state.answer};
        state.seen.push(entry);
        if (entry.answered === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    return state;
}

/**
 * Open the Profile page at its address (`/index.php/{context}/en/user/profile`).
 * The user menu's "Edit Profile" leads to the same page; the POM's menu
 * helper timed out on the dataset's `dbarnes` (2026-10-03), so the walk types
 * the address, as Steps step 2 says.
 */
async function openProfileFromMenu(app, page) {
    const P = require('../../../pages/ProfilePage.js');
    const profile = new P.ProfilePage(page, app.contextPath);
    await profile.goto('identity');
    return {profile, via: 'address'};
}

/**
 * Press a tab in the tab bar the way a person does, answering any question
 * as the recorder is set, and report what happened: the dialogs it raised,
 * which tab is selected afterwards. Never throws on a tab that did not open.
 */
async function pressTab(page, profile, dialogs, tab, {answer = 'dismiss'} = {}) {
    const P = require('../../../pages/ProfilePage.js');
    const {waitForJQueryIdle} = require('../../../support/legacy.js');
    const before = dialogs.seen.length;
    dialogs.answer = answer;
    await profile.tabLink(tab).click();
    await sleep(1500);
    await waitForJQueryIdle(page).catch(() => {});
    await profile.form(tab).waitFor({state: 'visible', timeout: 8000}).catch(() => {});
    const selected = [];
    for (const t of Object.keys(P.TAB_ANCHORS)) {
        if ((await profile.tabEntry(t).getAttribute('aria-selected').catch(() => null)) === 'true') selected.push(t);
    }
    dialogs.answer = 'dismiss';
    return {pressed: tab, dialogs: dialogs.seen.slice(before), selected};
}

/** The Contact tab's boxes as they stand (null when the tab is not loaded). */
async function contactValues(profile) {
    const read = async (loc) => (await loc.count()) ? loc.first().inputValue().catch(() => null) : null;
    return {
        open: await profile.form('contact').isVisible().catch(() => false),
        email: await read(profile.email()),
        emailLabel: (await profile.emailLabel().count()) ? (await profile.emailLabel().first().innerText().catch(() => null)) : null,
        phone: await read(profile.phone()),
    };
}

module.exports = {sleep, dialogRecorder, openProfileFromMenu, pressTab, contactValues};
