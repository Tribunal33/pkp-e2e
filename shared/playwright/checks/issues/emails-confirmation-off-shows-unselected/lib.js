// Helpers of the Settings › Workflow › "Emails" walks (issue reports
// docs/issues/U21-A12-emails-confirmation-off-shows-unselected.md and
// docs/issues/U21-OMP2-press-refuses-notify-anyone-list.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {sql} = require('../../../probe');
const {execFileSync} = require('child_process');
const path = require('path');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/** The page object of Settings › Workflow › "Emails" for the dataset's context. */
function emailsPage(page, app) {
    const {WorkflowEmailsSettingsPage} = require('../../../pages/EmailsPages.js');
    return new WorkflowEmailsSettingsPage(page, `${app.contextPath}${L(app)}`);
}

/**
 * What "Submission Confirmation" shows: the label of the selected option (null when none is),
 * every option's label, and whether "Notify Anyone" is on screen.
 */
async function readConfirmation(p) {
    const options = await p.radios('submissionAcknowledgement').evaluateAll((inputs) =>
        inputs.map((i) => ({
            label: ((i.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
            checked: i.checked,
        }))
    );
    const on = options.find((o) => o.checked);
    return {
        selected: on ? on.label : null,
        options: options.map((o) => o.label),
        notifyAnyoneShown: await p.notifyAnyoneBox().isVisible(),
    };
}

/** The stored rows of a context setting, each value in brackets ("[]" for an empty value; none when the setting has no row). */
async function storedSetting(app, name) {
    const t = app.contextTables;
    const out = await sql(app, `SELECT '[' || COALESCE(setting_value, 'NULL') || ']' FROM ${t.settings} WHERE ${t.id} = 1 AND setting_name = '${name}'`);
    return String(out || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Run a step of inapp.php in the app's code under the install's config; returns its output. */
function inApp(app, step) {
    return execFileSync('php', [path.join(__dirname, 'inapp.php'), step], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: app.configFile},
        encoding: 'utf8',
    });
}

module.exports = {flat, L, emailsPage, readConfirmation, storedSetting, inApp};

/**
 * Every radio group and select of the page as loaded (hidden tabs included):
 * {name: selected label | null} for radios, {name: selected option text} for selects.
 */
async function choicesOnPage(page) {
    return page.evaluate(() => {
        const out = {};
        const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
        for (const i of document.querySelectorAll('form input[type="radio"]')) {
            if (!(i.name in out)) out[i.name] = null;
            if (i.checked) out[i.name] = norm((i.closest('label') || {}).textContent).slice(0, 80);
        }
        for (const s of document.querySelectorAll('form select')) {
            const o = s.selectedIndex >= 0 ? s.options[s.selectedIndex] : null;
            out[`select:${s.name || s.id}`] = o ? norm(o.textContent).slice(0, 80) : null;
        }
        return out;
    });
}

module.exports.choicesOnPage = choicesOnPage;
