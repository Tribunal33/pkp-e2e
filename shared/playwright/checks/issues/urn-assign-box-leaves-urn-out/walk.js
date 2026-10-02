// Issue report docs/issues/U44-A7-urn-assign-box-leaves-urn-out.md (U44 A7): on an item's
// "Identifiers" tab the ticked box that assigns the URN reads "Assign the URN  to this galley"
// (chapter, …), the URN left out, while the same box in "Publish Issue" names it. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP
// (OPS has no URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Articles" + "Galleys"
//        (press "Monographs" + "Chapters"), prefix urn:nbn:de:0000-, default patterns, no check
//        number, namespace urn:nbn:de, resolver, "Save"
//   4-5  OJS submission 1, galley "PDF Version 2" / OMP book 7, chapter "Introduction":
//        "Identifiers" tab, the URN area and its box; "Close"
//   6    URN "Settings": the individual suffix choice, "Save"
//   7    the same tab: "URN Suffix" u44k, "Save"
//   8    the tab again: the URN area and its box; "Close"
// WALK=neighbour runs alone (fix in and out): steps 1-3 with the individual suffix, 7, then the tab:
// "URN Suffix" changed to u44k2, "Save" with the box ticked; the tab again: the URN assigned.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44k --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u44k PROBE_AGENT=u44k node bin/probe.js all shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44k-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44k-3_5 PROBE_AGENT=u44k node bin/probe.js all shared/playwright/checks/issues/urn-assign-box-leaves-urn-out/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {flat, setUpUrn, openItemTab, readUrnArea, closeWindow} = require('../urn-check-digit-from-suffix-only/lib');
const {readAssignBox} = require('./lib');

const MODE = process.env.WALK || 'walk';
const APP = {
    ojs: {kinds: ['Articles', 'Galleys'], sid: 1, item: 'PDF Version 2'},
    omp: {kinds: ['Monographs', 'Chapters'], sid: 7, item: 'Introduction'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    if (!a) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const snap = async (label) => record(name(label), await screen(page));
    // A read for the facts, not a step: the version the workflow opens on (the newest).
    const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${a.sid}`).trim());
    const readTab = async (label) => {
        const win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
        const area = await readUrnArea(win);
        const box = await readAssignBox(win);
        fact(label, {area, box, urnNamed: box.present ? (box.text.match(/urn:\S+/i) || [null])[0] : null});
        await snap(label.replace(/\s+/g, '-'));
        return win;
    };

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        const first = MODE === 'neighbour' ? 'customId' : 'default';
        fact('3 setup', await setUpUrn(page, app, {kinds: a.kinds, suffix: first, checkNo: false}));

        if (MODE !== 'neighbour') {
            // 4-5
            const win = await readTab('4 pattern tab');
            await closeWindow(page, win);
            // 6
            fact('6 setup individual', await setUpUrn(page, app, {kinds: [], suffix: 'customId', checkNo: false}));
        }

        // 7
        let win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
        await win.urnSuffixBox().fill('u44k');
        await win.save();

        // 8
        win = await readTab('8 suffix tab');
        if (MODE !== 'neighbour') {
            await closeWindow(page, win);
            fact('verdict', {
                pattern: facts['4 pattern tab'].box,
                suffix: facts['8 suffix tab'].box,
                patternUrnNamed: facts['4 pattern tab'].urnNamed,
                suffixUrnNamed: facts['8 suffix tab'].urnNamed,
            });
            return;
        }

        // neighbour: change the suffix and save with the box ticked as it arrived
        try {
            await win.urnSuffixBox().fill('u44k2');
            const ticked = await win.assignBox().isChecked();
            await win.save();
            win = await readTab('n stored');
            await closeWindow(page, win);
            fact('neighbour verdict', {boxTickedOnSave: ticked, labelNamedBefore: facts['8 suffix tab'].urnNamed, assigned: facts['n stored'].area.urn});
        } catch (e) {
            fact('neighbour error', flat(e.message, 400));
            await snap('n-error');
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
