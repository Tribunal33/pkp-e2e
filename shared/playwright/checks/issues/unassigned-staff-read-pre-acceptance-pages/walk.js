// Issue report docs/issues/U13-A16-unassigned-staff-read-pre-acceptance-pages.md (U13 A16, U69 A27):
// a Section Editor (Series editor) or an assistant role not assigned to a submission types its page's
// address and reads its unpublished page while it is still in the Submission or Review stage, or after
// it was declined; the releases answer "404 Not Found" until copyediting. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet); the kit builds nothing, and the only change the walk
// makes is step 11's tick ("Make available with publication" on OJS submission 20).
//
// WALK=walk (default):
//   OJS  1-2  minoue: the workflow of 20 (refused)   3-6  minoue: article/view/20, 4, 18; control 3
//        7    gcox: article/view/4                    8-9  cturner: review request of 20, article/view/20
//        10   control amccrae: article/view/20        11   dbarnes ticks 20's "Make available with publication"
//        12   minoue: article/view/20, "JATS XML"
//   OMP  13   minoue: the workflow of 3              14-15 minoue: catalog/book/3, 17, 18; control 1
//        16   mfritz: catalog/book/3                  17   cturner: review request of 18, catalog/book/18
//        18   control jjanssen: catalog/book/17
//   OPS  19   control minoue: preprint/view/4 (declined, Production) and 1 (Production)
// WALK=neighbour runs alone (fix in and out): what the fix must leave open. OJS: dbarnes (assigned
//   manager) 20 and 4; rvaca (manager, unassigned) 4; dbuskins (Section editor assigned to 20) 20 and
//   18; zzedd (20's author) 20; minoue (unassigned) 3 in Copyediting; gcox (unassigned) the unpublished
//   version 1.1 of submission 1, which sits in the "Done" stage; dbuskins presses 20's "JATS XML"
//   (dbarnes ticks it first when it is not ticked). OMP: dbarnes (Press editor) 6 (assigned, internal
//   review) and 3 (unassigned); minoue 6 (assigned); bbarnetson 3 (its author); mfritz 1 (unassigned,
//   Copyediting). OPS: dbuskins (assigned) 4; minoue 1.
//
// Reset first:  npm run fleet-prep -- --feature issues-x1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-x1 PROBE_AGENT=x1 node bin/probe.js all shared/playwright/checks/issues/unassigned-staff-read-pre-acceptance-pages/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-x1-3_5 PROBE_AGENT=x1 node bin/probe.js all shared/playwright/checks/issues/unassigned-staff-read-pre-acceptance-pages/walk.js
// Facts: .reports/<feature>/x1/a16-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const H = require('./lib.js');
const J = require('../jats-make-available-offered-then-refused/lib.js');

const MODE = process.env.WALK || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `a16-${s}-${MODE}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 600)}; }
        if (dialogs.length) facts[`${key} dialogs`] = dialogs.splice(0);
        const shown = {...facts[key]}; delete shown.text;
        console.log(`[a16] ${app.name} ${MODE} ${key}: ${JSON.stringify(shown).slice(0, 700)}`);
        return facts[key];
    };
    const as = async (user) => { await signIn(page, user); facts.signedIn = (facts.signedIn || []).concat(user); };
    const authors = (id) => H.authorNames(app, sql, id);
    const read = (id) => H.readPage(page, app, id, authors(id));
    const readReview = async (id) => {
        const path = `/index.php/${app.contextPath}/en/reviewer/submission/${id}`;
        const r = await page.goto(app.url(path));
        await idle(page).catch(() => {});
        const body = await page.locator('body').innerText().catch(() => '');
        return {path, status: r ? r.status() : null, authorsShown: authors(id).filter((a) => body.includes(a)),
            text: H.flat((await screen(page)).text.main, 600)};
    };
    const tickJats = async (id) => {
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const {JatsPage} = require('../../../pages/JatsBodyTextPages.js');
        const frame = new WorkflowPage(page, app.contextPath);
        const jats = new JatsPage(page, frame);
        await frame.gotoEditorial(id).catch(() => {});
        await idle(page).catch(() => {});
        const reached = await J.openPage(frame, 'JATS XML');
        await jats.ready().waitFor({state: 'visible', timeout: 30_000}).catch(() => {});
        await idle(page).catch(() => {});
        const before = await J.boxState(jats);
        if (!before.present || before.disabled || before.checked) return {reached, before, pressed: false};
        let windowText = null;
        const answer = await J.pressAndAnswer(page, (r) => /\/jats\/visibility/.test(r.url()) && r.request().method() !== 'GET', async () => {
            const dialog = await jats.pressMakePublic(true);
            windowText = H.flat(await dialog.innerText());
            await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        });
        await idle(page).catch(() => {});
        return {reached, before, pressed: true, windowText, answer, after: await J.boxState(jats)};
    };
    const pressJats = async (id) => {
        const p = await read(id);
        if (!p.jatsLink) return {page: p, link: false};
        const {pressJatsLink} = require('../../../pages/JatsBodyTextPages.js');
        const got = await pressJatsLink(page).catch((e) => ({threw: H.flat(e.message, 300)}));
        const xml = got && (got.text || got.raw || '');
        return {page: {status: p.status, previewNotice: p.previewNotice}, link: true,
            download: got.threw ? got : {name: got.name, bytes: xml.length, namesAuthors: authors(id).filter((a) => {
                const [given, ...rest] = a.split(' ');
                return xml.includes(given) && xml.includes(rest.join(' '));
            })}};
    };

    try {
        if (app.name === 'ojs' && MODE === 'walk') {
            await as('minoue');
            await step('2 minoue workflow 20', () => H.tryWorkflow(page, app, 20));
            await step('3 minoue page 20', () => read(20));
            record(name('03-minoue-20'), await screen(page));
            await step('4 minoue page 4', () => read(4));
            await step('5 minoue page 18', () => read(18));
            await step('6 control minoue page 3', () => read(3));
            await as('gcox');
            await step('7 gcox page 4', () => read(4));
            await as('cturner');
            await step('8 cturner review request 20', () => readReview(20));
            await step('9 cturner page 20', () => read(20));
            record(name('09-cturner-20'), await screen(page));
            await as('amccrae');
            await step('10 control amccrae page 20', () => read(20));
            await as('dbarnes');
            await step('11 dbarnes ticks JATS 20', () => tickJats(20));
            await as('minoue');
            await step('12 minoue JATS XML 20', () => pressJats(20));
        }
        if (app.name === 'ojs' && MODE === 'neighbour') {
            await as('dbarnes');
            await step('n dbarnes page 20', () => read(20));
            await step('n dbarnes page 4', () => read(4));
            await step('n dbarnes ticks JATS 20', () => tickJats(20));
            await as('rvaca');
            await step('n rvaca page 4', () => read(4));
            await as('dbuskins');
            await step('n dbuskins page 20', () => read(20));
            await step('n dbuskins page 18', () => read(18));
            await step('n dbuskins JATS XML 20', () => pressJats(20));
            await as('zzedd');
            await step('n zzedd page 20', () => read(20));
            await as('minoue');
            await step('n minoue page 3', () => read(3));
            await as('gcox');
            const v = sql(app, "select publication_id from publications where submission_id = 1 and status <> 3 order by publication_id desc limit 1");
            await step('n gcox page 1 unpublished version', async () => {
                const path = `/index.php/${app.contextPath}/en/article/view/1/version/${v}`;
                const r = await page.goto(app.url(path));
                await idle(page).catch(() => {});
                const body = await page.locator('body').innerText().catch(() => '');
                return {path, status: r ? r.status() : null, notFound: /404 Not Found/.test(body), previewNotice: body.includes(H.PREVIEW)};
            });
        }
        if (app.name === 'omp' && MODE === 'walk') {
            await as('minoue');
            await step('13 minoue workflow 3', () => H.tryWorkflow(page, app, 3));
            await step('14 minoue page 3', () => read(3));
            record(name('14-minoue-3'), await screen(page));
            await step('14 minoue page 17', () => read(17));
            await step('14 minoue page 18', () => read(18));
            await step('15 control minoue page 1', () => read(1));
            await as('mfritz');
            await step('16 mfritz page 3', () => read(3));
            await as('cturner');
            await step('17 cturner review request 18', () => readReview(18));
            await step('17 cturner page 18', () => read(18));
            await as('jjanssen');
            await step('18 control jjanssen page 17', () => read(17));
        }
        if (app.name === 'omp' && MODE === 'neighbour') {
            await as('dbarnes');
            await step('n dbarnes page 6', () => read(6));
            await step('n dbarnes page 3', () => read(3));
            await as('minoue');
            await step('n minoue page 6', () => read(6));
            await as('bbarnetson');
            await step('n bbarnetson page 3', () => read(3));
            await as('mfritz');
            await step('n mfritz page 1', () => read(1));
        }
        if (app.name === 'ops' && MODE === 'walk') {
            await as('minoue');
            await step('19 control minoue page 4', () => read(4));
            await step('19 control minoue page 1', () => read(1));
        }
        if (app.name === 'ops' && MODE === 'neighbour') {
            await as('dbuskins');
            await step('n dbuskins page 4', () => read(4));
            await as('minoue');
            await step('n minoue page 1', () => read(1));
        }
        await signOut(page).catch(() => {});
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
