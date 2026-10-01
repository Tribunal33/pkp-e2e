// A press refuses the comma-separated "Notify Anyone" list its own help text
// asks for (spec U21 register OMP2; docs/issues/U21-OMP2-press-notify-anyone-list-refused.md).
// Takes the report's Steps through the screens on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), as `rvaca`, on every app
// (OJS and OPS are the control):
//   1-3  Settings › Workflow › "Emails": read "Notify Anyone" and its help text
//   4-5  type "one@example.com,two@example.com", "Save": the request's answer,
//        the error under the box, the stored setting
//   6    reload, "Emails": read "Notify Anyone" again
// NEIGHBOUR=1 (the fix's neighbour check): steps 4-6 run twice more, with one
// address ("one@example.com", which must save) and with a list holding a bad
// part ("one@example.com,not-an-address", which must stay refused).
// ALSO=1 (what the refusal drops): step 4 also switches "Editorial Statistics"
// to the option not selected, so the one save carries a second change; after
// the reload both are read, then the box is set to "one@example.com" alone and
// saved again (the way round), and both are read once more.
// The kit builds nothing. Besides the screens it reads the stored setting from
// the database after each save (Evidence only).
//
// Reset first:  npm run fleet-prep -- --feature issues-w44 --dataset 9 --reset
// Run (main):   PROBE_FEATURE=issues-w44 PROBE_AGENT=w44 [NEIGHBOUR=1 | ALSO=1] [PROBE_RUN=fix] node bin/probe.js all shared/playwright/checks/issues/press-notify-anyone-list-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w44-3_5 PROBE_AGENT=w44 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w44/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LIST = 'one@example.com,two@example.com';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const neighbour = !!process.env.NEIGHBOUR;
    const also = !neighbour && !!process.env.ALSO;
    const values = neighbour ? ['one@example.com', 'one@example.com,not-an-address'] : also ? [LIST, 'one@example.com'] : [LIST];
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    const facts = {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, neighbour, also, values};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `${neighbour ? 'nb' : also ? 'also' : 'w'}-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const stored = () => sql(app, `select 'rows:' || count(*) || ' value:"' || coalesce(max(setting_value), '(none)') || '"' from ${app.contextTables.settings} where setting_name = 'copySubmissionAckAddress'`);

    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/TinyMCE/.test(m.text())) errors.push(`${m.type()}: ${flat(m.text(), 300)}`); });
    page.setDefaultTimeout(30_000);

    const openEmails = async (label) => {
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/management/settings/workflow`));
        await idle(page);
        await page.getByRole('tab', {name: 'Emails', exact: true}).click();
        await idle(page);
        const panel = page.locator('#emails');
        await panel.locator('input[name="copySubmissionAckAddress"]').waitFor({timeout: 30_000});
        await rec(page, label);
        return panel;
    };
    // The "Notify Anyone" box: its label, help text, value and any error under it.
    const readBox = async (panel) => panel.locator('input[name="copySubmissionAckAddress"]').evaluate((input) => {
        const field = input.closest('.pkpFormField') || input.parentElement;
        const txt = (sel) => [...field.querySelectorAll(sel)].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
        return {
            label: txt('.pkpFormFieldLabel')[0] || null,
            help: txt('.pkpFormField__description')[0] || null,
            value: input.value,
            ariaInvalid: input.getAttribute('aria-invalid'),
            errors: txt('.pkpFieldError__message'),
        };
    });
    // "Editorial Statistics": the label of the checked radio, and the stored setting.
    const readStats = async (panel) => ({
        checked: await panel.locator('input[type=radio][name="editorialStatsEmail"]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => ((e.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim())),
        db: sql(app, `select 'rows:' || count(*) || ' value:"' || coalesce(max(setting_value), '(none)') || '"' from ${app.contextTables.settings} where setting_name = 'editorialStatsEmail'`),
    });
    const trySave = async (panel, value, label, other = false) => {
        const box = panel.locator('input[name="copySubmissionAckAddress"]');
        await box.fill(value);
        if (other) {
            const unchecked = panel.locator('input[type=radio][name="editorialStatsEmail"]:not(:checked)').first();
            await unchecked.check();
        }
        const resp = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 20_000}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        let body = null;
        if (r && r.status() >= 400) body = flat(await r.text().catch(() => null), 600);
        const saved = await panel.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page);
        await rec(page, `${label}-saved`);
        const sent = r ? new URLSearchParams(r.request().postData() || '') : null;
        return {typed: value, sentFields: sent ? [...new Set(sent.keys())] : null, status: r ? r.status() : null, body, savedNotice: saved, box: await readBox(panel), db: stored()};
    };

    try {
        // Step 1
        await signIn(page, 'rvaca');
        // Steps 2-3
        let panel = await openEmails('s2-emails-opened');
        fact('step 3 Notify Anyone', {...(await readBox(panel)), db: stored()});
        let i = 0;
        for (const value of values) {
            i += 1;
            // Steps 4-5
            if (also) fact(`step 4 Editorial Statistics before (${i})`, await readStats(panel));
            fact(`step 5 save (${i}) ${value}`, await trySave(panel, value, `s5-${i}`, also && i === 1));
            // Step 6
            panel = await openEmails(`s6-${i}-emails-reopened`);
            fact(`step 6 after reload (${i})`, await readBox(panel));
            if (also) fact(`step 6 Editorial Statistics after reload (${i})`, await readStats(panel));
        }
        await signOut(page);
    } finally {
        fact('page errors and console', errors);
        record(neighbour ? 'nb-facts' : also ? 'also-facts' : 'walk-facts', facts);
        await close();
    }
});
