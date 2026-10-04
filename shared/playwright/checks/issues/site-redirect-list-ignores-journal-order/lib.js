// Helpers for walk.js beside this file (U60 A11). Requiring this file runs nothing.
// Every helper drives the screens a Site Administrator uses and never throws: an error comes back
// in `error`.
const {idle} = require('../../../probe');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words of Administration's context list. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

function hostedPage(page, app) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    return new HostedJournalsPage(page, WORDS[app.name]);
}

/** Administration › "Hosted Journals": every row's name and path, in the table's order. */
async function readHosted(page, app) {
    const hosted = hostedPage(page, app);
    try {
        await hosted.gotoFromAdministration();
        const rows = await hosted.rows.evaluateAll((trs) =>
            trs.map((tr) => {
                const cells = tr.querySelectorAll('td');
                const copy = cells[0].cloneNode(true);
                copy.querySelectorAll('a, script').forEach((e) => e.remove());
                return {name: copy.textContent.replace(/\s+/g, ' ').trim(), path: ((cells[1] || {}).textContent || '').replace(/\s+/g, ' ').trim()};
            })
        );
        return {names: rows.map((r) => r.name), paths: rows.map((r) => r.path)};
    } catch (e) {
        return {error: flat(e.message)};
    }
}

/**
 * Administration › "Site Settings" › "Site Setup" › "Settings": the redirect list's entries in
 * order (the blank one included), or `null` when the page has no such list; then "Bulk Emails":
 * its boxes' labels in order (the control). Also the page's top and side tabs.
 */
async function readSiteSettings(page) {
    const {SiteSettingsPage} = require('../../../pages/SiteSettingsPages.js');
    const site = new SiteSettingsPage(page);
    const out = {};
    try {
        await site.gotoFromAdministration();
        out.topTabs = (await site.topTabs.allInnerTexts()).map((s) => flat(s, 60));
        await site.openTop('Site Setup');
        out.sideTabs = (await site.sideTabs('Site Setup').allInnerTexts()).map((s) => flat(s, 60));
        // With one journal the page has no "Settings" side tab, so no redirect list.
        const form = out.sideTabs.includes('Settings') ? await site.settings() : null;
        if (form && (await form.redirect.count())) {
            out.redirectLabel = flat(await page.locator('label[for^="siteConfig-redirectContextId-control"]').first().innerText().catch(() => null), 80);
            out.redirect = await form.redirectChoices();
        } else {
            out.redirect = null;
        }
        if (out.sideTabs.includes('Bulk Emails')) {
            out.bulkEmails = await (await site.bulkEmails()).boxLabels();
        }
    } catch (e) {
        out.error = flat(e.message);
    }
    return out;
}

/** "Hosted Journals" › "Order": drag the row `from` above the row `to` (paths), "Done". */
async function orderAbove(page, app, from, to) {
    const hosted = hostedPage(page, app);
    try {
        await hosted.gotoFromAdministration();
        await hosted.startOrdering();
        await hosted.drag(from, to);
        const r = await hosted.done();
        await idle(page).catch(() => {});
        return {status: r.status(), paths: await hosted.paths()};
    } catch (e) {
        return {error: flat(e.message)};
    }
}

/** "Hosted Journals" › a row's "Edit" › "Save" with nothing changed; the save's status. */
async function editSave(page, app, path) {
    const hosted = hostedPage(page, app);
    try {
        await hosted.gotoFromAdministration();
        const win = await hosted.openEdit(path);
        const r = await win.pressSave();
        const saved = await win.savedStatus.waitFor({timeout: 5_000}).then(() => true).catch(() => false);
        await win.root.waitFor({state: 'detached', timeout: 30_000}).catch(() => {});
        return {status: r.status(), saved};
    } catch (e) {
        return {error: flat(e.message)};
    }
}

module.exports = {flat, WORDS, readHosted, readSiteSettings, orderAbove, editSave};
