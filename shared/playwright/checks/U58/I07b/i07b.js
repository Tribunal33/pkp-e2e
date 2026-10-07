// U58 kept check, chunk I07b (housekeeping incidentals row of 2026-10-04): Settings › Workflow ›
// "Submission" › "Components". Spec: docs/specs/U58-submission-intake-configuration.md — Rule 15a and
// register A15 (footnotes td15, f-a15): a press on the dimmed page beside the "Add a Component" window,
// made while the cursor is still in "Name", closes the window without the question "Close" asks, and the
// browser's leave-page question comes at the next page load.
//
// The steps are the neighbour steps N1-N10 of the walk kept with the A13 issue report until 2026-10-06
// (git show 13c355f7:shared/playwright/checks/issues/notice-close-blocked-by-open-window/walk.js,
// WALK=neighbour), restored here on 2026-10-07 without that report's notice steps; N7 now also records
// what the browser asked while the page loaded again. Runs on PKP's default test dataset (a dataset
// fleet), as the manager rvaca, on OJS, OMP and OPS; nothing is saved, so no reset is needed afterwards.
//   N1-N4   "Add a Component", nothing typed, a press on the dimmed page beside the window
//   N5-N7   "Add a Component", "u58b neighbour" in "Name" (the cursor stays there), the same press,
//           then the settings page opened again by its address
//   N8-N10  the first row's "Delete" window, the same press, the rows after
// Every press is a real mouse press at the left edge of the 1280 px wide page.
//
// Reset first:  npm run fleet-prep -- --feature U58 --dataset 2 --reset
// Run:          PROBE_FEATURE=U58 PROBE_AGENT=i07b node bin/probe.js all shared/playwright/checks/U58/I07b/i07b.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

const LIST = {ojs: 'Article Components', omp: 'Monograph Components', ops: 'Preprint Components'};
const OUTSIDE = {x: 30, y: 450}; // the dimmed page left of a side window (1280 px wide viewport)

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('i07b.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', steps: {}};
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

    const settings = new WorkflowSubmissionSettings(page, app.contextPath, {listTitle: LIST[app.name]});
    const openComponents = async () => {
        await settings.goto('Components');
        await idle(page);
        return {rows: await settings.components.rows().count()};
    };
    const componentWindowOpen = () => settings.components.page.locator('form#genreForm').isVisible().catch(() => false);
    const pressOutside = async () => {
        await page.mouse.click(OUTSIDE.x, OUTSIDE.y);
        await sleep(1500);
    };

    try {
        await step('N1 sign in as rvaca', () => signIn(page, 'rvaca'));
        await step('N2 Components', openComponents);
        let win = null;
        await step('N3 Add a Component', async () => {
            win = await settings.components.openAdd();
            return {heading: flat(await win.heading().innerText().catch(() => null))};
        });
        await step('N4 press the dimmed page beside the unchanged window', async () => {
            const before = dialogs.length;
            await pressOutside();
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
            await pressOutside();
            return {windowOpen: await componentWindowOpen(), asked: dialogs.slice(before)};
        });
        record(name('N6-outside-changed'), await screen(page));
        await step('N7 Components again (the page opened by its address)', async () => {
            const before = dialogs.length;
            const out = await openComponents();
            return {...out, asked: dialogs.slice(before)};
        });
        let first = null;
        await step('N8 the first row › Delete', async () => {
            first = (await settings.components.names())[0];
            await settings.components.openDelete(first);
            return {row: first, dialog: flat(await page.getByRole('dialog').last().innerText().catch(() => null))};
        });
        await step('N9 press the dimmed page beside the "Delete" window', async () => {
            const before = dialogs.length;
            await pressOutside();
            const open = await page.getByRole('dialog').filter({hasText: 'Are you sure you wish to delete this item?'}).count();
            return {deleteWindowOpen: open > 0, asked: dialogs.slice(before)};
        });
        record(name('N9-outside-delete'), await screen(page));
        await step('N10 the rows after', async () => {
            const before = dialogs.length;
            await openComponents();
            const names = await settings.components.names();
            return {rowKept: names.includes(first), names, asked: dialogs.slice(before)};
        });
    } finally {
        facts.dialogs = dialogs;
        record(name('facts'), facts);
        await close();
    }
});
