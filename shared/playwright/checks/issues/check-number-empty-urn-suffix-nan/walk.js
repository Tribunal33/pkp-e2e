// Issue report docs/issues/U44-A13-check-number-empty-urn-suffix-nan.md (U44 A13): on an item's
// "Identifiers" tab, with the individual URN suffix choice and "Check Number" ticked, "Add Check
// Number" pressed while "URN Suffix" is empty writes "NaN" into the box, where the article's
// (monograph's) "Identifiers" page greys the same button while its box is empty. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS has no
// URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Articles" + "Galleys"
//        (press "Monographs" + "Chapters"), prefix urn:nbn:de:0000-, the individual suffix choice,
//        "Check Number", namespace urn:nbn:de, resolver, "Save"
//   4    OJS submission 1 / OMP book 7: "Identifiers": the URN box empty, "Add Check Number" greyed
//   5    OJS galley "PDF Version 2" / OMP chapter "Introduction": "Identifiers" tab, "URN Suffix" empty
//   6    "Add Check Number"; "Close"
// WALK=neighbour runs alone (fix in and out): steps 1-3 and 5, then "g1" + "Add Check Number"
// (a digit is added), the box emptied (the button's state), "a~b" + "Add Check Number" (recorded).
//
// Reset first:  npm run fleet-prep -- --feature issues-u44i --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-u44i PROBE_AGENT=u44i node bin/probe.js all shared/playwright/checks/issues/check-number-empty-urn-suffix-nan/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44i-3_5 --dataset 9 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44i-3_5 PROBE_AGENT=u44i node bin/probe.js all shared/playwright/checks/issues/check-number-empty-urn-suffix-nan/walk.js
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {flat, setUpUrn, openIdentifiers, openItemTab, closeWindow} = require('../urn-check-digit-from-suffix-only/lib');

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
    /** The tab's button and box as they stand. */
    const readTab = async (win) => ({
        value: await win.urnSuffixBox().inputValue(),
        buttonShown: await win.addCheckNumberButton().isVisible().catch(() => false),
        buttonDisabled: await win.addCheckNumberButton().isDisabled().catch(() => null),
    });
    /** Press the tab's "Add Check Number" when it can be pressed; a greyed one is recorded, not forced. */
    const press = async (win) => {
        const before = await readTab(win);
        if (before.buttonShown && before.buttonDisabled === false) {
            await win.addCheckNumberButton().click();
            await expect(win.urnSuffixBox()).not.toHaveValue(before.value, {timeout: 5_000}).catch(() => {});
        }
        return {before, after: await readTab(win)};
    };
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        fact('3 setup', await setUpUrn(page, app, {kinds: a.kinds, suffix: 'customId', checkNo: true}));

        if (MODE !== 'neighbour') {
            // 4 (control; a page that does not show its URN box is recorded, and the walk goes on)
            try {
                const ids = await openIdentifiers(page, app, frame, a.sid, pubId);
                fact('4 page', {
                    value: await ids.box().inputValue(),
                    buttonDisabled: await ids.addCheckNumberButton().isDisabled().catch(() => null),
                });
            } catch (e) {
                fact('4 page', {error: flat(e.message, 300)});
            }
            await snap('4-page');
        }

        // 5
        const win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
        fact('5 tab', await readTab(win));
        await snap('5-tab');

        if (MODE === 'neighbour') {
            await win.urnSuffixBox().fill('g1');
            fact('nb typed g1', await press(win));
            await win.urnSuffixBox().fill('');
            await win.urnSuffixBox().dispatchEvent('input');
            fact('nb emptied', await readTab(win));
            await win.urnSuffixBox().fill('a~b');
            fact('nb typed a~b', await press(win));
            await snap('nb-tab');
        } else {
            // 6
            fact('6 add check number (tab)', await press(win));
            await snap('6-tab');
        }
        await closeWindow(page, win);
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
