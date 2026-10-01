// Helpers for the create-context-one-language-script-error walk. Requiring
// this file runs nothing.
const {idle} = require('../../../probe');

const LABELS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/**
 * The page's script failures as they happen: uncaught page errors and the
 * console errors Vue's error handler logs for a failure it caught (a
 * watcher's TypeError fires no page error). `since()` returns those since
 * its last call, `all` every one.
 */
function watchScriptErrors(page) {
    const all = [];
    page.on('pageerror', (e) => all.push({kind: 'pageerror', message: String(e.message || e).slice(0, 200), at: String(e.stack || '').split('\n').slice(1, 2).join('').trim().slice(0, 160)}));
    page.on('console', (m) => {
        if (m.type() !== 'error') return;
        const lines = m.text().split('\n');
        all.push({kind: 'console', message: lines[0].slice(0, 200), at: (lines.find((l) => /^\s+at /.test(l)) || '').trim().slice(0, 160)});
    });
    let seen = 0;
    return {
        all,
        since() {
            const out = all.slice(seen);
            seen = all.length;
            return out;
        },
    };
}

/** Administration › Hosted Journals (Presses, Servers) › "Create Journal": the open window. */
async function openCreateForm(page, app) {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const hosted = new HostedJournalsPage(page, LABELS[app.name]);
    await hosted.gotoFromAdministration();
    const win = await hosted.openCreate();
    await idle(page);
    return win;
}

/** The field labels the window shows, in order (legends and labels). */
async function formLabels(win) {
    return win.form.locator('legend, label.pkpFormFieldLabel').evaluateAll((els) =>
        els.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    );
}

/**
 * The create form's own fields, one change each, the way a person fills
 * them: [step label, action]. The "Languages" and "Primary locale" fields
 * (two-language site only) are left to the caller.
 */
function fieldSteps(win, {name, path}) {
    return [
        ['title', () => win.type(win.title('en'), name)],
        ['initials', () => win.type(win.initials('en'), 'UJ')],
        ['contact name', () => win.type(win.contactName, `${name} Contact`)],
        ['contact email', () => win.type(win.contactEmail, `${path}@mailinator.com`)],
        ['country', () => win.country.selectOption({label: 'Canada'})],
        ['path', () => win.type(win.path, path)],
    ];
}

/** Administration › "Site Settings" › "Site Setup" › "Languages": untick "Enable" on a row and answer "OK". */
async function disableSiteLanguage(page, code) {
    const {SiteLanguagesList} = require('../../../pages/LanguagesPages.js');
    const site = new SiteLanguagesList(page);
    await site.gotoFromAdministration();
    const before = await site.codes();
    await site.enableBox(code).click();
    const question = await site.question('Disable').innerText();
    const r = await site.answer('Disable', 'OK');
    return {rows: before, question: question.replace(/\s+/g, ' ').trim(), status: r && r.status(), enabled: await site.enableBox(code).isChecked()};
}

module.exports = {LABELS, watchScriptErrors, openCreateForm, formLabels, fieldSteps, disableSiteLanguage};
