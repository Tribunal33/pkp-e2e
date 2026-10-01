// Kept walk for docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md (spec U44 register A7).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   1  `rvaca`: Settings › Website › Plugins: tick "URN"; its "Settings": OJS "Issues" and "Galleys" (OMP
//      "Monographs", "Chapters" and "Publication Formats"), prefix urn:nbn:de:0000-, "Use default patterns.",
//      namespace urn:nbn:de, resolver; "Save".
//   2  `dbarnes`: OJS submission 1's version 2 galley "PDF Version 2" (OMP submission 4's chapter
//      "Introduction: Contexts of Popular Culture"), "Edit" › "Identifiers": the preview and the assign box.
//   3  OJS: Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Edit" › "Identifiers".
//      OMP: "Publication Formats" › "Add publication format" "u44r25 PDF"; its "Edit" › "Identifiers".
//   4  Control: OJS that issue's "Publish Issue" (OMP the format's "Awaiting Approval" › "Format Approval"):
//      the same box in the confirmation window; "Cancel".
//   5  `rvaca`: the URN "Settings": "Enter an individual URN suffix for each published item…"; "Save".
//   6  `dbarnes`: the galley's (chapter's) "Identifiers": "URN Suffix" u44r25, "Save"; reopen the tab.
//      Steps 5-6 are the state the fix leaves as it is (the box there keeps no URN): with fix.diff applied the
//      walk shows steps 2-3 naming the URN and steps 4 and 6 unchanged.
// Each read records the box's label as shown and as the page holds it. No assertions: the script records.
// Run (main): PROBE_FEATURE=issues-r25 PROBE_AGENT=r25 node bin/probe.js all shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r25-3_5 PROBE_AGENT=r25 node bin/probe.js all …
//   With the fix applied (bin/try-fix.js), PROBE_RUN=fix keeps the records apart.
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {sid: 1, version: 2, kinds: ['enableIssueURN', 'enableRepresentationURN'], tab: {kind: 'galley', label: 'PDF Version 2'},
        second: {kind: 'issue', label: 'Vol. 2 No. 1 (2015)'}},
    omp: {sid: 4, version: null, kinds: ['enablePublicationURN', 'enableChapterURN', 'enableRepresentationURN'],
        tab: {kind: 'chapter', label: 'Introduction: Contexts of Popular Culture'}, second: {kind: 'format', label: 'u44r25 PDF'}},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('w-facts', facts); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${String(++n).padStart(2, '0')}-${x}`;
    const pid = L.pubIdOf(app, cfg.sid, cfg.version);
    fact('publication', {sid: cfg.sid, version: cfg.version, pid});
    const openTab = (name) => (cfg.tab.kind === 'galley' ? L.openGalleyWindow(page, app, cfg.sid, pid, cfg.tab.label, name)
        : L.openChapterWindow(page, app, cfg.sid, pid, cfg.tab.label, name));
    const openSecond = (name) => (cfg.second.kind === 'issue' ? L.openIssueWindow(page, app, cfg.second.label, name)
        : L.openFormatWindow(page, app, cfg.sid, pid, cfg.second.label, name));
    try {
        // 1
        await L.signIn(page, 'rvaca');
        fact('step1: URN settings, default patterns', await L.configureUrn(page, app, nm('step1-urn'), {kinds: cfg.kinds, suffix: 'default', checkNo: false}));
        await signOut(page);
        // 2
        await L.signIn(page, 'dbarnes');
        await openTab(nm(`step2-${cfg.tab.kind}-window`));
        fact(`step2: ${cfg.tab.kind} Identifiers`, await L.openIdTab(page, nm(`step2-${cfg.tab.kind}-identifiers`)));
        await L.closeTopWin(page);
        // 3
        if (cfg.second.kind === 'format') fact('step3: Add publication format', await L.addFormat(page, app, cfg.sid, pid, cfg.second.label, nm('step3-format-add')));
        await openSecond(nm(`step3-${cfg.second.kind}-window`));
        fact(`step3: ${cfg.second.kind} Identifiers`, await L.openIdTab(page, nm(`step3-${cfg.second.kind}-identifiers`)));
        await L.closeTopWin(page);
        // 4 (control)
        fact(`step4: control, ${cfg.second.kind === 'issue' ? 'Publish Issue' : 'Format Approval'}`, cfg.second.kind === 'issue'
            ? await L.publishIssue(page, app, cfg.second.label, nm('step4-publish-issue'))
            : await L.formatApproval(page, app, cfg.sid, pid, cfg.second.label, nm('step4-format-approval')));
        await signOut(page);
        // 5
        await L.signIn(page, 'rvaca');
        fact('step5: URN settings, individual suffix', await L.configureUrn(page, app, nm('step5-urn'), {kinds: cfg.kinds, suffix: 'customId', checkNo: false}));
        await signOut(page);
        // 6
        await L.signIn(page, 'dbarnes');
        await openTab(nm(`step6-${cfg.tab.kind}-window`));
        fact(`step6: ${cfg.tab.kind} Identifiers before`, await L.openIdTab(page, nm(`step6-${cfg.tab.kind}-identifiers`)));
        fact('step6: URN Suffix u44r25, Save', await L.saveTab(page, nm('step6-save'), 'u44r25'));
        await openTab(nm(`step6-${cfg.tab.kind}-reopen`));
        fact(`step6: ${cfg.tab.kind} Identifiers reopened`, await L.openIdTab(page, nm(`step6-${cfg.tab.kind}-identifiers-reopened`)));
        await L.closeTopWin(page);
        await signOut(page);
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await L.snap(page, nm('error')).catch(() => {});
    } finally {
        record('w-facts', facts);
        await close();
    }
});
