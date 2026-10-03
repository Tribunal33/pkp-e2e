// U74 A12, A13, A14 {OMP}: a book's "Marketing" › "Representatives". A12: the window shows both
// "Role" lists and refuses a supplier until the type is clicked; A13: a representative switched to
// the other type is listed in both groups until a reload; A14: a refused "Delete" (a market names the
// representative) leaves its window open with a spinner. The issue reports' Steps, on PKP's default
// test dataset (submission 4, "How Canadians Communicate", its format "PDF"), as `dbarnes`.
// Spec: docs/specs/U74-onix-metadata-export.md, register A12, A13, A14.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/representative-window-refuses-supplier/walk.js [neighbour]
// (PKP_E2E_LINE=stable-3_5_0 in front for 3.5.)
// `stale` adds a supplier, switches it to an agent, then uses the row left under "Suppliers"
// ("Edit" with a new name, then "Delete"). `neighbour` runs alone what the fixes must leave alone: an agent and a supplier with no role are
// still refused under their own list; an agent's edit that keeps its type updates its row in place;
// a representative no market names is deleted. Records the screens, asserts nothing.
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || process.env.MODE || 'walk';
const ALPHA = 'Alpha Books u74ir9';
const BETA = 'Beta Agency u74ir9';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {watchDialogs} = require('../../../../../apps/omp/playwright/pages/PublicationFormatPages.js');
    const {page, close} = await launch(app);
    const dialogs = watchDialogs(page);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        const show = v && typeof v === 'object' ? {...v, win: undefined, screen: undefined} : v;
        console.log(`[${MODE}] ${k}:`, String(JSON.stringify(show)).slice(0, 1800));
    };
    try {
        await signIn(page, 'dbarnes');
        // Step 2.
        let reps = await L.step(page, 'open', () => L.openRepresentatives(app, page));
        fact('s2-groups', await L.step(page, 'groups-0', () => L.groups(reps)));

        // Steps 3-4: the press's first representative, an agent; the table shows it only after a reload
        // (a representative whose id is 1 is fetched as the "Suppliers" group: a separate fault).
        fact('s3-first-agent', await L.step(page, 'first-agent', async () => {
            const a = await L.openAdd(reps);
            await a.win.chooseType('agent');
            await a.win.roleList('agent').selectOption({label: 'Sales agent (08)'});
            await a.win.nameBox().fill(BETA);
            return {ok: await L.pressOk(page, a.win), groups: await L.groups(reps)};
        }));
        fact('s4-reload', await L.step(page, 'reload-0', async () => {
            await reps.reload();
            return L.groups(reps);
        }));

        if (MODE === 'stale') {
            // A13: what the stale row under "Suppliers" does after a switch to "Agent".
            fact('t1-supplier-added', await L.step(page, 't1', async () => {
                const a = await L.openAdd(reps);
                await a.win.roleList('supplier').selectOption({label: 'Distributor to end-customers (12)'});
                await a.win.nameBox().fill(ALPHA);
                await a.win.chooseType('agent');
                await a.win.chooseType('supplier');
                return {ok: await L.pressOk(page, a.win), groups: await L.groups(reps)};
            }));
            fact('t2-switched', await L.step(page, 't2', async () => {
                const e = await L.openEdit(reps, 'Suppliers', ALPHA);
                await e.win.chooseType('agent');
                await e.win.roleList('agent').selectOption({label: 'Non-exclusive sales agent (06)'});
                return {ok: await L.pressOk(page, e.win), groups: await L.groups(reps)};
            }));
            // The stale row's "Edit": what it loads; then a new name and "OK".
            fact('t3-stale-edit', await L.step(page, 't3', async () => {
                const e = await L.openEdit(reps, 'Suppliers', ALPHA);
                const arrived = e.arrived;
                await e.win.nameBox().fill(`${ALPHA} renamed`);
                return {arrived, ok: await L.pressOk(page, e.win), groups: await L.groups(reps), stored: L.stored(app)};
            }));
            // The stale row's "Delete" (whatever name it still shows), "OK".
            fact('t4-stale-delete', await L.step(page, 't4', async () => {
                const names = await reps.names('Suppliers').allInnerTexts();
                const name = (names[0] || '').trim();
                const out = await L.deleteRow(page, reps, 'Suppliers', name, dialogs);
                return {name, ...out, stored: L.stored(app)};
            }));
            fact('t5-reload', await L.step(page, 't5', async () => {
                await reps.reload();
                return L.groups(reps);
            }));
        } else if (MODE === 'walk') {
            // Steps 5-7: a new supplier.
            const add = await L.step(page, 'open-add', () => L.openAdd(reps));
            fact('s5-add-arrived', add.arrived);
            await shot(page, 's5-add-arrived').catch(() => {});
            record('s5-add-window', await screen(page));
            fact('s6-ok-supplier', await L.step(page, 'ok-supplier', async () => {
                await add.win.roleList('supplier').selectOption({label: 'Distributor to end-customers (12)'});
                await add.win.nameBox().fill(ALPHA);
                const r = await L.pressOk(page, add.win);
                if (r.open) await shot(page, 's6-refused').catch(() => {});
                return r;
            }));
            if (facts['s6-ok-supplier'].open) {
                fact('s7-agent-then-supplier', await L.step(page, 'toggle-ok', async () => {
                    await add.win.chooseType('agent');
                    const afterAgent = await L.windowState(add.win);
                    await add.win.chooseType('supplier');
                    const afterSupplier = await L.windowState(add.win);
                    return {afterAgent, afterSupplier, ok: await L.pressOk(page, add.win)};
                }));
            }
            fact('s7-groups', await L.step(page, 'groups-1', () => L.groups(reps)));
            fact('s7-stored', L.stored(app));

            // Steps 8-10: its "Edit", unchanged.
            const edit = await L.step(page, 'open-edit', () => L.openEdit(reps, 'Suppliers', ALPHA));
            fact('s8-edit-arrived', edit.arrived);
            await shot(page, 's8-edit-arrived').catch(() => {});
            fact('s9-ok-unchanged', await L.step(page, 'ok-unchanged', () => L.pressOk(page, edit.win)));
            if (facts['s9-ok-unchanged'].open) {
                fact('s10-agent-then-supplier', await L.step(page, 'toggle-ok-edit', async () => {
                    await edit.win.chooseType('agent');
                    await edit.win.chooseType('supplier');
                    return L.pressOk(page, edit.win);
                }));
            }

            // Steps 11-13: switched to an agent.
            fact('s11-switch', await L.step(page, 'switch', async () => {
                const e = await L.openEdit(reps, 'Suppliers', ALPHA);
                await e.win.chooseType('agent');
                await e.win.roleList('agent').selectOption({label: 'Non-exclusive sales agent (06)'});
                return L.pressOk(page, e.win);
            }));
            fact('s12-groups', await L.step(page, 'groups-2', () => L.groups(reps)));
            await shot(page, 's12-groups').catch(() => {});
            record('s12-table', await screen(page));
            fact('s13-reload', await L.step(page, 'reload', async () => {
                await reps.reload();
                return L.groups(reps);
            }));
            fact('s13-stored', L.stored(app));

            // Steps 14-15: a market naming the first agent.
            fact('s15-market', await L.step(page, 'market', () =>
                L.addMarket(app, page, {country: 'Canada (CA)', date: '20261001', price: '25', agent: BETA})));

            // Steps 16-20: the first agent's "Delete".
            reps = await L.step(page, 'reopen', () => L.openRepresentatives(app, page));
            fact('s17-20-delete', await L.step(page, 'delete', () => L.deleteRow(page, reps, 'Agents', BETA, dialogs)));
            await shot(page, 's20-after').catch(() => {});
            fact('s20-stored', L.stored(app));
        } else {
            // Neighbour 1: an agent, then a supplier, with "Role" on its empty choice: refused under its own list.
            fact('n1-agent-no-role', await L.step(page, 'n1', async () => {
                const a = await L.openAdd(reps);
                await a.win.chooseType('agent');
                await a.win.nameBox().fill('Agent no role u74ir9');
                const r = await L.pressOk(page, a.win);
                if (r.open) await a.win.cancel().catch(() => {});
                return r;
            }));
            fact('n1-supplier-no-role', await L.step(page, 'n1b', async () => {
                const a = await L.openAdd(reps);
                await a.win.nameBox().fill('Supplier no role u74ir9');
                const r = await L.pressOk(page, a.win);
                if (r.open) await a.win.cancel().catch(() => {});
                return r;
            }));
            // Neighbour 2: an agent added with a role, then edited keeping its type: one row, in place.
            fact('n2-agent-added', await L.step(page, 'n2', async () => {
                const a = await L.openAdd(reps);
                await a.win.chooseType('agent');
                await a.win.roleList('agent').selectOption({label: 'Exclusive sales agent (05)'});
                await a.win.nameBox().fill('Gamma Agency u74ir9');
                return {arrived: a.arrived, ok: await L.pressOk(page, a.win), groups: await L.groups(reps)};
            }));
            fact('n2-agent-edited', await L.step(page, 'n2b', async () => {
                const e = await L.openEdit(reps, 'Agents', 'Gamma Agency u74ir9');
                await e.win.roleList('agent').selectOption({label: 'Sales agent (08)'});
                await e.win.nameBox().fill('Gamma Agency u74ir9 renamed');
                return {arrived: e.arrived, ok: await L.pressOk(page, e.win), groups: await L.groups(reps)};
            }));
            // Neighbour 3: a representative no market names: "Delete" › "OK" removes it.
            fact('n3-delete', await L.step(page, 'n3', () => L.deleteRow(page, reps, 'Agents', 'Gamma Agency u74ir9 renamed', dialogs)));
            fact('n3-stored', L.stored(app));
        }
    } finally {
        facts.dialogs = dialogs.seen;
        record(`u74-reps-${MODE}`, facts);
        await close();
    }
});
