// Issue report docs/issues/U17-OMP5-series-toggle-asks-about-section.md (U17 OMP5): a press's "Series"
// list asks "Are you sure you wish to deactivate this section?" ("…activate this section?") when a
// manager presses a series' "Inactive" box. Takes the report's Steps on PKP's default test dataset (a
// dataset fleet), OMP only (journals and servers have sections, whose question is right):
//   1    sign in as rvaca
//   2    Settings › Press › "Series"
//   3-4  "History": press "Inactive", read the "Confirm" window, "OK"
//   5-6  press it again, read the window, "OK"
//   7    control: the row's arrow, "Edit", the box at the window's foot, "Cancel"
// WALK=neighbour runs alone (fix in and out): the French interface's question on the first row's box
// (answered "Annuler") stays a sentence, and the "History" row's "Delete" window still asks "…delete this
// item?" (answered "Cancel"). Neither changes the data.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17g --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u17g PROBE_AGENT=u17g node bin/probe.js omp shared/playwright/checks/issues/series-toggle-asks-about-section/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17g-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17g-3_5 PROBE_AGENT=u17g node bin/probe.js omp shared/playwright/checks/issues/series-toggle-asks-about-section/walk.js
const {forEachApp, launch, signIn, screen, record, idle, shot} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const T = 30_000;
const SERIES = 'History';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        console.log(`[fact] ${app.name}: no series list (a journal's and a server's sections ask about a "section"); skipped`);
        return;
    }
    const {SectionsTab, ConfirmWindow, pastCloseWindow} = require('../../../pages/SectionsPages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const tidy = (t) => (t || '').replace(/\s+/g, ' ').trim();

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n').filter(Boolean).slice(0, 6).join(' | '));
            await shot(page, `threw-${label.split(' ')[0]}${run}`).catch(() => null);
        }
        await idle(page);
    };
    const snap = async (label) => {
        const s = await screen(page);
        record(`${label}${run}`, s);
        return s;
    };

    const tab = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm'});
    // The "Confirm" window an "Inactive" box opens: its heading, question and buttons, recorded.
    const readConfirm = async (win, label) => {
        const s = await snap(label);
        return {
            heading: win.name,
            question: tidy(await win.question().innerText()),
            buttons: (await win.root().getByRole('button').allInnerTexts()).map(tidy).filter(Boolean),
            dialogText: tidy(s.text && s.text.dialog),
        };
    };
    const okAndRead = async (win, label) => {
        const response = await tab.confirm(win);
        const s = await snap(label);
        return {status: response.status(), ticked: await tab.inactiveBox(SERIES).isChecked(), notices: s.notices};
    };

    try {
        await step('1 sign in as rvaca', () => signIn(page, 'rvaca'));

        if (MODE !== 'neighbour') {
            await step('2 Settings › Press › "Series"', async () => {
                await tab.goto();
                await snap('series-list');
                return {rows: (await tab.titleCells().allInnerTexts()).map(tidy), historyTicked: await tab.inactiveBox(SERIES).isChecked()};
            });
            let win = null;
            await step('3 "History": press "Inactive"', async () => {
                win = await tab.pressInactive(SERIES);
                return readConfirm(win, 'confirm-deactivate');
            });
            await step('4 "OK"', () => okAndRead(win, 'after-deactivate'));
            await step('5 "History": press the ticked "Inactive" box', async () => {
                win = await tab.pressInactive(SERIES);
                return readConfirm(win, 'confirm-activate');
            });
            await step('6 "OK"', () => okAndRead(win, 'after-activate'));
            await step('7 control: the arrow, "Edit", the box at the foot, "Cancel"', async () => {
                const swin = await tab.openEdit(SERIES);
                const form = page.locator('form#seriesForm');
                const label = tidy(await form.locator('input[type="checkbox"][id^="isInactive"]').first().evaluate((box) => {
                    const own = box.closest('label') || (box.id && document.querySelector(`label[for="${box.id}"]`));
                    return own ? own.textContent : box.parentElement.textContent;
                }).catch((e) => `unread: ${String(e.message).split('\n')[0]}`));
                await snap('edit-window');
                await swin.cancelLink().click();
                await form.waitFor({state: 'hidden', timeout: T}).catch(() => null);
                await pastCloseWindow(page);
                return {inactiveBoxLabel: label};
            });
        } else {
            await step('n1 French interface: "Séries", first row\'s "Inactive" box', async () => {
                const fr = new SectionsTab(page, app.contextPath, {tab: 'Séries', gridId: 'seriesGridContainer', formId: 'seriesForm', locale: 'fr_CA'});
                await fr.goto();
                const firstRow = fr.rows().first();
                const title = tidy(await firstRow.locator('[id$="-title"]').innerText());
                await firstRow.locator('input[type="checkbox"]').click();
                const win = new ConfirmWindow(page, 'Confirmer');
                await win.root().waitFor({state: 'visible', timeout: T});
                const out = await readConfirm(win, 'neighbour-fr-confirm');
                await win.answer('Annuler');
                await pastCloseWindow(page);
                return {row: title, ...out, tickedAfterCancel: await firstRow.locator('input[type="checkbox"]').isChecked()};
            });
            await step('n2 English: "History" arrow, "Delete", read, "Cancel"', async () => {
                // The French visit leaves the session's language French, so the address names "en".
                const en = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm', locale: 'en'});
                await en.goto();
                const win = await en.openDelete(SERIES);
                const out = await readConfirm(win, 'neighbour-delete');
                await win.answer('Cancel');
                await pastCloseWindow(page);
                return {...out, rows: (await en.titleCells().allInnerTexts()).map(tidy)};
            });
        }
    } finally {
        record(`facts-${MODE}${run}`, facts);
        await close();
    }
});
