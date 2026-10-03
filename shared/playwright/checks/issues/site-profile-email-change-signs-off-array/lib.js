// Helpers of walk.js (issue report docs/issues/U03-A10-site-profile-email-change-signs-off-array.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses; page objects
// are required inside each function, after forEachApp has set the app's environment.
// The second context and dbarnes's role there reuse the U21 A8 helpers (Administration ›
// Hosted Journals › "Create Journal", then the Settings Wizard's "Users" tab), and the
// Profile page is opened with the U03 A14 helper.
const {idle} = require('../../../probe');
const {createContext, giveRole} = require('../section-editors-not-assigned-second-journal/lib.js');
const {openProfile} = require('../site-profile-privacy-link-not-found/lib.js');

const SUBJECT = 'Confirm account contact email change request';
const NOUN = {ojs: 'Journal', omp: 'Press', ops: 'Server'};
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** The second context the steps create, tagged u03rg. */
function secondContext(app) {
    return {name: `u03rg Second ${NOUN[app.name]}`, initials: 'U03RG', path: 'u03rg', email: 'u03rg@mailinator.com'};
}

/** Steps 1-2: `admin` (signed in) creates the second context and gives `username` a role there. */
async function createSecondContext(page, app, {username = 'dbarnes', role = 'Reader'} = {}) {
    const ctx = secondContext(app);
    const status = await createContext(page, app, ctx);
    const landed = rel(page.url());
    const roleGiven = await giveRole(page, app, {username, role});
    return {ctx, status, landed, roleGiven};
}

/**
 * Step 4: on the open Profile page, "Contact" › "Email" typed, "Save". Returns the save's
 * outcome: the toast, the pending-change notice and the Email box afterwards.
 */
async function requestEmailChange(page, profile, newEmail) {
    await profile.open('contact');
    await profile.email().fill(newEmail);
    await profile.save();
    await profile.pendingEmailNotice().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
    await idle(page).catch(() => {});
    return {
        notice: await profile.pendingEmailNotice().innerText().catch(() => null),
        toast: await profile.toast.innerText().catch(() => null),
        emailBox: await profile.email().inputValue().catch(() => null),
    };
}

/**
 * Step 5: the "Confirm account contact email change request" message to `to` sent since
 * `since` that names `newEmail`: its sender, recipients and how its text and HTML end.
 */
async function readChangeMail(app, {to, newEmail, since}) {
    const m = await app.mail.find({to, subject: SUBJECT, contains: newEmail, since, timeoutMs: 45_000});
    const full = await app.mail.fullMessage(m.ID);
    const text = String(full.Text || '').replace(/\r/g, '');
    const html = String(full.HTML || '');
    const kr = text.lastIndexOf('Kind regards');
    return {
        subject: full.Subject,
        from: full.From,
        to: full.To,
        textEnd: kr >= 0 ? text.slice(kr, kr + 200).trim() : text.slice(-300).trim(),
        htmlEnd: html.slice(Math.max(0, html.lastIndexOf('Kind regards') - 3), html.lastIndexOf('Kind regards') + 200),
    };
}

module.exports = {SUBJECT, secondContext, createSecondContext, openProfile, requestEmailChange, readChangeMail};
