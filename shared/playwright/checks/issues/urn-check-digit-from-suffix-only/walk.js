// Issue report docs/issues/U44-A6-urn-check-digit-from-suffix-only.md (U44 A6): with "Check Number"
// ticked, the digit "Assign" (article/monograph "Identifiers" page) and "Add Check Number" (that page
// and an item's "Identifiers" tab) append is worked out from the URN's suffix alone, while the URNs the
// server builds itself (a tab's preview) get the whole URN's digit. Takes the report's Steps on PKP's
// default test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS has no URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Articles" + "Galleys"
//        (press "Monographs" + "Chapters"), prefix urn:nbn:de:0000-, default patterns, "Check Number",
//        namespace urn:nbn:de, resolver, "Save"
//   4-5  OJS submission 1 (version 1.1) / OMP book 7: "Identifiers", "Assign"
//   6    OJS galley "PDF Version 2" / OMP chapter "Introduction": "Identifiers" tab, the URN preview; "Close"
//   7    URN "Settings": the individual suffix choice, "Save"
//   8    "Identifiers": type urn:nbn:de:0000-abc, "Add Check Number"
//   9    the galley's / chapter's tab: "URN Suffix" abc, "Add Check Number"; "Close"
// WALK=neighbour runs alone (fix in and out): steps 1-6 with "Check Number" unticked: no digit anywhere.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44d --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u44d PROBE_AGENT=u44d node bin/probe.js all shared/playwright/checks/issues/urn-check-digit-from-suffix-only/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44d-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44d-3_5 PROBE_AGENT=u44d node bin/probe.js all shared/playwright/checks/issues/urn-check-digit-from-suffix-only/walk.js
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {PREFIX, flat, digits, setUpUrn, openIdentifiers, openItemTab, readUrnArea, closeWindow} = require('./lib');

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

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        const checkNo = MODE !== 'neighbour';
        fact('3 setup', await setUpUrn(page, app, {kinds: a.kinds, suffix: 'default', checkNo}));

        // 4-5
        let ids = await openIdentifiers(page, app, frame, a.sid, pubId);
        const before = await ids.box().inputValue();
        let assigned = null;
        if (await ids.assignButton().isVisible().catch(() => false)) {
            await ids.assignButton().click();
            await expect(ids.box()).not.toHaveValue(before, {timeout: 10_000}).catch(() => {});
            assigned = await ids.box().inputValue();
        }
        const missing = assigned ? null : flat(await ids.field().innerText().catch(() => ''), 300);
        const base = assigned ? (checkNo ? assigned.slice(0, -1) : assigned) : null;
        fact('5 assign', {publication: pubId, before, assigned, missing, digitShown: checkNo && assigned ? assigned.slice(-1) : null, rule: base ? digits(base) : null});
        await snap('5-assign');

        // 6
        let win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
        const area = await readUrnArea(win);
        const pbase = area.urn ? (checkNo ? area.urn.slice(0, -1) : area.urn) : null;
        fact('6 tab preview', {...area, digitShown: checkNo && area.urn ? area.urn.slice(-1) : null, rule: pbase ? digits(pbase) : null});
        await snap('6-tab-preview');
        await closeWindow(page, win);

        if (MODE === 'neighbour') {
            fact('neighbour verdict', {assignHasNoDigit: assigned === base, previewHasNoDigit: area.urn === pbase, assigned, preview: area.urn});
            return;
        }

        // 7
        fact('7 setup individual', await setUpUrn(page, app, {kinds: [], suffix: 'customId', checkNo: true}));

        // 8 (a page that does not show its URN box is recorded, and the walk goes on to step 9)
        try {
            ids = await openIdentifiers(page, app, frame, a.sid, pubId);
            await ids.box().fill(`${PREFIX}abc`);
            await ids.addCheckNumberButton().click();
            await expect(ids.box()).not.toHaveValue(`${PREFIX}abc`, {timeout: 10_000}).catch(() => {});
            const typed = await ids.box().inputValue();
            fact('8 add check number (page)', {value: typed, digitShown: typed.slice(-1), rule: digits(`${PREFIX}abc`)});
            await snap('8-add-check-number-page');
        } catch (e) {
            fact('8 add check number (page)', {error: flat(e.message, 300), digitShown: null});
            await snap('8-add-check-number-page');
        }

        // 9
        win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
        await win.urnSuffixBox().fill('abc');
        await win.addCheckNumberButton().click();
        await expect(win.urnSuffixBox()).not.toHaveValue('abc', {timeout: 10_000}).catch(() => {});
        const suffix = await win.urnSuffixBox().inputValue();
        fact('9 add check number (tab)', {value: suffix, digitShown: suffix.slice(-1), rule: digits(`${PREFIX}abc`)});
        await snap('9-add-check-number-tab');
        await closeWindow(page, win);

        fact('verdict', {
            assign: facts['5 assign'].digitShown,
            assignWhole: facts['5 assign'].rule && facts['5 assign'].rule.whole,
            preview: facts['6 tab preview'].digitShown,
            previewWhole: facts['6 tab preview'].rule && facts['6 tab preview'].rule.whole,
            page: facts['8 add check number (page)'].digitShown,
            tab: facts['9 add check number (tab)'].digitShown,
            whole: digits(`${PREFIX}abc`).whole,
        });
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
