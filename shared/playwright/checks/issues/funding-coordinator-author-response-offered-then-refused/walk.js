// U30 A3 issue walk (docs/issues/U30-A3-funding-coordinator-author-response-refused.md): the
// review stage's "Author Response" table offers an assigned Funding coordinator "Request
// Response", "View" and "Delete", and the app refuses them. On PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`, submission 13 (review
// round 1, revisions requested). The kit builds nothing. Only a journal shows the table (a press
// shows none, spec U30 OMP1; a preprint server has no review): OMP and OPS are not walked. Every
// step is recorded and none throws, so the same script reads the state a fix brings (a control
// gone) and the 3.5 screens.
//
// MODE=walk (default), the Steps:
//   1 admin gives svogt "Funding coordinator" (Administration > Hosted Journals > Settings wizard >
//   Users > Edit User); 2 dbarnes assigns Sarah Vogt as Funding coordinator on submission 13;
//   3 svogt opens submission 13, reads the "Author Response" table; 4 "Request Response";
//   5 lkumiega submits a response from the "Author Response" card; 6 svogt reads the row's "More
//   Actions"; 7 "View", the window, "Cancel"; 8-9 "Delete" > "OK", the dialog, the table after a
//   reload and the stored response.
// MODE=nb, the neighbours alone (with a fix in and out), on a fresh dataset:
//   dbarnes on submission 13: the table, "Request Response" opens "Request Author Response";
//   dbuskins (the assigned Section editor) the same; lkumiega submits a response (the window keeps
//   "Submit Response"); dbuskins "View" (the window has "Save"); dbarnes "Delete" > "OK" removes it,
//   and lkumiega's card offers "Submit Response" again.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/funding-coordinator-author-response-offered-then-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a3-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const TAG = 'u30b';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[a3 ${app.name}] no "Author Response" table on this app: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 500)}; }
        console.log(`[a3 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        record(`a3-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a3-${MODE}-${key}`).catch(() => {});
        record(`a3-facts-${MODE}`, o);
        return o[key];
    };
    const respond = (text) => step('authorSubmits', async () => {
        await signIn(page, c.author);
        const card = await H.openStage(page, app, c.id, {author: true});
        return {card, ...(await H.authorSubmits(page, text)), stored: H.stored(app, c.id)};
    });
    try {
        if (MODE === 'nb') {
            await step('nbEditorTable', async () => {
                await signIn(page, 'dbarnes');
                const shown = await H.openStage(page, app, c.id);
                return {shown, ...(await H.readTable(page)), request: await H.pressRequest(page)};
            });
            await step('nbSectionEditorTable', async () => {
                await signIn(page, 'dbuskins');
                const shown = await H.openStage(page, app, c.id);
                return {shown, ...(await H.readTable(page)), request: await H.pressRequest(page)};
            });
            await respond(`${TAG} neighbour response`);
            await step('nbSectionEditorView', async () => {
                await signIn(page, 'dbuskins');
                await H.openStage(page, app, c.id);
                const menu = await H.rowMenu(page, c.authorName);
                const viewed = (await H.chooseFromMenu(page, c.authorName, 'View')) ? await H.readWindowAndCancel(page) : null;
                return {menu, viewed};
            });
            await step('nbEditorDelete', async () => {
                await signIn(page, 'dbarnes');
                await H.openStage(page, app, c.id);
                const del = await H.deleteResponse(page, c.authorName);
                await H.openStage(page, app, c.id);
                return {del, after: await H.readTable(page), stored: H.stored(app, c.id)};
            });
            await step('nbAuthorCardAgain', async () => {
                await signIn(page, c.author);
                await H.openStage(page, app, c.id, {author: true});
                const card = page.getByRole('dialog').first().getByRole('button', {name: /Submit Response|View Submitted Response/});
                return {card: (await card.allInnerTexts()).map((t) => H.flat(t, 60))};
            });
        } else {
            await step('s1Role', async () => {                                          // 1
                await signIn(page, 'admin');
                const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
                await R.giveRoleAsAdmin(page, app, {username: 'svogt', role: 'Funding coordinator'});
                return {given: 'Funding coordinator'};
            });
            await step('s2Assign', async () => {                                        // 2
                await signIn(page, 'dbarnes');
                const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
                return R.assignAs(page, app, c.id, {role: 'Funding coordinator', personName: 'Sarah Vogt'});
            });
            await step('s3Table', async () => {                                         // 3
                await signIn(page, 'svogt');
                const shown = await H.openStage(page, app, c.id);
                return {shown, ...(await H.readTable(page))};
            });
            await step('s4Request', async () => H.pressRequest(page));                  // 4
            await respond(`${TAG} response`);                                           // 5
            await step('s6Menu', async () => {                                          // 6
                await signIn(page, 'svogt');
                await H.openStage(page, app, c.id);
                return {table: await H.readTable(page), menu: await H.rowMenu(page, c.authorName)};
            });
            await step('s7View', async () => {                                          // 7
                if (!(await H.chooseFromMenu(page, c.authorName, 'View'))) return {viewOffered: false};
                return {viewOffered: true, ...(await H.readWindowAndCancel(page))};
            });
            await step('s8Delete', async () => H.deleteResponse(page, c.authorName));  // 8-9
            await step('s9After', async () => {                                         // 9
                await H.openStage(page, app, c.id);
                return {table: await H.readTable(page), stored: H.stored(app, c.id)};
            });
        }
    } finally {
        record(`a3-facts-${MODE}`, o);
        await close();
    }
});
