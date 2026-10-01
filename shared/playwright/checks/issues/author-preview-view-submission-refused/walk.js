// Kept walk for docs/issues/U13-A5-author-preview-view-submission-refused.md (spec U13 register A5;
// U69 Rule 5a, the same on a book's preview).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Author: sign in as the submission's author, open it from "My Submissions" ("View") and note
//     whether its workflow offers "Preview"; type the unpublished submission's public address; on the
//     preview, press the notice's "View submission".
//   Control (the fix's neighbour check): `dbarnes` types the same address and presses "View submission";
//     the editorial workflow must open, with the fix in and out.
//   OJS submission 5 (author ddiouf), OMP submission 4 (bbeaty), OPS submission 1 (ccorino).
// Records every screen with screen(); prints the notice's link, where the press landed and its text.
//   PHASE=neighbour in front takes the control alone (no Author steps), for the fix's neighbour check
//   with the fix in and out.
//   The address is typed without the language part, as the Steps give it; NOLOC=0 in front types it with `/en/`.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-preview-view-submission-refused/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const PHASE = process.env.PHASE || 'walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const CONF = {
    ojs: {sid: 5, author: 'ddiouf', title: 'Genetic transformation of forest trees', path: 'article/view/5'},
    omp: {sid: 4, author: 'bbeaty', title: 'How Canadians Communicate', path: 'catalog/book/4'},
    ops: {sid: 1, author: 'ccorino', title: 'The influence of lactation', path: 'preprint/view/1'},
};

forEachApp(async (app) => {
    const conf = CONF[app.name];
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const loc = app.line && app.line !== 'main' && !String(app.line).startsWith('stable-3_5') ? '' : '/en';
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        const key = `w-${PHASE === 'walk' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${name}`;
        record(key, s);
        await shot(page, key).catch(() => {});
        return s;
    };
    const preview = async (who) => {
        // The Steps' address, typed without the language part (the site adds it); NOLOC=0 types it with.
        const typed = `/index.php/${app.contextPath}${process.env.NOLOC === '0' ? loc : ''}/${conf.path}`;
        await page.goto(app.url(typed));
        await idle(page);
        const notice = page.locator('.cmp_notification.notice').filter({hasText: 'This is a preview'});
        const noticeText = flat(await notice.first().innerText().catch(() => null));
        const link = notice.getByRole('link', {name: 'View submission'});
        const href = await link.first().getAttribute('href').catch(() => null);
        await snap(`${who}-preview`, {noticeText, href});
        fact(`${who}.preview`, {typed, url: page.url(), notice: noticeText, href});
        if (!href) return;
        await link.first().click();
        await page.waitForLoadState('load').catch(() => {});
        await idle(page); await sleep(1500);
        const s = await snap(`${who}-view-submission`);
        const dialog = s.text && s.text.dialog;
        fact(`${who}.viewSubmission`, {
            url: page.url(),
            title: await page.title(),
            main: flat(s.text && s.text.main, 300),
            dialog: flat(dialog, 300),
        });
    };
    try {
        // ---- Author
        if (PHASE === 'walk') {
            await signIn(page, conf.author);
            await idle(page);
            await page.goto(app.url(`/index.php/${app.contextPath}${loc}/dashboard/mySubmissions`));
            await idle(page); await sleep(1000);
            await snap('author-my-submissions');
            const row = page.locator('tr, li, .listPanel__item').filter({hasText: conf.title}).first();
            const view = row.getByRole('button', {name: /^View/}).or(row.getByRole('link', {name: /^View/})).first();
            let opened = 'View';
            if (await view.count()) {
                await view.click();
            } else {
                opened = 'address (no "View" found)';
                await page.goto(app.url(`/index.php/${app.contextPath}${loc}/dashboard/mySubmissions?workflowSubmissionId=${conf.sid}`));
            }
            await idle(page); await sleep(2000);
            const wf = await snap('author-workflow');
            const previewBtn = await page.getByRole('button', {name: 'Preview', exact: true})
                .or(page.getByRole('link', {name: 'Preview', exact: true})).count();
            fact('author.workflow', {opened, url: page.url(), previewOffered: previewBtn > 0, dialog: flat(wf.text && wf.text.dialog, 200)});
            await preview('author');
            await signOut(page);
        }

        // ---- Control: the editor
        await signIn(page, 'dbarnes');
        await idle(page);
        await preview('editor');
        await signOut(page);
    } finally {
        record(`w-${PHASE === 'walk' ? '' : 'n-'}facts`, facts);
        await close();
    }
});
