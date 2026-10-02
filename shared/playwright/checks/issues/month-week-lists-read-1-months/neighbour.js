// Neighbour check for the U51 A15 fix (fix.diff): run with the fix in and out, on a freshly
// reset dataset fleet. The fix changes only the label of the count 1; this shows that
//   N1  the other counts read as before ("2 Months" … "60 Months", "2 Weeks", "3 Weeks");
//   N2  the count 1 still saves as 1 and reads back chosen: "Delayed Open Access" and the
//       four "Subscription Expiry Reminders" lists, each set to its first count, "Save", reload;
//   N3  the French interface's lists (fr_CA, the dataset's second language): what the first
//       count reads there, the language the new strings have not reached.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb8 --dataset 9 --reset
// Run:          PROBE_FEATURE=issues-sb8 PROBE_AGENT=sb8 [PROBE_RUN=fix] node bin/probe.js ojs shared/playwright/checks/issues/month-week-lists-read-1-months/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const L = require('../delayed-open-access-box-empty/lib');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const texts = (s) => s.all.filter((t, i) => i <= 3 || i === s.all.length - 1);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        // N1 + N2, "Delayed Open Access"
        let access = await L.openAccess(page);
        await L.chooseSubscriptionMode(access);
        const list = await L.readSelect(access.delayedList());
        fact('N1 Delayed Open Access', {count: list.count, entries: texts(list)});
        await access.delayedList().selectOption('1');
        fact('N2 Delayed Open Access Save', await L.saveAccess(page, access));
        fact('N2 stored', L.stored(app));
        access = await L.openAccess(page);
        const back = await L.readSelect(access.delayedList());
        fact('N2 Delayed Open Access after reload', {shown: back.shown, value: back.value});

        // N1 + N2, the reminder lists
        let {form, lists} = await L.readReminderLists(page);
        for (const [name, s] of Object.entries(lists)) fact(`N1 ${name}`, {count: s.count, entries: texts(s)});
        await form.locator('[name="subscriptionName"]').fill('Subscriptions u51sb8');
        await form.locator('[name="subscriptionEmail"]').fill('subs-u51sb8@mailinator.com');
        await form.locator('[name="subscriptionMailingAddress"]').fill('1 Harbour Road u51sb8');
        for (const name of L.REMINDERS) await form.locator(`select[name="${name}"]`).selectOption('1');
        const saved = page.waitForResponse((r) => /saveSubscriptionPolicies/i.test(r.url()) && r.request().method() === 'POST', {timeout: L.T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await saved;
        await idle(page).catch(() => {});
        fact('N2 policies Save', r ? r.status() : null);
        ({lists} = await L.readReminderLists(page));
        for (const [name, s] of Object.entries(lists)) fact(`N2 ${name} after reload`, {shown: s.shown, value: s.value, stored: L.stored(app, name)});
        record('N2-policies', await screen(page));

        // N3, French: the same two screens by their fr_CA addresses
        await page.goto(app.url(`/index.php/${L.CTX}/fr_CA/management/settings/distribution#access`));
        await idle(page).catch(() => {});
        const frDelayed = page.locator('select[id*="delayedOpenAccessDuration"]').first();
        await frDelayed.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
        if (await frDelayed.count()) {
            const s = await L.readSelect(frDelayed);
            fact('N3 fr_CA Delayed Open Access', {label: s.label, shown: s.shown, entries: texts(s)});
        } else fact('N3 fr_CA Delayed Open Access', 'not found');
        record('N3-fr-access', await screen(page));
        await page.goto(app.url(`/index.php/${L.CTX}/fr_CA/payments`));
        await idle(page).catch(() => {});
        await page.getByRole('main').getByRole('tab').nth(3).click();
        const frForm = page.locator('form#subscriptionPolicyForm, form:has(select[name="numMonthsBeforeSubscriptionExpiryReminder"])').first();
        await frForm.locator('select[name="numMonthsBeforeSubscriptionExpiryReminder"]').waitFor({state: 'visible', timeout: L.T});
        for (const name of L.REMINDERS) {
            const s = await L.readSelect(frForm.locator(`select[name="${name}"]`));
            fact(`N3 fr_CA ${name}`, {shown: s.shown, entries: texts(s)});
        }
        record('N3-fr-policies', await screen(page));
    } finally {
        record('facts', facts);
        await close();
    }
});
