// Helpers of walk.js (issue report docs/issues/U56-OMP2-press-notify-primary-contact-unselected.md):
// "Notify Primary Contact" on Settings › Workflow › "Emails" read as data, a context created on screen
// through Administration › Hosted Journals (Presses, Servers), and the proposed migration run in the app's code.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {execFileSync} = require('child_process');
const path = require('path');

const T = 30_000;
const NAME = 'copySubmissionAckPrimaryContact';
const LABELS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/** "Notify Primary Contact" as shown: every choice's label and whether it is checked, and the selected label (null when none is). */
async function readPrimaryContact(p) {
    const options = await p.radios(NAME).evaluateAll((inputs) =>
        inputs.map((i) => ({
            label: ((i.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
            checked: i.checked,
        }))
    );
    const legend = await p.panel
        .locator(`fieldset:has(input[name="${NAME}"]) legend, fieldset:has(input[name="${NAME}"]) .pkpFormFieldLabel`)
        .first()
        .innerText()
        .catch(() => null);
    const on = options.find((o) => o.checked);
    return {label: legend && legend.replace(/\s+/g, ' ').trim(), options, selected: on ? on.label : null};
}

/** Pick a "Notify Primary Contact" choice by the start of its label ("Yes", "No"). */
async function pickPrimaryContact(p, start) {
    for (const i of await p.radios(NAME).all()) {
        const label = await i.evaluate((el) => ((el.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim());
        if (label.startsWith(start)) return i.check();
    }
    throw new Error(`no "${start}" choice`);
}

/**
 * Administration › Hosted Journals (Presses, Servers) › "Create …", filled and saved, as `admin`.
 * Returns the save's status.
 */
async function createContext(page, app, {name, initials, path: urlPath, email}) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, LABELS[app.name]);
    const L = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await page.goto(app.url(`/index.php/index${L}/admin/contexts`));
    await hosted.expectOpen();
    const win = await hosted.openCreate();
    await win.type(win.title('en'), name);
    await win.type(win.initials('en'), initials);
    await win.type(win.contactName, name);
    await win.type(win.contactEmail, email);
    if (await win.country.count()) await win.country.selectOption({label: 'Canada'});
    await win.type(win.path, urlPath);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        if (await win.primaryChoice('en').count()) await win.setBox(win.primaryChoice('en'), true);
    }
    await win.setBox(win.enableBox, true);
    const r = await win.pressSave();
    await page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T}).catch(() => {});
    await idle(page).catch(() => null);
    return r.status();
}

/** Run a step of inapp.php in the app's code under the install's config; returns its output. */
function inApp(app, step) {
    return execFileSync('php', [path.join(__dirname, 'inapp.php'), step], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: app.configFile},
        encoding: 'utf8',
    });
}

module.exports = {NAME, LABELS, readPrimaryContact, pickPrimaryContact, createContext, inApp};
