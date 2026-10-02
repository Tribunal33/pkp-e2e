// U49 OJS2: on a journal with no published issue, the issue choice is not the one made.
// PKP's default test dataset, OJS, signed in as `dbarnes`. Modes (the first argument):
//   walk (default), the report's Steps:
//     control  submission 15: "Review Publishing Details" › "Version of Record", "Major",
//              "Assign To Future Issue and Schedule Only", "Vol. 2 No. 1 (2015)", "Confirm":
//              the window (then "Cancel"); the journal still has its published issue.
//     3        Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Unpublish Issue" › "OK".
//     4-6      submission 5: the panel's radios as it opens; the first pick of "Schedule Only" and the
//              future issue, "Confirm": the window; its button pressed: the status line.
//     7-9      submission 6: "Publication Settings": "Schedule Only", the future issue, "Save": the
//              radios after "Saved" and after a reload; the panel's radios; "Confirm": the window.
//     10-12    submission 9: "Publication Settings": "Pages" "1-10", "Save": the radios after it and
//              after a reload; the panel's radios; "Confirm": the window.
//   neighbour, what the fix must leave alone (the journal keeps its published issue): submission 15's
//     panel (preselection, first pick of "Schedule Only", window, "Cancel"), and a "Pages" save on
//     submission 9's "Publication Settings" (refused until an issue choice is made).
//   On stable-3_5_0 either mode reads submission 5's publish button and what it opens (no
//   "Issue Assignment" choices there).
// Each step records its state rather than throwing, so a run with the fix applied reads through.
//
// Reset first:  npm run fleet-prep -- --feature issues-v5 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-v5 PROBE_AGENT=v5 node bin/probe.js ojs shared/playwright/checks/issues/future-issue-schedule-only-publishes-now/walk.js [walk|neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-v5-3_5 PROBE_AGENT=v5 node bin/probe.js ojs shared/playwright/checks/issues/future-issue-schedule-only-publishes-now/walk.js
const {forEachApp, launch, signIn, screen, record, shot} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] || 'walk';

async function step(f, key, fn) {
    try {
        f[key] = await fn();
    } catch (e) {
        f[key] = {error: L.flat(e.message, 300)};
    }
    console.log(`[fact] ${f.line} ${f.run} ${key}: ${JSON.stringify(f[key])}`);
}

async function line35(page, app, f) {
    await step(f, 'publish35', async () => {
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const frame = new WorkflowPage(page, app.contextPath);
        await frame.gotoEditorial(5);
        const entry = await frame.revealPublicationEntry('Title & Abstract');
        await entry.click();
        await L.sleep(1500);
        const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await button.waitFor({timeout: L.T});
        const label = L.flat(await button.innerText(), 60);
        await button.click();
        await L.sleep(2500);
        const s = await screen(page);
        record('r35-publish-window', s);
        await shot(page, 'r35-publish-window');
        return {button: label, dialog: L.flat(s.text && s.text.dialog, 500), radios: await L.readRadios(page)};
    });
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const f = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode};
    const writes = [];
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    L.watchWrites(page, writes);
    const name = (s) => `${mode}-${s}`;
    try {
        await signIn(page, 'dbarnes');
        if (f.line !== 'main') {
            await line35(page, app, f);
            return;
        }

        // Control, or the neighbour's first half: submission 15 with the published issue present.
        await step(f, 'control15', async () => {
            const {pub, panel, button, opened} = await L.openPanel(page, app, 15);
            const {out, question} = await L.confirmPanel(page, pub, panel, {pick: L.SCHEDULE_ONLY, issue: true});
            record(name('control15-window'), await screen(page));
            if (question) await L.cancelWindow(question);
            return {button, opened: L.checkedOf(opened), options: opened.map((r) => r.label), ...out};
        });

        if (mode === 'neighbour') {
            await step(f, 'pages9', async () => {
                const {form} = await L.openSettings(page, app, 9);
                const before = L.checkedOf(await L.readRadios(form));
                await form.locator('input[name="pages"]').fill('1-10');
                const saved = await L.saveForm(page, form);
                record(name('pages9-after-save'), await screen(page));
                return {before, ...saved, after: L.checkedOf(await L.readRadios(form))};
            });
            f.stored = L.stored(app, [9, 15]);
            return;
        }

        // Step 3: the journal loses its only published issue.
        await step(f, 'unpublish', () => L.unpublishIssue(page, app, L.BACK));

        // Steps 4-6: the panel's first pick.
        await step(f, 'panel5', async () => {
            const {pub, panel, button, opened} = await L.openPanel(page, app, 5);
            record(name('panel5-opened'), await screen(page));
            const {out, question} = await L.confirmPanel(page, pub, panel, {pick: L.SCHEDULE_ONLY, issue: true});
            record(name('panel5-window'), await screen(page));
            await shot(page, name('panel5-window'));
            const answered = question ? await L.answerWindow(page, pub, question) : null;
            record(name('panel5-after'), await screen(page));
            return {button, opened: L.checkedOf(opened), options: opened.map((r) => r.label), ...out, answered};
        });

        // Steps 7-9: "Schedule Only" saved on Publication Settings.
        await step(f, 'settings6', async () => {
            const {form} = await L.openSettings(page, app, 6);
            const before = L.checkedOf(await L.readRadios(form));
            await form.getByRole('radio', {name: L.SCHEDULE_ONLY, exact: true}).check();
            const sel = form.locator('select[name="issueId"]');
            await sel.waitFor({state: 'visible', timeout: L.T});
            const opt = sel.locator('option').filter({hasText: L.FUTURE});
            await opt.first().waitFor({state: 'attached', timeout: L.T});
            await sel.selectOption((await opt.first().getAttribute('value')) || '');
            const saved = await L.saveForm(page, form);
            const afterSave = L.checkedOf(await L.readRadios(form));
            record(name('settings6-after-save'), await screen(page));
            await shot(page, name('settings6-after-save'));
            const {form: again} = await L.openSettings(page, app, 6);
            const afterReload = L.checkedOf(await L.readRadios(again));
            const {pub, panel, opened} = await L.openPanel(page, app, 6);
            const {out, question} = await L.confirmPanel(page, pub, panel);
            record(name('settings6-window'), await screen(page));
            if (question) await L.cancelWindow(question);
            return {before, ...saved, afterSave, afterReload, panelOpened: L.checkedOf(opened), ...out};
        });

        // Steps 10-12: a save for another field.
        await step(f, 'pages9', async () => {
            const {form} = await L.openSettings(page, app, 9);
            const before = L.checkedOf(await L.readRadios(form));
            await form.locator('input[name="pages"]').fill('1-10');
            const saved = await L.saveForm(page, form);
            const afterSave = L.checkedOf(await L.readRadios(form));
            record(name('pages9-after-save'), await screen(page));
            await shot(page, name('pages9-after-save'));
            const {form: again} = await L.openSettings(page, app, 9);
            const afterReload = L.checkedOf(await L.readRadios(again));
            const pagesKept = await again.locator('input[name="pages"]').inputValue();
            const {pub, panel, opened} = await L.openPanel(page, app, 9);
            const {out, question} = await L.confirmPanel(page, pub, panel);
            record(name('pages9-window'), await screen(page));
            if (question) await L.cancelWindow(question);
            return {before, ...saved, afterSave, afterReload, pagesKept, panelOpened: L.checkedOf(opened), ...out};
        });

        f.stored = L.stored(app, [5, 6, 9, 15]);
    } finally {
        f.writes = writes;
        record(`facts-${mode}`, f);
        await close();
    }
});
