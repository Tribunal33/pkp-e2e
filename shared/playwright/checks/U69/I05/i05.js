// U69 claim check I05 (housekeeping hk05, 2026-10-05): two incidentals rows.
//   R028  the format file links on a preview (Rule 5 / 5b; Rule 13): a new,
//         unpublished version of a published book, and (the other end) a book
//         never published; per permission level (Press manager, Series editor
//         and Copyeditor not assigned, the book's Author, the Site
//         Administrator, a Reader, a visitor), the HTML and the PDF format.
//         Control: the published version's own links.
//   R047  an HTML book file holding an `omp://monograph/{id}` link, opened from
//         the book's page (HTML view page and the file it frames); control: a
//         second file holding only an `omp://press` link.
//   rule5 Rule 5, 5a, 5b as written (lines 262-281): the preview per permission level, its
//         "View submission", its chapter page; the date axis (none, past, future; a new version
//         with no date, then with "Date Published" saved on its "Catalog Entry").
//   ctl   OJS, OPS: a new version's preview, its "PDF" galley link (the
//         journal / server counterpart of R028).
//
// Every phase seeds its own scratch context (scenarios.md) and signs in from
// that context's roster. One process per app, one run per PROBE_RUN.
// Run (twice, r1 and r2; OMP outlasts 600 s, so run detached):
//   PROBE_RUN=r1 PROBE_FEATURE=U69 PROBE_AGENT=ccI05 node bin/probe.js all shared/playwright/checks/U69/I05/i05.js
// PHASES=prev,omp,ctl picks (default all that apply to the app).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outFile, serverLog, sql} = require('../../../probe');

const PHASES = (process.env.PHASES || 'prev,rule5,omp,ctl').split(',').map((s) => s.trim());
const on = (p) => PHASES.includes(p);
const RUN = process.env.PROBE_RUN || 'r0';
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/index\.php/, '');
const PROD = ['skipExternalReview', 'sendToProduction'];

function fact(key, value) {
    record('facts', {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 1500)}`);
}
async function step(name, fn) {
    const out = {};
    try {
        return await fn(out);
    } catch (e) {
        out.ERR = String((e && e.message) || e).split('\n').slice(0, 5).join(' | ');
        return null;
    } finally {
        if (Object.keys(out).length) fact(name, out);
    }
}
async function snap(page, name) {
    const s = await screen(page).catch((e) => ({screenError: String(e.message || e)}));
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}
const ctxUrl = (app, P, p = '') => app.url(`/index.php/${P}${p}`);

// What a reader sees on a book (article, preprint) page: notices, file links.
const PAGE = () => {
    const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
    const sel = 'a[href*="/catalog/view/"], a[href*="/catalog/download/"], a.obj_galley_link, ul.galleys_links a';
    return {
        docTitle: document.title,
        h1: txt(document.querySelector('h1')),
        notices: [...document.querySelectorAll('.cmp_notification')].map((n) => txt(n)),
        fileLinks: [...document.querySelectorAll(sel)].map((a) => ({t: txt(a), h: a.getAttribute('href'), cls: a.className})),
        files: txt(document.querySelector('.item.files')),
        sideItems: [...document.querySelectorAll('.obj_monograph_full .entry_details > .item')].map((el) => String(el.className).replace(/\bitem\b\s*/, '').trim()),
        dateLabel: txt(document.querySelector('.item.date_published > .sub_item:not(.versions) .label')),
        dateValue: txt(document.querySelector('.item.date_published > .sub_item:not(.versions) .value')),
        versionsHeading: txt(document.querySelector('.item.date_published .sub_item.versions .label')),
        versions: [...document.querySelectorAll('.item.date_published .sub_item.versions li')].map((li) => txt(li)),
        chapterLinks: [...document.querySelectorAll('a[href*="/chapter/"]')].map((a) => ({t: txt(a).slice(0, 60), h: a.getAttribute('href')})),
        chapterDate: txt(document.querySelector('.obj_chapter .item.date_published, .page_chapter .item.date_published, .item.published')),
        body: txt(document.querySelector('.pkp_structure_main') || document.body).slice(0, 400),
    };
};
async function visit(pg, url, name) {
    let r = null;
    let err = null;
    try {
        r = await pg.goto(url);
    } catch (e) {
        err = String(e.message).split('\n')[0].slice(0, 200);
    }
    await idle(pg).catch(() => {});
    const chain = [];
    if (r) {
        let q = r.request();
        while (q) {
            const resp = await q.response().catch(() => null);
            chain.unshift(`${resp ? resp.status() : '?'} ${rel(q.url())}`);
            q = q.redirectedFrom();
        }
    }
    await snap(pg, name);
    const data = await pg.evaluate(PAGE).catch((e) => ({err: String(e.message).slice(0, 200)}));
    return {status: r ? r.status() : err, url: rel(pg.url()), chain, ...data};
}

/**
 * Press a link on the page and read where it lands: the main document's
 * status, the page's title and text, and, on a view page, its frame's own
 * address, status and text. Then back to `back`.
 */
async function press(pg, link, name, back) {
    const out = {href: rel(await link.getAttribute('href').catch(() => null)), text: flat(await link.innerText().catch(() => ''), 80)};
    const seen = [];
    const onResp = (r) => {
        if (/\/catalog\/|\/article\/|\/preprint\/|\/login/.test(r.url()) && r.request().resourceType() !== 'image') {
            seen.push(`${r.status()} ${r.request().resourceType()} ${rel(r.url())}`);
        }
    };
    pg.on('response', onResp);
    const nav = pg.waitForNavigation({timeout: T}).catch(() => null);
    await link.click().catch((e) => { out.clickErr = flat(e.message, 200); });
    const r = await nav;
    await idle(pg).catch(() => {});
    await sleep(1200);
    out.status = r ? r.status() : null;
    out.landed = rel(pg.url());
    out.title = await pg.title().catch(() => null);
    await snap(pg, name);
    out.body = flat(await pg.locator('body').innerText().catch(() => ''), 300);
    const frames = pg.frames().filter((f) => f !== pg.mainFrame());
    out.frames = [];
    for (const f of frames) {
        out.frames.push({url: rel(f.url()), text: flat(await f.locator('body').innerText({timeout: 5000}).catch(() => '(unreadable)'), 300)});
    }
    pg.off('response', onResp);
    out.responses = seen.slice(0, 12);
    if (back) {
        await pg.goto(back).catch(() => {});
        await idle(pg).catch(() => {});
    }
    return out;
}

// ---------------------------------------------------------------- workflow helpers (as U69 K2)
async function openWorkflow(page, app, P, sid, menuKey = null) {
    await page.goto(ctxUrl(app, P, `/dashboard/editorial?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
}
async function createVersion(page, P, group) {
    const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
    const wf = new WorkflowPage(page, P, {labels: {publicationGroup: group}});
    await wf.expectVersionLoaded();
    const item = await wf.revealPublicationEntry('Create New Version');
    await item.click();
    const dlg = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
    await dlg.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(800);
    await snap(page, `${group.toLowerCase()}-create-version-window`);
    const info = {text: flat(await dlg.innerText(), 300)};
    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
    const resp = await created;
    info.status = resp.status();
    const j = await resp.json().catch(() => ({}));
    info.id = j.id;
    info.pubStatus = j.status;
    info.datePublished = j.datePublished;
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    return info;
}
async function publishOnScreen(page) {
    const s = {};
    const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await btn.waitFor({state: 'visible', timeout: T});
    await sleep(600);
    await btn.click();
    const vs = page.locator('select[name="versionStage"]');
    const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Publish', exact: true})}).last();
    const which = await Promise.race([
        vs.waitFor({state: 'visible', timeout: 20_000}).then(() => 'stage'),
        confirm.waitFor({state: 'visible', timeout: 20_000}).then(() => 'confirm'),
    ]).catch(() => null);
    if (which === 'stage') {
        const opts = await vs.locator('option').evaluateAll((os) => os.map((o) => ({v: o.value, t: o.textContent.trim()})));
        const pick = opts.find((o) => /Version of Record/.test(o.t));
        if (pick) await vs.selectOption(pick.v);
        await page.getByRole('button', {name: 'Confirm', exact: true}).last().click();
        await confirm.waitFor({state: 'visible', timeout: T});
    }
    await idle(page);
    s.confirmText = flat(await confirm.innerText().catch(() => ''), 300);
    const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await done;
    s.status = r ? r.status() : null;
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    s.head = flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => ''), 200);
    return s;
}
/** The workflow header's "Preview": where it leads (same tab or a new one). */
async function headerPreview(page, name) {
    const dlg = page.getByRole('dialog').first();
    const ctl = dlg.getByRole('button', {name: 'Preview', exact: true}).or(dlg.getByRole('link', {name: 'Preview', exact: true})).first();
    await loc(page, 'Workflow header: "Preview"', ctl);
    if (!(await ctl.count())) return {absent: true};
    const popup = page.context().waitForEvent('page', {timeout: 8000}).catch(() => null);
    await ctl.click();
    const np = await popup;
    const tgt = np || page;
    await tgt.waitForLoadState('domcontentloaded').catch(() => {});
    await idle(tgt).catch(() => {});
    await snap(tgt, name);
    const d = await tgt.evaluate(PAGE).catch(() => ({}));
    const out = {newTab: !!np, landed: rel(tgt.url()), docTitle: d.docTitle, notices: d.notices, fileLinks: d.fileLinks};
    if (np) await np.close().catch(() => {});
    return out;
}

// ---------------------------------------------------------------- run
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const log = serverLog(app);
    const A = await launch(app); // the signed-in roles
    const V = await launch(app); // a visitor, never signed in
    const page = A.page;
    const vis = V.page;
    for (const p of [page, vis]) p.on('dialog', (d) => d.accept().catch(() => {}));
    const as = async (who, P) => {
        await signOut(page).catch(() => {});
        if (who) await signIn(page, who, P ? {contextPath: P} : {});
    };
    try {
        // ======================================================== R028 (OMP)
        if (isOmp && on('prev')) {
            const P = tag('u69i05');
            const S = {};
            const ok = await step('prev-seed', async (out) => {
                await app.api.createContext({
                    tag: P,
                    context: {name: {en: `I05 Press ${P}`}},
                    users: [
                        {username: `${P}mg`, roles: ['manager']},
                        {username: `${P}se`, roles: ['sectionEditor']},
                        {username: `${P}ce`, roles: ['copyeditor']},
                        {username: `${P}au`, roles: ['author']},
                        {username: `${P}rd`, roles: ['reader']},
                    ],
                });
                const formats = [{name: 'PDF', file: 'article.pdf'}, {name: 'HTML', file: 'article.html'}];
                const seed = async (k, title, extra) => {
                    const r = await app.api.createSubmission({tag: `${P}${k}`, context: P, submitter: `${P}au`, title, publicationFormats: formats, ...extra});
                    return {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats};
                };
                S.a = await seed('a', 'I05 Published Book', {published: true, datePublished: '2024-03-05'});
                S.b = await seed('b', 'I05 Never Published Book', {decisions: PROD});
                Object.assign(out, {P, S});
                note(`ccI05 [omp] ${RUN} prev: press ${P}, books ${JSON.stringify(S)}`);
                return true;
            });
            if (ok) {
                // the published version's links, a visitor (control)
                await step('prev-published-control', async (out) => {
                    const url = ctxUrl(app, P, `/catalog/book/${S.a.id}`);
                    const d = await visit(vis, url, 'prev-a-published-visitor');
                    out.page = {status: d.status, notices: d.notices, fileLinks: d.fileLinks};
                    for (const kind of ['HTML', 'PDF']) {
                        const link = vis.locator('.item.files a').filter({hasText: kind}).first();
                        if (await link.count()) out[kind] = await press(vis, link, `prev-a-published-visitor-${kind.toLowerCase()}`, url);
                    }
                });
                // the Press manager makes the new version and presses "Preview"
                await step('prev-new-version', async (out) => {
                    await as(`${P}mg`, P);
                    await openWorkflow(page, app, P, S.a.id);
                    out.version = await createVersion(page, P, 'Publication');
                    S.v = out.version.id;
                    out.preview = await headerPreview(page, 'prev-a-new-version-header-preview');
                    out.db = {
                        formats: sql(app, `select publication_format_id, publication_id, is_available, is_approved from publication_formats where publication_id in (select publication_id from publications where submission_id=${S.a.id}) order by 1`),
                        files: sql(app, `select submission_file_id, file_stage, assoc_type, assoc_id, direct_sales_price from submission_files where submission_id=${S.a.id} order by 1`),
                        pubs: sql(app, `select publication_id, status, date_published from publications where submission_id=${S.a.id} order by 1`),
                    };
                });
                // each permission level opens the new version's preview and presses its file links
                const readPreview = async (who, url, key, kinds = ['HTML', 'PDF']) => {
                    const pg = who ? page : vis;
                    const d = await visit(pg, url, `prev-${key}`);
                    const o = {status: d.status, url: d.url, chain: d.chain, notices: d.notices, fileLinks: d.fileLinks, files: d.files, body: d.status === 200 ? undefined : flat(d.body, 200)};
                    if (d.status === 200) {
                        await loc(pg, 'Book page (preview): a format file link', pg.locator('.item.files a').first());
                        for (const kind of kinds) {
                            const link = pg.locator('.item.files a').filter({hasText: kind}).first();
                            if (await link.count()) o[kind] = await press(pg, link, `prev-${key}-${kind.toLowerCase()}`, url);
                            else o[kind] = 'no link';
                        }
                    }
                    return o;
                };
                if (S.v) {
                    await step('prev-new-version-roles', async (out) => {
                        const url = ctxUrl(app, P, `/catalog/book/${S.a.id}/version/${S.v}`);
                        for (const [who, k] of [[`${P}mg`, 'manager'], [`${P}se`, 'serieseditor'], [`${P}ce`, 'copyeditor'], [`${P}au`, 'author'], ['admin', 'admin'], [`${P}rd`, 'reader']]) {
                            await as(who, who === 'admin' ? null : P);
                            const m = log.mark();
                            out[k] = await readPreview(who, url, `a-v-${k}`);
                            out[k].log = log.since(m).slice(0, 4).map((l) => flat(l, 220));
                        }
                        out.visitor = await readPreview(null, url, 'a-v-visitor');
                    });
                    // the visitor types the addresses the manager's preview links carry
                    await step('prev-new-version-visitor-typed', async (out) => {
                        await as(`${P}mg`, P);
                        await page.goto(ctxUrl(app, P, `/catalog/book/${S.a.id}/version/${S.v}`));
                        await idle(page);
                        const hrefs = await page.locator('.item.files a').evaluateAll((as) => as.map((a) => ({t: a.innerText.trim(), h: a.href})));
                        for (const {t, h} of hrefs) out[t] = {href: rel(h), ...(await visit(vis, h, `prev-a-v-visitor-typed-${t.replace(/\W+/g, '').toLowerCase()}`).then((d) => ({status: d.status, title: d.docTitle, body: flat(d.body, 160)})))};
                    });
                }
                // the other end: a book never published
                await step('prev-never-published-roles', async (out) => {
                    const url = ctxUrl(app, P, `/catalog/book/${S.b.id}`);
                    for (const [who, k] of [[`${P}mg`, 'manager'], [`${P}se`, 'serieseditor'], [`${P}au`, 'author'], ['admin', 'admin']]) {
                        await as(who, who === 'admin' ? null : P);
                        out[k] = await readPreview(who, url, `b-${k}`);
                    }
                    out.db = sql(app, `select pf.publication_format_id, pf.publication_id, pf.is_available, pf.is_approved from publication_formats pf where pf.publication_id=${S.b.pub} order by 1`);
                });
            }
        }

        // ======================================================== Rule 5 / 5a / 5b (OMP): the preview's own lines
        if (isOmp && on('rule5')) {
            const P = tag('u69i05');
            const S = {};
            const ok = await step('r5-seed', async (out) => {
                await app.api.createContext({
                    tag: P,
                    context: {name: {en: `I05 Press ${P}`}},
                    users: [
                        {username: `${P}mg`, roles: ['manager']},
                        {username: `${P}se`, roles: ['sectionEditor']},
                        {username: `${P}sa`, roles: ['sectionEditor']},
                        {username: `${P}ce`, roles: ['copyeditor']},
                        {username: `${P}au`, roles: ['author']},
                        {username: `${P}rd`, roles: ['reader']},
                    ],
                });
                const parts = [{username: `${P}sa`, role: 'sectionEditor'}];
                const ch = [{title: 'Chapter One', page: true, authors: [`${P}au`]}];
                const seed = async (k, title, extra) => {
                    const r = await app.api.createSubmission({tag: `${P}${k}`, context: P, submitter: `${P}au`, title, participants: parts, ...extra});
                    return {id: r.submissionId, pub: r.publicationId};
                };
                S.n = await seed('n', 'I05 Undated Preview', {decisions: PROD, chapters: ch});
                S.d = await seed('d', 'I05 Dated Preview', {decisions: PROD, datePublished: '2024-06-01', chapters: ch});
                S.f = await seed('f', 'I05 Future Preview', {decisions: PROD, datePublished: '2031-01-10'});
                S.a = await seed('a', 'I05 Published Book', {published: true, datePublished: '2024-03-05', chapters: ch});
                Object.assign(out, {P, S});
                note(`ccI05 [omp] ${RUN} rule5: press ${P}, books ${JSON.stringify(S)}`);
                return true;
            });
            if (ok) {
                const brief = (d) => ({status: d.status, url: d.url, notices: d.notices, sideItems: d.sideItems, dateLabel: d.dateLabel, dateValue: d.dateValue,
                    versionsHeading: d.versionsHeading, versions: d.versions, body: d.status === 200 ? undefined : flat(d.body, 160)});
                // the undated book, per permission level: the page, "View submission", the chapter page
                await step('r5-roles', async (out) => {
                    const url = ctxUrl(app, P, `/catalog/book/${S.n.id}`);
                    for (const [who, k] of [[`${P}mg`, 'manager'], [`${P}sa`, 'serieseditor-assigned'], [`${P}se`, 'serieseditor'], [`${P}ce`, 'copyeditor'], [`${P}au`, 'author'], ['admin', 'admin'], [`${P}rd`, 'reader'], [null, 'visitor']]) {
                        const pg = who ? page : vis;
                        if (who) await as(who, who === 'admin' ? null : P);
                        const d = await visit(pg, url, `r5-n-${k}`);
                        const o = brief(d);
                        o.chapterLinks = d.chapterLinks;
                        if (d.status === 200) {
                            const ch = pg.locator('a[href*="/chapter/"]').first();
                            if (await ch.count()) {
                                const c = await press(pg, ch, `r5-n-${k}-chapter`, null);
                                const cd = await pg.evaluate(PAGE).catch(() => ({}));
                                o.chapter = {status: c.status, landed: c.landed, title: c.title, notices: cd.notices, body: flat(c.body, 260)};
                                await pg.goto(url);
                                await idle(pg);
                            }
                            const vsub = pg.locator('.cmp_notification').getByRole('link', {name: 'View submission', exact: true});
                            await loc(pg, 'Book page (preview): "View submission"', vsub);
                            if (await vsub.count()) {
                                await vsub.click();
                                await pg.waitForLoadState('domcontentloaded').catch(() => {});
                                await idle(pg).catch(() => {});
                                await sleep(1500);
                                const sv = await snap(pg, `r5-n-${k}-view-submission`);
                                o.viewSubmission = {url: rel(pg.url()), title: await pg.title().catch(() => null), dialog: flat(sv.text && sv.text.dialog, 220), main: flat(sv.text && sv.text.main, 220),
                                    errorDialog: flat(await pg.getByRole('dialog', {name: 'Error', exact: true}).innerText().catch(() => null), 200)};
                            }
                        }
                        if (o.chapterLinks && o.chapterLinks[0]) S.nChapter = o.chapterLinks[0].h;
                        if (d.status !== 200 && S.nChapter) {
                            // the chapter's address typed by those the book's page refuses
                            const c = await visit(pg, S.nChapter, `r5-n-${k}-chapter-typed`);
                            o.chapterTyped = {status: c.status, url: c.url, chain: c.chain, body: flat(c.body, 120)};
                        }
                        out[k] = o;
                    }
                });
                // the date axis: no date (above), a past date, a future date
                await step('r5-dates', async (out) => {
                    await as(`${P}mg`, P);
                    for (const [k, b] of [['undated', S.n], ['dated', S.d], ['future', S.f]]) {
                        out[k] = brief(await visit(page, ctxUrl(app, P, `/catalog/book/${b.id}`), `r5-${k}-manager`));
                    }
                    // the dated unpublished book's chapter page
                    const d = await visit(page, ctxUrl(app, P, `/catalog/book/${S.d.id}`), 'r5-dated-manager-again');
                    if (d.chapterLinks && d.chapterLinks[0]) {
                        const c = await visit(page, d.chapterLinks[0].h, 'r5-dated-chapter-manager');
                        out.datedChapter = {status: c.status, notices: c.notices, body: flat(c.body, 260)};
                    }
                });
                // a new version of the published book: no date, then a date saved on it
                await step('r5-new-version', async (out) => {
                    await as(`${P}mg`, P);
                    await openWorkflow(page, app, P, S.a.id);
                    out.version = await createVersion(page, P, 'Publication');
                    S.v = out.version.id;
                    const url = ctxUrl(app, P, `/catalog/book/${S.a.id}/version/${S.v}`);
                    out.undated = brief(await visit(page, url, 'r5-a-v-undated-manager'));
                    // its chapter page, from the preview's contents
                    const dd = await page.evaluate(PAGE).catch(() => ({}));
                    out.undatedChapterLinks = dd.chapterLinks;
                    if (dd.chapterLinks && dd.chapterLinks[0]) {
                        const c = await visit(page, dd.chapterLinks[0].h, 'r5-a-v-chapter-manager');
                        out.chapter = {status: c.status, url: c.url, notices: c.notices, body: flat(c.body, 260)};
                    }
                    // "Date Published" on the new version's "Catalog Entry"
                    await openWorkflow(page, app, P, S.a.id, `publication_${S.v}_catalogEntry`);
                    const box = page.locator('input[name="datePublished"]').last();
                    await box.waitFor({state: 'visible', timeout: T});
                    await sleep(600);
                    const form = page.locator('form').filter({has: box}).last();
                    out.dateBefore = await box.inputValue();
                    await box.fill('2025-01-15');
                    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
                    await form.getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await saved;
                    out.dateSave = {status: r.status(), stored: (await r.json().catch(() => ({}))).datePublished};
                    await idle(page);
                    await sleep(800);
                    await snap(page, 'r5-a-v-catalog-entry-saved');
                    await page.reload();
                    await idle(page);
                    await sleep(800);
                    out.dateAfterReload = await page.locator('input[name="datePublished"]').last().inputValue().catch(() => null);
                    out.dated = brief(await visit(page, url, 'r5-a-v-dated-manager'));
                    out.current = brief(await visit(vis, ctxUrl(app, P, `/catalog/book/${S.a.id}`), 'r5-a-current-visitor'));
                    out.db = sql(app, `select publication_id, status, date_published, version_stage, version_major, version_minor from publications where submission_id=${S.a.id} order by 1`);
                });
            }
        }

        // ======================================================== R047 (OMP)
        if (isOmp && on('omp')) {
            const P = tag('u69i05');
            const S = {};
            const ok = await step('omp-seed', async (out) => {
                await app.api.createContext({tag: P, context: {name: {en: `I05 Press ${P}`}}, users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}, {username: `${P}rd`, roles: ['reader']}]});
                const t = await app.api.createSubmission({tag: `${P}t`, context: P, submitter: `${P}au`, title: 'I05 Target Book', published: true, datePublished: '2024-03-05'});
                const c = await app.api.createSubmission({tag: `${P}c`, context: P, submitter: `${P}au`, title: 'I05 Linking Book', decisions: PROD, publicationFormats: [{name: 'HTML'}]});
                S.t = {id: t.submissionId, pub: t.publicationId};
                S.c = {id: c.submissionId, pub: c.publicationId, formats: c.publicationFormats};
                // the two HTML files the press uploads: one links another book, one the press
                S.fMono = outFile('i05-monograph-link.html');
                S.fPress = outFile('i05-press-link.html');
                fs.writeFileSync(S.fMono, `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>Linking chapter</title></head>\n<body><h1>Linking chapter</h1>\n<p>See also <a href="omp://monograph/${S.t.id}">the target book</a>.</p>\n</body></html>\n`);
                fs.writeFileSync(S.fPress, `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>Press link</title></head>\n<body><h1>Press link</h1>\n<p>Visit <a href="omp://press">the press</a>.</p>\n</body></html>\n`);
                Object.assign(out, {P, S: {...S, fMono: path.basename(S.fMono), fPress: path.basename(S.fPress)}});
                note(`ccI05 [omp] ${RUN} omp: press ${P}, books ${JSON.stringify({t: S.t, c: S.c})}`);
                return true;
            });
            if (ok) {
                const ok2 = await step('omp-upload-publish', async (out) => {
                    const {PublicationFormatsPage, TermsWindow, SALES} = require(path.join(REPO, 'apps/omp/playwright/pages/PublicationFormatPages.js'));
                    await as(`${P}mg`, P);
                    const pf = new PublicationFormatsPage(page, P);
                    await pf.gotoEditorial(S.c.id, S.c.pub);
                    await snap(page, 'omp-formats-before');
                    for (const f of [S.fMono, S.fPress]) {
                        out[`upload-${path.basename(f)}`] = await pf.uploadWithChangeFile('HTML', f);
                        const tw = await pf.openTerms('HTML', path.basename(f));
                        await tw.choose(SALES.openAccess);
                        await tw.save();
                        await idle(page);
                        await sleep(600);
                    }
                    void TermsWindow;
                    await snap(page, 'omp-formats-after');
                    await openWorkflow(page, app, P, S.c.id, `publication_${S.c.pub}_titleAbstract`);
                    out.publish = await publishOnScreen(page);
                    out.db = sql(app, `select sf.submission_file_id, sf.file_stage, sf.direct_sales_price, f.mimetype from submission_files sf join files f on f.file_id=sf.file_id where sf.submission_id=${S.c.id} order by 1`);
                    return out.publish && out.publish.status === 200;
                });
                if (ok2) {
                    const readFile = async (pg, who, key) => {
                        const o = {};
                        const url = ctxUrl(app, P, `/catalog/book/${S.c.id}`);
                        const d = await visit(pg, url, `omp-book-${key}`);
                        o.page = {status: d.status, fileLinks: d.fileLinks, files: d.files};
                        for (const [k, f] of [['monograph', S.fMono], ['press', S.fPress]]) {
                            const name = path.basename(f);
                            const link = pg.locator('.item.files a').filter({hasText: name.replace(/\.html$/, '')}).first();
                            const fallback = pg.locator(`.item.files a`).nth(k === 'monograph' ? 0 : 1);
                            const use = (await link.count()) ? link : fallback;
                            const m = log.mark();
                            o[k] = await press(pg, use, `omp-view-${k}-${key}`, null);
                            // the file the view page frames, read on its own
                            const fr = o[k].frames && o[k].frames[0];
                            if (fr && fr.url) {
                                const r = await pg.request.get(app.url(`/index.php${fr.url}`)).catch(() => null);
                                o[k].frameStatus = r ? r.status() : null;
                                const body = r ? await r.text().catch(() => '') : '';
                                o[k].frameHasLink = (body.match(/href="[^"]*"/g) || []).slice(0, 4);
                            }
                            o[k].log = log.since(m).slice(0, 4).map((l) => flat(l, 260));
                            if (k === 'press' && fr && fr.url) {
                                // follow the rewritten link inside the frame
                                const inner = pg.frames().find((x) => x !== pg.mainFrame());
                                const a = inner ? inner.locator('a').first() : null;
                                if (a && (await a.count())) {
                                    o.pressFollow = {href: rel(await a.getAttribute('href'))};
                                    await a.click().catch(() => {});
                                    await sleep(2000);
                                    o.pressFollow.frameUrl = rel(inner.url());
                                    await snap(pg, `omp-view-press-followed-${key}`);
                                }
                            }
                            await pg.goto(url).catch(() => {});
                            await idle(pg).catch(() => {});
                        }
                        return o;
                    };
                    await step('omp-visitor', async (out) => Object.assign(out, await readFile(vis, null, 'visitor')));
                    await step('omp-reader', async (out) => {
                        await as(`${P}rd`, P);
                        Object.assign(out, await readFile(page, `${P}rd`, 'reader'));
                    });
                    await step('omp-manager', async (out) => {
                        await as(`${P}mg`, P);
                        Object.assign(out, await readFile(page, `${P}mg`, 'manager'));
                    });
                }
            }
        }

        // ======================================================== ctl (OJS, OPS)
        if (!isOmp && on('ctl')) {
            const isOjs = app.name === 'ojs';
            const P = tag('u69i05');
            const S = {};
            const ok = await step('ctl-seed', async (out) => {
                const spec = {tag: P, context: {name: {en: `I05 ${isOjs ? 'Journal' : 'Server'} ${P}`}}, users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}]};
                if (isOjs) spec.issues = [{volume: 1, number: 1, year: 2026, published: true}];
                await app.api.createContext(spec);
                const r = await app.api.createSubmission({tag: `${P}a`, context: P, submitter: `${P}au`, title: 'I05 Published Item', published: true,
                    galleys: [{label: 'PDF', file: isOjs ? 'article.pdf' : 'preprint.pdf'}], ...(isOjs ? {issue: {volume: 1, number: 1, year: 2026}} : {})});
                S.a = {id: r.submissionId, pub: r.publicationId};
                Object.assign(out, {P, S});
                return true;
            });
            if (ok) {
                await step('ctl-new-version-preview', async (out) => {
                    await as(`${P}mg`, P);
                    await openWorkflow(page, app, P, S.a.id);
                    out.version = await createVersion(page, P, isOjs ? 'Publication' : 'Preprint');
                    const item = isOjs ? 'article/view' : 'preprint/view';
                    const url = ctxUrl(app, P, `/${item}/${S.a.id}/version/${out.version.id}`);
                    const d = await visit(page, url, 'ctl-preview-manager');
                    out.preview = {status: d.status, notices: d.notices, fileLinks: d.fileLinks};
                    const link = page.locator('a.obj_galley_link').filter({hasText: 'PDF'}).first();
                    if (await link.count()) out.pdf = await press(page, link, 'ctl-preview-manager-pdf', url);
                    else out.pdf = 'no link';
                });
            }
        }
        await signOut(page).catch(() => {});
    } finally {
        await A.close();
        await V.close();
    }
});
