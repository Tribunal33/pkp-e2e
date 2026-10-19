// U44 A17, joined to issue report docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md:
// a Publisher ID typed on the "Identifiers" tab of a galley's window (OJS, OPS), of "Edit Chapter"
// or of a publication format's "Edit" (OMP), then the window's header "Close": the window closes at
// once without the "The data on this form has changed…" question, the value is gone, and the next
// reload raises the browser's leave-page question. Takes the Steps on PKP's default test dataset
// (a dataset fleet), as `dbarnes`:
//   1     sign in; Settings › Workflow › Submission › "Metadata": "Publisher ID" boxes, "Save"
//   0     OMP: submission 4's "Publication Formats" › "Add publication format", "Name" h19n, "OK"
//   2-3   Publication › "Galleys" / "Chapters" / "Publication Formats"; the item's window, its
//         first tab's form loaded
//   4     "Identifiers", "Publisher ID" h19n, no "Save"
//   5     header "Close" (a question is answered "Cancel", then "Close" again with "OK")
//   6     reload (WAIT=<ms> in front waits that long first; the trial of 2026-10-19 ran with 2000)
//   7     the window again, "Identifiers": the box's value; "Close"
//   8     control: the window again, "Identifiers", h19n, the first tab ("OK")
// MODE=neighbour runs alone (fix in and out): (a) "Identifiers" with nothing typed, "Close", reload;
// (b) h19n typed, the first tab answered "OK", "Close", reload; (c) a change on the first tab,
// "Close" ("Cancel", then "Close" with "OK").
//
// pressClose() returns as soon as the window is gone (or two seconds on, when a question kept it open).
// Reset first:  npm run fleet-prep -- --feature issues-h19n --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-h19n PROBE_AGENT=h19n node bin/probe.js all shared/playwright/checks/issues/identifiers-tab-close-drops-typed-value/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-h19n-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19n-3_5 PROBE_AGENT=h19n node bin/probe.js all shared/playwright/checks/issues/identifiers-tab-close-drops-typed-value/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {flat, pause, enablePublisherIds, openItemWindow, addFormat, formIds, pressClose} = require('./lib');

const MODE = process.env.MODE || 'walk';
const VALUE = 'h19n';
const WAIT = Number(process.env.WAIT || 0);
const APP = {
    ojs: {boxes: ['Enable for Galleys'], items: [{kind: 'galley', sid: 1, item: 'PDF Version 2'}]},
    ops: {boxes: ['Enable for Galleys'], items: [{kind: 'galley', sid: 1, item: 'PDF'}]},
    omp: {
        boxes: ['Enable for Chapters', 'Enable for Publication Formats'],
        items: [
            {kind: 'chapter', sid: 4, item: 'Introduction: Contexts of Popular Culture'},
            {kind: 'format', sid: 4, item: 'h19n', add: true},
        ],
    },
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    const {page, close} = await launch(app);
    // The browser's questions: a confirm() is answered as `answer` says, a page-leave one accepted.
    let label = '';
    let answer = 'dismiss';
    const dialogs = [];
    page.on('dialog', async (d) => {
        const entry = {at: label, type: d.type(), message: flat(d.message(), 200), answered: d.type() === 'beforeunload' ? 'accept' : answer};
        dialogs.push(entry);
        console.log(`[dialog] ${app.name} ${JSON.stringify(entry)}`);
        if (entry.answered === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const asked = (at) => dialogs.filter((d) => d.at === at).map(({type, message, answered}) => ({type, message, answered}));
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication', publicationHeading: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    const step = async (k, fn) => {
        label = k;
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: flat(e.message, 400), asked: asked(k)});
        }
    };
    /** Reload, `WAIT` ms after the step before (default 0: at once, as the Steps say). */
    const reload = async (k) => {
        label = k;
        if (WAIT) await pause(page, WAIT);
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await pause(page, 1000);
        return {asked: asked(k)};
    };

    try {
        await signIn(page, 'dbarnes');
        await step('1 publisher ids', () => enablePublisherIds(page, app, a.boxes));

        for (const it of a.items) {
            const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${it.sid}`).trim());
            const ref = {...it, pubId};
            const p = (s) => `${it.kind} ${s}`;
            let win;
            let firstTab;
            if (it.add) await step(p('0 add'), () => addFormat(page, app, frame, {sid: it.sid, pubId, name: it.item}));

            if (MODE === 'neighbour') {
                // (a) nothing typed
                await step(p('nb-a open'), async () => {
                    win = await openItemWindow(page, app, frame, ref);
                    firstTab = (await win.tabNames())[0];
                    await win.openIdentifiersTab();
                    return {tabs: await win.tabNames(), forms: await formIds(win)};
                });
                answer = 'accept';
                await step(p('nb-a close'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('nb-a close'))}));
                await step(p('nb-a reload'), () => reload(p('nb-a reload')));
                // (b) typed, the first tab answered "OK", then "Close"
                await step(p('nb-b open'), async () => {
                    win = await openItemWindow(page, app, frame, ref);
                    await win.openIdentifiersTab();
                    await win.publisherIdBox().fill(VALUE);
                    await win.publisherIdBox().blur();
                    return {typed: await win.publisherIdBox().inputValue()};
                });
                await step(p('nb-b first tab'), async () => {
                    await win.tab(firstTab).click();
                    await pause(page, 1500);
                    return {asked: asked(p('nb-b first tab')), selected: await win.tab(firstTab).getAttribute('aria-selected')};
                });
                await step(p('nb-b close'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('nb-b close'))}));
                await step(p('nb-b reload'), () => reload(p('nb-b reload')));
                // (c) a change on the first tab, "Close": "Cancel", then "Close" with "OK"
                await step(p('nb-c open'), async () => {
                    win = await openItemWindow(page, app, frame, ref);
                    const box = win.dialog.locator('form').first().locator('input[type="text"]:visible').first();
                    const before = await box.inputValue();
                    await box.fill(`${before} ${VALUE}`);
                    await box.blur();
                    return {box: await box.getAttribute('name'), typed: await box.inputValue()};
                });
                answer = 'dismiss';
                await step(p('nb-c close cancel'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('nb-c close cancel'))}));
                answer = 'accept';
                await step(p('nb-c close ok'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('nb-c close ok'))}));
                await step(p('nb-c reload'), () => reload(p('nb-c reload')));
                continue;
            }

            // 2-4
            await step(p('3-4 typed'), async () => {
                win = await openItemWindow(page, app, frame, ref);
                firstTab = (await win.tabNames())[0];
                await win.openIdentifiersTab();
                await win.publisherIdBox().fill(VALUE);
                await win.publisherIdBox().blur();
                return {tabs: await win.tabNames(), forms: await formIds(win), typed: await win.publisherIdBox().inputValue()};
            });
            record(name(`${it.kind}-4-typed`), await screen(page));
            // 5: "Close"; a question is answered "Cancel" (the window must stay with the value), then OK
            answer = 'dismiss';
            await step(p('5 close'), async () => {
                const r = await pressClose(page, win, win.publisherIdBox());
                return {...r, asked: asked(p('5 close'))};
            });
            if (facts[p('5 close')] && facts[p('5 close')].stillOpen) {
                answer = 'accept';
                await step(p('5 close again ok'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('5 close again ok'))}));
            }
            record(name(`${it.kind}-5-closed`), await screen(page));
            // 6: two seconds, reload
            await step(p('6 reload'), () => reload(p('6 reload')));
            // 7: the window again, "Identifiers": the box's value; "Close"
            await step(p('7 reopened'), async () => {
                win = await openItemWindow(page, app, frame, ref);
                await win.openIdentifiersTab();
                const stored = it.kind === 'galley'
                    ? sql(app, `select count(*) from publication_galley_settings where setting_name = 'pub-id::publisher-id' and setting_value = '${VALUE}'`)
                    : it.kind === 'chapter'
                      ? sql(app, `select count(*) from submission_chapter_settings where setting_name = 'pub-id::publisher-id' and setting_value = '${VALUE}'`)
                      : sql(app, `select count(*) from publication_format_settings where setting_name = 'pub-id::publisher-id' and setting_value = '${VALUE}'`);
                return {value: await win.publisherIdBox().inputValue(), storedRows: Number(stored), asked: asked(p('7 reopened'))};
            });
            record(name(`${it.kind}-7-reopened`), await screen(page));
            answer = 'accept';
            await step(p('7 close'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('7 close'))}));
            // 8: control, the switch to the first tab
            await step(p('8 control open'), async () => {
                win = await openItemWindow(page, app, frame, ref);
                await win.openIdentifiersTab();
                await win.publisherIdBox().fill(VALUE);
                await win.publisherIdBox().blur();
                return {typed: await win.publisherIdBox().inputValue()};
            });
            await step(p('8 control first tab'), async () => {
                await win.tab(firstTab).click();
                await pause(page, 1500);
                return {firstTab, asked: asked(p('8 control first tab')), selected: await win.tab(firstTab).getAttribute('aria-selected')};
            });
            await step(p('8 control close'), async () => ({...(await pressClose(page, win, null)), asked: asked(p('8 control close'))}));
            await step(p('8 control reload'), () => reload(p('8 control reload')));
        }
    } finally {
        facts.dialogs = dialogs;
        record(name('facts'), facts);
        await close();
    }
});
