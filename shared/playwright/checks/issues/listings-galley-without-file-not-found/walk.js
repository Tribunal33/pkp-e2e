// Kept walk for docs/issues/U13-A4-listings-galley-without-file-not-found.md (spec U13 register A4).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   OJS, as `dbarnes`, submission 5 "Genetic transformation of forest trees" (Production): "Galleys" › "Add galley"
//   "PDF" (Article Text), "Data" (Data Set), and "Draft" whose upload window is cancelled before a file is chosen;
//   "Schedule For Publication" › "Don't Assign To An Issue" › "Publish"; Website › Appearance › Theme: "Include recent
//   most published articles" ticked; signed out the home page (control: the current issue's table of contents also
//   shown); then "Include the current issue's table of contents" unticked, the home page again, its "Draft" pressed,
//   the article's page.
//   OPS, as `dbarnes`, submission 1 "The influence of lactation …" (Production, galley "PDF"): "Add galley" "Data"
//   (Data Set) and "Draft" (upload cancelled); "Post"; signed out the home page, its "Draft" pressed, "Preprints",
//   the preprint's page.
// OMP has no galleys in its lists (a book summary lists no formats): not walked.
// Records every screen with screen(); per list: the summary's galley links (text, address); per press: the chain of
// document responses and the page it ended on.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/listings-galley-without-file-not-found/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature); OJS 3.5 has no
//   "Latest Publications" and is skipped there.
//   PHASE=neighbour (after a walk, nothing reset) reads what the fix must leave alone: the issue's table of contents
//   and the home page, the other posted preprints' "PDF" in the lists, the search results (no galleys), the article /
//   preprint page's main and additional files and the walk's "Data" download; and, on OPS, the section's list
//   (/preprints/section/preprints), which the fix changes like the home page. Run with the fix in and out.
// Fix trial: trial.sh beside this file (fix-ojs.diff, fix-ops.diff).
const fs = require('fs');
const os = require('os');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PHASE = process.env.PHASE || 'walk';
// A one-page PDF reading "u13a4".
const MINI_PDF = (() => {
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
    const stream = 'BT /F1 24 Tf 40 60 Td (u13a4) Tj ET';
    objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    let out = '%PDF-1.4\n';
    const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
    return Buffer.from(out, 'latin1');
})();

forEachApp(async (app) => {
    if (app.name === 'omp') { console.log('[omp] not walked: a book summary in the press\'s lists shows no publication formats'); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const isOJS = app.name === 'ojs';
    if (isOJS && !isMain) { console.log('[ojs] not walked on this line: no "Latest Publications" (the home page shows the current issue only)'); return; }
    const SID = isOJS ? 5 : 1;
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}`;
    const page_ = isOJS ? 'article' : 'preprint';
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
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
    const rel = (u) => (u || '').replace(app.baseURL, '');

    // Every summary on the page: the list it sits in, its title, its galley links.
    async function lists(name, p) {
        const resp = await page.goto(app.url(p), {waitUntil: 'load'});
        await idle(page).catch(() => {});
        const d = await page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            return [...document.querySelectorAll('.obj_article_summary, .obj_preprint_summary')].map((x) => {
                const sec = x.closest('section, .sections, .current_issue, .homepage_latest_preprints');
                const h = sec ? sec.querySelector('h2') : null;
                return {
                    list: f(h && h.innerText) || (sec && sec.className) || f(document.querySelector('h1') && document.querySelector('h1').innerText),
                    title: f(x.querySelector('.title') && x.querySelector('.title').innerText).slice(0, 80),
                    galleys: [...x.querySelectorAll('ul.galleys_links a')].map((a) => ({text: f(a.innerText), href: a.getAttribute('href')})),
                };
            });
        });
        const out = {status: resp && resp.status(), summaries: d.map((s) => ({...s, galleys: s.galleys.map((g) => ({text: g.text, href: rel(g.href)}))}))};
        await snap(name, {lists: out});
        return out;
    }
    const mineIn = (out, title) => out.summaries.filter((s) => s.title.startsWith(title)).map((s) => ({list: s.list, galleys: s.galleys.map((g) => g.text)}));

    // Follow one action: the document responses on the way, a download if one starts, where it ended.
    async function follow(name, action) {
        const chain = [];
        const onResp = (r) => {
            const rq = r.request();
            if (rq.resourceType() !== 'document' || rq.frame() !== page.mainFrame()) return;
            chain.push({status: r.status(), url: rel(r.url()), location: r.headers().location ? rel(r.headers().location) : undefined});
        };
        page.on('response', onResp);
        const dlP = page.waitForEvent('download', {timeout: 12_000}).catch(() => null);
        await action().catch((e) => chain.push({error: flat(e.message, 160)}));
        const dl = await Promise.race([dlP, sleep(4000).then(() => 'none')]);
        await idle(page).catch(() => {});
        await sleep(500);
        page.off('response', onResp);
        const out = {
            chain,
            download: dl && dl !== 'none' ? {suggested: dl.suggestedFilename(), failure: await dl.failure().catch((e) => flat(e.message, 200))} : null,
            endedAt: rel(page.url()),
            title: flat(await page.title().catch(() => null), 120),
            heading: flat(await page.locator('h1').first().innerText({timeout: 2000}).catch(() => null), 200),
        };
        await snap(name, {follow: out});
        fact(name, out);
        return out;
    }
    // The landing page's main galleys and additional files.
    async function landing(name) {
        await page.goto(app.url(`${ctx}/${page_}/view/${SID}`), {waitUntil: 'load'});
        await idle(page).catch(() => {});
        const d = {
            main: (await page.locator('a.obj_galley_link').allInnerTexts()).map((t) => flat(t, 60)),
            additional: (await page.locator('a.obj_galley_link_supplementary').allInnerTexts()).map((t) => flat(t, 60)),
            headings: (await page.locator('.galleys h2, .supplementary_galleys_links, h2.pkp_screen_reader, .item.galleys h2').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)),
        };
        await snap(name, {landing: d});
        fact(name, d);
        return d;
    }

    try {
        const pubId = Number(sql(app, `select current_publication_id from submissions where submission_id = ${SID}`));
        const title = sql(app, `select setting_value from publication_settings where publication_id = ${pubId} and setting_name = 'title' and locale = 'en'`).slice(0, 25);
        fact('submission', {id: SID, publication: pubId, title});

        if (PHASE === 'walk') {
            const pdf = path.join(os.tmpdir(), 'u13a4.pdf');
            const csv = path.join(os.tmpdir(), 'u13a4-data.csv');
            fs.writeFileSync(pdf, MINI_PDF);
            fs.writeFileSync(csv, 'site,count\nu13a4,1\n');
            const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
            const {GalleyManager} = require('../../../pages/GalleysPages.js');
            const frame = new WorkflowPage(page, cp, isOJS ? {} : {labels: {publicationGroup: 'Preprint'}});
            const galleys = new GalleyManager(page, frame);
            const key = (k) => (isMain ? `publication_${pubId}_${k}` : `publication_${k}`);
            const openWorkflow = async (k) => {
                await page.goto(app.url(`${ctx}/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key(k)}`));
                await idle(page); await sleep(1500);
            };

            // ---- dbarnes: the galleys
            await signIn(page, 'dbarnes');
            await openWorkflow('galleys');
            await galleys.table().waitFor({timeout: T});
            await snap('galleys-before');
            if (isOJS) {
                await galleys.addGalley({label: 'PDF', component: 'Article Text', file: pdf, name: 'u13a4.pdf'});
                await idle(page); await sleep(800);
            }
            await galleys.addGalley({label: 'Data', component: 'Data Set', file: csv, name: 'u13a4-data.csv'});
            await idle(page); await sleep(800);
            const win = await galleys.openCreate();
            await win.type(win.labelBox(), 'Draft');
            await win.save();
            await snap('draft-upload-window');
            await galleys.cancelWizard();
            await idle(page); await sleep(800);
            fact('galleyList', await galleys.labels().catch((e) => flat(e.message, 200)));
            await snap('galleys-after');
            fact('galleysStored', sql(app, `select g.galley_id || ':' || g.label || ':' || coalesce(g.submission_file_id::text, 'no file') || ':' || coalesce(sf.genre_id::text, '') from publication_galleys g left join submission_files sf on sf.submission_file_id = g.submission_file_id where g.publication_id = ${pubId} order by g.seq, g.galley_id`).split('\n'));

            // ---- publish / post
            const waitPublish = () => page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            const versionDetails = async (scope) => {
                for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                    const el = scope.locator(sel);
                    if (await el.isVisible().catch(() => false) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
                }
            };
            const pub = {};
            if (isOJS) {
                const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
                await button.waitFor({state: 'visible', timeout: T});
                pub.button = flat(await button.innerText(), 60);
                await sleep(800);
                await button.click();
                const panel = page.getByRole('dialog', {name: 'Review Publishing Details'});
                await panel.waitFor({state: 'visible', timeout: T}).catch(async () => { await button.click().catch(() => {}); await panel.waitFor({state: 'visible', timeout: T}); });
                await idle(page);
                await versionDetails(panel);
                // "Publication Stage" and "Revision Significance" (required radios on main)
                for (const name of ['Version of Record (VoR)', 'Major Revision']) {
                    const r = panel.getByRole('radio', {name, exact: true});
                    if (await r.count()) await r.first().check();
                }
                const dontAssign = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
                await dontAssign.waitFor({state: 'visible', timeout: T});
                await panel.locator('input[name="assignment"]:checked').waitFor({state: 'attached', timeout: T}).catch(() => {});
                await dontAssign.check();
                await snap('publish-panel');
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
                await confirm.waitFor({state: 'visible', timeout: T});
                pub.confirm = flat(await confirm.innerText(), 300);
                const done = waitPublish();
                await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
                pub.status = (await done)?.status() ?? null;
                await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
            } else {
                const post = page.getByRole('button', {name: 'Post', exact: true}).first();
                await post.waitFor({state: 'visible', timeout: T});
                await post.click();
                const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to post this\?/}).last();
                await confirm.waitFor({state: 'visible', timeout: T});
                await idle(page);
                await versionDetails(confirm);
                pub.confirm = flat(await confirm.innerText(), 300);
                const done = waitPublish();
                await confirm.getByRole('button', {name: 'Post', exact: true}).last().click();
                pub.status = (await done)?.status() ?? null;
                await page.getByRole('button', {name: 'Unpost', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
            }
            await idle(page);
            await snap('published', {publish: pub});
            fact('publish', {...pub, stored: sql(app, `select status || ':' || coalesce(${isOJS ? 'issue_id::text' : "''"}, 'no issue') from publications where publication_id = ${pubId}`)});

            if (isOJS) {
                // ---- Theme: "Include recent most published articles" ticked (the current issue's table of contents kept)
                const box = (panel, name) => panel.getByRole('checkbox', {name, exact: true});
                const TOC = "Include the current issue's table of contents";
                const RECENT = 'Include recent most published articles';
                const openTheme = async () => {
                    await page.goto(app.url(`${ctx}/management/settings/website`)); await idle(page);
                    const top = page.locator('#appearance-button').first();
                    if ((await top.getAttribute('aria-selected')) !== 'true') { await top.click(); await idle(page); }
                    const side = page.locator('#theme-button').first();
                    if ((await side.getAttribute('aria-selected')) !== 'true') { await side.click(); await idle(page); }
                    await sleep(500);
                    const panel = page.locator('[role="tabpanel"]#theme').first();
                    await box(panel, TOC).waitFor({timeout: T});
                    return panel;
                };
                const saveTheme = async (panel) => {
                    const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+\/theme/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await panel.getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await w;
                    await idle(page);
                    return r ? r.status() : null;
                };
                let panel = await openTheme();
                const before = {toc: await box(panel, TOC).isChecked(), recent: await box(panel, RECENT).isChecked()};
                await box(panel, RECENT).setChecked(true);
                const save1 = await saveTheme(panel);
                await snap('theme-recent-on', {save: save1});
                fact('themeOn', {before, save: save1});
                await signOut(page);
                const homeWithToc = await lists('home-with-toc', `${ctx}`);
                fact('homeWithToc', mineIn(homeWithToc, title));

                await signIn(page, 'dbarnes');
                panel = await openTheme();
                await box(panel, TOC).setChecked(false);
                const save2 = await saveTheme(panel);
                await snap('theme-toc-off', {save: save2});
                fact('themeTocOff', {save: save2, stored: sql(app, "select setting_value from plugin_settings where plugin_name = 'defaultthemeplugin' and setting_name = 'journalContentOrganization'")});
                await signOut(page);
                const home = await lists('home-without-toc', `${ctx}`);
                fact('homeWithoutToc', mineIn(home, title));
            } else {
                await signOut(page);
                const home = await lists('home', `${ctx}`);
                fact('home', mineIn(home, title));
                const archive = await lists('preprints', `${ctx}/preprints`);
                fact('preprints', mineIn(archive, title));
            }
            // ---- "Draft" pressed in the home page's list
            await page.goto(app.url(ctx)); await idle(page);
            const sum = page.locator('.obj_article_summary, .obj_preprint_summary').filter({has: page.locator('.title', {hasText: title})}).first();
            const draft = sum.locator('ul.galleys_links a').filter({hasText: /^\s*Draft\s*$/}).first();
            fact('draftHref', rel(await draft.getAttribute('href').catch(() => null)));
            if (await draft.count()) await follow('press-draft', () => draft.click());
            await landing('landing');
        } else {
            // ---- Neighbour: what the fix must leave alone
            if (isOJS) {
                const issue = await lists('issue-toc', `${ctx}/issue/view/1`);
                fact('issueToc', issue.summaries.map((s) => ({title: s.title.slice(0, 25), galleys: s.galleys.map((g) => g.text)})));
                const home = await lists('home', `${ctx}`);
                fact('home', home.summaries.map((s) => ({list: s.list, title: s.title.slice(0, 25), galleys: s.galleys.map((g) => g.text)})));
            } else {
                const home = await lists('home', `${ctx}`);
                fact('home', home.summaries.slice(0, 4).map((s) => ({title: s.title.slice(0, 25), galleys: s.galleys.map((g) => g.text)})));
                const archive = await lists('preprints', `${ctx}/preprints`);
                fact('preprints', archive.summaries.slice(0, 4).map((s) => ({title: s.title.slice(0, 25), galleys: s.galleys.map((g) => g.text)})));
                // the section's list (SectionsHandler): the fix changes it like the two lists above
                const section = await lists('section-list', `${ctx}/preprints/section/preprints`);
                fact('sectionList', section.summaries.slice(0, 3).map((s) => ({title: s.title.slice(0, 25), galleys: s.galleys.map((g) => g.text)})));
            }
            const search = await lists('search', `${ctx}/search/search?query=${encodeURIComponent(title.split(' ')[0])}`);
            fact('search', search.summaries.map((s) => ({title: s.title.slice(0, 25), galleys: s.galleys.map((g) => g.text)})));
            await landing('landing');
            const data = page.locator('a.obj_galley_link_supplementary').filter({hasText: /^\s*Data\s*$/}).first();
            if (await data.count()) await follow('press-data', () => data.click());
        }
        fact('consoleErrors', consoleLines.slice(0, 20));
    } finally {
        record(PHASE === 'walk' ? 'facts' : `facts-${PHASE}`, facts);
        await close();
    }
});
