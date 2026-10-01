// Kept walk for docs/issues/U13-OJS6-pdf-reader-arrow-names-issue.md (spec U13 register OJS6).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   OJS, signed out: submission 1 "Signalling Theory Dividends" (in "Vol. 1 No. 2 (2014)"), its page,
//     "PDF"; on the PDF reader the return arrow's accessible name (what a screen reader announces),
//     then the arrow pressed: where it lands.
//   Control (also the fix's neighbour check): as `dbarnes`, "Issues" › "Back Issues" › "Vol. 1 No. 2 (2014)"
//     › "Issue Galleys" › "Add Galley" "PDF" with a PDF file; signed out, "Archives" › the issue, the full
//     issue's "PDF": its arrow must stay "Return to Issue Details" and open the issue's page.
//   OPS (no issues, same plugin template), signed out: preprint 2's page, "PDF", the arrow's name and landing.
// Records every screen with screen(); the arrow's name is read from the accessibility tree (ariaSnapshot).
// Run (main; reset the dataset fleet first, the control adds a galley):
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/pdf-reader-arrow-names-issue/walk.js [neighbour]
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
//   `neighbour` takes the control alone (OJS), for the fix's check with the fix in and out.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const ISSUE = 'Vol. 1 No. 2 (2014)';
const FILES = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files');
const CONF = {ojs: {sid: 1, noun: 'article'}, ops: {sid: 2, noun: 'preprint'}};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    const conf = CONF[app.name];
    if (!conf) { console.log(`[${app.name}] no such surface (OMP's reader has its own template)`); return; }
    if (MODE === 'neighbour' && app.name !== 'ojs') { console.log(`[${app.name}] the control is OJS's (issue galleys)`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const cp = app.contextPath;
    const label = MODE === 'steps' ? 'w' : 'n';
    const facts = {line: app.line || 'main', mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const here = () => page.url().replace(app.baseURL, '');
    const {page, close} = await launch(app);
    const consoleLines = [];
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${flat(e.message, 300)}`));
    page.on('console', (m) => { if (m.type() === 'error') consoleLines.push(`error: ${flat(m.text(), 300)}`); });
    let n = 0;
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        const id = `${label}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };

    /** On a PDF reader page: the arrow's accessible name, its address, then press it and note the landing. */
    async function readArrow(name) {
        await idle(page); await sleep(1500);
        const arrow = page.locator('header.header_view a.return');
        const out = {reader: here(), pageTitle: await page.title().catch(() => null)};
        out.arrowAria = flat(await arrow.ariaSnapshot().catch((e) => `ERR ${e.message}`), 300);
        out.arrowVisibleText = flat(await arrow.innerText().catch(() => null));
        out.arrowHref = ((await arrow.getAttribute('href')) || '').replace(app.baseURL, '');
        out.titleLink = {text: flat(await page.locator('header.header_view a.title').innerText().catch(() => null), 200),
            href: ((await page.locator('header.header_view a.title').getAttribute('href').catch(() => null)) || '').replace(app.baseURL, '')};
        await snap(`${name}-reader`, {arrow: out});
        await arrow.click();
        await page.waitForLoadState('load'); await idle(page);
        out.landed = here();
        out.landedH1 = flat(await page.locator('main h1, .pkp_structure_main h1').first().innerText({timeout: 3000}).catch(() => null), 200);
        await snap(`${name}-after-arrow`, {arrow: out});
        fact(name, out);
        return out;
    }

    try {
        if (MODE === 'steps') {
            // Steps 1-4: signed out, the article's (preprint's) page, "PDF", the arrow
            await page.goto(app.url(`/index.php/${cp}/${conf.noun}/view/${conf.sid}`));
            await idle(page);
            const pdf = page.locator('a.obj_galley_link.pdf').first();
            const s1 = await snap('landing');
            fact('landing', {url: s1.url, h1: flat(await page.locator('main h1, .pkp_structure_main h1').first().innerText().catch(() => null), 200),
                issueLine: flat(await page.locator('.item.issue, .sub_item.issue').first().innerText({timeout: 2000}).catch(() => null), 200),
                pdfHref: ((await pdf.getAttribute('href')) || '').replace(app.baseURL, '')});
            await pdf.click();
            await page.waitForLoadState('load');
            await readArrow('galley');
        }

        if (app.name === 'ojs') {
            // Control C1-C5: a full issue galley, its reader's arrow
            await signIn(page, 'dbarnes', {contextPath: cp});
            const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
            const issues = new IssuesAdmin(page, cp);
            await issues.goto('Back Issues');
            const win = await issues.openManagement('Back Issues', ISSUE);
            await win.openTab('Issue Galleys');
            const g = await win.openCreateGalley();
            await g.labelBox().fill('PDF');
            const up = await g.upload(path.join(FILES, 'article.pdf'));
            const saved = await g.save();
            fact('issue-galley', {upload: up ? up.status() : null, save: saved ? saved.status() : null,
                rows: await win.galleyLabels().allInnerTexts(), db: sql(app, 'SELECT galley_id, issue_id, label FROM issue_galleys ORDER BY 1')});
            await snap('issue-galley-created');
            await win.close().catch(() => {});
            await signOut(page);
            await page.goto(app.url(`/index.php/${cp}`));
            await idle(page);
            await page.getByRole('navigation').getByRole('link', {name: 'Archives', exact: true}).first().click();
            await page.waitForLoadState('load'); await idle(page);
            await page.locator('.pkp_structure_main, main').first().getByRole('link', {name: ISSUE, exact: true}).first().click();
            await page.waitForLoadState('load'); await idle(page);
            const issueUrl = here();
            await snap('issue-page');
            await page.locator('.obj_issue_toc .galleys .galleys_links a').filter({hasText: 'PDF'}).first().click();
            await page.waitForLoadState('load');
            const r = await readArrow('issue-galley');
            fact('issue-page-url', issueUrl);
            r.issuePageUrl = issueUrl;
        }
        fact('console', consoleLines.slice(0, 20));
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
});
