// Neighbour check for docs/issues/U13-OJS7-publication-facts-settings-refused-ok-loses-changes.md:
// the fix keeps a refused "OK"'s entries on screen, and must not store them
// or change what the window loads when it opens. Through the screens, on the
// default dataset, as `dbarnes` with "Publication Facts Label plugin" ticked:
//   A. the Steps' entries, "OK" (refused), "Cancel", reopen: the saved values
//      (all empty), nothing of the refused entries stored;
//   B. the same entries with a valid Scopus "URL", "OK": "Your changes have been
//      saved.", the window closes; reopen: the stored values.
// Walked with the fix in and out (trial.sh). OJS only.
// Run: PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs7 node bin/probe.js ojs <this file>
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {openPflRow, enablePfl, readPflSettings} = require('../publication-facts-settings-warn-missing-funding-plugin/lib');
const {readPflFields, fillPflForm, pressPflOk, cancelPfl, reopenPflSettings} = require('./lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] nb-${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    const failures = [];
    page.on('response', (r) => { if (r.status() >= 500) failures.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e.message).slice(0, 200)}`));
    try {
        await signIn(page, 'dbarnes');
        const row = await openPflRow(page, app);
        fact('enable', await enablePfl(page, row));

        // A. Refused, then "Cancel", then reopen.
        await readPflSettings(page, row, 'nb-a-open');
        await fillPflForm(page, {society: 'u13ojs7 Society', scholar: true, scopusUrl: 'https://www.example.org/u13ojs7'});
        const a = await pressPflOk(page);
        fact('A-ok', {status: a.status, windowOpen: a.windowOpen, errors: a.errors, fields: a.windowOpen ? await readPflFields(page) : null});
        fact('A-cancel', await cancelPfl(page));
        await reopenPflSettings(page, row);
        record('nb-a-reopened', await screen(page)); await shot(page, 'nb-a-reopened');
        fact('A-reopened', await readPflFields(page));

        // B. Valid entries saved, then reopen.
        await fillPflForm(page, {society: 'u13ojs7 Society', scholar: true, scopusUrl: 'https://www.scopus.com/sourceid/12345'});
        const b = await pressPflOk(page);
        const sb = await screen(page); record('nb-b-saved', sb);
        fact('B-ok', {status: b.status, windowOpen: b.windowOpen, notices: sb.notices || null});
        await reopenPflSettings(page, row);
        record('nb-b-reopened', await screen(page)); await shot(page, 'nb-b-reopened');
        fact('B-reopened', await readPflFields(page));
    } finally {
        fact('failures', failures);
        record('nb-facts', facts);
        await close();
    }
});
