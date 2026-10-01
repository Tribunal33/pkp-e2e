// Kept walk for docs/issues/U13-A6-older-version-tab-current-title.md (spec U13 register A6, spec U69
// register A5). Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   OJS (main only, the HTML reader's setup): as `dbarnes`, submission 1 "Signalling Theory Dividends",
//     version 1's "Galleys": "Unpublish", "Add galley" "HTML" (an HTML file as "Article Text"), "Publish"
//     back into "Vol. 1 No. 2 (2014)".
//   OJS: as `dbarnes`, submission 1's unpublished version 2 (its title is the dataset's "The Signalling Theory
//     Dividends Version 2"): "Publish", keep the window's choices, "Confirm", "Publish".
//   OMP submission 14 / OPS submission 11, as `dbarnes`: "Create New Version"; on the new version's
//     "Title & Abstract" add " (u13a6 revision)" to the end of "Title", "Save"; "Publish" / "Post".
//   Signed out: the current page, then "Versions" › the older entry: heading and browser tab; on OJS (main)
//     the older version's "HTML" reader: its header line and tab.
// Neighbours (read in every phase): the current page's tab; OJS: the older version's "PDF" reader's tab.
//   (OMP's older chapter page would be one, but it answers 500 on this dataset: U69 register A19.)
// PHASE=neighbour in front takes only the signed-out reads, on the state a walk left (for the fix's
//   neighbour check with the fix out, after a walk with it in).
// Records every screen with screen(); per page: address, heading, browser tab.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-tab-current-title/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const PHASE = process.env.PHASE || 'walk';
const SUFFIX = ' (u13a6 revision)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const vis = '[role="dialog"]:visible';
const CONF = {
    ojs: {sid: 1, noun: 'article/view', heading: '.page_article h1.page_title'},
    omp: {sid: 14, noun: 'catalog/book', heading: '.obj_monograph_full h1.title'},
    ops: {sid: 11, noun: 'preprint/view', heading: '.page_preprint h1.page_title'},
};
const FILES = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files');

forEachApp(async (app) => {
    const conf = CONF[app.name];
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const cp = app.contextPath;
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const pubs = () => sql(app, `select p.publication_id || ':' || p.status || ':' || coalesce(ps.setting_value, '') from publications p left join publication_settings ps on ps.publication_id = p.publication_id and ps.setting_name = 'title' and ps.locale = 'en' where p.submission_id = ${conf.sid} order by 1`).split('\n');
    const maxPub = () => Number(sql(app, `select max(publication_id) from publications where submission_id = ${conf.sid}`));
    const {page, close} = await launch(app);
    const consoleLines = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleLines.push(flat(m.text(), 300)); });
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${flat(e.message, 300)}`));
    let n = 0;
    const pre = PHASE === 'walk' ? 'w' : 'n';
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        Object.assign(s, extra);
        const nm = `${pre}-${String(++n).padStart(2, '0')}-${name}`;
        record(nm, s);
        await shot(page, nm).catch(() => {});
        return s;
    };
    const wf = () => page.locator(vis).first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    const go = async (p) => { await page.goto(app.url(p)); await idle(page); };
    const openWorkflow = async (key) => {
        await go(`/index.php/${cp}/dashboard/editorial?workflowSubmissionId=${conf.sid}&workflowMenuKey=${key}`);
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page); await sleep(1000);
    };

    async function fillVersionIfPresent(scope) {
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = scope.locator(sel);
            if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
        }
    }

    /** "Publish" / "Schedule For Publication" / "Post": the details window when it opens (its choices kept), then the question. */
    async function publishOnScreen(name) {
        const out = {};
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
        await button.waitFor({state: 'visible', timeout: T});
        out.button = flat(await button.innerText().catch(() => ''), 60);
        await sleep(800);
        const statusAnswer = page.waitForResponse((x) => x.url().includes('/issueAssignmentStatus'), {timeout: 20_000}).catch(() => null);
        await button.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|All (publication|posting) requirements/}).last();
        const which = () => Promise.race([
            panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
        ]).catch(() => null);
        let opened = await which();
        if (!opened) { out.secondPress = true; await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
        out.opened = opened;
        await idle(page); await sleep(600);
        if (opened === 'panel') {
            if (app.name === 'ojs') { await statusAnswer; await sleep(800); }
            await fillVersionIfPresent(panel);
            out.assignment = await panel.locator('input[name="assignment"]:checked').evaluate((e) => (e.closest('label') || e.parentElement).innerText.trim()).catch(() => null);
            out.issue = await panel.locator('select[name="issueId"] option:checked').innerText().catch(() => null);
            out.panel = flat(await panel.innerText().catch(() => ''), 700);
            await snap(`${name}-panel`);
            await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
            await confirm.waitFor({state: 'visible', timeout: T});
        }
        await idle(page); await sleep(600);
        await fillVersionIfPresent(confirm);
        out.confirm = flat(await confirm.innerText().catch(() => ''), 500);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click();
        const r = await w;
        out.status = r ? r.status() : null;
        if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 500);
        await controls().getByRole('button', {name: /^(Unpublish|Unpost|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page); await sleep(600);
        await snap(`${name}-done`, {publish: out});
        return out;
    }

    /** "Create New Version" (main: the version window, its choices kept, "Confirm"; 3.5: the button, "Yes"). */
    async function createNewVersion(name) {
        const out = {before: maxPub()};
        const w = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        const link = wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T});
        await sleep(800);
        await link.click();
        const win = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        const yes = page.getByRole('dialog').filter({hasText: 'Create New Version'}).last().getByRole('button', {name: 'Yes', exact: true});
        const opened = await Promise.race([
            win.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T}).then(() => 'window'),
            yes.waitFor({state: 'visible', timeout: T}).then(() => 'yes'),
        ]).catch(() => null);
        out.opened = opened;
        await idle(page); await sleep(1000);
        if (opened === 'window') {
            await fillVersionIfPresent(win);
            out.window = flat(await win.innerText().catch(() => ''), 400);
            await snap(`${name}-window`);
            await win.getByRole('button', {name: 'Confirm', exact: true}).click();
        } else {
            await snap(`${name}-window`);
            await yes.click();
        }
        const r = await w;
        out.status = r ? r.status() : null;
        await idle(page); await sleep(1500);
        out.after = maxPub();
        await snap(`${name}-done`, {version: out});
        return out;
    }

    async function typeTitleSuffix(text) {
        const id = 'titleAbstract-title-control-en';
        await page.locator(`[id="${id}_ifr"]`).waitFor({state: 'visible', timeout: T});
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
        await page.keyboard.press('ControlOrMeta+End');
        await page.keyboard.type(text);
        await sleep(300);
        return page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), id).catch(() => null);
    }

    async function pressSave(name) {
        const button = wf().getByRole('button', {name: 'Save', exact: true}).last();
        const r = page.waitForResponse((x) => /\/api\/v1\//.test(x.url()) && ['POST', 'PUT'].includes(x.request().method()), {timeout: T}).catch(() => null);
        await button.click();
        const resp = await r;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
        await sleep(500);
        const out = {status: resp ? resp.status() : null, errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
        await snap(name, {save: out});
        return out;
    }

    /** A front-end page's address, heading and browser tab. */
    async function readPage(name, sel = conf.heading) {
        await idle(page); await sleep(500);
        const out = {
            url: page.url().replace(app.baseURL, ''),
            tab: flat(await page.title()),
            heading: flat(await page.locator(sel).first().innerText({timeout: 5000}).catch(() => null)),
            notice: flat(await page.locator('body').innerText().catch(() => ''), 6000).match(/This is an outdated version[^.]*\.[^.]*\./)?.[0] || null,
        };
        await snap(name, {read: out});
        fact(name, out);
        return out;
    }

    try {
        // ------------------------------------------------------------ setup through the screens
        if (PHASE === 'walk') {
            fact('before', pubs());
            await signIn(page, 'dbarnes');
            if (app.name === 'ojs') {
                if (isMain) {
                    // The HTML reader's setup: version 1 unpublished, an "HTML" galley added, published again.
                    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
                    const {GalleyManager} = require('../../../pages/GalleysPages.js');
                    const frame = new WorkflowPage(page, cp);
                    const galleys = new GalleyManager(page, frame);
                    await galleys.open(conf.sid, 1);
                    await snap('ojs-v1-galleys');
                    await controls().getByRole('button', {name: 'Unpublish', exact: true}).click();
                    const q = page.getByRole('dialog').filter({hasText: "Are you sure you don't want this to be published?"});
                    const un = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
                    await q.getByRole('button', {name: 'Unpublish', exact: true}).click();
                    const u = await un; await idle(page); await sleep(800);
                    fact('v1 unpublish', u ? u.status() : null);
                    await galleys.addGalley({label: 'HTML', component: 'Article Text', file: path.join(FILES, 'article.html'), name: 'article.html'});
                    await idle(page); await sleep(500);
                    fact('v1 galleys', await galleys.labels().catch((e) => String(e).slice(0, 200)));
                    await snap('ojs-v1-galley-html');
                    fact('v1 republish', await publishOnScreen('ojs-v1-publish'));
                }
                // Version 2 (the dataset's unpublished version with its own title) published.
                await openWorkflow(isMain ? 'publication_2_titleAbstract' : 'publication_titleAbstract');
                await snap('ojs-v2-before-publish');
                fact('v2 publish', await publishOnScreen('ojs-v2-publish'));
            } else {
                await openWorkflow(isMain ? `publication_${maxPub()}_titleAbstract` : 'publication_titleAbstract');
                await snap(`${app.name}-v1-title-abstract`);
                const v = await createNewVersion(`${app.name}-new-version`);
                fact('new version', v);
                await openWorkflow(isMain ? `publication_${v.after}_titleAbstract` : 'publication_titleAbstract');
                fact('title typed', await typeTitleSuffix(SUFFIX));
                fact('title save', await pressSave(`${app.name}-v2-title-saved`));
                fact('v2 publish', await publishOnScreen(`${app.name}-v2-publish`));
            }
            fact('after', pubs());
            await signOut(page);
        }

        // ------------------------------------------------------------ signed out: the pages
        await go(`/index.php/${cp}/${conf.noun}/${conf.sid}`);
        const cur = await readPage('current-page');
        const versions = page.locator('.sub_item.versions, section.versions').first();
        fact('versions list', flat(await versions.innerText().catch(() => null), 400));
        const older = versions.locator('a[href*="/version/"]').last();
        if (!(await older.count())) { fact('older link', 'none'); return; }
        fact('older link', {text: flat(await older.innerText()), href: (await older.getAttribute('href')).replace(app.baseURL, '')});
        await older.click();
        await page.waitForLoadState('load');
        const old = await readPage('older-page');
        fact('verdict', {olderHeading: old.heading, olderTab: old.tab, currentTab: cur.tab, tabNamesCurrent: !!(cur.tab && old.tab === cur.tab)});
        const olderUrl = page.url();

        if (app.name === 'ojs') {
            // The older version's readers: "HTML" (main, set up above) and "PDF" (neighbour).
            for (const kind of ['html', 'pdf']) {
                await page.goto(olderUrl); await idle(page);
                // An HTML galley's link has the class "file"; a PDF's "pdf".
                const link = kind === 'pdf' ? page.locator('a.obj_galley_link.pdf').first() : page.locator('a.obj_galley_link').filter({hasText: /^\s*HTML\s*$/}).first();
                if (!(await link.count())) { fact(`older ${kind} reader`, 'no link'); continue; }
                const href = (await link.getAttribute('href')).replace(app.baseURL, '');
                await link.click();
                await page.waitForLoadState('load');
                const r = await readPage(`older-${kind}-reader`, 'header a.title, .header_view a.title');
                r.href = href;
                fact(`older ${kind} reader`, r);
            }
        }
    } finally {
        facts.console = consoleLines.slice(0, 20);
        record(PHASE === 'walk' ? 'facts' : `facts-${PHASE}`, facts);
        await close();
    }
});
