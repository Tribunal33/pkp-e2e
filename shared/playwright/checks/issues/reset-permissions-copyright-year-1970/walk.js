// Walk of docs/issues/U40-A2-reset-permissions-copyright-year-1970.md on PKP's default test dataset:
// sign in as rvaca; on the journal set "Copyright Year" to "Use the article's publication date"; read an unpublished
// submission's "Permissions & Disclosure"; Tools › "Permissions" › reset, OK; read the unpublished, the declined and a
// published submission again. On the preprint server, then post the unpublished one and read it and its page.
// Neighbour (R1_MODE=nb, OJS and OPS: the dated path a fix must leave alone): type a publication date of 2020-05-01 on
// the unpublished submission first; after the reset it must read 2020, and the published one its own year.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/reset-permissions-copyright-year-1970/walk.js
//               R1_MODE=nb PROBE_RUN=nb-out ONLY=ojs,ops ... for the neighbour alone
// Facts: .reports/<feature>/<agent>/a2-walk[-<run>]-<app>.json (a2-nb for the neighbour)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.R1_MODE === 'nb' ? 'nb' : 'walk';
// The dataset's own submissions: unpublished, declined, published (dataset.md).
const ITEMS = {
    ojs: {unpublished: 4, declined: 18, published: 17, readerPath: 'article/view/17'},
    omp: {unpublished: 3, declined: null, published: 5, readerPath: null},
    ops: {unpublished: 1, declined: 4, published: 2, readerPath: 'preprint/view/1'},
};
const step = async (f, key, fn) => { try { f[key] = await fn(); } catch (e) { f[key] = {error: L.flat(e.message, 400)}; } };

forEachApp(async (app) => {
    const it = ITEMS[app.name];
    const f = {app: app.name, line: app.line || 'main', mode: MODE, items: it};
    const {page, close} = await launch(app);
    page.setDefaultTimeout(20_000);
    try {
        await signIn(page, 'rvaca');                                                          // 1
        if (app.name === 'ojs') await step(f, 'basis', () => L.setYearBasis(app, page, "Use the article's publication date")); // 2
        if (MODE === 'nb') await step(f, 'dated', () => L.setDatePublished(app, page, it.unpublished, '2020-05-01'));
        await step(f, 'before', () => L.readPermissions(app, page, it.unpublished));         // 3
        await L.R.snap(page, `a2-${MODE}-before`);
        await step(f, 'tool', () => L.R.openPermissionsTool(app, page));                     // 4
        await step(f, 'reset', () => L.R.pressReset(page, 'ok'));
        await L.R.snap(page, `a2-${MODE}-reset`);
        f.after = {};                                                                         // 5
        for (const kind of ['unpublished', 'declined', 'published']) {
            if (!it[kind]) continue;
            await step(f.after, kind, () => L.readPermissions(app, page, it[kind]));
            await L.R.snap(page, `a2-${MODE}-after-${kind}`);
        }
        if (MODE === 'walk' && app.name === 'ops') {                                          // 6, 7: post it
            await step(f, 'post', async () => { await L.openWorkflow(app, page, it.unpublished); await L.R.snap(page, 'a2-walk-before-post'); return L.post(page); });
            await step(f, 'afterPost', () => L.readPermissions(app, page, it.unpublished));
            await L.R.snap(page, 'a2-walk-after-post');
            await step(f, 'reader', () => L.readerRights(app, page, it.readerPath));
            await step(f, 'oai', () => L.oaiRights(app, page, 'preprint', it.unpublished));
        }
    } catch (e) {
        f.error = L.flat(e.stack, 900);
        await L.R.snap(page, `a2-${MODE}-error`).catch(() => {});
    } finally {
        record(`a2-${MODE}`, f);
        console.log(`[a2-${MODE}] ${app.name}`, JSON.stringify({basis: f.basis, dated: f.dated && f.dated.saved, before: f.before && f.before.copyrightYear,
            reset: f.reset && {posts: f.reset.posts, toast: f.reset.toast},
            after: Object.fromEntries(Object.entries(f.after || {}).map(([k, v]) => [k, v.copyrightYear || v.error])),
            post: f.post && f.post.status, afterPost: f.afterPost && f.afterPost.copyrightYear, reader: f.reader, oai: f.oai, error: f.error}));
        await close();
    }
});
