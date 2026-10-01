// Issue report docs/issues/U13-A5-author-view-submission-access-denied.md
// (U13 A5, U69 Rule 5a): the submission's Author opens the preview of their
// unpublished article, book or preprint by typing its address and presses the
// preview notice's "View submission": the access-denied page opens instead of
// the submission. Takes the report's Steps on PKP's default test dataset:
//   OJS: ddiouf, article/view/5; OMP: bbeaty, catalog/book/4; OPS: ccorino, preprint/view/1.
// Then the neighbour check a fix must leave as it is: dbarnes (editor / manager)
// opens the same preview and "View submission" still opens the editorial workflow.
// Nothing is created. Reset the dataset fleet first.
// Run: PROBE_FEATURE=issues-ir13 PROBE_AGENT=ir13 node bin/probe.js all shared/playwright/checks/issues/author-view-submission-access-denied/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CASE = {
    ojs: {author: 'ddiouf', path: 'article/view/5', id: 5},
    omp: {author: 'bbeaty', path: 'catalog/book/4', id: 4},
    ops: {author: 'ccorino', path: 'preprint/view/1', id: 1},
};

async function previewAndViewSubmission(app, page, who, label) {
    const c = CASE[app.name];
    // Main and 3.5 carry the locale segment in the address; 3.4 and 3.3 do not.
    const loc = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${loc}/${c.path}`), {timeout: T});
    await idle(page);
    const notice = page.locator('.cmp_notification', {hasText: 'This is a preview and has not been published.'});
    const preview = {
        who,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        notice: flat(await notice.first().innerText().catch(() => null)),
        href: await notice.first().getByRole('link', {name: 'View submission'}).getAttribute('href').catch(() => null),
    };
    record(`${label}-preview`, {...preview, screen: await screen(page)});
    if (!preview.notice) return {preview, after: null};
    await notice.first().getByRole('link', {name: 'View submission'}).click();
    await page.waitForLoadState('domcontentloaded', {timeout: T});
    await idle(page);
    await sleep(1500);
    const s = await screen(page);
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    const after = {
        who,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        denied: /The current role does not have access to this operation\./.test(body),
        dialog: flat(s.text && s.text.dialog, 300),
        heading: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
    };
    record(`${label}-after-view-submission`, {...after, screen: s});
    return {preview, after};
}

forEachApp(async (app) => {
    const c = CASE[app.name];
    const {page, close} = await launch(app);
    const out = {app: app.name, line: app.line, dataset: app.dataset};
    try {
        // Steps 1-3: the submission's Author.
        await signIn(page, c.author);
        out.author = await previewAndViewSubmission(app, page, c.author, 'author');
        await signOut(page);
        // Neighbour / control: the editor.
        await signIn(page, 'dbarnes');
        out.editor = await previewAndViewSubmission(app, page, 'dbarnes', 'editor');
        await signOut(page);
    } finally {
        record('summary', out);
        console.log(JSON.stringify({
            app: app.name,
            line: app.line,
            author: out.author && {href: out.author.preview.href, landed: out.author.after && out.author.after.url, denied: out.author.after && out.author.after.denied, dialog: out.author.after && out.author.after.dialog},
            editor: out.editor && {href: out.editor.preview.href, landed: out.editor.after && out.editor.after.url, denied: out.editor.after && out.editor.after.denied, dialog: out.editor.after && out.editor.after.dialog},
        }, null, 1));
        await close();
    }
});
