// Issue report docs/issues/U52-A11-merged-payer-breaks-payments-list-and-publishing.md: the press's
// side of the same merge. A reader who bought a book file loses the purchase when their account is
// merged into another. OMP only, on a dataset fleet freshly reset.
//   1. dbarnes: Settings › Distribution › "Payments": "Enable", US Dollar, "Manual Fee Payment",
//      instructions, "Save"
//   2. book 14 › "Publication Formats" › "PDF" › "Segmentation of Vascular Ultrasound Imag.pdf" ›
//      "Open Access": "Direct Sales", 25.00, "Save"
//   3. aclark: the book's page, the file's link: "Manual Fee Payment" (the purchase is queued)
//   4. PayPal's callback, which no test install receives: the SQL that
//      OMPPaymentManager::fulfillQueuedPayment() runs for that queued payment (the completed
//      payment written with the queued payment's type, press, user, file, amount and currency,
//      read from its payment_data; the queued payment deleted)
//   5. aclark: the file's link again: the file opens (the purchase counts)
//   6. admin: Settings › Users & Roles: Arthur Clark's "…" › "Merge user" › Alvin Finkel's
//      "Merge into this User" › "OK"
//   7. afinkel: the book's page, the file's link
// Reads `completed_payments` after 4 and 6.
// Run: PROBE_FEATURE=<fleet feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/merged-payer-breaks-payments-list-and-publishing/omp.js
//      (PROBE_RUN=fixin with fix-omp.diff applied; PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 on 3.5)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const {flat} = require('./lib');

const BOOK = 14;
const TITLE = 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots';
const FILE = 'Segmentation of Vascular Ultrasound Imag.pdf';
const BUYER = {username: 'aclark', name: 'Arthur Clark'};
const TARGET = {username: 'afinkel', name: 'Alvin Finkel'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('omp.js runs on a dataset fleet');
    const {setUpPayments, openFormats, setDirectSales, openBook, pressFileLink} = require('../priced-file-link-price-twice-or-missing/lib');
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    const {serverLog} = require('./lib');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1400)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: flat(e.message, 400)});
        }
    };
    const uid = (u) => sql(app, `select user_id from users where username='${u}'`);
    const stored = () => sql(app, "select completed_payment_id, coalesce(user_id::text,'NULL'), assoc_id, amount, currency_code_alpha, payment_method_plugin_name from completed_payments order by 1") || 'no row';
    const read = (r) => ({url: r.url, heading: r.heading, body: flat(r.body, 160)});
    const log = serverLog(app);
    const ids = {buyer: uid(BUYER.username), target: uid(TARGET.username)};
    fact('0 accounts', ids);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await step('1 payments on', () => setUpPayments(page, app, {currency: 'USD', instructions: 'Pay by bank transfer u52r5'}));
        await step('2 file for sale', async () => setDirectSales(page, await openFormats(page, app, BOOK), 'PDF', FILE, '25.00'));

        await signIn(page, BUYER.username);
        await step('3 buyer presses the link', async () => {
            await openBook(page, app, TITLE);
            return {...read(await pressFileLink(page, FILE)), queued: sql(app, 'select queued_payment_id from queued_payments order by 1')};
        });

        await step('4 the payment completes (PayPal callback, SQL)', async () => {
            // the queued payment's own user, file, amount and currency (createCompletedPayment() copies them)
            const q = sql(app, 'select queued_payment_id from queued_payments order by 1 desc limit 1');
            const data = sql(app, `select payment_data from queued_payments where queued_payment_id=${q}`);
            const prop = (name) => (data.match(new RegExp(`"${name}";(?:i|d):([0-9.]+);`)) || [])[1];
            const cur = (data.match(/"currencyCode";s:\d+:"([A-Z]{3})"/) || [])[1];
            const [user, file, amount, ctx, type] = ['userId', 'assocId', 'amount', 'contextId', 'type'].map(prop);
            sql(app, `insert into completed_payments (timestamp, payment_type, context_id, user_id, assoc_id, amount, currency_code_alpha, payment_method_plugin_name) values (now(), ${type}, ${ctx}, ${user}, ${file}, ${amount}, '${cur}', 'PaypalPayment'); delete from queued_payments where queued_payment_id=${q}`);
            return {queuedPayment: q, user, file, amount, cur, stored: stored()};
        });

        await step('5 buyer presses the link again', async () => {
            await openBook(page, app, TITLE);
            return read(await pressFileLink(page, FILE));
        });

        await signIn(page, 'admin');
        await step('6 merge', async () => {
            const list = new UsersListPage(page, app.contextPath);
            await list.goto();
            await list.search('Clark');
            await idle(page);
            await list.chooseAction(list.row(`${BUYER.username}@mailinator.com`), 'Merge user');
            const win = new MergeUserWindow(page);
            await win.expectOpen();
            await win.grid.search({text: 'Finkel'});
            await win.mergeInto(TARGET.username);
            const r = await win.confirm();
            await idle(page).catch(() => {});
            return {merge: r.status(), buyerLeft: uid(BUYER.username) || 'deleted', stored: stored()};
        });

        await signIn(page, TARGET.username);
        await step('7 merged-into account presses the link', async () => {
            await openBook(page, app, TITLE);
            const out = read(await pressFileLink(page, FILE));
            record('s7-target', await screen(page));
            return out;
        });
        await signOut(page).catch(() => {});
        fact('server log', log.since());
    } finally {
        record('omp-facts', facts);
        await close();
    }
});
