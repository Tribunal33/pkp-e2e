// Neighbour checks for docs/issues/U44-A14-cleared-urn-stays-on-tab.md, on a fresh load of PKP's default test dataset.
// The paths the fix must leave alone or must also cover:
//   Galley (OJS; OMP: the chapter): "Save" assigns; reopen; "Clear" › "Cancel" keeps the URN and the tab as it was;
//     "Clear" › "OK"; then "Save" on the tab as it now stands, and reopen (the redrawn form still saves).
//   Issue (OJS): URN on for "Issues" too. Issues › Future Issues › "Vol. 2 No. 1 (2015)" › "Edit" › "Identifiers":
//     "Save" assigns; reopen; "Clear" › "OK" (open-access journal, "Identifiers" the last tab).
//     Then Settings › Distribution › "Access": "The journal will require subscriptions…", "Save" (adds an
//     "Access" tab after "Identifiers"); the same assign and "Clear" › "OK" on the issue.
// Run (main): PROBE_FEATURE=issues-r24 PROBE_AGENT=r24 node bin/probe.js all shared/playwright/checks/issues/cleared-urn-stays-on-tab/neighbour.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r24-3_5 PROBE_AGENT=r24 node bin/probe.js all …
const {forEachApp, launch, signOut, record} = require('../../../probe');
const L = require('./lib');

const APPS = {
    ojs: {sid: 1, version: 2, kinds: ['enableIssueURN', 'enablePublicationURN', 'enableRepresentationURN'],
        item: {kind: 'galley', label: 'PDF Version 2'}, issue: 'Vol. 2 No. 1 (2015)'},
    omp: {sid: 4, version: null, kinds: ['enablePublicationURN', 'enableChapterURN'],
        item: {kind: 'chapter', label: 'Introduction: Contexts of Popular Culture'}},
};

forEachApp(async (app) => {
    const cfg = APPS[app.name];
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!cfg) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    if (!app.dataset) throw new Error('neighbour.js drives a dataset fleet (fleet-prep --dataset)');
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `n-${String(++n).padStart(2, '0')}-${x}`;
    const pid = L.pubIdOf(app, cfg.sid, cfg.version);
    const item = cfg.item;
    const open = (name) => (item.kind === 'galley' ? L.openGalleyWindow(page, app, cfg.sid, pid, item.label, name)
        : L.openChapterWindow(page, app, cfg.sid, pid, item.label, name));
    const k = item.kind;
    async function issueRound(tag) {
        fact(`${tag}: window`, await L.openIssueWindow(page, app, cfg.issue, nm(`${tag}-window`)));
        fact(`${tag}: Identifiers`, await L.openIdTab(page, nm(`${tag}-identifiers`)));
        fact(`${tag}: Save`, {...(await L.saveTab(page, nm(`${tag}-save`))), stored: L.storedUrns(app, 'issue')});
        await L.openIssueWindow(page, app, cfg.issue, nm(`${tag}-window2`));
        fact(`${tag}: Identifiers again`, await L.openIdTab(page, nm(`${tag}-identifiers2`)));
        fact(`${tag}: Clear › OK`, {...(await L.clearUrn(page, 'ok', nm(`${tag}-clear`))), stored: L.storedUrns(app, 'issue')});
        await L.closeTopWin(page);
    }
    try {
        await L.signIn(page, 'rvaca');
        fact('setup: URN plugin', await L.configureUrn(page, app, nm('setup-urn'), {kinds: cfg.kinds, suffix: 'default', checkNo: false}));
        await signOut(page);
        await L.signIn(page, 'dbarnes');

        // N1-N3: the item
        await open(nm(`${k}-window`));
        await L.openIdTab(page, nm(`${k}-identifiers`));
        fact(`N1 ${k}: Save (assign)`, {...(await L.saveTab(page, nm(`${k}-save`))), stored: L.storedUrns(app, k)});
        await open(nm(`${k}-window2`));
        fact(`N1 ${k}: Identifiers`, await L.openIdTab(page, nm(`${k}-identifiers2`)));
        fact(`N2 ${k}: Clear › Cancel`, {...(await L.clearUrn(page, 'cancel', nm(`${k}-clear-cancel`))), stored: L.storedUrns(app, k)});
        fact(`N3 ${k}: Clear › OK`, {...(await L.clearUrn(page, 'ok', nm(`${k}-clear-ok`))), stored: L.storedUrns(app, k)});
        fact(`N3 ${k}: Save on the tab as it stands`, {...(await L.saveTab(page, nm(`${k}-save-after-clear`))), stored: L.storedUrns(app, k)});
        await L.closeTopWin(page);
        await open(nm(`${k}-window3`));
        fact(`N3 ${k}: reopened`, await L.openIdTab(page, nm(`${k}-identifiers3`)));
        await L.closeTopWin(page);

        if (cfg.issue) {
            // N4: the issue, open-access journal
            await issueRound('N4 issue open access');
            // N5: the issue, subscription journal
            await signOut(page);
            await L.signIn(page, 'rvaca');
            fact('N5: publishing mode', await L.setPublishingMode(page, app, 'The journal will require subscriptions to access some or all of its contents.', nm('access-subscription')));
            await signOut(page);
            await L.signIn(page, 'dbarnes');
            await issueRound('N5 issue subscription');
        }
        await signOut(page);
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await L.snap(page, nm('error')).catch(() => {});
    } finally {
        record('n-facts', facts);
        await close();
    }
});
