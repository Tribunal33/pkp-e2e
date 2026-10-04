// Issue report docs/issues/U34-OPS2-preprint-server-initials-placeholder-raw-key.md (U34 OPS2, U56 OPS1): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"). The script builds nothing and saves nothing.
//   (default)  as dbarnes: a submission's "Decline Submission" › "Notify Authors" › "Insert Content" (OPS 1,
//              OJS 4, OMP 10); Settings › Workflow › "Emails" › "Signature" › "Insert Content"; the Emails
//              page › the decline email › "Edit Template" › body "Insert Content". Each window's rows are
//              recorded; OPS is the finding, OJS and OMP the controls.
//   neighbour  (the fix's check, runs alone): in the decision's "Insert Content", "Insert" on the initials row,
//              then the message's text read: the placeholder's value still goes in (the fix changes only the
//              row's description).
// Run (main):   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//               PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-server-initials-placeholder-raw-key/walk.js [neighbour]
// 3.5: the same with PKP_E2E_LINE=stable-3_5_0, the 3.5 fleet's feature, PROBE_RUN=r35.
// Facts: .reports/<feature>/<id>/initials-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const R = require('../internal-round-revised-files-not-carried/lib.js');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {WorkflowEmailsSettingsPage, ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const c = L.CASES[app.name];
    const fact = (k, v) => {
        record('initials-facts', {[k]: v}, {merge: true});
        console.log('[initials]', app.name, k, JSON.stringify(v).slice(0, 700));
    };
    const snap = async (page, name) => {
        record(`initials-${MODE}-${name}`, await screen(page).catch((e) => ({error: L.flat(e.message)})));
        await shot(page, `initials-${MODE}-${name}`).catch(() => {});
    };
    const {page} = await launch(app);

    // 1–3: sign in as dbarnes, open the submission, "Decline Submission".
    await signIn(page, 'dbarnes');
    await R.openWorkflow(page, app, c.id);
    const pressed = await R.pressDecision(page, 'Decline Submission');
    fact(`${MODE}-decision-opened`, {id: c.id, pressed, url: page.url()});
    // 4: "Insert Content" in the "Notify Authors" message's toolbar.
    const toolbarButton = page.getByRole('button', {name: 'Insert Content', exact: true}).first();
    try {
        const dec = await L.readInsertContent(page, toolbarButton);
        await snap(page, 'step5-decision');
        fact(`${MODE}-step5-decision`, {...L.summarize(dec.rows), rows: dec.rows});
        if (MODE === 'neighbour') {
            const initials = L.summarize(dec.rows).initials;
            if (initials) {
                await dec.win.locator('li').filter({hasText: initials.value}).getByRole('button', {name: 'Insert', exact: true}).first().click();
                await dec.win.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
                await idle(page);
            }
            const message = await page.locator('.tox-edit-area iframe').first().contentFrame().locator('body').innerText().catch((e) => `error: ${e.message}`);
            fact('nb-inserted', {initials, messageHasValue: initials ? message.includes(initials.value) : null, messageStart: L.flat(message, 200)});
            await snap(page, 'nb-inserted');
            await signOut(page).catch(() => {});
            return;
        }
        await L.closeInsert(page, dec.win);
    } catch (e) {
        fact(`${MODE}-step5-decision`, {error: L.flat(e.message)});
        await snap(page, 'step5-decision-error');
    }

    // 6–7: Settings › Workflow › "Emails", "Insert Content" under "Signature".
    try {
        const emails = new WorkflowEmailsSettingsPage(page, app.contextPath);
        await emails.goto();
        const sig = await L.readInsertContent(page, emails.panel.getByRole('button', {name: 'Insert Content', exact: true}).first());
        await snap(page, 'step7-signature');
        fact('step7-signature', {...L.summarize(sig.rows), rows: sig.rows});
        await L.closeInsert(page, sig.win);
    } catch (e) {
        fact('step7-signature', {error: L.flat(e.message)});
        await snap(page, 'step7-signature-error');
    }

    // 8–10: the Emails page, the decline email's "Edit Template", "Insert Content" in the body's toolbar.
    try {
        const manage = new ManageEmailsPage(page, app.contextPath);
        await manage.goto();
        const name = L.DECLINE_EMAIL[app.name];
        const opened = await manage.openEmail(name);
        let template = opened.window;
        if (opened.kind === 'several') {
            const firstRow = (await manage.templateRowsRead(opened.window))[0];
            fact('step9-templates', {name, firstRow});
            template = await manage.openTemplate(opened.window, firstRow.name || firstRow);
        }
        const tpl = await L.readInsertContent(page, manage.templateField('body', 'en').getByRole('button', {name: 'Insert Content', exact: true}));
        await snap(page, 'step10-template');
        fact('step10-template', {email: name, kind: opened.kind, ...L.summarize(tpl.rows), rows: tpl.rows});
        await L.closeInsert(page, tpl.win);
    } catch (e) {
        fact('step10-template', {error: L.flat(e.message)});
        await snap(page, 'step10-template-error');
    }
    await signOut(page).catch(() => {});
});
