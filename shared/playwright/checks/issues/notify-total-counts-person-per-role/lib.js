// Helpers for walk.js beside this file (U55 A3). Requiring this file runs nothing.
// Every helper drives the screens and never throws: an error comes back in `error`.
const {idle} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words of the default dataset. */
const WORDS = {
    ojs: {context: 'Journal of Public Knowledge', manager: 'Journal manager', author: 'ccorino'},
    omp: {context: 'Public Knowledge Press', manager: 'Press manager', author: 'aclark'},
    ops: {context: 'Public Knowledge Preprint Server', manager: 'Preprint Server manager', author: 'ccorino'},
};

/**
 * As the signed-in Site Administrator: Administration › "Site Settings" › "Site Setup" ›
 * "Bulk Emails", tick the context's box and "Save". Returns the save's status.
 */
async function allowBulkEmail(page, app) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    try {
        await site.gotoFromAdministration();
        const form = await site.bulkEmails();
        await form.box(WORDS[app.name].context).check();
        const r = await form.pressSave();
        return {status: r.status(), labels: await form.boxLabels()};
    } catch (e) {
        return {error: flat(e.message)};
    }
}

/** Settings › Users & Roles › "Notify"; returns the tab page object (or {error}). */
async function openNotify(page, app) {
    const {NotifyTab} = require('../../../pages/NotifyUsersPages.js');
    const tab = new NotifyTab(page, app.contextPath);
    try {
        await tab.goto();
        return {tab, roles: await tab.roleLabels(), copy: flat(await tab.copyField.last().innerText())};
    } catch (e) {
        return {error: flat(e.message)};
    }
}

/**
 * Press the form's button ("Save") and read the "Send Email" window; then "Cancel" it, unless
 * `keep` (the window is left open for "Send Email"). Returns the window's title, message and
 * buttons, and the requests the press sent.
 */
async function readConfirm(page, tab, {keep = false} = {}) {
    const sent = [];
    const onRequest = (r) => {
        if (/\/api\/v1\//.test(r.url())) sent.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
    };
    page.on('request', onRequest);
    try {
        const win = await tab.pressSubmit();
        await idle(page).catch(() => {});
        const out = {
            title: flat(await win.title.innerText().catch(() => null)),
            // Read from the window's text: 3.5's dialog holds the message in no <p>.
            message: ((flat(await win.dialog.innerText(), 600) || '').match(/You are about to send an email to .*?\?/) || [null])[0],
            buttons: await win.buttonLabels(),
            requests: sent.slice(),
        };
        if (!keep) await win.cancel();
        return {out, win};
    } catch (e) {
        return {out: {error: flat(e.message), requests: sent.slice()}};
    } finally {
        page.off('request', onRequest);
    }
}

/**
 * Mailpit: the messages with this subject received since `since`, addressed to a dataset
 * account (`…@mailinator.com`). The dataset runs the site's jobs on page requests
 * (`job_runner = On`), so the page is reloaded between reads until the count holds still over
 * three reads or `timeoutMs` runs out.
 */
async function sentTo(app, page, {subject, since, timeoutMs = 90_000}) {
    const read = async () => {
        const r = await app.mail._search({to: 'mailinator.com', subject, since});
        return (r.messages || []).map((m) => (m.To || []).map((t) => t.Address).join(',')).sort();
    };
    const deadline = Date.now() + timeoutMs;
    let last = [];
    let still = 0;
    while (Date.now() < deadline) {
        await page.reload().catch(() => {});
        await idle(page).catch(() => {});
        const now = await read().catch(() => last);
        if (now.length && now.length === last.length) {
            still += 1;
            if (still >= 3) break;
        } else {
            still = 0;
        }
        last = now;
        await page.waitForTimeout(2_000);
    }
    return {count: last.length, distinct: new Set(last).size, to: last};
}

module.exports = {flat, WORDS, allowBulkEmail, openNotify, readConfirm, sentTo};
