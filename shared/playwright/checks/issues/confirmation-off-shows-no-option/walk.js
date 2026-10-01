// "Submission Confirmation" on Settings › Workflow › "Emails" shows no option
// selected once "Do not send an email." is saved (spec U21 register A12).
// Takes the report's Steps through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as `rvaca`:
//   1-2  Settings › Workflow › "Emails": read "Submission Confirmation"
//   3    choose "Do not send an email.", "Save"
//   4    reload, "Emails": read which option is selected
//   5    "Save" again unchanged, reload, "Emails": read it again
// NEIGHBOUR=1 (the fix's neighbour check): step 3 chooses "Send an email to the
// submitting author only." instead, and steps 4-5 must show it selected; the
// "Editorial Statistics" radios are read on every load too.
// The kit builds nothing. Besides the screens it reads the stored setting from
// the database after each save (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w39 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-w39 PROBE_AGENT=w39 node bin/probe.js all shared/playwright/checks/issues/confirmation-off-shows-no-option/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w39-3_5 PROBE_AGENT=w39 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w39/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Every radio of a group on the Emails panel: its label and whether it is checked. */
async function readGroup(panel, name) {
    return panel.locator(`input[type=radio][name="${name}"]`).evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
        checked: e.checked,
    })));
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const neighbour = !!process.env.NEIGHBOUR;
    const choice = neighbour ? 'Send an email to the submitting author only.' : 'Do not send an email.';
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour, choice};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `${neighbour ? 'nb' : 'w'}-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    // The stored setting: "rows:<n> value:<v>" (no row means the setting is off).
    const stored = () => sql(app, `select 'rows:' || count(*) || ' value:' || coalesce(max(setting_value), '(none)') from ${app.contextTables.settings} where setting_name = 'submissionAcknowledgement'`);

    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    // TinyMCE's "fire" deprecation warning shows at every editor mount on every page; left out.
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/TinyMCE/.test(m.text())) errors.push(`${m.type()}: ${flat(m.text(), 300)}`); });
    page.setDefaultTimeout(30_000);

    const openEmails = async (label) => {
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/management/settings/workflow`));
        await idle(page);
        await page.getByRole('tab', {name: 'Emails', exact: true}).click();
        await idle(page);
        const panel = page.locator('#emails');
        await panel.locator('input[name="submissionAcknowledgement"]').first().waitFor({timeout: 30_000});
        await rec(page, label);
        return panel;
    };
    const read = async (panel) => ({
        submissionConfirmation: await readGroup(panel, 'submissionAcknowledgement'),
        editorialStatistics: await readGroup(panel, 'editorialStatsEmail'),
    });
    const save = async (panel, label) => {
        const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20_000}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        // The form posts form-encoded fields; keep only the one this report is about.
        const sent = r ? new URLSearchParams(r.request().postData() || '') : null;
        const saved = await panel.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page);
        await rec(page, label);
        return {status: r ? r.status() : null, sentAck: sent ? (sent.has('submissionAcknowledgement') ? `"${sent.get('submissionAcknowledgement')}"` : '(absent)') : null, saved, db: stored()};
    };

    try {
        // Step 1
        await signIn(page, 'rvaca');
        // Step 2
        let panel = await openEmails('s2-emails-opened');
        fact('step 2 before', await read(panel));
        // Step 3
        await panel.getByRole('radio', {name: choice, exact: true}).and(panel.locator('[name="submissionAcknowledgement"]')).check();
        await rec(page, 's3-chosen');
        fact('step 3 save', await save(panel, 's3-saved'));
        // Step 4
        panel = await openEmails('s4-emails-reopened');
        fact('step 4 after reload', await read(panel));
        // Step 5
        fact('step 5 save unchanged', await save(panel, 's5-saved-again'));
        panel = await openEmails('s5-emails-reopened');
        fact('step 5 after reload', await read(panel));
        await signOut(page);
    } finally {
        fact('page errors and console', errors);
        record('facts', facts);
        await close();
    }
});
