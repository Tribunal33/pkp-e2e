// Issue report docs/issues/U51-A21-subscription-end-before-start-saved.md (U51 A21): the
// manager's subscription window saves a "Start date" after the "End date", and the subscriber
// is then refused the journal's restricted content. OJS only (subscriptions are a journal's),
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal
// `publicknowledge`. The kit builds nothing; every step is a screen.
//
//   P1 rvaca: Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   P2 Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   P3 "Payments" › "Subscription Types": "u51sb7 Online Year" (10 USD, Online, 12 months)
//   1 "Individual Subscriptions" › "Create New Subscription"   2 ccorino, the type, "Active"
//   3 "Start date" eleven months on, "End date" a month ago (typed), "Save"   4 the list row
//   5 ccorino: "Signalling Theory Dividends" › "PDF"
//   6 (control) rvaca: the row's "Edit": the two dates the right way round, "Save"
//   7 (control) ccorino: "PDF"
// With `neighbour` as its argument (the fix must leave these alone): a start date equal to the
// end date (a one-day subscription) saved, and a start date before the end date saved.
//
// Reset first: npm run fleet-prep -- --feature issues-sb7 --dataset 8 --reset
// Run (main):  PROBE_FEATURE=issues-sb7 PROBE_AGENT=sb7 node bin/probe.js ojs shared/playwright/checks/issues/subscription-end-before-start-saved/walk.js [neighbour]
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb7-3_5 PROBE_AGENT=sb7 node bin/probe.js ojs <this file> [neighbour]
// Facts: .reports/<feature>/sb7/a21-facts[-neighbour][-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('../refused-form-date-box-shows-today/lib');

const MANAGER = 'rvaca';
const READER = 'ccorino';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ARTICLE = 1; // "Signalling Theory Dividends"
const NEIGHBOUR = process.argv.includes('neighbour');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // OMP and OPS have no subscriptions
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, neighbour: NEIGHBOUR, today: L.dayFrom()};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: L.flat(e.message, 500)});
        }
    };
    const stored = () => sql(app, "select subscription_id, user_id, status, date_start::text, date_end::text from subscriptions order by 1") || 'no row';
    const early = L.dayFrom({months: -1});
    const late = L.dayFrom({months: 11});
    const name = (n) => `a21-${n}${NEIGHBOUR ? '-neighbour' : ''}`;

    /** Create (or, with `edit`, edit Carlo Corino's row) with the two dates typed, "Save". */
    const saveWith = async (label, {user = READER, start, end, edit = false}) => {
        const win = edit ? await L.openEdit(page, app, 'Corino') : await L.openCreate(page, app);
        if (!edit) {
            await win.chooseUser(user, L.userId(app, user));
            await win.chooseType(L.TYPE);
            await win.chooseStatus('Active');
        }
        const s = await L.typeDate(page, win, 'dateStart', start);
        const e = await L.typeDate(page, win, 'dateEnd', end);
        const out = {start: s, end: e, ...(await L.save(page, win))};
        record(name(label), await screen(page));
        await shot(page, name(label)).catch(() => {});
        if (out.window.open) await win.close().catch(() => {});
        return out;
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('P1 access', () => L.P.requireSubscriptions(page, app));
        await step('P2 issue access', () => L.P.restrictIssue(page, ISSUE));
        await step('P3 type', () => L.createType(page, app));

        if (!NEIGHBOUR) {
            await step('1-3 start after end, save', () => saveWith('3-saved', {start: late, end: early}));
            await step('4 row', () => L.P.managerRow(page, app, 'Individual Subscriptions', 'Corino'));
            fact('4 stored', stored());
            await signIn(page, READER);
            await step('5 pdf', () => L.P.pressGalley(page, app, ARTICLE));
            await shot(page, name('5-pdf')).catch(() => {});
            await signIn(page, MANAGER);
            await step('6 edit, dates the right way round', () => saveWith('6-edit', {start: early, end: late, edit: true}));
            await step('6 row', () => L.P.managerRow(page, app, 'Individual Subscriptions', 'Corino'));
            await signIn(page, READER);
            await step('7 pdf', () => L.P.pressGalley(page, app, ARTICLE));
        } else {
            const today = L.dayFrom();
            await step('N1 start equals end, save', () => saveWith('N1-one-day', {start: today, end: today}));
            await step('N1 row', () => L.P.managerRow(page, app, 'Individual Subscriptions', 'Corino'));
            await signIn(page, READER);
            await step('N1 pdf', () => L.P.pressGalley(page, app, ARTICLE));
            await signIn(page, MANAGER);
            await step('N2 start before end, save (another reader)', () => saveWith('N2-saved', {user: 'dsokoloff', start: early, end: late}));
            await step('N2 row', () => L.P.managerRow(page, app, 'Individual Subscriptions', 'Sokoloff'));
        }
        fact('stored', stored());
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
