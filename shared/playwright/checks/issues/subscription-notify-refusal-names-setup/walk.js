// Issue report walk: docs/issues/U51-A4-subscription-notify-refusal-names-setup.md
// (spec U51 register A4). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   step 1     sign in as the journal manager `rvaca`;
//   step 2     create the individual type "Online Year u51w19";
//   steps 3-4  "Individual Subscriptions" › "Create New Subscription": Alan
//              Mwandenga, the type, "Active", 2026-10-01 to 2027-09-30, and
//              "Send the user an email …" ticked;
//   step 5     "Save": the refusal, read from the window;
//   step 6     "Subscription Policies": the "Subscription Manager" name, email
//              and mailing address typed, "Save";
//   step 7     steps 3-5 again: saved, and Alan Mwandenga's "Subscription
//              Notification" read from the mail catcher.
// Between steps 5 and 6 the walk reads the Settings screens (Journal, Website
// with Appearance › "Setup", Distribution) for the subscription contact's
// fields, to show where the message's "journal Setup" leads.
// Step numbers are the report's. The kit builds nothing.
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check, contact still empty: n1 the box ticked and no
//               user chosen, refused with "A user is required." and the
//               contact message; n2 the user chosen and the box unticked:
//               saved, no mail to the subscriber.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-notify-refusal-names-setup/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);

const T = 30_000;
const TAG = 'u51w19';
const TYPE = `Online Year ${TAG}`;
const SUBSCRIBER = 'amwandenga';
const SUBSCRIBER_EMAIL = 'amwandenga@mailinator.com';
const OLD = 'In order to send the user a notification email, the subscription contact name and email address must be specified in the journal Setup.';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const cp = app.contextPath;
    const facts = {line: app.line || 'main', mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const userId = (u) => Number(sql(app, `SELECT user_id FROM users WHERE username = '${u}'`));
    const contact = () => sql(app, `SELECT setting_name || '=' || coalesce(setting_value, '') FROM journal_settings WHERE setting_name IN ('subscriptionName', 'subscriptionEmail') ORDER BY 1`).trim();
    // The subscriber's mail naming the walk's type, sent since `since` (the slot's one
    // mail catcher keeps earlier walks' mail).
    const mails = async (since = 0) => {
        const r = await app.mail._search({to: SUBSCRIBER_EMAIL, contains: TAG}).catch(() => ({messages: []}));
        return (r.messages || []).filter((m) => Date.parse(m.Created) >= since)
            .map((m) => ({id: m.ID, subject: m.Subject, from: m.From, created: m.Created}));
    };
    const started = Date.now() - 1000;

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const payments = new PaymentsPage(page, cp);

    /** Type a date the way a person does: click the box, select all, type it key by key, Tab away. */
    async function typeByKeys(sw, which, value) {
        const box = sw.dateBox(which);
        await box.click();
        await box.press('ControlOrMeta+a');
        await box.pressSequentially(value, {delay: 40});
        await box.press('Tab');
        await pause(200);
    }

    /** Steps 3-4 (and the neighbour's variants): the window filled in. */
    async function openAndFill({user = true, notify = true} = {}) {
        await payments.gotoTab('Individual Subscriptions');
        const sw = await payments.openCreateSubscription('Individual Subscriptions');
        if (user) await sw.chooseUser(SUBSCRIBER, userId(SUBSCRIBER));
        await sw.chooseType(TYPE);
        await sw.chooseStatus('Active');
        await typeByKeys(sw, 'dateStart', '2026-10-01');
        await typeByKeys(sw, 'dateEnd', '2027-09-30');
        if (notify) await sw.emailBox().check(); else await sw.emailBox().uncheck();
        fact(`window-${user ? 'user' : 'nouser'}-${notify ? 'notify' : 'quiet'}`, {
            emailBoxLabel: flat(await sw.dialog.locator('label[for^="notifyEmail"]').first().innerText().catch(() => '')),
            ticked: await sw.emailBox().isChecked()});
        return sw;
    }

    /** "Save", recorded: accepted (the window closes) or refused, with the window's messages. */
    async function save(step, sw) {
        const response = await sw.save();
        await pause(400);
        const open = await sw.dialog.isVisible().catch(() => false);
        const text = open ? flat(await sw.dialog.innerText().catch(() => '')) : '';
        const out = {step, status: response.status(), accepted: !open,
            topNotice: open ? flat(await sw.dialog.locator('.pkp_notification, [id*="Notification"]').first().innerText().catch(() => ''), 800) : '',
            fieldErrors: open ? (await sw.fieldErrors().allInnerTexts()).map((t) => flat(t)) : [],
            oldMessageShown: text.includes(OLD),
            contactMessage: (text.match(/In order to send the user a notification email[^.]*\./) || [null])[0],
            userRequired: text.includes('A user is required.')};
        await snap(`step${step}-save`, {walk: out});
        fact(`step${step}`, out);
        return out;
    }

    /** Where "the journal Setup" leads: the Settings screens, read for the contact's fields. */
    async function settingsScreens() {
        const out = {};
        for (const [label, tail] of [['Journal', 'context'], ['Website', 'website'], ['Distribution', 'distribution']]) {
            await page.goto(app.url(`/index.php/${cp}/en/management/settings/${tail}`));
            await idle(page);
            const tabs = (await page.getByRole('main').getByRole('tab').allInnerTexts()).map((t) => flat(t));
            const html = await page.content();
            out[label] = {tabs, subscriptionFields: /name="subscription(Name|Email)"/.test(html),
                mentionsSubscriptionManager: /Subscription Manager/.test(await page.getByRole('main').innerText().catch(() => ''))};
            if (tail === 'website') {
                await page.getByRole('main').getByRole('tab', {name: 'Appearance', exact: true}).click();
                await idle(page);
                const setupTab = page.locator('#setup-button').filter({visible: true}).first();
                await setupTab.click();
                await idle(page);
                out[label].appearanceSetup = flat(await page.locator('[id="setup"]').filter({visible: true}).first().innerText().catch(() => ''), 700);
                await snap('reach-website-appearance-setup');
            }
        }
        fact('settings-screens', out);
    }

    try {
        await signIn(page, 'rvaca', {contextPath: cp});                                                    // 1
        fact('contact-at-start', contact());
        await payments.gotoTab('Subscription Types');                                                       // 2
        fact('page-heading', flat(await payments.heading().innerText()));
        const type = await payments.openCreateType();
        await type.fill({name: TYPE, currency: 'USD', cost: '10', format: 'Online', duration: '12'});
        await type.kindRadio('Individual (users are validated via login)').check();
        fact('step2-type', (await type.saveAccepted()).status());

        if (MODE === 'steps') {
            const sw = await openAndFill();                                                                 // 3-4
            await snap('step4-window');
            const s5 = await save('5', sw);                                                                 // 5
            if (s5.accepted) throw new Error('step 5 was accepted');
            fact('mail-after-5', await mails(started));
            await sw.close().catch(() => {});

            await settingsScreens();                                                                        // reach

            await payments.gotoTab('Subscription Policies');                                                // 6
            const pol = payments.policies();
            fact('policies-section', flat(await pol.panel.locator('form').first().innerText(), 500));
            await pol.nameBox().fill(`Subscriptions Desk ${TAG}`);
            await pol.emailBox().fill('rvaca@mailinator.com');
            await pol.addressBox().fill('1 Harbour Road');
            const ps = await pol.save();
            await pause(400);
            fact('step6', {status: ps.status(), notices: (await screen(page)).notices, contact: contact()});

            const sw7 = await openAndFill();                                                                // 7
            const s7 = await save('7', sw7);
            let mail = [];
            for (let i = 0; i < 20 && !mail.length; i++) { mail = await mails(started); if (!mail.length) await pause(1000); }
            fact('step7-mail', mail);
            if (mail.length) {
                const full = await app.mail.fullMessage(mail[0].id);
                fact('step7-mail-body', flat(full.Text || full.HTML, 600));
            }
            await payments.gotoTab('Individual Subscriptions');
            fact('list-rows', (await payments.rows('Individual Subscriptions').allInnerTexts()).map((s) => flat(s, 300)));
            await snap('list');
            if (!s7.accepted) fact('step7-refused', true);
        } else {
            const n1w = await openAndFill({user: false, notify: true});                                     // n1
            const n1 = await save('n1', n1w);
            await n1w.close().catch(() => {});
            const n2w = await openAndFill({user: true, notify: false});                                     // n2
            const before = Date.now() - 1000;
            const n2 = await save('n2', n2w);
            await pause(3000);
            fact('neighbour', {n1Refused: !n1.accepted, n1UserRequired: n1.userRequired, n1ContactMessage: n1.contactMessage,
                n2Saved: n2.accepted, n2Mail: await mails(before), stored: sql(app, `SELECT s.status, s.date_start, s.date_end FROM subscriptions s JOIN users u ON u.user_id = s.user_id WHERE u.username = '${SUBSCRIBER}'`)});
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
