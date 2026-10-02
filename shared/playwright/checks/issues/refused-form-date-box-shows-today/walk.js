// Issue report docs/issues/U51-A28-refused-form-date-box-shows-today.md (U51 A28): after a
// refused "Save" in "Create New Subscription", the empty "Start date" and "End date" boxes show
// today's date, which the window does not send. OJS only (subscriptions are a journal's), on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal
// `publicknowledge`. The kit builds nothing; every step is a screen.
//
//   1 rvaca: "Payments" › "Subscription Types": "u51sb7 Online Year" (10 USD, Online, 12 months)
//   2 "Individual Subscriptions" › "Create New Subscription"
//   3 the type only, the dates empty, "Save"        4 read the date boxes
//   5 ccorino, "Active", "Save"
//   6 type today's date (as the box shows it) and next year's, "Save"
//   7 (when still refused) type yesterday's date and then today's into "Start date", "Save"
// With `neighbour` as its argument, instead of 3-7 (the fix must leave a typed date alone):
//   N1 type both dates, no user, "Save" (refused for the user)   N2 read the boxes
//   N3 dsokoloff, "Active", "Save"     N4 the row's "Edit": the stored dates in the boxes
//
// Reset first: npm run fleet-prep -- --feature issues-sb7 --dataset 8 --reset
// Run (main):  PROBE_FEATURE=issues-sb7 PROBE_AGENT=sb7 node bin/probe.js ojs shared/playwright/checks/issues/refused-form-date-box-shows-today/walk.js [neighbour]
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb7-3_5 PROBE_AGENT=sb7 node bin/probe.js ojs <this file> [neighbour]
// Facts: .reports/<feature>/sb7/a28-facts[-neighbour][-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const MANAGER = 'rvaca';
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
    const stored = () => sql(app, "select subscription_id, user_id, status, coalesce(date_start::text,'-'), coalesce(date_end::text,'-') from subscriptions order by 1") || 'no row';
    const name = (n) => `a28-${n}${NEIGHBOUR ? '-neighbour' : ''}`;

    const {page, close} = await launch(app);
    try {
        await signIn(page, MANAGER);
        await step('1 type', () => L.createType(page, app));
        let win;
        await step('2 open', async () => {
            win = await L.openCreate(page, app);
            return L.readWindow(win);
        });

        if (!NEIGHBOUR) {
            await step('3 save, type only', async () => {
                await win.chooseType(L.TYPE);
                return L.save(page, win);
            });
            await step('4 boxes', async () => {
                record(name('4-window'), await screen(page));
                await shot(page, name('4-window')).catch(() => {});
                return {start: await L.readDate(win, 'dateStart'), end: await L.readDate(win, 'dateEnd')};
            });
            await step('5 save, user and status', async () => {
                await win.chooseUser('ccorino', L.userId(app, 'ccorino'));
                await win.chooseStatus('Active');
                const before = {start: await L.readDate(win, 'dateStart'), end: await L.readDate(win, 'dateEnd')};
                const out = {before, ...(await L.save(page, win).catch(async (e) => ({error: L.flat(e.message, 200), window: await L.readWindow(win)})))};
                await shot(page, name('5-window')).catch(() => {});
                return out;
            });
            await step('6 type today and next year, save', async () => {
                const shown = await win.dateBox('dateStart').inputValue();
                const today = shown || L.dayFrom();
                const start = await L.typeDate(page, win, 'dateStart', today);
                const end = await L.typeDate(page, win, 'dateEnd', L.dayFrom({years: 1}));
                const out = {shownBefore: shown, start, end, ...(await L.save(page, win))};
                record(name('6-window'), await screen(page));
                await shot(page, name('6-window')).catch(() => {});
                return out;
            });
            if (facts['6 type today and next year, save'] && facts['6 type today and next year, save'].window && facts['6 type today and next year, save'].window.open) {
                await step('7 yesterday then today, save', async () => {
                    const today = (await win.dateBox('dateStart').inputValue()) || L.dayFrom();
                    const first = await L.typeDate(page, win, 'dateStart', L.dayFrom({days: -1}));
                    const second = await L.typeDate(page, win, 'dateStart', today);
                    return {first, second, ...(await L.save(page, win))};
                });
            }
        } else {
            await step('N1 dates, no user, save', async () => {
                await win.chooseType(L.TYPE);
                await win.chooseStatus('Active');
                const start = await L.typeDate(page, win, 'dateStart', L.dayFrom({days: -1}));
                const end = await L.typeDate(page, win, 'dateEnd', L.dayFrom({years: 1}));
                return {start, end, ...(await L.save(page, win))};
            });
            await step('N2 boxes', async () => ({start: await L.readDate(win, 'dateStart'), end: await L.readDate(win, 'dateEnd')}));
            await step('N3 user, save', async () => {
                await win.chooseUser('dsokoloff', L.userId(app, 'dsokoloff'));
                return L.save(page, win);
            });
            await step('N3 row', () => L.P.managerRow(page, app, 'Individual Subscriptions', 'Sokoloff'));
            await step('N4 edit', async () => {
                const edit = await L.openEdit(page, app, 'Sokoloff');
                const out = await L.readWindow(edit);
                await shot(page, name('N4-edit')).catch(() => {});
                await edit.close().catch(() => {});
                return out;
            });
        }
        fact('stored', stored());
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
