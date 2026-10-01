// Kept walk for docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md,
// the "Payment Types" steps (spec U52 register A4). Takes the report's
// Payment Types steps through the screens on a dataset fleet (PKP's default
// test dataset, harness.md "Dataset fleets"), OJS only (OMP and OPS have no
// "Payment Types" form):
//   `rvaca` turns payments on (Settings › Distribution › "Payments": "Enable",
//   "Manual Fee Payment", "Save"), opens the side menu's "Payments" and its tab
//   "Payment Types", reads the labels, asterisks and the line under "Save",
//   and saves the form empty.
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check, after the Steps: "abc" in "Article Processing
//               Charge" must still be refused, "10" saved; the "Subscription
//               Types" tab's "Create New Subscription Type" window, whose
//               fields are required, must keep its note and asterisks.
//
// The kit builds nothing. Every screen is recorded with screen().
//
// Reset the fleet before each walk (the walk changes the dataset):
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-required-note-without-required-field/payment-types.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const NOTE = 'Required fields are marked with an asterisk: *';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no "Payment Types" form on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const cp = app.contextPath;
    const label = `a4-${MODE}`;
    const facts = {label, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    const failed = [];
    page.on('response', (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${r.request().method()} ${r.url().replace(app.baseURL, '')}`); });
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, s); return s; };

    // A form's labels with their asterisks, every "*" outside a label, and the note.
    const readForm = (form) => form.evaluate((f, note) => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const labels = [...f.querySelectorAll('label, legend, .label')].filter(vis)
            .map((l) => l.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const marked = [...f.querySelectorAll('.req')].filter(vis).map((r) => (r.closest('label, .label, legend') || r.parentElement).innerText.replace(/\s+/g, ' ').trim());
        const required = [...f.querySelectorAll('[required], .required, [aria-required="true"]')].map((e) => e.name || e.id || e.outerHTML.slice(0, 160));
        const notes = [...f.querySelectorAll('.formRequired')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim());
        return {labels, marked, required, notes, noteShown: notes.includes(note)};
    }, NOTE);

    const saveTypes = async (panel) => {
        const rs = page.waitForResponse((x) => /savePaymentTypes/.test(x.url()), {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await rs; await idle(page); await pause(500);
        let body = null;
        try { body = r ? JSON.parse(await r.text()) : null; } catch { /* not JSON */ }
        const s = await screen(page);
        return {status: r ? r.status() : null, jsonStatus: body ? body.status : null,
            notices: s.notices, errors: await panel.locator('.error, .pkp_form_error, label.error').allInnerTexts().then((a) => a.map(flat).filter(Boolean))};
    };

    try {
        // 1. sign in
        await signIn(page, 'rvaca', {contextPath: cp});
        // 2-3. Settings › Distribution › "Payments": "Enable", "Manual Fee Payment", "Save"
        await page.goto(app.url(`/index.php/${cp}${app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en'}/management/settings/distribution`));
        await idle(page);
        await page.getByRole('tab', {name: 'Payments', exact: true}).click();
        await idle(page); await pause(500);
        const pay = page.getByRole('tabpanel', {name: 'Payments', exact: true});
        await pay.getByRole('checkbox', {name: /Payments will be enabled/}).check();
        await pause(300);
        await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
        await pause(300);
        const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r3 = await rs; await idle(page); await pause(500);
        fact('03-payments-save', r3 ? r3.status() : null);
        await snap('payments-enabled');
        // 4. side menu "Payments", tab "Payment Types"
        const menu = page.locator('nav#app-nav [aria-label="Payments"]').first();
        fact('04-side-menu-payments', await menu.count());
        await menu.click();
        await page.waitForURL(/\/payments/, {timeout: T});
        await idle(page);
        const payments = new PaymentsPage(page, cp);
        await payments.showTab('Payment Types');
        const panel = payments.panel('Payment Types');
        const form = panel.locator('form#paymentTypesForm');
        await form.waitFor({timeout: T});
        // 5. read the form
        fact('05-form', await readForm(form));
        fact('05-text-under-save', flat(await form.evaluate((f) => {
            const b = f.querySelector('.formButtons'); let t = ''; let e = b ? b.nextElementSibling : null;
            while (e) { t += ' ' + e.innerText; e = e.nextElementSibling; } return t;
        })));
        await snap('payment-types-opened');
        // 6. every box empty, "Save"
        fact('06-values-before-save', await form.locator('input[type="text"]').evaluateAll((is) => is.map((i) => `${i.name}=${i.value}`)));
        fact('06-save-empty', await saveTypes(panel));
        await snap('payment-types-saved-empty');

        if (MODE === 'neighbour') {
            // a refused value stays refused, a good one is saved
            await panel.locator('input[name="publicationFee"]').fill('abc');
            fact('n1-save-abc', await saveTypes(panel));
            await snap('payment-types-abc');
            await payments.goto();
            await payments.showTab('Payment Types');
            const panel2 = payments.panel('Payment Types');
            await panel2.locator('input[name="publicationFee"]').fill('10');
            fact('n2-save-10', await saveTypes(panel2));
            await payments.goto();
            await payments.showTab('Payment Types');
            fact('n2-after-reload', await payments.panel('Payment Types').locator('input[name="publicationFee"]').inputValue());
            fact('n2-form-after-reload', await readForm(payments.panel('Payment Types').locator('form#paymentTypesForm')));
            // a form with required fields keeps its note and asterisks
            await payments.showTab('Subscription Types');
            const win = await payments.openCreateType();
            const winForm = page.locator('form#subscriptionTypeForm').first();
            await winForm.waitFor({timeout: T});
            fact('n3-type-window', await readForm(winForm));
            await snap('subscription-type-window');
            await win.close().catch(() => {});
        }
        fact('server-errors', failed);
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
});
