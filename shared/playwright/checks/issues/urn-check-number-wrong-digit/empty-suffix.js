// Kept walk for U44 A13, joined to docs/issues/U44-A6-urn-check-number-wrong-digit.md ("Add Check Number" with
// nothing after the prefix). On a fresh load of PKP's default test dataset, through the screens:
//   Preconditions, as `rvaca`: the URN plugin as in walk.js (individual suffix, "Check Number" ticked).
//   The tab, as `dbarnes`: OJS submission 1's version 2 galley "PDF Version 2" (OMP submission 7's chapter
//     "Introduction"), tab "Identifiers": "URN Suffix" left empty, "Add Check Number"; then "g1", "Add Check Number".
//   The page: OJS submission 5 (OMP 4) "Identifiers": the button with "URN" empty; then the prefix alone typed,
//     "Add Check Number".
// Records every screen with screen(); prints one line per step. No assertions: the script records.
// Run (main): PROBE_FEATURE=issues-r29 PROBE_AGENT=r29 node bin/probe.js all shared/playwright/checks/issues/urn-check-number-wrong-digit/empty-suffix.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r29-3_5 PROBE_AGENT=r29 node bin/probe.js all …
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {kinds: ['enablePublicationURN', 'enableRepresentationURN'], page: 5, other: 1, otherVersion: 2, tab: 'galley', tabName: 'PDF Version 2'},
    omp: {kinds: ['enablePublicationURN', 'enableChapterURN'], page: 4, other: 7, otherVersion: 1, tab: 'chapter', tabName: 'Introduction'},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('e-facts', facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `e-${String(++n).padStart(2, '0')}-${x}`;
    const pubOf = async (sid, v) => { const s = await L.readSubmission(page, app, sid); return (s.publications || []).find((p) => p.version === v) || s.publications[s.publications.length - 1]; };
    try {
        // Preconditions.
        await L.signIn(page, 'rvaca');
        fact('pre: URN plugin set up', await L.configureUrn(page, app, nm('pre-urn-settings'), {kinds: cfg.kinds, suffix: 'customId', checkNo: true}));
        await signOut(page);

        // 1-2. dbarnes, the galley's (chapter's) window, tab "Identifiers".
        await L.signIn(page, 'dbarnes');
        const o = await pubOf(cfg.other, cfg.otherVersion);
        fact(`submission ${cfg.other} version`, o);
        fact(`step2: ${cfg.tab} window`, cfg.tab === 'galley'
            ? await L.openGalleyWindow(page, app, cfg.other, o.id, cfg.tabName, nm('step2-galley-window'))
            : await L.openChapterWindow(page, app, cfg.other, o.id, cfg.tabName, nm('step2-chapter-window')));
        const t2 = await L.openIdTab(page, nm(`step2-${cfg.tab}-identifiers`));
        fact('step2: tab', t2);
        const f = L.topWin(page).locator('#publicIdentifiersForm').first();
        const button = f.getByRole('button', {name: 'Add Check Number'}).first();
        fact('step2: button with the box empty', {offered: (await button.count()) > 0, enabled: await button.isEnabled().catch(() => null), suffix: await f.locator('input[name="urnSuffix"]').inputValue().catch(() => null)});

        // 3. "URN Suffix" left empty, "Add Check Number".
        const s3 = await L.tabAddCheckNumber(page, '', nm(`step3-${cfg.tab}-empty-add-check-number`));
        fact('step3: empty suffix, Add Check Number', s3);

        // 4. Control: "g1", "Add Check Number".
        const s4 = await L.tabAddCheckNumber(page, 'g1', nm(`step4-${cfg.tab}-g1-add-check-number`));
        fact('step4: g1, Add Check Number', {...s4, rule: L.rules(`${L.PREFIX}g1`)});
        await L.closeTopWin(page);

        // 5. The submission's "Identifiers" page.
        const d = await pubOf(cfg.page, null);
        const s5 = await L.openIdentifiers(page, app, cfg.page, d.id, nm('step5-identifiers'));
        fact(`step5: submission ${cfg.page} Identifiers`, s5);
        if (!s5.found) {
            // OMP stable-3_5_0: the page's URN field fails to render while the book has no URN (U44 A6's Evidence).
            fact('step6-7: not taken', 'no URN field on the page');
        } else {
            // 6. Control: the button with "URN" empty.
            const pb = L.wf(page).locator('.pkpFormField').filter({hasText: 'URN'}).first().getByRole('button', {name: 'Add Check Number', exact: true});
            fact('step6: page button with the box empty', {offered: (await pb.count()) > 0, enabled: await pb.isEnabled().catch(() => null), value: await L.urnInputValue(page)});
            // 7. The prefix alone, "Add Check Number".
            await L.typeUrn(page, L.PREFIX);
            const s7 = await L.pressFieldButton(page, 'Add Check Number', nm('step7-prefix-alone-add-check-number'));
            fact('step7: prefix alone, Add Check Number', {...s7, wholeUrnDigit: L.digit(L.PREFIX)});
        }
        await signOut(page);
    } finally {
        record('e-facts', facts);
        await close();
    }
});
