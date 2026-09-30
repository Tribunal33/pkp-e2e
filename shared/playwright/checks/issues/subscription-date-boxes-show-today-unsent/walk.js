// Issue report walk: docs/issues/U51-A28-subscription-date-boxes-show-today-unsent.md
// (spec U51 register A28). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   step 1     sign in as the journal manager `rvaca`;
//   step 2     create the individual type "Online Year u51w10";
//   steps 3-4  "Individual Subscriptions" › "Create New Subscription", choose
//              Alan Mwandenga, the type and "Active", dates left empty;
//   step 5     "Save": refused; the date boxes read afterwards;
//   step 6     "Save" again, the boxes untouched (sent to the server, or refused in
//              the browser with "This field is required." under an empty box);
//   step 7     type today's date (as the box shows it) into "Start date" key
//              by key, and the same day next year into "End date"; "Save";
//   step 8     (only when step 7 was refused) open "Start date"'s calendar,
//              click the highlighted day, "Save".
// Step numbers are the report's. The kit builds nothing. Every save is
// recorded with screen(); the visible boxes, the hidden fields the form
// posts, the posted dateStart/dateEnd/userId, the window's messages and the
// fleet's server-log errors go into the facts.
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check, on the same setup: dates typed and a refusal
//               for another reason (no user) keep the typed dates and send
//               them; the saved subscription's "Edit" shows its stored
//               dates; a published article page still shows its date.
//   reach       the same fault on the neighbouring screens (after step 2):
//               r0 payments switched on, the side menu's "Payments" and the
//               page's heading; r1 an institution added, then "Institutional
//               Subscriptions" › "Create New Subscription" with it, refused with the dates empty, then "Save"
//               again; r2 "Edit" of a saved subscription with "Start date"
//               cleared, refused, then "Save" again; r3 the way round by the
//               calendar: click the highlighted day, "Save"; r4 Issues ›
//               "Create Issue" refused (Title ticked, empty) with "Date
//               Published" empty, then the title typed and "Save": the date
//               stored.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-date-boxes-show-today-unsent/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour', 'reach'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);

const T = 30_000;
const TAG = 'u51w10';
const TYPE = `Online Year ${TAG}`;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const nextYearOf = (ymd) => `${Number(ymd.slice(0, 4)) + 1}${ymd.slice(4)}`;

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const cp = app.contextPath;
    const facts = {line: app.line || 'main', mode: MODE, saves: []};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const userId = (u) => Number(sql(app, `SELECT user_id FROM users WHERE username = '${u}'`));

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const payments = new PaymentsPage(page, cp);

    // What the browser posts on each "Save" (the form's own traffic).
    let lastPost = null;
    page.on('request', (r) => {
        if (/subscriptions-grid\/update-subscription(\?|$)/.test(r.url()) && r.method() === 'POST') {
            const p = new URLSearchParams(r.postData() || '');
            lastPost = {dateStart: p.get('dateStart'), dateEnd: p.get('dateEnd'), userId: p.get('userId'), typeId: p.get('typeId'),
                dateStartRemoved: p.get('dateStart-removed'), dateEndRemoved: p.get('dateEnd-removed')};
        }
    });

    /** The two date boxes: what the manager sees and what the form holds to post. */
    async function boxes(sw) {
        const read = async (which) => ({
            shown: await sw.dateBox(which).inputValue(),
            posted: await sw.dialog.locator(`input[type="hidden"][name="${which}"]`).inputValue(),
        });
        return {dateStart: await read('dateStart'), dateEnd: await read('dateEnd')};
    }

    /** The window's refusal messages. */
    async function messages(sw) {
        const t = flat(await sw.dialog.innerText().catch(() => ''));
        return (t.match(/(A subscription (start|end) date is required\.|A user is required\.|[^.]*already has a subscription[^.]*\.|[^.]*valid[^.]*date[^.]*\.)/g) || []);
    }

    /** "Save", recorded: accepted (the window closes) or refused. */
    async function save(step, sw) {
        const from = logSize();
        lastPost = null;
        // The window posts, or refuses in the browser ("This field is required." under a
        // box it marks required after a refusal by the server), sending nothing.
        const answer = page.waitForResponse((r) => /subscriptions-grid\/update-subscription(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        const inBrowser = sw.dialog.locator('label.error').filter({hasText: 'This field is required.'}).first()
            .waitFor({state: 'visible', timeout: T}).then(() => 'browser').catch(() => null);
        await sw.saveButton().click();
        const first = await Promise.race([answer, inBrowser]);
        const response = first === 'browser' ? null : first;
        if (response) {
            await idle(page);
            if (/<form/.test(await response.text())) await sw.expectUsersLoaded();
        }
        await pause(300);
        const open = await sw.dialog.isVisible().catch(() => false);
        const out = {step, status: response ? response.status() : 'not sent', posted: lastPost, accepted: !open,
            browserMessages: open ? (await sw.dialog.locator('label.error').filter({hasText: 'This field is required.'}).allInnerTexts()).map((t) => flat(t)) : [],
            messages: open ? await messages(sw) : [], boxesAfter: open ? await boxes(sw) : null,
            userStillChosen: open ? await sw.userRadio(userId('amwandenga')).isChecked().catch(() => null) : null,
            log: logSince(from)};
        await snap(`step${step}-save`, {walk: out});
        facts.saves.push(out);
        console.log(`[${app.name}] step ${step}: ${JSON.stringify(out)}`);
        return out;
    }

    /** Type a date the way a person does: click the box, select all, type it key by key, Tab away. */
    async function typeByKeys(sw, which, value) {
        const box = sw.dateBox(which);
        await box.click();
        await box.press('ControlOrMeta+a');
        await box.pressSequentially(value, {delay: 40});
        await box.press('Tab');
        await pause(200);
    }

    /** Clear a date box the way a person does: click, select all, Delete, Tab. */
    async function clearByKeys(sw, which) {
        const box = sw.dateBox(which);
        await box.click();
        await box.press('ControlOrMeta+a');
        await box.press('Delete');
        await box.press('Tab');
        await pause(200);
    }

    /** The neighbouring screens (mode `reach`). */
    async function reach() {
        const uidA = userId('amwandenga');
        // r0: switch payments on (Settings › Distribution › "Payments"), then the side menu.
        const {PaymentSettingsTab} = require('../../../pages/PaymentsPages.js');
        const {EditorialSideMenu} = require('../../../pages/SubscriptionsPages.js');
        const ps = new PaymentSettingsTab(page, cp);
        await ps.goto();
        if (!(await ps.enableBox().isChecked())) await ps.enableBox().check();
        if (!(await ps.chosenOption(ps.currencySelect()))) await ps.currencySelect().selectOption('USD');
        await ps.save();
        await page.goto(app.url(`/index.php/${cp}/en/dashboard/editorial`)).catch(() => {});
        await idle(page);
        const menu = new EditorialSideMenu(page);
        fact('r0-side-menu', await menu.labels());
        await menu.entry('Payments').click();
        await idle(page);
        fact('r0-payments-page', {url: page.url(), heading: flat(await payments.heading().innerText())});
        await snap('r0-payments');

        // r1: institutional (an institution first: the window requires one before it posts).
        const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
        const inst = new InstitutionsPage(page, cp);
        await inst.goto();
        const ip = await inst.openAdd();
        await ip.nameBox('en').fill(`Harbour Library ${TAG}`);
        await ip.ipRangesBox.fill('192.0.2.0/24');
        fact('r1-institution', (await ip.saveAccepted({refetch: true})).status());
        await payments.gotoTab('Subscription Types');
        const it = await payments.openCreateType();
        await it.fill({name: `Campus Year ${TAG}`, currency: 'USD', cost: '100', format: 'Online', duration: '12'});
        await it.kindRadio('Institutional (users are validated via domain or IP address)').check();
        fact('r1-type', (await it.saveAccepted()).status());
        await payments.gotoTab('Institutional Subscriptions');
        const iw = await payments.openCreateSubscription('Institutional Subscriptions');
        await iw.chooseUser('amwandenga', uidA);
        await iw.chooseType(`Campus Year ${TAG}`);
        await iw.chooseStatus('Active');
        await iw.chooseInstitution(`Harbour Library ${TAG}`);
        fact('r1-before', await boxes(iw));
        const r1a = await save('r1a', iw);
        const r1b = await save('r1b', iw);
        fact('r1', {first: {messages: r1a.messages, boxes: r1a.boxesAfter}, second: {status: r1b.status, posted: r1b.posted, messages: r1b.messages, boxes: r1b.boxesAfter}});
        await iw.close().catch(() => {});

        // r2: edit a saved subscription, "Start date" cleared.
        await payments.gotoTab('Individual Subscriptions');
        const cw = await payments.openCreateSubscription('Individual Subscriptions');
        await cw.chooseUser('amwandenga', uidA);
        await cw.chooseType(TYPE);
        await cw.chooseStatus('Active');
        await typeByKeys(cw, 'dateStart', '2026-01-15');
        await typeByKeys(cw, 'dateEnd', '2027-01-15');
        fact('r2-created', (await save('r2-create', cw)).accepted);
        await payments.gotoTab('Individual Subscriptions');
        const ew = await payments.openEditSubscription('Individual Subscriptions', 'Mwandenga');
        fact('r2-edit-opened', await boxes(ew));
        await clearByKeys(ew, 'dateStart');
        fact('r2-cleared', await boxes(ew));
        const r2a = await save('r2a', ew);
        const r2b = await save('r2b', ew);
        fact('r2', {first: {status: r2a.status, messages: r2a.messages, boxes: r2a.boxesAfter}, second: {status: r2b.status, posted: r2b.posted, messages: r2b.messages, browser: r2b.browserMessages, boxes: r2b.boxesAfter}});

        // r3: the way round by the calendar, in the same window.
        if (!r2b.accepted) {
            const calendar = page.locator('#ui-datepicker-div');
            await ew.dateBox('dateStart').click();
            await calendar.waitFor({state: 'visible', timeout: T});
            const day = calendar.locator('td.ui-datepicker-current-day a');
            fact('r3-highlighted-day', flat(await day.innerText()));
            await day.click();
            await pause(300);
            fact('r3-picked', await boxes(ew));
            const r3 = await save('r3', ew);
            fact('r3', {status: r3.status, posted: r3.posted, accepted: r3.accepted, messages: r3.messages});
            fact('r3-stored', sql(app, `SELECT s.date_start, s.date_end FROM subscriptions s JOIN subscription_types t ON t.type_id = s.type_id WHERE t.institutional = 0`));
        }

        // r4: Issues › "Create Issue", "Date Published" left empty.
        const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
        const issues = new IssuesAdmin(page, cp);
        await issues.goto('Future Issues');
        const {dialog, form} = await issues.openCreate();
        const hiddenDate = () => form.form.locator('input[type="hidden"][name="datePublished"]').inputValue();
        fact('r4-before', {shown: await form.dateBox().inputValue(), posted: await hiddenDate(),
            show: {Volume: await form.showBox('Volume').isChecked(), Number: await form.showBox('Number').isChecked(), Year: await form.showBox('Year').isChecked(), Title: await form.showBox('Title').isChecked()}});
        await form.volumeBox().fill('9');
        await form.numberBox().fill('1');
        await form.yearBox().fill('2027');
        await form.showBox('Title').check();
        let posted = null;
        const onReq = (r) => { if (/update-issue/.test(r.url()) && r.method() === 'POST') posted = new URLSearchParams(r.postData() || '').get('datePublished'); };
        page.on('request', onReq);
        await form.save();
        await pause(500);
        const r4a = {posted, text: flat(await dialog.innerText().catch(() => ''), 600), shown: await form.dateBox().inputValue(), hidden: await hiddenDate()};
        fact('r4a', r4a);
        await snap('r4a-issue-refused');
        posted = null;
        await form.titleBox().fill(`Issue ${TAG}`);
        await form.save();
        await pause(800);
        fact('r4b', {posted, windowOpen: await dialog.isVisible().catch(() => false)});
        fact('r4-stored', sql(app, `SELECT i.issue_id, i.volume, i.number, i.year, coalesce(i.date_published::text, 'NULL'), i.published FROM issues i WHERE i.volume = 9 AND i.year = 2027`));
        page.off('request', onReq);
        await snap('r4b-issue-saved');
    }

    try {
        await signIn(page, 'rvaca', {contextPath: cp});                                                    // 1
        await payments.gotoTab('Subscription Types');                                                       // 2
        const type = await payments.openCreateType();
        await type.fill({name: TYPE, currency: 'USD', cost: '10', format: 'Online', duration: '12'});
        await type.kindRadio('Individual (users are validated via login)').check();
        fact('step2-type', (await type.saveAccepted()).status());

        if (MODE === 'reach') { await reach(); return; }

        await payments.gotoTab('Individual Subscriptions');                                                 // 3
        const sw = await payments.openCreateSubscription('Individual Subscriptions');
        fact('step3-boxes', await boxes(sw));
        await snap('step3-window');

        if (MODE === 'steps') {
            await sw.chooseUser('amwandenga', userId('amwandenga'));                                        // 4
            await sw.chooseType(TYPE);
            await sw.chooseStatus('Active');

            const s5 = await save('5', sw);                                                                  // 5
            if (s5.accepted) throw new Error('step 5 was accepted');
            if (!s5.userStillChosen) await sw.chooseUser('amwandenga', userId('amwandenga'));
            const s6 = await save('6', sw);                                                                  // 6
            if (s6.accepted) throw new Error('step 6 was accepted');
            if (!s6.userStillChosen) await sw.chooseUser('amwandenga', userId('amwandenga'));

            const shown = s6.boxesAfter.dateStart.shown || s5.boxesAfter.dateStart.shown;                   // 7
            const today = /^\d{4}-\d{2}-\d{2}$/.test(shown) ? shown
                : sql(app, `SELECT to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD')`).trim();
            fact('today', today);
            await typeByKeys(sw, 'dateStart', today);
            await typeByKeys(sw, 'dateEnd', nextYearOf(today));
            fact('step7-typed', await boxes(sw));
            const s7 = await save('7', sw);

            if (!s7.accepted) {                                                                              // 8
                if (!s7.userStillChosen) await sw.chooseUser('amwandenga', userId('amwandenga'));
                const calendar = page.locator('#ui-datepicker-div');
                await sw.dateBox('dateStart').click();
                await calendar.waitFor({state: 'visible', timeout: T});
                const day = calendar.locator('td.ui-datepicker-current-day a');
                fact('step8-calendar-day', flat(await day.innerText()));
                await day.click();
                await pause(200);
                fact('step8-picked', await boxes(sw));
                await save('8', sw);
            }
            await payments.gotoTab('Individual Subscriptions');
            fact('list', (await payments.firstCells('Individual Subscriptions').catch(() => [])).map((s) => flat(s, 200)));
            fact('list-rows', (await payments.rows('Individual Subscriptions').allInnerTexts()).map((s) => flat(s, 300)));
            await snap('list');
        } else {
            // n1: dates typed (15 January), no user chosen: refused for the user only; the typed dates stay and are sent.
            // A day that is not today, so a date shown can only be the one typed or stored.
            const today = '2026-01-15';
            await sw.chooseType(TYPE);
            await sw.chooseStatus('Active');
            await typeByKeys(sw, 'dateStart', today);
            await typeByKeys(sw, 'dateEnd', nextYearOf(today));
            fact('n1-typed', await boxes(sw));
            const n1 = await save('n1', sw);
            await sw.chooseUser('ccorino', userId('ccorino'));
            const n2 = await save('n2', sw);
            fact('n1-n2', {refusedForUserOnly: JSON.stringify(n1.messages) === JSON.stringify(['A user is required.']),
                datesKept: n1.boxesAfter && n1.boxesAfter.dateStart.shown === today && n1.boxesAfter.dateStart.posted === today,
                savedWithDates: n2.accepted && n2.posted && n2.posted.dateStart === today});
            // n3: the saved subscription's "Edit" shows its stored dates.
            await payments.gotoTab('Individual Subscriptions');
            const edit = await payments.openEditSubscription('Individual Subscriptions', 'Corino');
            fact('n3-edit-boxes', await boxes(edit));
            fact('n3-stored', sql(app, `SELECT s.date_start, s.date_end FROM subscriptions s JOIN users u ON u.user_id = s.user_id WHERE u.username = 'ccorino'`));
            await snap('n3-edit');
            await edit.close();
            // n4: a published article's page still shows its date ("Signalling Theory Dividends", id 1).
            await page.goto(app.url(`/index.php/${cp}/article/view/1`));
            await idle(page);
            const pub = flat(await page.locator('.item.published, .published').first().innerText().catch(() => ''), 300);
            fact('n4-article-published', pub);
            fact('n4-stored', sql(app, `SELECT date_published FROM publications WHERE submission_id = 1 ORDER BY publication_id`));
            await snap('n4-article');
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
