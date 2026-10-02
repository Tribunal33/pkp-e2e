// Helpers for walk.js (U59 OPS1). Requiring this file runs nothing.
const {sql} = require('../../../probe');
// The journal form's "Save" reader and the per-app screen words are U59 A1's.
const {T, flat, WORDS, saveAndRead} = require('../journal-form-country-unmarked-refused/lib');

/** The paths of the fleet's contexts, in id order (read from its database). */
function paths(app) {
    const {table, id} = app.contextTables;
    const out = sql(app, `SELECT path FROM ${table} ORDER BY ${id}`);
    return out ? out.split('\n') : [];
}

/**
 * Fill "Create Journal" as the Steps say (everything valid, "Iceland" chosen)
 * with `path` in "Path".
 *
 * @param {object} win a ContextFormWindow (pages/HostedJournalsPages.js)
 * @param {string} noun "Journal" | "Press" | "Server"
 * @param {string} path
 */
async function fillCreate(win, noun, path) {
    await win.type(win.title('en'), `u59j ${noun}`);
    await win.type(win.initials('en'), 'U59J');
    await win.type(win.contactName, 'u59j Contact');
    await win.type(win.contactEmail, 'u59j@mailinator.com');
    await win.country.selectOption({label: 'Iceland'});
    await win.type(win.path, path);
    if (await win.languageBox('en').count()) {
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.primaryChoice('en'), true);
    }
}

/** A refused save's facts: what was sent, the error line, the reason under "Path". */
function pathFacts(res) {
    return {
        sent: res.sent.map((s) => ({status: s.status, url: s.url, override: s.override})),
        url: res.url,
        errorLine: res.errorLine,
        fieldErrors: res.fieldErrors,
        underPath: res.fieldErrors ? res.fieldErrors['context-urlPath-error'] ?? null : null,
        saved: res.saved,
    };
}

module.exports = {T, flat, WORDS, saveAndRead, paths, fillCreate, pathFacts};
