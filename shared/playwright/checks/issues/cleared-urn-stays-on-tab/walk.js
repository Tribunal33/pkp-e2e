// Issue report docs/issues/U44-A14-cleared-urn-stays-on-tab.md (U44 A14): after "Clear" › "OK" on a
// galley's (OJS) or a chapter's (OMP) "Identifiers" tab the URN is removed, but the tab keeps showing
// it with "The URN is assigned to this …" and "Clear" until the window is opened again; an issue's
// tab redraws, but only while "Identifiers" is the window's last tab. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), as `dbarnes` (OPS has no URN plugin):
//   1-3   sign in; Settings › Website › Plugins: "URN" enabled; "Settings": "Issues" + "Galleys"
//         (press "Monographs" + "Chapters"), prefix urn:nbn:de:0000-, default patterns, namespace, resolver, "Save"
//   4-8   OJS submission 1 galley "PDF Version 2" / OMP submission 7 chapter "Introduction":
//         "Identifiers", "Save"; again: the URN stored; "Clear" › "OK"; the tab; closed and reopened
//   control OJS, open access: issue Vol. 1 No. 2 (2014) "Identifiers": "Save"; again: "Clear" › "OK";
//         the tab (facts "9 …" and "10 …")
//   9-11  OJS: Settings › Distribution › Access: subscriptions; the issue's window lists "Access"
//         after "Identifiers"; "Save"; again: "Clear" › "OK"; the tab (facts "11 …" to "13 …")
// WALK=neighbour runs alone (fix in and out): steps 1-6, then "Clear" › "Cancel" on the item's tab
// (the URN kept, no tab load), and on OJS the open-access control (the issue's tab still redraws).
// WALK=stale (OJS) acts on the out-of-date galley tab under the individual suffix choice: "Clear"
// again and "Save", then reads the URN and the stored suffix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u44j --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u44j PROBE_AGENT=u44j node bin/probe.js all shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44j-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44j-3_5 PROBE_AGENT=u44j node bin/probe.js all shared/playwright/checks/issues/cleared-urn-stays-on-tab/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {flat, setUpUrn, openItemTab, closeWindow} = require('../urn-check-digit-from-suffix-only/lib');
const {readTab, saveTab, pressClear, setPublishingMode, openIssueTab} = require('./lib');

const MODE = process.env.WALK || 'walk';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const SUBSCRIPTIONS = 'The journal will require subscriptions to access some or all of its contents.';
const APP = {
    ojs: {kinds: ['Issues', 'Galleys'], sid: 1, item: 'PDF Version 2'},
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
    // A read for the facts, not a step: the version the workflow opens on (the newest).
    const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${a.sid}`).trim());
    const storedUrn = () =>
        sql(app, app.name === 'ojs'
            ? `select setting_value from publication_galley_settings where setting_name = 'pub-id::other::urn' and galley_id in (select galley_id from publication_galleys where publication_id = ${pubId} and label = '${a.item}')`
            : `select setting_value from submission_chapter_settings where setting_name = 'pub-id::other::urn' and chapter_id in (select chapter_id from submission_chapters where publication_id = ${pubId})`).trim();
    const issueUrn = () => sql(app, `select setting_value from issue_settings where setting_name = 'pub-id::other::urn'`).trim();

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const snap = async (label) => record(name(label), await screen(page));
    /** One step that records its error and lets the walk go on. */
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: flat(e.message, 400)});
        }
    };
    try {
        // 1-3
        await signIn(page, 'dbarnes');
        if (MODE !== 'stale') fact('3 setup', await setUpUrn(page, app, {kinds: a.kinds, suffix: 'default', checkNo: true}));

        let win;
        if (MODE === 'stale') {
            // Acting on the out-of-date tab, with the individual suffix choice: the setup again with
            // "Enter an individual URN suffix…"; "URN Suffix" `a14`, "Save"; again: the box ticked,
            // "Save"; again: "Clear" › "OK"; on the out-of-date tab "Clear" › "OK" again, then "Save";
            // opened again.
            const suffixStored = () => sql(app, `select setting_value from publication_galley_settings where setting_name = 'urnSuffix' and galley_id in (select galley_id from publication_galleys where publication_id = ${pubId} and label = '${a.item}')`).trim();
            fact('s setup', await setUpUrn(page, app, {kinds: a.kinds, suffix: 'customId', checkNo: false}));
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            await win.urnSuffixBox().fill('a14');
            await step('s1 save suffix', () => saveTab(page, win));
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            await step('s2 tab', async () => ({...(await readTab(win)), suffix: await win.urnSuffixBox().inputValue().catch(() => null)}));
            await step('s2 save assign', () => saveTab(page, win));
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            await step('s3 tab', async () => ({...(await readTab(win)), stored: storedUrn(), suffixStored: suffixStored()}));
            await step('s4 clear ok', async () => ({clear: await pressClear(page, win, 'OK'), stored: storedUrn(), suffixStored: suffixStored()}));
            await step('s5 clear again', async () => ({clear: await pressClear(page, win, 'OK'), stored: storedUrn(), suffixStored: suffixStored()}));
            await step('s6 save stale', async () => ({save: await saveTab(page, win), stored: storedUrn(), suffixStored: suffixStored()}));
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            await step('s7 reopened', async () => ({...(await readTab(win)), suffix: await win.urnSuffixBox().inputValue().catch(() => null)}));
            await snap('s7-reopened');
            await closeWindow(page, win);
            return;
        }

        // 4-6: the item's tab, "Save", opened again with the URN stored
        await step('4 tab', async () => {
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            return readTab(win);
        });
        await snap('4-tab');
        await step('5 save', () => saveTab(page, win));
        await step('6 tab again', async () => {
            win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
            return {...(await readTab(win)), stored: storedUrn()};
        });
        await snap('6-tab');

        if (MODE === 'neighbour') {
            await step('nb cancel', async () => ({clear: await pressClear(page, win, 'Cancel'), tab: await readTab(win), stored: storedUrn()}));
            await snap('nb-cancel');
            await closeWindow(page, win);
        } else {
            // 7-8
            await step('7 clear ok', async () => ({clear: await pressClear(page, win, 'OK'), stored: storedUrn()}));
            await step('8 tab after ok', () => readTab(win));
            await snap('8-tab-after-ok');
            await closeWindow(page, win);
            await step('8 reopened', async () => {
                win = await openItemTab(page, app, frame, a.sid, pubId, a.item);
                return readTab(win);
            });
            await snap('8-reopened');
            await closeWindow(page, win);
        }

        if (app.name !== 'ojs') return;

        // 9-10: the issue, open access (control)
        let iw;
        await step('9 issue tab', async () => {
            const o = await openIssueTab(page, app, ISSUE);
            iw = o.win;
            return {tabs: o.tabs, ...(await readTab(iw))};
        });
        await step('9 issue save', () => saveTab(page, iw));
        await step('10 issue tab again', async () => {
            const o = await openIssueTab(page, app, ISSUE);
            iw = o.win;
            return {tabs: o.tabs, ...(await readTab(iw)), stored: issueUrn()};
        });
        await step('10 issue clear ok', async () => ({clear: await pressClear(page, iw, 'OK'), stored: issueUrn()}));
        await step('10 issue tab after ok', () => readTab(iw));
        await snap('10-issue-after-ok');
        await closeWindow(page, iw);
        if (MODE === 'neighbour') return;

        // 11-13: the issue, subscription journal
        await step('11 subscriptions', () => setPublishingMode(page, app, SUBSCRIPTIONS));
        await step('12 issue tab', async () => {
            const o = await openIssueTab(page, app, ISSUE);
            iw = o.win;
            return {tabs: o.tabs, ...(await readTab(iw))};
        });
        await step('12 issue save', () => saveTab(page, iw));
        await step('13 issue tab again', async () => {
            const o = await openIssueTab(page, app, ISSUE);
            iw = o.win;
            return {tabs: o.tabs, ...(await readTab(iw)), stored: issueUrn()};
        });
        await step('13 issue clear ok', async () => ({clear: await pressClear(page, iw, 'OK'), stored: issueUrn()}));
        await step('13 issue tab after ok', () => readTab(iw));
        await snap('13-issue-after-ok');
        await closeWindow(page, iw);
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
