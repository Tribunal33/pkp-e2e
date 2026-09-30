// Kept walk for docs/issues/U44-A6-urn-check-number-wrong-digit.md (spec U44 register A6).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Preconditions, as `rvaca`: Settings › Website › Plugins: tick "URN"; its "Settings": "Articles" and "Galleys"
//     ("Monographs" and "Chapters"), prefix urn:nbn:de:0000-, individual suffix, "Check Number" ticked,
//     namespace urn:nbn:de, resolver; "Save".
//   Individual suffix, as `dbarnes`: OJS submission 5 (OMP 4) "Identifiers": type urn:nbn:de:0000-abc,
//     "Add Check Number", "Save". OJS submission 1's version 2 galley "PDF Version 2" (OMP submission 7's
//     chapter "Introduction"), tab "Identifiers": "URN Suffix" abc, "Add Check Number".
//   Default patterns: `rvaca` switches "URN Suffix" to "Use default patterns."; `dbarnes` presses "Assign" on
//     OJS submission 1's version 2 (OMP submission 7) "Identifiers", then reads the galley's (chapter's)
//     "Identifiers" tab, whose URN the server builds.
// Each digit seen is set beside what the check-digit rule gives over the whole URN and over the suffix alone.
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main): PROBE_FEATURE=issues-r10 PROBE_AGENT=r10 node bin/probe.js all shared/playwright/checks/issues/urn-check-number-wrong-digit/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r10-3_5 PROBE_AGENT=r10 node bin/probe.js all …
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {kinds: ['enablePublicationURN', 'enableRepresentationURN'], typed: 5, other: 1, otherVersion: 2, tab: 'galley', tabName: 'PDF Version 2'},
    omp: {kinds: ['enablePublicationURN', 'enableChapterURN'], typed: 4, other: 7, otherVersion: 1, tab: 'chapter', tabName: 'Introduction'},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${String(++n).padStart(2, '0')}-${x}`;
    const pubOf = async (sid, v) => { const s = await L.readSubmission(page, app, sid); return (s.publications || []).find((p) => p.version === v) || s.publications[s.publications.length - 1]; };
    const openTab = (sid, pid, name) => (cfg.tab === 'galley'
        ? L.openGalleyWindow(page, app, sid, pid, cfg.tabName, name)
        : L.openChapterWindow(page, app, sid, pid, cfg.tabName, name));
    try {
        // Preconditions: the URN plugin on and set up, individual suffix, "Check Number" ticked.
        await L.signIn(page, 'rvaca');
        fact('pre: URN plugin set up', await L.configureUrn(page, app, nm('pre-urn-settings'), {kinds: cfg.kinds, suffix: 'customId', checkNo: true}));
        await signOut(page);

        // 1-3. dbarnes, the submission's "Identifiers".
        await L.signIn(page, 'dbarnes');
        const d = await pubOf(cfg.typed, null);
        const s3 = await L.openIdentifiers(page, app, cfg.typed, d.id, nm('step3-identifiers'));
        fact(`step3: submission ${cfg.typed} Identifiers`, s3);
        if (!s3.found) {
            // OMP stable-3_5_0: the page's URN field fails to render while the book has no URN (a page script error).
            fact('step4-5: not taken', 'no URN field on the page');
        } else {
            // 4. Type the URN, "Add Check Number".
            await L.typeUrn(page, `${L.PREFIX}abc`);
            const s4 = await L.pressFieldButton(page, 'Add Check Number', nm('step4-add-check-number'));
            fact('step4: Add Check Number', {...s4, rule: L.rules(`${L.PREFIX}abc`)});
            // 5. "Save".
            const s5 = await L.pressSave(page, nm('step5-save'));
            fact('step5: Save', {status: s5.status, savedShown: s5.savedShown, storedUrn: s5.storedUrn, errors: s5.errors});
        }

        // 6-7. The other submission's galley (chapter) window, tab "Identifiers": "URN Suffix" abc, "Add Check Number".
        const o = await pubOf(cfg.other, cfg.otherVersion);
        fact(`submission ${cfg.other} version`, o);
        fact(`step6: ${cfg.tab} window`, await openTab(cfg.other, o.id, nm(`step6-${cfg.tab}-window`)));
        fact(`step6: ${cfg.tab} Identifiers tab`, await L.openIdTab(page, nm(`step6-${cfg.tab}-identifiers`)));
        const s7 = await L.tabAddCheckNumber(page, 'abc', nm(`step7-${cfg.tab}-add-check-number`));
        fact('step7: tab Add Check Number', {...s7, rule: L.rules(`${L.PREFIX}abc`)});
        await L.closeTopWin(page);
        await signOut(page);

        // 8. rvaca: "Use default patterns."
        await L.signIn(page, 'rvaca');
        fact('step8: default patterns', await L.configureUrn(page, app, nm('step8-urn-settings'), {kinds: cfg.kinds, suffix: 'default', checkNo: true}));
        await signOut(page);

        // 9. dbarnes: "Assign" on the other submission's "Identifiers".
        await L.signIn(page, 'dbarnes');
        fact(`step9: submission ${cfg.other} Identifiers`, await L.openIdentifiers(page, app, cfg.other, o.id, nm('step9-identifiers')));
        const s9 = await L.pressFieldButton(page, 'Assign', nm('step9-assign'));
        fact('step9: Assign', {...s9, rule: s9.after ? L.rules(s9.after.slice(0, -1)) : null});

        // 10. The galley's (chapter's) "Identifiers" tab: the URN the server builds.
        await openTab(cfg.other, o.id, nm(`step10-${cfg.tab}-window`));
        const t10 = await L.openIdTab(page, nm(`step10-${cfg.tab}-identifiers`));
        const preview = (t10.paragraphs || []).find((p) => p.startsWith(L.PREFIX)) || null;
        fact('step10: tab preview', {preview, paragraphs: t10.paragraphs, rule: preview ? L.rules(preview.slice(0, -1)) : null});
        await L.closeTopWin(page);
        await signOut(page);
    } finally {
        record('w-facts', facts);
        await close();
    }
});
