// Issue report docs/issues/U70-A6-unpublished-book-notice-still-approved.md (U70 A6, U33 OMP2): after
// "Unpublish" a press's Production stage keeps the "Catalog Management" notice ("The monograph has been
// approved…") instead of "Awaiting approval.". Takes the report's Steps on PKP's default test dataset
// (a dataset fleet), OMP only (the notice is a press's):
//   1  sign in as dbarnes
//   2  submission 5 ("Bomb Canada…", published, one version): the workflow
//   3  side menu "Production": the notice
//   4  side menu "Title & Abstract": "Unpublish", confirmed
//   5  "Production": the notice
//   6  the public catalog: the book listed or not
//   7  sign in as callan (the author): the book › "Production": the notice
// WALK=neighbour runs alone (fix in and out), the paths the fix must leave as they are:
//   n1 dbarnes, submission 4 (Production, never published): "Awaiting approval."
//   n2 submission 5: "Unpublish", then "Publish" again: "Catalog Management"
//   n3 submission 4: "Catalog Entry" › "Date Published" 2030-01-01, "Save"; "Schedule For Publication": the notice
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u70e --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u70e PROBE_AGENT=u70e node bin/probe.js omp shared/playwright/checks/issues/unpublished-book-notice-still-approved/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u70e-3_5 PROBE_AGENT=u70e node bin/probe.js omp …/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, note, serverLog, sql} = require('../../../probe');
const W = require('../one-item-reads-1-items/lib.js');
const C = require('../chapter-page-dates-and-preview-notice/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK || 'walk';
const BOOK = {sid: 5, title: 'Bomb Canada'};
const NEVER = {sid: 4, title: 'How Canadians Communicate'};

/** The notice rows of a submission (assoc type 1048585 = submission) and its current version's state. */
function rows(app, sid) {
    return {
        notifications: sql(app, `select type, coalesce(user_id::text, 'none') from notifications where assoc_type = 1048585 and assoc_id = ${sid} and type in (16777243, 16777245, 16777246) order by type`),
        publication: sql(app, `select p.publication_id, p.status, p.date_published from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id = ${sid}`),
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        note(`u70e A6: ${app.name} skipped, the Production notice is a press's`);
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page).catch(() => null);
    };
    const production = async (label, sid) => {
        await L.openStage(page, 'Production');
        const out = {boxes: await L.noticeBoxes(page), header: await L.header(page), ...rows(app, sid)};
        record(`a6-${label}`, await screen(page));
        return out;
    };
    try {
        if (MODE === 'walk') {
            await step('1 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step(`2 submission ${BOOK.sid}: the workflow`, () => L.openWorkflow(page, app, BOOK.sid));
            await step('3 Production, published', () => production('s3-published', BOOK.sid));
            await step('4 Title & Abstract: Unpublish, confirmed', async () => {
                await L.openStage(page, 'Title & Abstract');
                return {status: await W.unpublish(page), header: await L.header(page)};
            });
            await step('5 Production, same page', () => production('s5-unpublished', BOOK.sid));
            await step('6 public catalog', async () => {
                const r = await page.goto(app.url(`/index.php/publicknowledge${/3_[34]/.test(app.line || '') ? '' : '/en'}/catalog`));
                await idle(page).catch(() => {});
                const text = await page.locator('body').innerText();
                return {status: r && r.status(), listsBook: text.includes(BOOK.title)};
            });
            await step('7 sign in as callan, Production', async () => {
                await signOut(page).catch(() => {});
                await signIn(page, 'callan');
                await page.goto(L.dash(app, 'mySubmissions', BOOK.sid));
                await idle(page).catch(() => {});
                await page.getByRole('dialog').first().waitFor({timeout: L.T});
                await L.sleep(1500);
                return production('s7-author', BOOK.sid);
            });
        } else if (MODE === 'neighbour') {
            await step('n0 sign in as dbarnes', () => signIn(page, 'dbarnes'));
            await step(`n1 submission ${NEVER.sid}: Production, never published`, async () => {
                await L.openWorkflow(page, app, NEVER.sid);
                return production('n1-never', NEVER.sid);
            });
            await step(`n2a submission ${BOOK.sid}: Unpublish`, async () => {
                await L.openWorkflow(page, app, BOOK.sid);
                await L.openStage(page, 'Title & Abstract');
                return {status: await W.unpublish(page)};
            });
            await step('n2b Publish again', async () => {
                await L.openWorkflow(page, app, BOOK.sid);
                await L.openStage(page, 'Title & Abstract');
                return W.publish(page);
            });
            await step('n2c Production, republished', () => production('n2-republished', BOOK.sid));
            await step(`n3a submission ${NEVER.sid}: Catalog Entry, Date Published 2030-01-01`, async () => {
                await L.openWorkflow(page, app, NEVER.sid);
                const opened = await W.openCategoriesPage(page);
                return {opened, ...(await C.setBookDate(page, '2030-01-01'))};
            });
            await step('n3b Schedule For Publication', async () => {
                await L.openWorkflow(page, app, NEVER.sid);
                await L.openStage(page, 'Title & Abstract');
                return C.publishOrSchedule(page);
            });
            await step('n3c Production, scheduled', () => production('n3-scheduled', NEVER.sid));
        }
    } finally {
        fact('server log since start', log.since(from));
        record(`a6-facts-${MODE}`, facts);
        await close();
    }
});
