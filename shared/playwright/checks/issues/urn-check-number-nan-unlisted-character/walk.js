// Issue report docs/issues/U44-A15-urn-check-number-nan-unlisted-character.md (U44 A15): with an
// individual URN suffix and "Check Number" ticked, "Add Check Number" on a suffix holding a
// character outside the check-digit conversion table ("~") appends "NaN"; "Save" keeps it. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS
// has no URN plugin):
//   1-3  sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Articles" + "Galleys"
//        (press "Monographs" + "Chapters"), prefix urn:nbn:de:0000-, the individual suffix choice,
//        "Check Number", namespace urn:nbn:de, resolver, "Save"
//   4    OJS submission 1, galley "PDF Version 2" / OMP book 7, chapter "Introduction": "Identifiers" tab
//   5    "URN Suffix" a~b, "Add Check Number"
//   6    "Save"; the tab again: the box and the URN area; "Close"
//   7    Publication › "Identifiers": "URN" urn:nbn:de:0000-a~b, "Add Check Number" (not saved)
// WALK=neighbour runs alone (fix in and out): the same steps with "ab" in place of "a~b" (a suffix of
// table characters only), so the digit it gets can be compared with the fix in and out.
//
// Reset first:  npm run fleet-prep -- --feature issues-h19m --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-h19m PROBE_AGENT=h19m node bin/probe.js all shared/playwright/checks/issues/urn-check-number-nan-unlisted-character/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h19m-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19m-3_5 PROBE_AGENT=h19m node bin/probe.js all shared/playwright/checks/issues/urn-check-number-nan-unlisted-character/walk.js
const {expect} = require('@playwright/test');
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {PREFIX, flat, digits, setUpUrn, openIdentifiers, openItemTab, readUrnArea, closeWindow} = require('./lib');

const MODE = process.env.WALK || 'walk';
const SUFFIX = MODE === 'neighbour' ? 'ab' : 'a~b';
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
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, suffix: SUFFIX};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const snap = async (label) => record(name(label), await screen(page));
    // A read for the facts, not a step: the version the workflow opens on (the newest).
    const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${a.sid}`).trim());
    // For the facts only: the digits the algorithm gives over the table characters (a skipped "~").
    fact('reference digits (table characters only)', digits(PREFIX + SUFFIX.replace(/~/g, '')));

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    /** Press an "Add Check Number" when it can be pressed and read the box after; a greyed one is recorded. */
    const press = async (button, box) => {
        const before = await box.inputValue();
        const disabled = await button.isDisabled().catch(() => null);
        if (disabled === false) {
            await button.click();
            await expect(box).not.toHaveValue(before, {timeout: 5_000}).catch(() => {});
        }
        return {before, disabled, after: await box.inputValue()};
    };
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        fact('3 setup', await setUpUrn(page, app, {kinds: a.kinds, suffix: 'customId', checkNo: true}));

        // 4-5
        let win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
        await win.urnSuffixBox().fill(SUFFIX);
        fact('5 tab add check number', await press(win.addCheckNumberButton(), win.urnSuffixBox()));
        await snap('5-tab');

        // 6
        try {
            await win.save();
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            fact('6 tab after save', {suffixBox: await win.urnSuffixBox().inputValue().catch(() => null), area: await readUrnArea(win)});
            await snap('6-tab-saved');
            await closeWindow(page, win);
        } catch (e) {
            fact('6 error', flat(e.message, 400));
            await snap('6-error');
            await closeWindow(page, win).catch(() => {});
        }
        fact('6 stored (read)', sql(app, `select setting_value from ${app.name === 'ojs' ? 'publication_galley_settings' : 'submission_chapter_settings'} where setting_name like 'pub-id::%urn%' or setting_name = 'urnSuffix'`).trim());

        // 7
        try {
            const ids = await openIdentifiers(page, app, frame, a.sid, pubId);
            await ids.box().fill(PREFIX + SUFFIX);
            fact('7 page add check number', await press(ids.addCheckNumberButton(), ids.box()));
        } catch (e) {
            fact('7 error', flat(e.message, 400));
        }
        await snap('7-page');
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
