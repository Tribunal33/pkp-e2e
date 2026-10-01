// Kept walk for docs/issues/U13-A10-reference-link-takes-closing-parenthesis.md (spec U13 register A10).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   OJS: as `dbarnes`, submission 1 "Signalling Theory Dividends": its unpublished version 2 › "References",
//     the references typed into the box, "Add"; "Publish", "Confirm", "Publish".
//   OMP: as `dbarnes`, submission 14 "From Bricks to Brains…": "Unpublish"; "References", type, "Add"; "Publish".
//   OPS: as `dbarnes`, submission 2 "The Facets Of Job Satisfaction…": "Unpost"; "References", type, "Add"; "Post".
//   (3.5: the References page is a form: the references go into its "References" box and "Save".)
//   Signed out: the item's public page, its "References" block: each paragraph's text and each link's
//   address and text.
// PHASE=neighbour in front types the neighbour set instead (addresses that must keep their own "(…)",
// a trailing "." or a ")" followed by ";", ":" or "?"), for the fix's neighbour check with the fix in and out.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PHASE = process.env.PHASE || 'walk';

const REFS = {
    walk: [
        'Ostrom, E. (1990). Governing the Commons. Cambridge University Press (https://doi.org/10.1017/CBO9780511807763).',
        'Tide gauge records (ftp://files.example.org/ridge/data.csv)',
        'Hardin, G. (1968). The tragedy of the commons. Science, 162. https://doi.org/10.1126/science.162.3859.1243.',
    ],
    neighbour: [
        'Commons. https://en.wikipedia.org/wiki/Commons_(disambiguation)',
        'Commons (see https://en.wikipedia.org/wiki/Commons_(disambiguation)).',
        'Elsevier (1982). Cryogenics. https://doi.org/10.1016/0011-2275(82)90084-4, retrieved 2026.',
        'Hardin, G. (1968). https://doi.org/10.1126/science.162.3859.1243.',
        'Annual report (https://example.org/report.pdf); see also chapter 2.',
        'Survey data (https://doi.org/10.5061/dryad.example): table 3.',
        'Is the archive still online (https://example.org/archive)?',
    ],
}[PHASE];

const CONF = {
    ojs: {sid: 1, noun: 'article/view'},
    omp: {sid: 14, noun: 'catalog/book'},
    ops: {sid: 2, noun: 'preprint/view'},
};

forEachApp(async (app) => {
    const conf = CONF[app.name];
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const fact = (k, v) => console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 3000)}`);
    const {page, close} = await launch(app);
    const consoleLines = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleLines.push(flat(m.text(), 300)); });
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${flat(e.message, 300)}`));
    let n = 0;
    const tagp = PHASE === 'walk' ? '' : 'n-';
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        const id = `${tagp}${String(++n).padStart(2, '0')}-${app.name}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const wf = () => page.locator('[role="dialog"]:visible').first();
    try {
        await signIn(page, 'dbarnes');
        // The version the references go on: OJS's unpublished version 2; OMP's and OPS's published one.
        const pubId = Number(sql(app, `select max(publication_id) from publications where submission_id = ${conf.sid}`));
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${conf.sid}`));
        await idle(page); await sleep(1500);
        if (app.name === 'omp') {
            const {unpublishFromWorkflow} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
            await unpublishFromWorkflow(page);
        } else if (app.name === 'ops') {
            const {unpostPreprint} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
            await unpostPreprint(page);
        }
        await idle(page); await sleep(800);
        await snap('workflow-before-references');

        // "References" in the side menu (OJS: under version 2)
        const key = isMain ? `publication_${pubId}_citations` : 'publication_citations';
        const refLink = wf().getByRole('link', {name: 'References', exact: true});
        if (!(await refLink.first().isVisible().catch(() => false))) {
            await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${conf.sid}&workflowMenuKey=${key}`));
            await idle(page); await sleep(1500);
        } else {
            await refLink.last().click();
            await idle(page); await sleep(800);
        }
        const box = wf().getByRole('textbox', {name: /^References/}).first();
        await box.waitFor({state: 'visible', timeout: T});
        await box.fill(REFS.join('\n'));
        // main: the box's "Add"; 3.5: the References form's textarea and its "Save"
        const add = wf().getByRole('button', {name: 'Add', exact: true}).first();
        const isAdd = await add.isVisible().catch(() => false);
        const resp = page.waitForResponse((r) => (isAdd ? /importAdditionalCitations/ : /\/publications\/\d+$/).test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await (isAdd ? add : wf().getByRole('button', {name: 'Save', exact: true}).first()).click();
        const r = await resp;
        await idle(page); await sleep(2000);
        const tableRows = await wf().locator('table').first().locator('tbody tr').allInnerTexts().catch(() => []);
        await snap('references-added', {addStatus: r && r.status(), tableRows});
        fact('added', {status: r && r.status(), url: r && r.url().replace(app.baseURL, ''), tableRows: tableRows.map((x) => flat(x, 300))});
        fact('stored', sql(app, `select seq || ' ' || raw_citation from citations where publication_id = ${pubId} order by seq`).split('\n'));

        // Publish again
        if (app.name === 'ojs') {
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, app.contextPath);
            const confirmWin = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
            const panel = await pub.pressPublish({or: confirmWin});
            if (panel) {
                const stage = panel.locator('select[name="versionStage"]');
                if (!(await stage.inputValue())) await stage.selectOption('VoR');
                const minor = panel.locator('select[name="versionIsMinor"]');
                if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            }
            await confirmWin.waitFor({timeout: T});
            const pr = page.waitForResponse((x) => x.url().includes('/publish') && x.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
            await confirmWin.getByRole('button', {name: 'Publish', exact: true}).click();
            const p = await pr;
            await page.getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
            fact('publish', p && p.status());
        } else if (app.name === 'omp') {
            const {publishShownVersion} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
            await publishShownVersion(page);
        } else {
            const {postPreprint} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
            await postPreprint(page);
        }
        await idle(page); await sleep(800);
        await snap('published');
        fact('status', sql(app, `select publication_id || ':' || status from publications where submission_id = ${conf.sid} order by 1`).split('\n'));
        await signOut(page);

        // Signed out: the public page's "References"
        await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/${conf.sid}`));
        await idle(page);
        const block = page.locator('.item.references').first();
        await block.waitFor({state: 'visible', timeout: T});
        await block.scrollIntoViewIfNeeded().catch(() => {});
        const refs = await block.locator('.value p').evaluateAll((ps) => ps.map((p) => ({
            text: p.innerText.replace(/\s+/g, ' ').trim(),
            links: [...p.querySelectorAll('a')].map((a) => ({href: a.getAttribute('href'), text: a.textContent, target: a.getAttribute('target')})),
        })));
        await snap('public-references', {references: refs});
        fact('heading', flat(await block.locator('h2').innerText()));
        refs.forEach((x, i) => fact(`ref${i + 1}`, x));
        if (consoleLines.length) fact('console', consoleLines.slice(0, 10));
    } finally {
        await close();
    }
});
