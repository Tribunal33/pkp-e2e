// Neighbour check for docs/issues/U44-A6-urn-check-number-wrong-digit.md: what the fix must leave alone.
// With "Check Number" NOT ticked, "Assign" fills the URN without any digit and the galley's (chapter's) tab
// previews it without one; the individual-suffix box offers no "Add Check Number". Run with the fix in and out,
// each time on a fresh load of the default dataset.
//   Preconditions, as `rvaca`: the URN plugin with "Articles" and "Galleys" ("Monographs" and "Chapters"),
//     prefix urn:nbn:de:0000-, "Use default patterns.", "Check Number" not ticked; "Save".
//   As `dbarnes`: OJS submission 1's version 2 (OMP submission 7) "Identifiers", "Assign"; the galley
//     "PDF Version 2" (chapter "Introduction") "Identifiers" tab. Then `rvaca` switches to the individual
//     suffix (still no "Check Number") and `dbarnes` reads OJS submission 5's (OMP 4's) URN field buttons.
// Run: PROBE_FEATURE=issues-r10 PROBE_AGENT=r10 node bin/probe.js all shared/playwright/checks/issues/urn-check-number-wrong-digit/neighbour.js
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {kinds: ['enablePublicationURN', 'enableRepresentationURN'], typed: 5, other: 1, otherVersion: 2, tab: 'galley', tabName: 'PDF Version 2'},
    omp: {kinds: ['enablePublicationURN', 'enableChapterURN'], typed: 4, other: 7, otherVersion: 1, tab: 'chapter', tabName: 'Introduction'},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `n-${String(++n).padStart(2, '0')}-${x}`;
    const pubOf = async (sid, v) => { const s = await L.readSubmission(page, app, sid); return (s.publications || []).find((p) => p.version === v) || s.publications[s.publications.length - 1]; };
    try {
        await L.signIn(page, 'rvaca');
        fact('pre: default patterns, no Check Number', await L.configureUrn(page, app, nm('pre-urn-settings'), {kinds: cfg.kinds, suffix: 'default', checkNo: false}));
        await signOut(page);

        await L.signIn(page, 'dbarnes');
        const o = await pubOf(cfg.other, cfg.otherVersion);
        await L.openIdentifiers(page, app, cfg.other, o.id, nm('identifiers'));
        const a = await L.pressFieldButton(page, 'Assign', nm('assign'));
        fact('Assign without Check Number', {...a, expected: cfg.tab === 'galley' ? `${L.PREFIX}jpkjpk.v1i2.1` : `${L.PREFIX}jpk.7`});
        if (cfg.tab === 'galley') await L.openGalleyWindow(page, app, cfg.other, o.id, cfg.tabName, nm('galley-window'));
        else await L.openChapterWindow(page, app, cfg.other, o.id, cfg.tabName, nm('chapter-window'));
        const t = await L.openIdTab(page, nm('tab-identifiers'));
        fact('tab preview without Check Number', {preview: (t.paragraphs || []).find((p) => p.startsWith(L.PREFIX)) || null});
        await L.closeTopWin(page);
        await signOut(page);

        await L.signIn(page, 'rvaca');
        await L.configureUrn(page, app, nm('individual-urn-settings'), {kinds: cfg.kinds, suffix: 'customId', checkNo: false});
        await signOut(page);
        await L.signIn(page, 'dbarnes');
        const d = await pubOf(cfg.typed, null);
        const f = await L.openIdentifiers(page, app, cfg.typed, d.id, nm('typed-identifiers'));
        const buttons = await page.locator('[role="dialog"]:visible').first().locator('.pkpFormField').filter({hasText: 'URN'}).first().getByRole('button').allInnerTexts().catch(() => []);
        fact('individual suffix without Check Number: the field', {found: f.found, buttons});
        await signOut(page);
    } finally {
        record('n-facts', facts);
        await close();
    }
});
