// U12 claim check, chunk H15 (housekeeping 2026-10-15): three incidentals rows, no spec lines.
// Runs on a DATASET fleet (PKP's default test dataset; harness.md "Dataset fleets"), three phases:
//
//   href   (main, ojs omp ops) — the REST API's single-item address (`_href`) of one journal (press,
//          server) announcement, section and institution (rows for U12, U17, U66; cf. U11 A10). A
//          scratch context with a manager and an author, one seeded announcement and institution
//          (OJS and OPS: the default section). The manager opens Announcements and Institutions (the
//          screens' own list requests carry `_href`) and the Sections tab; the sections list, which
//          no screen asks for, is read directly. Each `_href`, the context's own single-item
//          address and an unknown id there are read as the manager, the site administrator, the
//          author and signed out; `publicknowledge`'s lists are read (read-only) as `rvaca`.
//   credit (main, ojs) — `dbarnes`, submission 6, first contributor: the Edit window and what its
//          "Save" sends (a role with "Degree" left empty), then `PUT …/contributors/{id}` with a
//          CRediT degree the app does not know ("NULL" as text) from no roles and from three roles,
//          with a valid control; what each answers and what is kept (row for U41).
//   order  (main and stable-3_5_0, ojs omp ops) — `dbarnes`: a contributor's "Edit" and "Save" with
//          nothing changed (OJS 4, OMP 14 and 4, OPS 7); the list order before, right after and
//          after a reload, and the stored sequences (row for U41, retired A15).
//
// Every phase changes the dataset: reset the fleet before each run.
//   npm run fleet-prep -- --feature issues-cc12a --dataset 8 --reset
//   bin/app-lock.sh shared ojs -- env PROBE_FEATURE=issues-cc12a PKP_E2E_DATASET=8 PROBE_AGENT=cc12a PROBE_RUN=r1 \
//       node bin/probe.js ojs shared/playwright/checks/U12/H15/h15.js href
//   PKP_E2E_LINE=stable-3_5_0 PROBE_FEATURE=issues-cc12a-3_5 PKP_E2E_DATASET=8 PROBE_AGENT=cc12a PROBE_RUN=s1 \
//       node bin/probe.js omp shared/playwright/checks/U12/H15/h15.js order
// A main fleet loaded from the 3.5 dataset and upgraded (tied sequences on main):
//   PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature issues-cc12a --dataset 8 --reset
// Facts go to h15-<phase>[-<run>]-<app>.json; no assertions. A database error's text is never written out:
// the record keeps only whether the answer carried one.
const {forEachApp, launch, signIn, signOut, screen, shot, record, note, idle, tag, sql, serverLog} =
    require('../../../probe');

const T = 30_000;
const PHASE = process.argv[2] || 'href';
const CTX = 'publicknowledge';
const flat = (s, n = 400) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[h15]', ...a);
const ROLE = (slug) => `https://credit.niso.org/contributor-roles/${slug}/`;

async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
    if (extra) Object.assign(s, extra);
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** A request in the page's own session (cookie, CSRF token of the page's `pkp.currentUser`). */
async function call(page, method, url, data) {
    return page.evaluate(async ({method, url, data}) => {
        const token = window.pkp?.currentUser?.csrfToken || '';
        const r = await fetch(url, {
            method, credentials: 'same-origin',
            headers: {Accept: 'application/json', 'Content-Type': 'application/json', 'X-Csrf-Token': token},
            body: data === undefined ? undefined : JSON.stringify(data),
        });
        const text = await r.text();
        let body = text; try { body = JSON.parse(text); } catch { /* not JSON */ }
        return {url, status: r.status, body};
    }, {method, url, data});
}
/** An answer with a database error's text in it is kept as a flag only. */
function short(r) {
    const raw = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    if (/SQLSTATE|Connection: pgsql|violates check constraint/i.test(raw || '')) {
        return {url: r.url, status: r.status, body: '[database error text: withheld]', dbErrorText: true};
    }
    return {url: r.url, status: r.status, body: typeof r.body === 'string' ? flat(r.body, 300) : r.body};
}
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

// ---------------------------------------------------------------------------------------------- href
async function phaseHref(app, out) {
    const t = tag('u12h15');
    const isOJS = app.name === 'ojs';
    const spec = {
        tag: t, context: {name: `U12 H15 ${t}`, acronym: 'U12H15'},
        users: [
            {username: `${t}mgr`, roles: ['manager'], givenName: 'Hana', familyName: 'Manager'},
            {username: `${t}au`, roles: ['author'], givenName: 'Abe', familyName: 'Author'},
        ],
        enableAnnouncements: true,
        announcements: [{title: `H15 notice ${t}`, descriptionShort: '<p>One announcement.</p>'}],
        institutions: [{name: `H15 Institute ${t}`, ipRanges: ['10.9.9.0/24']}],
    };
    const ctx = await app.api.createContext(spec);
    const P = ctx.path || t;
    out.scratch = {path: P, contextId: ctx.contextId, announcements: ctx.announcements, institutions: ctx.institutions};
    log(app.name, 'scratch', JSON.stringify(out.scratch));
    const slog = serverLog(app);
    const {page, close} = await launch(app);
    const lists = {};
    page.on('response', async (r) => {
        const m = r.url().match(/\/api\/v1\/(announcements|institutions|sections)(\?|$)/);
        if (!m || r.request().method() !== 'GET') return;
        try { lists[m[1]] = {url: rel(r.url()), status: r.status(), items: ((await r.json()).items || []).map((i) => ({id: i.id, _href: i._href, contextId: i.contextId ?? i.assocId}))}; } catch { /* not JSON */ }
    });
    try {
        // 1. the manager's screens
        await signIn(page, `${t}mgr`, {contextPath: P});
        await page.goto(app.url(`/index.php/${P}/management/settings/announcements`));
        await idle(page);
        await page.locator('main .listPanel').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.announcementsScreen = (await snap(page, 'h15-href-announcements-page')).text?.main?.slice(0, 600);
        await page.goto(app.url(`/index.php/${P}/management/settings/institutions`));
        await idle(page);
        await page.getByRole('button', {name: 'Add Institution'}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        out.institutionsScreen = (await snap(page, 'h15-href-institutions-page')).text?.main?.slice(0, 600);
        await page.goto(app.url(`/index.php/${P}/management/settings/context`));
        await idle(page);
        const secTab = page.getByRole('tab', {name: 'Sections', exact: true}).first();
        out.sectionsTab = (await secTab.count()) > 0;
        if (out.sectionsTab) { await secTab.click(); await idle(page); await sleep(800); }
        out.sectionsScreen = (await snap(page, 'h15-href-sections-tab', {sectionsTab: out.sectionsTab})).text?.main?.slice(0, 600);
        out.screenLists = JSON.parse(JSON.stringify(lists));

        // 2. the three lists, `_href` of the one item each
        const api = (p) => app.url(`/index.php/${P}/api/v1/${p}`);
        const items = {};
        for (const k of ['announcements', 'institutions', 'sections']) {
            const fromScreen = lists[k];
            const l = fromScreen && fromScreen.items.length ? null : await call(page, 'GET', api(k));
            const list = fromScreen && fromScreen.items.length ? fromScreen : {url: rel(l.url), status: l.status, items: (l.body?.items || []).map((i) => ({id: i.id, _href: i._href, hasHref: '_href' in i, contextId: i.contextId ?? i.assocId})), body: l.status >= 400 ? short(l).body : undefined};
            list.source = fromScreen && fromScreen.items.length ? 'the screen\'s own request' : 'read directly';
            items[k] = list;
            log(app.name, k, list.source, list.status, JSON.stringify(list.items.slice(0, 2)), list.body ? JSON.stringify(list.body).slice(0, 200) : '');
        }
        out.lists = items;

        const reads = async (who) => {
            const r = {};
            for (const k of Object.keys(items)) {
                const it = items[k].items[0];
                if (!it) continue;
                r[k] = {
                    href: it._href ? short(await call(page, 'GET', it._href)) : 'no _href in the answer',
                    contextItem: short(await call(page, 'GET', api(`${k}/${it.id}`))),
                    unknownId: short(await call(page, 'GET', api(`${k}/${Number(it.id) + 100000}`))),
                };
            }
            log(app.name, who, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, [v.href.status ?? v.href, v.contextItem.status, v.unknownId.status]]))));
            return r;
        };
        let from = slog.mark();
        out.manager = await reads('manager');
        out.managerLog = slog.since(from).slice(0, 8);
        // what a person opening the `_href` link gets
        out.openedHref = {};
        for (const k of Object.keys(items)) {
            const it = items[k].items[0];
            if (!it || !it._href) continue;
            const resp = await page.goto(it._href).catch(() => null);
            await idle(page).catch(() => {});
            const s = await snap(page, `h15-href-open-${k}-manager`);
            out.openedHref[k] = {status: resp && resp.status(), body: flat(s.text?.main || s.aria || '', 300)};
        }
        await page.goto(app.url(`/index.php/${P}`)); await idle(page);
        await signOut(page);

        // 3. the site administrator, 4. the author, 5. signed out
        await signIn(page, 'admin');
        await page.goto(app.url(`/index.php/${P}/management/settings/announcements`)); await idle(page);
        from = slog.mark();
        out.admin = await reads('admin');
        out.adminLog = slog.since(from).slice(0, 8);
        await signOut(page);
        await signIn(page, `${t}au`, {contextPath: P});
        await page.goto(app.url(`/index.php/${P}/submissions`)); await idle(page);
        out.author = await reads('author');
        await signOut(page);
        await page.goto(app.url(`/index.php/${P}`)); await idle(page);
        out.signedOut = await reads('signed out');

        // 6. the dataset's own journal, read only, as its manager
        await signIn(page, 'rvaca', {contextPath: CTX});
        await page.goto(app.url(`/index.php/${CTX}/management/settings/announcements`)); await idle(page);
        out.pk = {};
        for (const k of ['announcements', 'institutions', 'sections']) {
            const l = await call(page, 'GET', app.url(`/index.php/${CTX}/api/v1/${k}`));
            const first = (l.body?.items || [])[0];
            out.pk[k] = {status: l.status, count: l.body?.itemsMax, first: first ? {id: first.id, _href: first._href} : null, body: l.status >= 400 ? short(l).body : undefined};
            if (first?._href) out.pk[k].hrefAnswer = short(await call(page, 'GET', first._href)).status;
        }
        log(app.name, 'publicknowledge', JSON.stringify(out.pk));
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------------------------- shared workflow helpers
function workflow(app, page) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
}
const old = (app) => /3_5/.test(app.line || '');
const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

async function openContributors(app, page, wf, sid) {
    await wf.gotoEditorial(sid);
    await idle(page);
    if (!old(app)) await wf.expandLatestVersionNode().catch(() => {});
    const links = wf.menuLink('Contributors');
    for (let i = (await links.count()) - 1; i >= 0; i--) {
        if (await links.nth(i).isVisible().catch(() => false)) { await links.nth(i).click(); break; }
    }
    await idle(page);
    await wf.dialog().locator('li.listPanel__item').first().waitFor({timeout: T}).catch(() => {});
    await sleep(800);
}
async function listNames(wf) {
    const rows = await wf.dialog().locator('li.listPanel__item').allInnerTexts().catch(() => []);
    return rows.map((r) => flat(r.split('\n')[0], 80));
}
async function openEdit(page, wf, index = 0) {
    const item = wf.dialog().locator('li.listPanel__item').nth(index);
    const edit = item.getByRole('button', {name: /^Edit/}).first();
    if (!(await edit.isVisible().catch(() => false))) return null;
    await edit.click();
    const dlg = page.getByRole('dialog', {name: 'Edit', exact: true});
    await dlg.waitFor({timeout: T});
    await dlg.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    return dlg;
}
async function save(page, dlg) {
    const answer = page.waitForResponse((r) => /\/contributors\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const out = {status: r ? r.status() : null};
    if (r) { try { out.sent = r.request().postDataJSON(); } catch { out.sent = 'unreadable'; } }
    await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => { out.windowStayed = true; });
    await idle(page);
    await sleep(800);
    return out;
}
function seqs(app, sid) {
    return sql(app, `select a.seq, a.author_id, (select s.setting_value from author_settings s where s.author_id = a.author_id and s.setting_name = 'givenName' and s.locale = 'en') || ' ' || coalesce((select s.setting_value from author_settings s where s.author_id = a.author_id and s.setting_name = 'familyName' and s.locale = 'en'), '')
        from authors a where a.publication_id = (select current_publication_id from submissions where submission_id = ${sid}) order by a.seq, a.author_id`).split('\n').filter(Boolean);
}

// ---------------------------------------------------------------------------------------------- credit
async function phaseCredit(app, out) {
    if (app.name !== 'ojs') { out.skipped = 'OJS only'; return; }
    const slog = serverLog(app);
    const {page, close} = await launch(app);
    const wf = workflow(app, page);
    const api = (p) => app.url(`/index.php/${CTX}/api/v1/${p}`);
    try {
        await signIn(page, 'dbarnes', {contextPath: CTX});
        await openContributors(app, page, wf, 6);
        out.list = await listNames(wf);
        await snap(page, 'h15-credit-contributors');
        // 1. the Edit window: its CRediT table, one role added with "Degree" left empty, "Save"
        let dlg = await openEdit(page, wf, 0);
        out.editOpened = !!dlg;
        if (dlg) {
            await snap(page, 'h15-credit-edit-window');
            const add = dlg.getByRole('button', {name: 'Add Another Role'}).first();
            out.addRoleButton = await add.isVisible().catch(() => false);
            if (out.addRoleButton) { await add.click(); await sleep(500); }
            const row = await snap(page, 'h15-credit-edit-role-added');
            out.editDialogText = flat(String(row.text?.dialog || '').slice(Math.max(0, String(row.text?.dialog || '').indexOf('CRediT'))), 700);
            const sv = await save(page, dlg);
            const sentCredit = sv.sent && typeof sv.sent === 'object' ? Object.fromEntries(Object.entries(sv.sent).filter(([k]) => /^creditRoles/.test(k))) : null;
            out.formSave = {status: sv.status, windowStayed: !!sv.windowStayed, sentCreditRoles: sentCredit, sentKeys: sv.sent && typeof sv.sent === 'object' ? Object.keys(sv.sent).sort() : null};
            await snap(page, 'h15-credit-after-form-save');
            log('form save', JSON.stringify(out.formSave));
        }
        // 2. the API: the contributor as the workflow reads it
        const sub = (await call(page, 'GET', api('submissions/6'))).body;
        const pub = sub.publications[sub.publications.length - 1];
        const cl = await call(page, 'GET', api(`submissions/6/publications/${pub.id}/contributors`));
        const first = (cl.body?.items ?? cl.body)?.[0];
        const cid = first.id;
        const one = async () => {
            const r = await call(page, 'GET', api(`submissions/6/publications/${pub.id}/contributors/${cid}`));
            return {status: r.status, givenName: r.body?.givenName?.en, creditRoles: (r.body?.creditRoles || []).map((c) => `${c.role.replace(/.*contributor-roles\/|\/$/g, '')}:${c.degree ?? 'none'}`)};
        };
        const put = async (label, creditRoles, extra = {}) => {
            const from = slog.mark();
            const r = await call(page, 'PUT', api(`submissions/6/publications/${pub.id}/contributors/${cid}`), {...first, contributorRoles: (first.contributorRoles ?? []).map((x) => x.id), creditRoles, ...extra});
            const res = {sent: creditRoles.map((c) => `${c.role.replace(/.*contributor-roles\/|\/$/g, '')}:${c.degree === null ? 'null' : c.degree}`), answer: short(r), after: await one(), serverLogLines: slog.since(from).length};
            log(label, JSON.stringify({status: res.answer.status, dbErrorText: !!res.answer.dbErrorText, after: res.after}));
            return res;
        };
        out.contributor = {id: cid, before: await one()};
        out.clear = await put('clear', []);
        out.nullFromNone = await put('NULL from none', [
            {role: ROLE('conceptualization'), degree: 'LEAD'},
            {role: ROLE('data-curation'), degree: 'NULL'},
            {role: ROLE('software'), degree: 'SUPPORTING'},
        ], {givenName: {...(first.givenName || {}), en: `${first.givenName?.en || ''} H15`}});
        out.validControl = await put('valid control', [
            {role: ROLE('conceptualization'), degree: 'LEAD'},
            {role: ROLE('data-curation'), degree: null},
            {role: ROLE('software'), degree: 'SUPPORTING'},
        ]);
        out.nullFromThree = await put('NULL from three', [
            {role: ROLE('conceptualization'), degree: 'EQUAL'},
            {role: ROLE('data-curation'), degree: 'NULL'},
            {role: ROLE('software'), degree: 'LEAD'},
        ]);
        out.lowercase = await put('lowercase degree', [
            {role: ROLE('conceptualization'), degree: 'lead'},
        ]);
        // 3. the screen after: the list and the Edit window's CRediT rows, after a reload
        await openContributors(app, page, wf, 6);
        dlg = await openEdit(page, wf, 0);
        const after = await snap(page, 'h15-credit-edit-after-reload');
        out.editAfterReload = flat(String(after.text?.dialog || '').slice(Math.max(0, String(after.text?.dialog || '').indexOf('CRediT'))), 700);
        if (dlg) await dlg.getByRole('button', {name: /^Close|Cancel$/}).first().click().catch(() => {});
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------------------------- order
const CASES = {ojs: [4], omp: [14, 4], ops: [7]};
const PUBLIC = {omp: {14: '/index.php/publicknowledge/catalog/book/14'}, ops: {7: '/index.php/publicknowledge/preprint/view/7'}};
/** The item's public page, signed in as the editor: the citation_author tags in page order. */
async function publicAuthors(app, sid, name) {
    const addr = PUBLIC[app.name]?.[sid];
    if (!addr) return null;
    const {page, close} = await launch(app);
    try {
        const r = await page.goto(app.url(addr));
        await idle(page).catch(() => {});
        const authors = await page.locator('meta[name="citation_author"]').evaluateAll((ms) => ms.map((m) => m.content));
        await snap(page, name);
        return {status: r && r.status(), citationAuthors: authors};
    } finally {
        await close();
    }
}
async function phaseOrder(app, out) {
    const {page, close} = await launch(app);
    const wf = workflow(app, page);
    out.cases = {};
    try {
        await signIn(page, 'dbarnes', {contextPath: CTX});
        for (const sid of CASES[app.name]) {
            const c = {sid, seqBefore: seqs(app, sid), publicBefore: await publicAuthors(app, sid, `h15-order-${sid}-public-before`)};
            await openContributors(app, page, wf, sid);
            c.listBefore = await listNames(wf);
            await snap(page, `h15-order-${sid}-before`);
            let dlg = await openEdit(page, wf, 0);
            if (!dlg) {
                // a published version that cannot be edited: "Unpublish" ("Unpost") first, as a person would
                c.editAbsentOnPublished = true;
                await snap(page, `h15-order-${sid}-no-edit`);
                const btn = controls(page).getByRole('button', {name: /^(Unpublish|Unpost)$/}).first();
                if (await btn.isVisible().catch(() => false)) {
                    await btn.click();
                    const win = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be/}).last();
                    await win.waitFor({timeout: T});
                    const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                    await win.getByRole('button', {name: /^(Unpublish|Unpost)$/}).last().click();
                    c.unpublish = (await w)?.status() ?? null;
                    await idle(page); await sleep(800);
                }
                c.seqAfterUnpublish = seqs(app, sid);
                await openContributors(app, page, wf, sid);
                c.listAfterUnpublish = await listNames(wf);
                dlg = await openEdit(page, wf, 0);
            }
            if (!dlg) { c.edit = 'no Edit'; out.cases[sid] = c; continue; }
            c.edited = c.listAfterUnpublish ? c.listAfterUnpublish[0] : c.listBefore[0];
            await snap(page, `h15-order-${sid}-edit`);
            const sv = await save(page, dlg);
            c.save = {status: sv.status, windowStayed: !!sv.windowStayed};
            c.listRightAfter = await listNames(wf);
            await snap(page, `h15-order-${sid}-after-save`);
            c.seqAfter = seqs(app, sid);
            await page.reload(); await idle(page);
            await openContributors(app, page, wf, sid);
            c.listAfterReload = await listNames(wf);
            await snap(page, `h15-order-${sid}-after-reload`);
            c.publicAfter = await publicAuthors(app, sid, `h15-order-${sid}-public-after`);
            const ref = c.listAfterUnpublish || c.listBefore;
            c.movedToEnd = {rightAfter: c.listRightAfter.at(-1) === c.edited && ref[0] === c.edited, afterReload: c.listAfterReload.at(-1) === c.edited && ref[0] === c.edited};
            log(app.name, sid, JSON.stringify({before: ref, rightAfter: c.listRightAfter, afterReload: c.listAfterReload, publicBefore: c.publicBefore?.citationAuthors, publicAfter: c.publicAfter?.citationAuthors, seqAfter: c.seqAfter, save: c.save}));
            out.cases[sid] = c;
        }
    } finally {
        await close();
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('h15.js runs on a dataset fleet only (fleet-prep --dataset)');
    const out = {app: app.name, line: app.line || 'main', dataset: app.dataset, phase: PHASE, run: process.env.PROBE_RUN || null};
    try {
        if (PHASE === 'href') await phaseHref(app, out);
        else if (PHASE === 'credit') await phaseCredit(app, out);
        else if (PHASE === 'order') await phaseOrder(app, out);
        else throw new Error(`unknown phase ${PHASE}`);
    } catch (e) {
        out.error = flat(e.stack || e.message, 800);
        log(app.name, 'ERROR', out.error);
    } finally {
        record(`h15-${PHASE}`, out);
        console.log('[h15] RESULT', app.name, JSON.stringify(out).slice(0, 3000));
    }
});
