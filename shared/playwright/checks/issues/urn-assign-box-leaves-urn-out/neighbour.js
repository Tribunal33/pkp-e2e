// Neighbour check for docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md: what the fix must leave alone.
// On a fresh load of PKP's default test dataset, with the URN plugin set up as the report's step 1 says:
//   - `dbarnes` opens OJS submission 1's version 2 galley "PDF Version 2" (OMP submission 4's chapter
//     "Introduction: Contexts of Popular Culture"), "Identifiers": the box as it reads;
//   - "Save" with the box ticked: the URN is assigned, and it is the one the box names (with the fix) and the
//     preview shows;
//   - the tab reopened shows the stored URN, "The URN is assigned to this galley." and "Clear", with no box.
// The stored value is read from the item's settings table (read only).
// Run (main): PROBE_RUN=nb PROBE_FEATURE=issues-r25 PROBE_AGENT=r25 node bin/probe.js all shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/neighbour.js
//   with the fix applied: PROBE_RUN=nbfix …
const {forEachApp, launch, signOut, record, sql} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {sid: 1, version: 2, kinds: ['enableIssueURN', 'enableRepresentationURN'], kind: 'galley', label: 'PDF Version 2',
        table: ['publication_galley_settings', 'galley_id']},
    omp: {sid: 4, version: null, kinds: ['enablePublicationURN', 'enableChapterURN', 'enableRepresentationURN'], kind: 'chapter',
        label: 'Introduction: Contexts of Popular Culture', table: ['submission_chapter_settings', 'chapter_id']},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    if (!app.dataset) throw new Error('neighbour.js drives a dataset fleet (fleet-prep --dataset)');
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `n-${String(++n).padStart(2, '0')}-${x}`;
    const pid = L.pubIdOf(app, cfg.sid, cfg.version);
    const stored = () => sql(app, `select ${cfg.table[1]} || '=' || setting_value from ${cfg.table[0]} where setting_name = 'pub-id::other::urn' order by 1`).split('\n').filter(Boolean);
    const open = (name) => (cfg.kind === 'galley' ? L.openGalleyWindow(page, app, cfg.sid, pid, cfg.label, name)
        : L.openChapterWindow(page, app, cfg.sid, pid, cfg.label, name));
    try {
        await L.signIn(page, 'rvaca');
        fact('setup: URN settings, default patterns', {saveStatus: (await L.configureUrn(page, app, nm('setup-urn'), {kinds: cfg.kinds, suffix: 'default', checkNo: false})).saveStatus});
        await signOut(page);
        await L.signIn(page, 'dbarnes');
        await open(nm(`${cfg.kind}-window`));
        const before = await L.openIdTab(page, nm(`${cfg.kind}-identifiers`));
        fact('tab before', {preview: (before.paragraphs || [])[0], box: before.assignBox});
        fact('Save, box ticked', {...(await L.saveTab(page, nm('save'))), stored: stored()});
        await open(nm(`${cfg.kind}-reopen`));
        const after = await L.openIdTab(page, nm(`${cfg.kind}-identifiers-reopened`));
        fact('tab reopened', {paragraphs: after.paragraphs, clearLink: after.clearLink, box: after.assignBox});
        const named = before.assignBox ? (before.assignBox.shown.match(/urn:\S+/) || [null])[0] : null;
        const kept = stored().map((s) => s.split('=').slice(1).join('='));
        fact('verdict', {boxNames: named, preview: (before.paragraphs || [])[0], stored: kept,
            storedIsPreview: kept.includes((before.paragraphs || [])[0]), storedIsNamed: named ? kept.includes(named) : null,
            assignedStateWithoutBox: !!after.clearLink && !after.assignBox});
        await L.closeTopWin(page);
        await signOut(page);
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await L.snap(page, nm('error')).catch(() => {});
    } finally {
        record('n-facts', facts);
        await close();
    }
});
