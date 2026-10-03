// Issue report docs/issues/U15-A3-published-edits-never-reach-search.md (U15 A3): an editor
// corrects a published item's title or abstract, or adds a contributor, and the public Search
// page keeps finding the old words and never the new ones.
// Takes the report's Steps on PKP's default test dataset, all three apps (OJS article 17,
// OMP book 14, OPS preprint 12):
//   1. signed out, "Search": the old title word, then "u15btitle"
//   2. sign in as dbarnes, the item's workflow
//   3-4. Publication › "Title & Abstract": the old word replaced by "u15btitle" in "Title",
//        " u15babstract" added to "Abstract", "Save"
//   5. Publication › "Contributors" › "Add Contributor": Nova U15bcontrib, Author, "Save"
//   6. signed out, the item's page
//   7. "Search": "u15btitle", "u15babstract", "U15bcontrib", the old word (read once at once,
//      and once more after further page loads, the dataset's job runner being on)
// NB=1 is the neighbour check for a fix trial, alone: an unpublished submission's title gets
// " u15bdraft" and the word must still find nothing on the Search page.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/published-edits-never-reach-search/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib');

const WORDS = ['u15btitle', 'u15babstract', 'U15bcontrib'];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const item = L.ITEM[app.name];
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps', item: item.id};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${r.url()}`); });
    try {
        if (nb) {
            const id = L.DRAFT[app.name];
            facts.item = id;
            await signIn(page, 'dbarnes');
            await L.openWorkflow(app, page, id);
            await step('nb draft title edit', () => L.editTitleAbstract(app, page, {title: (t) => `${t} u15bdraft`}));
            fact('nb index after edit', L.indexState(app, id));
            await signOut(page).catch(() => {});
            await page.goto(app.url(`/index.php/${ctx}`));
            await idle(page).catch(() => {});
            await L.sleep(5000);
            await step('nb search u15bdraft', () => L.search(app, page, 'u15bdraft', id));
            record('nb-search', await screen(page));
            fact('nb index at end', L.indexState(app, id));
        } else {
            // 1
            await step('1 search old word (before)', () => L.search(app, page, item.old, item.id));
            await step('1 search u15btitle (before)', () => L.search(app, page, 'u15btitle', item.id));
            fact('index before', L.indexState(app, item.id, item.old));
            // 2
            await signIn(page, 'dbarnes');
            await L.openWorkflow(app, page, item.id);
            // 3-4
            await step('4 title and abstract saved', () => L.editTitleAbstract(app, page, {
                title: (t) => t.replace(item.old, 'u15btitle'),
                append: ' u15babstract',
            }));
            record('4-title-abstract', await screen(page));
            // 5
            await step('5 contributor added', () => L.addContributor(page, app, item.id, {given: 'Nova', family: 'U15bcontrib', email: 'u15bcontrib@mailinator.com', country: 'Canada'}));
            record('5-contributors', await screen(page));
            fact('index after edits', L.indexState(app, item.id, item.old));
            // 6
            await signOut(page).catch(() => {});
            await page.goto(app.url(item.page(ctx)));
            await idle(page).catch(() => {});
            const s = await screen(page);
            record('6-item-page', s);
            fact('6 item page', {title: s.title, hasNewTitle: /u15btitle/.test(JSON.stringify(s.text)), hasContributor: /U15bcontrib/.test(JSON.stringify(s.text))});
            await L.sleep(5000);
            // 7
            for (const w of [...WORDS, item.old]) await step(`7 search ${w}`, () => L.search(app, page, w, item.id));
            record('7-search-old-word', await screen(page));
            // a second read after further page loads, so a queued refresh has had its turn
            for (let i = 0; i < 3; i++) { await page.goto(app.url(`/index.php/${ctx}`)); await idle(page).catch(() => {}); }
            await L.sleep(10000);
            for (const w of [...WORDS, item.old]) await step(`7 again ${w}`, () => L.search(app, page, w, item.id));
            fact('index at end', L.indexState(app, item.id, item.old));
        }
    } finally {
        fact('page errors', errs);
        fact('5xx', fails);
        record('facts', facts);
        await close();
    }
});
