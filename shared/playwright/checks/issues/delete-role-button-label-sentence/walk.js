// Issue report docs/issues/U41-A12-delete-role-button-label-sentence.md (U41 A12): the report's
// Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"). The kit builds nothing.
//
// Steps (default mode):
//   1-2  rvaca: Settings › Workflow › "Submission" › "Contributor Roles"
//   3-4  "Translator" row › "More Actions" › "Delete Role": the dialog's text and its buttons
//        (accessible name, disabled state)
//   5    type "TRANSLATOR": the buttons again
//   6    the confirm button (the primary one): the answer dialog, then the role list
// MODE=neighbour (the neighbour check for fix.diff): steps 1-4, then "translator" (wrong case) is
//   typed: the confirm button must stay disabled; "Cancel" closes and "Translator" stays listed.
// On stable-3_5_0 the walk stops after step 2 when there is no "Contributor Roles" tab.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u41g --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u41g PROBE_AGENT=u41g node bin/probe.js all shared/playwright/checks/issues/delete-role-button-label-sentence/walk.js
// Neighbour:    MODE=neighbour PROBE_RUN=nb-out PROBE_FEATURE=issues-u41g PROBE_AGENT=u41g node bin/probe.js all …/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u41g-3_5 PROBE_AGENT=u41g node bin/probe.js all …/walk.js
// Facts: .reports/<feature>/u41g/walk[-<run>]-<app>.json, screens NN-<name>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const L = require('../one-role-journal-contributor-save-fails/lib.js');

const MODE = process.env.MODE || 'steps';

/** The open delete-role dialog's buttons: accessible name and whether each is disabled. */
async function dialogButtons(d) {
    return d.evaluate((root) => [...root.querySelectorAll('button')]
        .filter((b) => b.getClientRects().length > 0)
        .map((b) => ({name: (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim(),
            disabled: b.disabled, primary: /--primary|is-primary|bg-primary/.test(b.className)})));
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page).catch((e) => ({error: L.flat(e.message, 200)}));
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const step = async (name, fn) => {
        try { return await fn(); } catch (e) { fact(`${name}.FAILED`, L.flat(e.stack || e, 900)); await snap(`${name}-FAILED`); return null; }
    };

    try {
        // 1-2
        await signIn(page, 'rvaca');
        const before = await step('roles', () => L.openContributorRoles(page, app));
        fact('rolesBefore', before);
        await snap('contributor-roles');
        if (!before) { fact('stop', 'no "Contributor Roles" tab on Settings › Workflow › Submission'); return; }

        // 3-4
        const row = page.locator('#contributorRoles tbody tr').filter({has: page.getByText('Translator', {exact: true})});
        await row.getByRole('button', {name: 'More Actions'}).click();
        await page.getByRole('menuitem', {name: 'Delete Role', exact: true}).click();
        const d = page.getByRole('dialog').filter({hasText: 'Are you absolutely sure'}).last();
        await d.waitFor({timeout: L.T});
        fact('dialogText', L.flat(await d.innerText(), 700));
        fact('buttonsBeforeTyping', await dialogButtons(d));
        await snap('delete-dialog');

        // 5
        const typed = MODE === 'neighbour' ? 'translator' : 'TRANSLATOR';
        await d.locator('input').first().fill(typed);
        await idle(page).catch(() => {});
        fact('typed', typed);
        const after = await dialogButtons(d);
        fact('buttonsAfterTyping', after);
        await snap(`delete-dialog-typed-${typed}`);

        if (MODE === 'neighbour') {
            await d.getByRole('button', {name: 'Cancel', exact: true}).click();
            await idle(page).catch(() => {});
            await L.sleep(500);
            fact('dialogOpenAfterCancel', await page.getByRole('dialog').filter({hasText: 'Are you absolutely sure'}).count());
            fact('rolesAfterCancel', await L.roleRows(page));
            await snap('after-cancel');
            return;
        }

        // 6: the confirm button is the one beside "Cancel" (whatever it is labeled)
        const confirm = d.locator('button').filter({hasNotText: 'Cancel'}).last();
        fact('confirmLabel', L.flat(await confirm.innerText(), 200));
        await confirm.click();
        await idle(page).catch(() => {});
        const done = page.getByRole('dialog').filter({hasText: /Role Deleted|Error/}).last();
        await done.waitFor({timeout: L.T}).catch(() => {});
        fact('answer', L.flat(await done.innerText().catch(() => ''), 300));
        await snap('answer');
        const back = done.getByRole('button', {name: /Back to Contributor Roles|OK/});
        if (await back.count()) await back.first().click();
        await idle(page).catch(() => {});
        await L.sleep(600);
        fact('rolesAfter', await L.roleRows(page));
        await snap('contributor-roles-after');
    } finally {
        record('walk', facts);
        await close();
    }
});
