// Issue report docs/issues/U58-A13-notice-close-blocked-by-open-window.md (U58 A13, U05 A14): while a window
// or side panel is open, a notice at the top right cannot be closed with its "×", and resting the pointer on
// it does not keep it; it leaves by itself about five seconds after it showed. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), on OJS, OMP and OPS:
//   A 1-7  rvaca: Settings › Workflow › Submission › Components, "Add a Component", Name "u58b Survey Forms",
//          Key "-survey", "Save" (refused), a press on the notice's "×", "Save" again and the pointer resting
//          on the notice for eight seconds
//   B 1-5  dbarnes: a submission's Participants › the author's "More Actions" › "Notify", "Notify" with
//          "Message" empty (refused), a press on the notice's "×"
// Every press is a real mouse press at the centre of the "×"; each notice's lifetime is stamped in the page.
// WALK=neighbour runs alone (fix in and out): a press on the dimmed page beside the open "Add a Component"
// window still closes it (unchanged, then changed: the leave question), and a press beside a row's "Delete"
// window still closes that window, the row kept; and the control, a notice shown once the "Notify" panel has
// closed (a sent "Notify" with the first predefined message), still goes at a press on its "×", and whether
// that press leaves the submission's workflow open (NB_ONLY=control takes this control alone). NB_ONLY=again
// instead leaves that notice alone, opens "Notify" again, and presses the "×" of the refusal's notice.
//
// Reset first:  npm run fleet-prep -- --feature issues-u58b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u58b PROBE_AGENT=u58b node bin/probe.js all shared/playwright/checks/issues/notice-close-blocked-by-open-window/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u58b-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u58b-3_5 PROBE_AGENT=u58b node bin/probe.js all shared/playwright/checks/issues/notice-close-blocked-by-open-window/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {sleep, flat, watchNotices, nextNotice, lastNoticeId, lifetime, pressClose, restPointer} = require('./lib');

const MODE = process.env.WALK || 'walk';
const APP = {
    ojs: {list: 'Article Components', submission: 4, author: 'Craig Montgomerie'},
    omp: {list: 'Monograph Components', submission: 7, author: 'Dietmar Kennepohl'},
    ops: {list: 'Preprint Components', submission: 1, author: 'Carlo Corino'},
};
const OUTSIDE = {x: 30, y: 450}; // the dimmed page left of a side window (1280 px wide viewport)

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const a = APP[app.name];
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        // A page-leave question and the window's "data has changed" question are accepted (the person goes on).
        await d.accept().catch(() => {});
    });
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        }
    };

    const settings = new WorkflowSubmissionSettings(page, app.contextPath, {listTitle: a.list});
    const openComponents = async () => {
        await settings.goto('Components');
        await idle(page);
        await watchNotices(page);
        return {rows: await settings.components.rows().count()};
    };
    const componentWindowOpen = () => settings.components.page.locator('form#genreForm').isVisible().catch(() => false);

    try {
        if (MODE === 'neighbour') {
          // NB_ONLY (control, again) skips N1-N10 (the windows beside which the dimmed page is pressed).
          if (!process.env.NB_ONLY) {
            await step('N1 sign in as rvaca', () => signIn(page, 'rvaca'));
            await step('N2 Components', openComponents);
            let win = null;
            await step('N3 Add a Component', async () => {
                win = await settings.components.openAdd();
                return {heading: flat(await win.heading().innerText().catch(() => null))};
            });
            await step('N4 press the dimmed page beside the unchanged window', async () => {
                const before = dialogs.length;
                await page.mouse.click(OUTSIDE.x, OUTSIDE.y);
                await sleep(1500);
                return {windowOpen: await componentWindowOpen(), asked: dialogs.slice(before)};
            });
            record(name('N4-outside-unchanged'), await screen(page));
            await sleep(800);
            await step('N5 Add a Component, type "u58b neighbour" in Name', async () => {
                if (await componentWindowOpen()) return {skipped: 'window still open'};
                win = await settings.components.openAdd();
                await win.typeName('u58b neighbour');
                return {heading: flat(await win.heading().innerText().catch(() => null))};
            });
            await step('N6 press the dimmed page beside the changed window', async () => {
                const before = dialogs.length;
                await page.mouse.click(OUTSIDE.x, OUTSIDE.y);
                await sleep(1500);
                return {windowOpen: await componentWindowOpen(), asked: dialogs.slice(before)};
            });
            record(name('N6-outside-changed'), await screen(page));
            await step('N7 Components again', openComponents);
            let first = null;
            await step('N8 the first row › Delete', async () => {
                first = (await settings.components.names())[0];
                await settings.components.openDelete(first);
                return {row: first, dialog: flat(await page.getByRole('dialog').last().innerText().catch(() => null))};
            });
            await step('N9 press the dimmed page beside the "Delete" window', async () => {
                const before = dialogs.length;
                await page.mouse.click(OUTSIDE.x, OUTSIDE.y);
                await sleep(1500);
                const open = await page.getByRole('dialog').filter({hasText: 'Are you sure you wish to delete this item?'}).count();
                return {deleteWindowOpen: open > 0, asked: dialogs.slice(before)};
            });
            record(name('N9-outside-delete'), await screen(page));
            await step('N10 the rows after', async () => {
                await openComponents();
                const names = await settings.components.names();
                return {rowKept: names.includes(first), names};
            });
          }
            // Control: a notice shown once the side panel has closed (a sent "Notify" with a predefined message).
            const panel = new ParticipantsPanel(page, app.contextPath);
            await step('N11 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step(`N12 open submission ${a.submission}`, async () => {
                await panel.goto(a.submission);
                await idle(page);
                await watchNotices(page);
                return 'open';
            });
            let notify = null;
            await step(`N13 ${a.author} › More Actions › Notify, the first predefined message`, async () => {
                notify = await panel.openNotify(a.author);
                await idle(page);
                const options = (await notify.templateOptions()).filter((o) => o);
                await notify.chooseTemplate(options[0]);
                return {chosen: options[0], options};
            });
            let sent = null;
            await step('N14 Notify', async () => {
                const after = await lastNoticeId(page);
                const response = await notify.pressNotify();
                await notify.expectClosed().catch(() => null);
                sent = await nextNotice(page, after, 8000).catch(() => null);
                return {status: response.status(), notice: sent, panelOpen: await notify.notifyButton().isVisible().catch(() => false)};
            });
            if (process.env.NB_ONLY !== 'again') await step('N15 press that notice\'s "×"', async () => {
                if (!sent) return {skipped: 'no notice at the top right'};
                const press = await pressClose(page, sent.id);
                const life = await lifetime(page, sent.id);
                return {...press, lifetimeMs: life};
            });
            if (process.env.NB_ONLY === 'again') {
                // After the first panel has closed, leave its notice alone, open "Notify" again and press the
                // "×" of the refusal's notice: does the press reach it, and what closes?
                await step('A1 leave the notice alone until it goes', async () => (sent ? {lifetimeMs: await lifetime(page, sent.id)} : 'no notice'));
                await step(`A2 ${a.author} › More Actions › Notify again`, async () => {
                    notify = await panel.openNotify(a.author);
                    await idle(page);
                    return 'open';
                });
                let warning = null;
                await step('A3 Notify with Message empty', async () => {
                    const after = await lastNoticeId(page);
                    const response = await notify.pressNotify();
                    warning = await nextNotice(page, after);
                    return {status: response.status(), notice: warning.text, panelOpen: await notify.notifyButton().isVisible().catch(() => false)};
                });
                await step('A4 press the notice\'s "×"', async () => {
                    const press = await pressClose(page, warning.id);
                    await sleep(800);
                    return {...press, lifetimeMs: await lifetime(page, warning.id),
                        panelOpen: await notify.notifyButton().isVisible().catch(() => false),
                        workflowOpen: await panel.column().isVisible().catch(() => false)};
                });
                record(name('again'), await screen(page));
                return;
            }
            await step('N16 the submission\'s workflow after that press', async () => ({
                workflowOpen: await panel.column().isVisible().catch(() => false),
                url: page.url(),
            }));
            record(name('N15-control'), await screen(page));
            return;
        }

        // A. A refused "Key" in the "Add a Component" window
        await step('A1 sign in as rvaca', () => signIn(page, 'rvaca'));
        await step('A2 Settings › Workflow › Submission › Components', openComponents);
        let win = null;
        await step('A3 Add a Component', async () => {
            win = await settings.components.openAdd();
            return {heading: flat(await win.heading().innerText().catch(() => null))};
        });
        await step('A4 Name "u58b Survey Forms", Key "-survey"', async () => {
            await win.typeName('u58b Survey Forms');
            await win.typeKey('-survey');
            return 'typed';
        });
        let first = null;
        await step('A5 Save', async () => {
            const after = await lastNoticeId(page);
            const response = await win.save();
            first = await nextNotice(page, after);
            return {status: response.status(), notice: first, windowOpen: await componentWindowOpen()};
        });
        record(name('A5-refused'), await screen(page));
        await step('A6 press the notice\'s "×"', async () => {
            if (!first) return {skipped: 'no notice'};
            const press = await pressClose(page, first.id);
            const life = await lifetime(page, first.id);
            return {...press, lifetimeMs: life, windowOpen: await componentWindowOpen(), nameKept: await win.nameBox().inputValue().catch(() => null)};
        });
        record(name('A6-after-press'), await screen(page));
        await step('A7 Save again, the pointer resting on the notice for 8 s', async () => {
            if (!(await componentWindowOpen())) return {skipped: 'window closed'};
            const after = await lastNoticeId(page);
            await win.save();
            const second = await nextNotice(page, after);
            const rest = await restPointer(page, second.id, 8000);
            const life = await lifetime(page, second.id);
            return {notice: second.text, ...rest, lifetimeMs: life, windowOpen: await componentWindowOpen()};
        });
        await step('A8 leave the window ("Cancel")', async () => {
            if (await componentWindowOpen()) await win.cancelLink().click();
            await sleep(800);
            return {windowOpen: await componentWindowOpen(), asked: dialogs.slice(-1)};
        });

        // B. A refused "Notify" in a submission's Participants
        const panel = new ParticipantsPanel(page, app.contextPath);
        await step('B1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
        await step(`B2 open submission ${a.submission}`, async () => {
            await panel.goto(a.submission);
            await idle(page);
            await watchNotices(page);
            return {rows: await panel.rowLines()};
        });
        let notify = null;
        await step(`B3 ${a.author} › More Actions › Notify`, async () => {
            notify = await panel.openNotify(a.author);
            await idle(page);
            return {title: flat(await notify.title().innerText().catch(() => null))};
        });
        let warning = null;
        await step('B4 Notify with Message empty', async () => {
            const after = await lastNoticeId(page);
            const response = await notify.pressNotify();
            warning = await nextNotice(page, after);
            return {status: response.status(), notice: warning, panelOpen: await notify.notifyButton().isVisible().catch(() => false)};
        });
        record(name('B4-refused'), await screen(page));
        await step('B5 press the notice\'s "×"', async () => {
            if (!warning) return {skipped: 'no notice'};
            const press = await pressClose(page, warning.id);
            const life = await lifetime(page, warning.id);
            return {...press, lifetimeMs: life, panelOpen: await notify.notifyButton().isVisible().catch(() => false)};
        });
        record(name('B5-after-press'), await screen(page));
    } finally {
        facts.dialogs = dialogs;
        facts.noticeLog = await page.evaluate(() => window.__u58bNotices || null).catch(() => null);
        record(name(MODE === 'neighbour' ? 'neighbour-facts' : 'facts'), facts);
        await close();
    }
});

