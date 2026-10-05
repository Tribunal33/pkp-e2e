// U45 claim check, housekeeping chunk I05 (hk05, 2026-10-05): five incidentals rows on the DOIs page.
// Spec: docs/specs/U45-dois.md Rule 16 (317–322), Rules 26–28 (418–439, "every DOI of each ticked item"),
// Rule 29 "Deposit DOIs" / "Deposit All" (457–474), Rule 32 (507–509, "A deposit sets Submitted at once"),
// Rule 44 (669–678), Rule 52 (757–763); register A13, A15, A17; footnotes m p q21 x q26 z9 q34 f-a13 f-a15 f-a17.
//   R027  OJS "Issues" tab: ticked issues › "Deposit DOIs" — are the issue DOIs marked "Submitted"?  (Crossref, DataCite)
//   R034  OJS "Deposit All" with a published article whose article DOI is empty and whose galley has one (DataCite)
//   R037  OPS Tools › Crossref tool, an export with nothing ticked (and the DOIs page's own "Export DOIs" with nothing ticked)
//   R038  "DOI Versioning" "Yes", a work with versions 1.0 and 2.0 (major): "Mark DOIs Registered / Needs Sync /
//         Unregistered" — do they reach the earlier version's DOIs?  (OMP; OJS and OPS as controls)
//   R189  a title with an italic word and "&": the DOIs page rows (three apps) and OMP's Catalog rows
//
//   PROBE_FEATURE=U45 PROBE_AGENT=ccI05 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U45/I05/i05.js
//   PHASES=tools,titles,issues,depositall,versions,extras,leave (default: every phase the app has). Each run seeds its own
//   scratch contexts (tag prefix u45i05 + the run), so a second run is a fresh drive. The deposit phases drain the
//   fleet's queue (the kit's drainJobs: every feature's queued jobs on the fleet). No assertions: the script records
//   facts (`i05-facts`) and a screen() snapshot per screen; database reads (SELECT) are evidence only.
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, sql, drainJobs} = require('../../../probe');

const T = 30_000;
const RUN = process.env.PROBE_RUN || 'r0';
const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PREFIX = '10.1234';
const PHASES_BY_APP = {
    ojs: ['tools', 'titles', 'issues', 'depositall', 'versions', 'extras', 'leave'],
    omp: ['tools', 'titles', 'versions', 'extras', 'leave'],
    ops: ['tools', 'titles', 'versions', 'extras'],
};
// R189: the title as the Title box stores it (an italic word, "&" as the editor stores it), and the controls.
const TITLES = {
    both: 'Okapi <i>forest</i> census &amp; tapir',
    amp: 'Heron &amp; egret wading',
    plain: 'Plain puffin burrows',
    unpub: 'Narwhal <i>tusk</i> acoustics &amp; echoes',
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const ALL = PHASES_BY_APP[app.name];
    const PHASES = (process.env.PHASES || ALL.join(',')).split(',').filter((p) => ALL.includes(p));
    const on = (p) => PHASES.includes(p);
    const log = (...a) => console.log(`[i05 ${app.name} ${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record('i05-facts', {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 1800)); };
    const strip = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const q = (s) => { try { return sql(app, s).split('\n').filter(Boolean); } catch (e) { return [`SQL ERROR ${flat(e.message, 200)}`]; } };
    const {DoisPage, DoiSettings, recordNotices, DOIS_TEXT} = require(path.join(__dirname, '../../../pages/DoisPages.js'));
    const {WorkflowPage} = require(path.join(__dirname, '../../../pages/WorkflowPage.js'));
    const {createVersion, publishLatest, readVersionsWindow} = require(path.join(__dirname, '../../issues/minor-version-new-galley-dois/lib.js'));
    const WORK = {ojs: 'Article', omp: 'Monograph', ops: 'Preprint'}[app.name];
    const GROUP = isOPS ? 'Preprint' : 'Publication';
    const POST = isOPS ? 'Post' : 'Publish';

    await app.api.bootstrapProbe(app.contextPath);

    // ------------------------------------------------------------------ seeds
    const people = [['mg', ['manager'], 'Mona', 'Manager'], ['se', ['sectionEditor'], 'Sami', 'Section'], ['au', ['author'], 'Ada', 'Lovelace'],
        ...(isOPS ? [] : [['ed', ['editor'], 'Edda', 'Editor']])];
    async function mkCtx(key, keys = {}) {
        const t = tag(`u45i05${RUN.replace(/\W/g, '')}${key.toLowerCase()}`);
        const {context: cx = {}, ...rest} = keys;
        const res = await app.api.createContext({tag: t, context: {name: `U45 I05 ${key} ${t}`, acronym: 'IFV', contactName: 'I05 Contact',
            contactEmail: `${t}c@mail.test`, country: 'CA', ...cx}, users: people.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f})), ...rest});
        const C = {key, path: res.path || t, id: res.contextId, u: Object.fromEntries(people.map(([u]) => [u, `${t}${u}`])), subs: {}};
        fact(`seed.${key}`, {path: C.path, id: C.id, keys: rest});
        return C;
    }
    async function mkSub(C, key, spec) {
        const {submitter, ...r} = spec;
        try {
            const res = await app.api.createSubmission({tag: `${C.path}${key}`, context: C.path, submitter: submitter || C.u.au, ...r});
            C.subs[key] = {id: res.submissionId, pub: res.publicationId, title: r.title};
        } catch (e) {
            C.subs[key] = {error: flat(e.message, 600), title: r.title};
        }
        fact(`seed.${C.key}.${key}`, C.subs[key]);
        return C.subs[key];
    }
    const galley = isOMP ? {publicationFormats: [{name: 'PDF', file: 'article.pdf', genre: 'Book Manuscript'}]}
        : {galleys: [{label: 'PDF', file: isOPS ? 'preprint.pdf' : 'article.pdf'}]};
    const toEditing = isOJS ? {decisions: ['skipExternalReview']} : isOMP ? {decisions: ['skipExternalReview', 'sendToProduction']} : {};
    const inIssue = (n = 1) => (isOJS ? {issue: {volume: 1, number: n, year: 2025}} : {});
    const ojsIssues = [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2025, published: true},
        {volume: 1, number: 3, year: 2026}];
    const xref = (t) => ({crossrefplugin: {enabled: true, settings: {depositorName: 'I05 Depositor', depositorEmail: `${t}dep@mail.test`}}});
    const dbDois = (C) => q(isOMP
        ? `select d.doi_id, d.doi, d.status, coalesce('pub'||p.publication_id||' v'||p.version_major||'.'||p.version_minor,''), coalesce('chap'||c.chapter_id||'@'||c.publication_id,''), coalesce('fmt'||f.publication_format_id||'@'||f.publication_id,'') from dois d left join publications p on p.doi_id=d.doi_id left join submission_chapters c on c.doi_id=d.doi_id left join publication_formats f on f.doi_id=d.doi_id where d.context_id=${C.id} order by 1`
        : `select d.doi_id, d.doi, d.status, coalesce('pub'||p.publication_id||' v'||p.version_major||'.'||p.version_minor,''), coalesce('galley'||g.galley_id||'@'||g.publication_id,'')${isOJS ? `, coalesce('issue'||i.issue_id,'')` : ''} from dois d left join publications p on p.doi_id=d.doi_id left join publication_galleys g on g.doi_id=d.doi_id${isOJS ? ' left join issues i on i.doi_id=d.doi_id' : ''} where d.context_id=${C.id} order by 1`);
    const dbIssues = (C) => q(`select i.issue_id, i.volume, i.number, i.published, coalesce(d.doi,'-'), coalesce(d.status::text,'-') from issues i left join dois d on d.doi_id=i.doi_id where i.journal_id=${C.id} order by i.issue_id`);
    const failedSince = (iso) => q(`select id, substring(payload from 'displayName":"([^"]+)'), left(split_part(exception, E'\\n', 1), 220) from failed_jobs where failed_at >= '${iso}' order by id`);
    const queued = () => q(`select id, substring(payload from 'displayName":"([^"]+)') from jobs order by id`);

    // ------------------------------------------------------------------ browser
    const {page, close} = await launch(app);
    page.setDefaultTimeout(T);
    await recordNotices(page);
    const bad = [], pageErrors = [], dialogs = [];
    page.on('response', (r) => { if (r.status() >= 400) bad.push({at: Date.now(), status: r.status(), m: r.request().method(), url: strip(r.url()).slice(0, 220)}); });
    page.on('pageerror', (e) => pageErrors.push({at: Date.now(), text: flat(e.message, 200), url: strip(page.url())}));
    page.on('dialog', async (d) => { dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 200)}); await d.accept().catch(() => {}); });
    const since = (arr, t0) => arr.filter((e) => e.at >= t0).map(({at, ...x}) => x);
    let snapN = 0;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), text: {}, screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const n = `i05-${String(++snapN).padStart(3, '0')}-${name}`;
        record(n, s);
        await shot(page, n).catch(() => {});
        return `${n}-${RUN}-${app.name}`;
    }
    async function sect(name, fn) {
        if (!on(name)) return;
        const t0 = Date.now();
        log(`== ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}.FAILED`, flat(e.stack || e, 1500));
            await snap(`zz-failed-${name}`).catch(() => {});
        }
        fact(`${name}.crashes`, {server: since(bad, t0).filter((r) => r.status >= 500), script: since(pageErrors, t0)});
        const b4 = since(bad, t0).filter((r) => r.status < 500);
        if (b4.length) fact(`${name}.4xx`, b4.slice(0, 40));
        const d = since(dialogs, t0);
        if (d.length) fact(`${name}.dialogs`, d);
    }
    let who = null;
    const as = async (user, ctx) => { if (who === `${user}@${ctx}`) return; await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); who = `${user}@${ctx}`; };
    const takeNotices = () => page.evaluate(() => { const w = /** @type {any} */ (window); const n = w.__doiNotices || []; w.__doiNotices = []; return n; }).catch(() => []);

    // ------------------------------------------------------------------ DOIs page helpers
    const dois = (C) => new DoisPage(page, C.path);
    async function openDois(C, tab) {
        const d = dois(C);
        await d.goto().catch(async (e) => { fact('openDois.err', flat(e.message, 200)); await page.goto(cu(C.path, '/dois')); await idle(page).catch(() => {}); });
        if (tab && tab !== WORK + 's') { await d.openTab(tab).catch((e) => fact('openTab.err', flat(e.message, 200))); }
        await idle(page).catch(() => {});
        await sleep(500);
        return d;
    }
    /** Every row of the list shown: id, the name link's words and HTML, the badge. */
    const rowsRead = () => page.locator('.doiListPanel:visible .listPanel__item--doi').evaluateAll((els) => els.map((e) => {
        const a = e.querySelector('.listPanel__itemTitle a') || e.querySelector('.listPanel__itemTitle');
        return {id: e.id, text: a ? a.innerText.replace(/\s+/g, ' ').trim() : null, html: a ? a.innerHTML.trim().slice(0, 300) : null,
            href: a && a.getAttribute ? a.getAttribute('href') : null, target: a && a.getAttribute ? a.getAttribute('target') : null,
            badge: (e.querySelector('.listPanel__itemSummary .doiListItem__itemMetadata--badge') || {}).innerText?.trim() || null};
    })).catch(() => []);
    /** An expanded row: version line, the DOI table, agency panel, buttons. */
    async function readItem(d, id, type = 'submission') {
        const row = d.row(id, type);
        if (!(await row.count())) return {listed: false};
        await d.expand(row, id).catch(() => {});
        await idle(page).catch(() => {});
        return row.evaluate((el) => {
            const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
            const ex = el.querySelector('.listPanel__itemExpanded');
            const dep = ex && ex.querySelector('.doiListItem__depositorDetails');
            return {listed: true,
                name: t((el.querySelector('.listPanel__itemTitle') || {}).innerText),
                badge: t((el.querySelector('.listPanel__itemSummary .doiListItem__itemMetadata--badge') || {}).innerText),
                version: t((ex && ex.querySelector(':scope > span') || {}).innerText),
                rows: [...el.querySelectorAll('.listPanel__itemExpanded table tbody tr')].map((tr) => ({
                    type: t((tr.querySelector('td label') || {}).innerText), doi: (tr.querySelector('input') || {}).value ?? null,
                    badge: t((tr.querySelector('.doiListItem__itemMetadata--badge') || {}).innerText)})),
                versionsBar: t((ex && ex.querySelector('.doiListPanel__itemExpandedActions--actionsBar') || {}).innerText) || null,
                agency: dep ? {sentence: t((dep.querySelector('.doiListItem__depositorDescription') || {}).innerText),
                    buttons: [...dep.querySelectorAll('button')].map((b) => t(b.innerText) + (b.disabled ? ' [disabled]' : ''))} : null};
        }).catch((e) => ({err: flat(e.message, 200)}));
    }
    async function collapse(d, id, type = 'submission') { await d.collapse(d.row(id, type), id).catch(() => {}); }
    /**
     * A "Bulk Actions" item on the ticked `ids` (none: nothing ticked): the window's words, the action's request
     * and answer, the notices and any "DOI Updates Failed" window, the rows after the list's refetch.
     */
    async function bulk(d, label, ids, name, {type = 'submission', list = 'submissions'} = {}) {
        const out = {label, ids};
        await takeNotices();
        if (ids.length) await d.tick(ids, type);
        out.menu = await d.bulkLabels().catch((e) => `ERR ${flat(e.message, 120)}`);
        out.menuDescription = flat(await d.bulkDescription().innerText().catch(() => null), 100);
        await d.closeBulkActions().catch(() => {});
        const dialog = await d.chooseBulkAction(label);
        out.window = flat(await dialog.innerText().catch(() => ''), 600);
        out.windowButtons = (await dialog.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        out.windowSnap = await snap(`${name}-window`);
        const acted = page.waitForResponse((r) => /\/api\/v1\/dois\//.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        const refetched = page.waitForResponse((r) => r.request().method() === 'GET' && new RegExp(`/api/v1/${list}\\?`).test(r.url()), {timeout: T}).catch(() => null);
        await dialog.getByRole('button', {name: label, exact: true}).click();
        const r = await acted;
        out.request = r ? {status: r.status(), url: strip(r.url()), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null,
            post: flat(r.request().postData(), 300), body: flat(await r.text().catch(() => null), 500)} : null;
        await refetched;
        await idle(page).catch(() => {});
        await sleep(1200);
        const failed = d.failedDialog();
        out.failedWindow = (await failed.isVisible().catch(() => false)) ? flat(await failed.innerText().catch(() => ''), 900) : null;
        out.failedHtml = out.failedWindow ? flat(await failed.innerHTML().catch(() => ''), 900) : null;
        out.notices = await takeNotices();
        out.ticked = await page.locator('.doiListPanel:visible .listPanel__item--doi input[type="checkbox"]:checked').count().catch(() => null);
        out.rows = await rowsRead();
        out.snap = await snap(`${name}-after`);
        if (out.failedWindow) await d.closeFailedDialog().catch(() => {});
        return out;
    }
    /** "Deposit All" from the list header: its window, the request, the notices, the rows. */
    async function depositAll(d, name, {list = 'submissions'} = {}) {
        const out = {};
        await takeNotices();
        await d.depositAllButton().click();
        const dialog = d.dialog('Deposit all DOIs');
        await dialog.waitFor({timeout: T});
        await sleep(400);
        out.window = flat(await dialog.innerText().catch(() => ''), 600);
        out.windowButtons = (await dialog.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40));
        out.windowSnap = await snap(`${name}-window`);
        const acted = page.waitForResponse((r) => /\/api\/v1\/dois\/depositAll/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        const refetched = page.waitForResponse((r) => r.request().method() === 'GET' && new RegExp(`/api/v1/${list}\\?`).test(r.url()), {timeout: T}).catch(() => null);
        await dialog.getByRole('button', {name: 'Deposit all DOIs', exact: true}).click();
        const r = await acted;
        out.request = r ? {status: r.status(), url: strip(r.url()), method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null,
            body: flat(await r.text().catch(() => null), 300)} : null;
        await refetched;
        await idle(page).catch(() => {});
        await sleep(1200);
        out.notices = await takeNotices();
        out.rows = await rowsRead();
        out.snap = await snap(`${name}-after`);
        return out;
    }
    /** Drain the queue, then the failed jobs since `iso`, and Administration › "Failed Jobs" as admin. */
    async function drainAndFailedJobs(iso, name, back) {
        const out = {queuedBefore: queued()};
        const dj = await drainJobs(app).catch((e) => ({err: flat(e.message, 300)}));
        out.drain = {passes: dj.passes, counts: dj.counts, deposit: flat((dj.output || '').split(/\n/).filter((l) => /Deposit|DOI|doi/.test(l)).join(' | '), 1500), err: dj.err};
        out.failed = failedSince(iso);
        await as('admin', 'index');
        await page.goto(app.url('/index.php/index/en/admin/failedJobs'));
        await idle(page).catch(() => {});
        await sleep(1200);
        out.failedPageTop = flat(await page.locator('main').innerText().catch(() => ''), 1500);
        out.failedPageSnap = await snap(`${name}-failed-jobs`);
        if (back) await as(back.user, back.ctx);
        return out;
    }
    const isoNow = () => new Date(Date.now() - 2000).toISOString();

    try {
        // ======================================================================== tools: Rule 44 (x, q26), R037
        await sect('tools', async () => {
            const T1 = await mkCtx('TL', {doiPrefix: PREFIX});                   // no agency plugin on
            let A = null;
            if (!isOMP) {
                const t = tag('dep');
                A = await mkCtx('XA', {doiPrefix: PREFIX, plugins: xref(t), registrationAgency: 'crossrefplugin',
                    ...(isOJS ? {publisherInstitution: 'I05 Press', onlineIssn: '0378-5955', issues: ojsIssues} : {})});
                await mkSub(A, 'p1', {title: 'Gecko toe adhesion', published: true, ...galley, ...inIssue(1)});
            }
            const readTools = async (C, user, name) => {
                await as(user, C.path);
                const r = await page.goto(cu(C.path, '/management/tools')).catch((e) => ({err: e.message}));
                await idle(page).catch(() => {});
                const ie = page.getByRole('tab', {name: /Import\/Export/i}).first();
                if (await ie.count()) { await ie.click().catch(() => {}); await idle(page).catch(() => {}); await sleep(1000); }
                const links = (await page.locator('main a').evaluateAll((els) => els.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => []))
                    .filter((x) => /importexport/i.test(x)).map(strip);
                return {status: r && r.status ? r.status() : flat(r && r.err, 200), links, snap: await snap(name)};
            };
            const openPlugin = async (C, user, plugin, name, {follow = false} = {}) => {
                await as(user, C.path);
                const r = await page.goto(cu(C.path, `/management/importexport/plugin/${plugin}`)).catch((e) => ({err: e.message}));
                await idle(page).catch(() => {});
                await sleep(600);
                const o = {status: r && r.status ? r.status() : flat(r && r.err, 200), url: strip(page.url()), title: await page.title().catch(() => null),
                    h1: await page.locator('main h1, h1').first().innerText().catch(() => null),
                    main: flat(await page.locator('main').innerText().catch(() => page.locator('body').innerText().catch(() => '')), 600),
                    links: (await page.locator('main a').evaluateAll((els) => els.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`)).catch(() => [])).map(strip),
                    // R037: anything on the page that could start an export (a form, a tick box, a button, a select)
                    controls: await page.locator('main').evaluate((m) => ({forms: m.querySelectorAll('form').length, checkboxes: m.querySelectorAll('input[type=checkbox]').length,
                        buttons: [...m.querySelectorAll('button, input[type=submit]')].map((b) => (b.innerText || b.value || '').trim()).filter(Boolean),
                        selects: m.querySelectorAll('select').length, tabs: [...m.querySelectorAll('[role=tab]')].map((x) => x.innerText.trim())})).catch(() => null)};
                o.snap = await snap(name);
                if (follow) {
                    o.follow = [];
                    const notice = page.locator('main a').filter({hasText: /^DOI (management|settings)$/});
                    const n = await notice.count();
                    for (let i = 0; i < n; i++) {
                        const text = await notice.nth(i).innerText().catch(() => null);
                        await notice.nth(i).click().catch(() => {});
                        await page.waitForLoadState('load').catch(() => {});
                        await idle(page).catch(() => {});
                        await sleep(800);
                        o.follow.push({text, landed: strip(page.url()), h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 80),
                            selectedTabs: await page.locator('[role=tab][aria-selected=true]').allInnerTexts().catch(() => [])});
                        await page.goBack().catch(() => {});
                        await idle(page).catch(() => {});
                    }
                    o.followSnap = await snap(`${name}-followed`);
                }
                return o;
            };
            const out = {};
            out.toolsNoAgency = await readTools(T1, T1.u.mg, 'tools-noagency');
            if (A) out.toolsAgency = await readTools(A, A.u.mg, 'tools-agency');
            if (!isOMP) {
                out.crossrefNoAgency = await openPlugin(T1, T1.u.mg, 'CrossrefExportPlugin', 'crossref-page-noagency');
                out.crossrefAgency = await openPlugin(A, A.u.mg, 'CrossrefExportPlugin', 'crossref-page-agency', {follow: true});
                if (isOJS) {
                    out.dataciteNoAgency = await openPlugin(T1, T1.u.mg, 'DataciteExportPlugin', 'datacite-page-noagency', {follow: true});
                    out.crossrefEditor = await openPlugin(A, A.u.ed, 'CrossrefExportPlugin', 'crossref-page-editor');
                }
                out.crossrefSection = await openPlugin(A, A.u.se, 'CrossrefExportPlugin', 'crossref-page-sectioneditor');
                out.crossrefAuthor = await openPlugin(A, A.u.au, 'CrossrefExportPlugin', 'crossref-page-author');
                // the Plugins list's own rows for the export tools, and their "Import/Export Data" link
                await as(A.u.mg, A.path);
                await page.goto(cu(A.path, '/management/settings/website'));
                await idle(page).catch(() => {});
                await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click().catch(() => {});
                await idle(page).catch(() => {});
                await page.locator('tr.gridRow').first().waitFor({timeout: 20000}).catch(() => {});
                const rows = page.locator('tr.gridRow').filter({hasText: /XML Export Plugin|Export\/Registration Plugin/});
                out.pluginRows = [];
                for (let i = 0; i < await rows.count(); i++) {
                    const row = rows.nth(i);
                    const ex = row.locator('a.show_extras');
                    if (await ex.count()) { await ex.click().catch(() => {}); await sleep(600); }
                    out.pluginRows.push({row: flat(await row.innerText().catch(() => ''), 120),
                        actions: (await row.locator('xpath=following-sibling::tr[1]').locator('a').evaluateAll((els) => els.map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href') || ''}`)).catch(() => [])).map(strip)});
                }
                out.pluginRowsSnap = await snap('plugins-export-rows');
                // R037 on the DOIs page: "Export DOIs" and "Deposit DOIs" with nothing ticked
                const d = await openDois(A);
                out.exportNothing = await bulk(d, 'Export DOIs', [], 'export-nothing');
                out.depositNothing = await bulk(d, 'Deposit DOIs', [], 'deposit-nothing');
            } else {
                // a press: the plugin's address typed by hand
                out.crossrefPress = await openPlugin(T1, T1.u.mg, 'CrossrefExportPlugin', 'crossref-page-press');
            }
            fact('tools', out);
        });

        // ======================================================================== titles: R189, Rule 16 (m)
        await sect('titles', async () => {
            const C = await mkCtx('TT', {doiPrefix: PREFIX, ...(isOJS ? {issues: ojsIssues} : {})});
            const s = {};
            s.both = await mkSub(C, 'both', {title: TITLES.both, published: true, ...galley, ...inIssue(1)});
            s.amp = await mkSub(C, 'amp', {title: TITLES.amp, published: true, ...galley, ...inIssue(1)});
            s.plain = await mkSub(C, 'plain', {title: TITLES.plain, published: true, ...galley, ...inIssue(1)});
            s.unpub = await mkSub(C, 'unpub', {title: TITLES.unpub, ...toEditing});
            const stored = q(`select p.submission_id, ps.setting_value from publications p join publication_settings ps on ps.publication_id=p.publication_id and ps.setting_name='title' where p.submission_id in (${Object.values(s).map((x) => x.id || 0).join(',')}) order by 1`);
            await as(C.u.mg, C.path);
            const d = await openDois(C);
            const out = {stored, rows: await rowsRead(), snap: await snap('titles-dois-rows')};
            out.expanded = await readItem(d, s.both.id);
            out.expandedSnap = await snap('titles-dois-expanded');
            await collapse(d, s.both.id);
            await loc(page, 'DOIs page: a row name link', d.rowLink(d.row(s.both.id)));
            // a sweep of the same title through the failure window ("Mark DOIs Registered" on the unpublished work)
            out.markUnpublished = await bulk(d, 'Mark DOIs Registered', [s.unpub.id], 'titles-mark-unpublished');
            // the reader page the row's link opens: the title as readers see it
            const link = (out.rows.find((r) => r.id.endsWith(`-${s.both.id}`)) || {}).href;
            if (link) {
                await page.goto(link.startsWith('http') ? link : app.url(link));
                await idle(page).catch(() => {});
                out.readerTitle = {text: flat(await page.locator('h1').first().innerText().catch(() => null), 200), html: flat(await page.locator('h1').first().innerHTML().catch(() => null), 300)};
                out.readerSnap = await snap('titles-reader-page');
            }
            if (isOMP) {
                await page.goto(cu(C.path, '/manageCatalog'));
                await idle(page).catch(() => {});
                await page.locator('.listPanel__item--catalog').first().waitFor({timeout: T}).catch(() => {});
                await sleep(800);
                out.catalog = await page.locator('.listPanel__item--catalog').evaluateAll((els) => els.map((e) => ({
                    title: (e.querySelector('.listPanel__itemSubtitle') || {}).innerText?.trim(), html: (e.querySelector('.listPanel__itemSubtitle') || {}).innerHTML?.trim().slice(0, 300),
                    authors: (e.querySelector('.listPanel__itemTitle') || {}).innerText?.trim()}))).catch(() => []);
                out.catalogSnap = await snap('titles-catalog-rows');
                await loc(page, 'Catalog: a row title', page.locator('.listPanel__item--catalog .listPanel__itemSubtitle').first());
            }
            fact('titles', out);
        });

        // ======================================================================== issues: R027 (Rules 29, 32; OJS)
        await sect('issues', async () => {
            for (const agency of ['crossref', 'datacite']) {
                const t = tag('dep');
                const k = agency === 'crossref' ? 'IC' : 'ID';
                const C = await mkCtx(k, {doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'issue'],
                    plugins: agency === 'crossref' ? xref(t) : {dataciteplugin: {enabled: true, settings: {username: 'I05SYMBOL'}}},
                    registrationAgency: agency === 'crossref' ? 'crossrefplugin' : 'dataciteplugin',
                    ...(agency === 'crossref' ? {publisherInstitution: 'I05 Press', onlineIssn: '0378-5955'} : {}), issues: ojsIssues});
                const w = await mkSub(C, 'w1', {title: 'Tapir seed dispersal', published: true, ...galley, ...inIssue(1)});
                const issues = dbIssues(C);
                const pubIssues = issues.map((l) => l.split('|')).filter((x) => x[3] === '1').map((x) => Number(x[0]));
                const o = {issuesBefore: issues, doisBefore: dbDois(C)};
                await as(C.u.mg, C.path);
                const d = await openDois(C, 'Issues');
                o.issueRowsBefore = await rowsRead();
                o.listSnap = await snap(`${k}-issues-before`);
                // Assign DOIs first when the published issues carry none (an issue gets its DOI at "Publish Issue" by itself)
                const noDoi = issues.map((l) => l.split('|')).filter((x) => x[3] === '1' && x[4] === '-').map((x) => Number(x[0]));
                if (noDoi.length) o.assign = await bulk(d, 'Assign DOIs', noDoi, `${k}-issues-assign`, {type: 'issue', list: 'issues'});
                o.doisBeforeDeposit = dbDois(C);
                const iso = isoNow();
                o.deposit = await bulk(d, 'Deposit DOIs', pubIssues, `${k}-issues-deposit`, {type: 'issue', list: 'issues'});
                o.doisAtOnce = dbDois(C);
                o.queuedAtOnce = queued().filter((l) => /Deposit/.test(l));
                o.expandedAtOnce = [];
                for (const id of pubIssues) o.expandedAtOnce.push(await readItem(d, id, 'issue'));
                o.expandedSnap = await snap(`${k}-issues-expanded-at-once`);
                await d.reload().catch(() => {});
                await d.openTab('Issues').catch(() => {});
                o.rowsAfterReload = await rowsRead();
                o.reloadSnap = await snap(`${k}-issues-after-reload`);
                // the work's own "Deposit DOIs" on the Articles tab: the control that marks at once
                await d.openTab('Articles').catch(() => {});
                const isoW = isoNow();
                o.workDeposit = await bulk(d, 'Deposit DOIs', [w.id], `${k}-work-deposit`);
                o.doisAfterWork = dbDois(C);
                o.jobs = await drainAndFailedJobs(iso, `${k}-issues`, {user: C.u.mg, ctx: C.path});
                o.isoWork = isoW;
                const d2 = await openDois(C, 'Issues');
                o.rowsAfterJobs = await rowsRead();
                o.expandedAfterJobs = [];
                for (const id of pubIssues) o.expandedAfterJobs.push(await readItem(d2, id, 'issue'));
                o.afterJobsSnap = await snap(`${k}-issues-after-jobs`);
                o.doisAfterJobs = dbDois(C);
                // "Deposit All" on the same journal: the path that does mark the issues
                const iso2 = isoNow();
                o.depositAll = await depositAll(d2, `${k}-issues-deposit-all`, {list: 'issues'});
                o.doisAfterDepositAll = dbDois(C);
                await d2.reload().catch(() => {});
                await d2.openTab('Issues').catch(() => {});
                o.rowsAfterDepositAllReload = await rowsRead();
                o.depositAllReloadSnap = await snap(`${k}-issues-deposit-all-reload`);
                o.jobs2 = {drain: (await drainJobs(app).catch((e) => ({err: e.message}))).passes, failed: failedSince(iso2)};
                o.doisEnd = dbDois(C);
                fact(`issues.${agency}`, o);
            }
        });

        // ======================================================================== depositall: R034 (Rule 29, A15; OJS DataCite)
        await sect('depositall', async () => {
            const C = await mkCtx('DA', {doiPrefix: PREFIX, enabledDoiTypes: ['publication', 'representation'],
                plugins: {dataciteplugin: {enabled: true, settings: {username: 'I05SYMBOL'}}}, registrationAgency: 'dataciteplugin', issues: ojsIssues});
            const g1 = await mkSub(C, 'g1', {title: 'Walrus haul-out timing', published: true, ...galley, ...inIssue(1)});
            const g2 = await mkSub(C, 'g2', {title: 'Heron wading depth', published: true, ...galley, ...inIssue(1)});
            const o = {doisSeeded: dbDois(C)};
            await as(C.u.mg, C.path);
            let d = await openDois(C);
            // give every item its DOIs (a seeded work published under "Upon reaching the copyediting stage" may carry none)
            o.assign = await bulk(d, 'Assign DOIs', [g1.id, g2.id], 'da-assign');
            // empty g1's article DOI on screen; its galley keeps its own
            const row = d.row(g1.id);
            o.g1Before = await readItem(d, g1.id);
            try {
                await d.startEditing(row);
                await d.doiBox(row, 'Article').fill('');
                o.emptyStatuses = await d.saveEditing(row, {expectRequests: true});
            } catch (e) { o.emptyErr = flat(e.message, 300); }
            await idle(page).catch(() => {});
            await sleep(800);
            o.emptyNotices = await takeNotices();
            o.g1AfterEmpty = await readItem(d, g1.id);
            o.emptySnap = await snap('da-g1-article-emptied');
            await d.reload().catch(() => {});
            o.g1AfterEmptyReload = await readItem(d, g1.id);
            o.doisBefore = dbDois(C);
            await collapse(d, g1.id);
            const iso = isoNow();
            o.depositAll = await depositAll(d, 'da-deposit-all');
            o.doisAtOnce = dbDois(C);
            o.queuedAtOnce = queued().filter((l) => /Deposit/.test(l));
            o.g1AtOnce = await readItem(d, g1.id);
            o.g2AtOnce = await readItem(d, g2.id);
            o.atOnceSnap = await snap('da-expanded-at-once');
            await d.reload().catch(() => {});
            o.g1AfterReload = await readItem(d, g1.id);
            o.reloadSnap = await snap('da-after-reload');
            o.jobs = await drainAndFailedJobs(iso, 'da', {user: C.u.mg, ctx: C.path});
            d = await openDois(C);
            o.rowsAfterJobs = await rowsRead();
            o.g1AfterJobs = await readItem(d, g1.id);
            o.g2AfterJobs = await readItem(d, g2.id);
            o.afterJobsSnap = await snap('da-after-jobs');
            o.doisAfterJobs = dbDois(C);
            // "Deposit All" again: is the stuck galley DOI ever sent again?
            const iso2 = isoNow();
            o.depositAllAgain = await depositAll(d, 'da-deposit-all-again');
            o.queuedAgain = queued().filter((l) => /Deposit/.test(l));
            o.doisAgain = dbDois(C);
            o.jobs2 = {passes: (await drainJobs(app).catch((e) => ({err: e.message}))).passes, failed: failedSince(iso2)};
            fact('depositall', o);
        });

        // ======================================================================== versions: R038 (Rules 26–28, 52; A17)
        await sect('versions', async () => {
            const kinds = isOJS ? ['publication', 'representation'] : isOMP ? ['publication', 'chapter', 'representation'] : ['publication', 'representation'];
            const C = await mkCtx('VY', {doiPrefix: PREFIX, enabledDoiTypes: kinds, doiCreationTime: 'publication', doiVersioning: true, ...(isOJS ? {issues: ojsIssues} : {})});
            const extra = isOMP ? {chapters: [{title: 'Tides', page: true}]} : {};
            const w = await mkSub(C, 'y', {title: 'Puffin burrow sharing', published: true, ...galley, ...extra, ...inIssue(1), ...(isOMP ? toEditing : {})});
            const u = await mkSub(C, 'u', {title: 'Egret plume moult', ...galley, ...extra, ...toEditing});
            const o = {doisSeeded: dbDois(C)};
            const frame = new WorkflowPage(page, C.path, {labels: {publicationGroup: GROUP}});
            try {
                await as(C.u.mg, C.path);
                let d = await openDois(C);
                o.v1 = await readItem(d, w.id);
                if (!o.v1.rows || o.v1.rows.some((r) => !r.doi)) o.assignV1 = await bulk(d, 'Assign DOIs', [w.id], 'vy-assign-v1');
                o.doisV1 = dbDois(C);
                // 2.0 "Major Revision" on screen, published
                await frame.gotoEditorial(w.id);
                await frame.expectVersionLoaded().catch(() => {});
                o.newVersion = await createVersion(page, frame, 'Major Revision').catch((e) => ({err: flat(e.message, 300)}));
                o.newVersionSnap = await snap('vy-new-version');
                await frame.gotoEditorial(w.id);
                await frame.expectVersionLoaded().catch(() => {});
                const ojsScreen = isOJS ? new (require(path.join(app.suiteDir, 'pages', 'PublishSchedulePages.js')).PublishScreen)(page, C.path) : null;
                o.publishV2 = await publishLatest(page, frame, POST, ojsScreen).catch((e) => ({err: flat(e.message, 300)}));
                o.publishSnap = await snap('vy-published-v2');
                o.doisV2 = dbDois(C);
                d = await openDois(C);
                o.rowV2 = await readItem(d, w.id);
                o.viewAllV2 = await readVersionsWindow(page, d, w.id).catch((e) => ({err: flat(e.message, 200)}));
                o.viewAllSnap = await snap('vy-view-all-v2');
                // give 2.0 its DOIs too when publishing did not (so every version has something to mark)
                if (!o.rowV2.rows || o.rowV2.rows.some((r) => !r.doi)) { o.assignV2 = await bulk(d, 'Assign DOIs', [w.id], 'vy-assign-v2'); o.doisV2b = dbDois(C); }
                for (const [label, key] of [['Mark DOIs Registered', 'registered'], ['Mark DOIs Needs Sync', 'needssync'], ['Mark DOIs Unregistered', 'unregistered']]) {
                    d = await openDois(C);
                    await collapse(d, w.id);
                    const m = {};
                    m.action = await bulk(d, label, [w.id], `vy-${key}`);
                    m.row = await readItem(d, w.id);
                    m.viewAll = await readVersionsWindow(page, d, w.id).catch((e) => ({err: flat(e.message, 200)}));
                    m.viewAllSnap = await snap(`vy-${key}-view-all`);
                    m.db = dbDois(C);
                    await page.reload().catch(() => {});
                    await idle(page).catch(() => {});
                    const d3 = dois(C);
                    await d3.expectListSettled().catch(() => {});
                    m.viewAllAfterReload = await (async () => { await readItem(d3, w.id); return readVersionsWindow(page, d3, w.id); })().catch((e) => ({err: flat(e.message, 200)}));
                    o[key] = m;
                }
                // Rule 26 / 28's refusals beside a ticked unpublished work (the sweep: are they all-or-nothing?)
                d = await openDois(C);
                o.registeredWithUnpublished = await bulk(d, 'Mark DOIs Registered', [w.id, u.id], 'vy-registered-with-unpublished');
                o.dbAfterRefusal = dbDois(C);
                d = await openDois(C);
                o.needsSyncUnregistered = await bulk(d, 'Mark DOIs Needs Sync', [w.id], 'vy-needssync-from-unregistered');
                o.dbEnd = dbDois(C);
            } finally {
                if (isOJS) {
                    // a journal left on "DOI Versioning" "Yes" makes every OJS OAI list request answer 500 (scenarios.md): back to "No" on screen
                    try {
                        const st = new DoiSettings(page, C.path);
                        await st.goto('Setup');
                        await st.versioningRadio('No').check();
                        const r = await st.pressSave(st.setup);
                        o.versioningBackToNo = r.status();
                    } catch (e) { o.versioningBackToNo = `ERR ${flat(e.message, 200)}`; }
                }
            }
            fact('versions', o);
        });

        // ======================================================================== extras: the rest of the owned lines of Rules 16, 26–29
        // Rule 16's number; Rule 27 on an unpublished work; (agency apps) Rule 28 from "Submitted", Rule 29's ticked unpublished
        // work and a published work with no DOI (A15); (OJS) Rule 26's "…The issue must be published…" on the "Issues" tab.
        await sect('extras', async () => {
            const t = tag('dep');
            const agency = !isOMP;
            const C = await mkCtx('EX', {doiPrefix: PREFIX, ...(isOJS ? {enabledDoiTypes: ['publication', 'issue'], issues: ojsIssues} : {}),
                ...(agency ? {plugins: xref(t), registrationAgency: 'crossrefplugin'} : {}),
                ...(isOJS ? {publisherInstitution: 'I05 Press', onlineIssn: '0378-5955'} : {})});
            const p1 = await mkSub(C, 'p1', {title: 'Ibex cliff balance', published: true, ...galley, ...inIssue(1)});
            const p2 = await mkSub(C, 'p2', {title: 'Otter tool use', published: true, ...galley, ...inIssue(1)});
            const u1 = await mkSub(C, 'u1', {title: 'Gecko toe adhesion', ...toEditing});
            const o = {doisSeeded: dbDois(C)};
            await as(C.u.mg, C.path);
            let d = await openDois(C);
            o.rows = await rowsRead();
            o.rowNumbers = await page.locator('.doiListPanel:visible .listPanel__item--doi').evaluateAll((els) => els.map((e) => ({id: e.id,
                actions: (e.querySelector('.listPanel__itemSummary .listPanel__itemActions') || {}).innerText?.replace(/\s+/g, ' ').trim()}))).catch(() => []);
            o.rowsSnap = await snap('x-rows');
            // the unpublished work gets its DOI, then "Mark DOIs Unregistered" on it (Rule 27: "published or not")
            o.assignU = await bulk(d, 'Assign DOIs', [u1.id], 'x-assign-unpublished');
            o.unregU = await bulk(d, 'Mark DOIs Unregistered', [u1.id], 'x-unregistered-unpublished');
            o.dbAfterUnregU = dbDois(C);
            if (agency) {
                // Rule 29: a ticked unpublished work beside a published one: "Deposit DOIs"
                d = await openDois(C);
                o.depositWithUnpub = await bulk(d, 'Deposit DOIs', [p1.id, u1.id], 'x-deposit-with-unpublished');
                o.dbAfterDepositWithUnpub = dbDois(C);
                // Rule 28 from "Submitted": deposit p1 alone, then "Mark DOIs Needs Sync"
                d = await openDois(C);
                o.depositP1 = await bulk(d, 'Deposit DOIs', [p1.id], 'x-deposit-p1');
                d = await openDois(C);
                o.needsSyncFromSubmitted = await bulk(d, 'Mark DOIs Needs Sync', [p1.id], 'x-needssync-from-submitted');
                o.dbAfterNeedsSync = dbDois(C);
                // A15 / Rule 29: p2's DOI emptied on screen, then "Deposit DOIs" on it
                d = await openDois(C);
                const row = d.row(p2.id);
                try {
                    await d.expand(row, p2.id);
                    await d.startEditing(row);
                    await d.doiBox(row, WORK).fill('');
                    o.emptyP2 = await d.saveEditing(row, {expectRequests: true});
                } catch (e) { o.emptyP2 = `ERR ${flat(e.message, 200)}`; }
                await idle(page).catch(() => {});
                await collapse(d, p2.id);
                o.p2Before = await readItem(d, p2.id);
                await collapse(d, p2.id);
                const iso = isoNow();
                o.depositNoDoi = await bulk(d, 'Deposit DOIs', [p2.id], 'x-deposit-no-doi');
                o.queuedNoDoi = queued().filter((l) => /Deposit/.test(l));
                o.jobs = await drainAndFailedJobs(iso, 'x', {user: C.u.mg, ctx: C.path});
                d = await openDois(C);
                o.p2After = await readItem(d, p2.id);
                o.p2AfterSnap = await snap('x-p2-after-jobs');
                o.dbEnd = dbDois(C);
            }
            if (isOJS) {
                // Rule 26 on the "Issues" tab: the unpublished issue given a DOI, then "Mark DOIs Registered"
                d = await openDois(C, 'Issues');
                const unpubIssue = Number((dbIssues(C).map((l) => l.split('|')).find((x) => x[3] === '0') || [])[0]);
                o.issueAssign = await bulk(d, 'Assign DOIs', [unpubIssue], 'x-issue-assign', {type: 'issue', list: 'issues'});
                d = await openDois(C, 'Issues');
                o.issueMarkRegistered = await bulk(d, 'Mark DOIs Registered', [unpubIssue], 'x-issue-registered-unpublished', {type: 'issue', list: 'issues'});
                o.issuesEnd = dbIssues(C);
            }
            fact('extras', o);
        });

        // ======================================================================== leave: the sweep's "left with something changed"
        await sect('leave', async () => {
            const C = await mkCtx('LV', {doiPrefix: PREFIX, ...(isOJS ? {issues: ojsIssues} : {})});
            const w = await mkSub(C, 'w', {title: 'Kiwi nocturnal foraging', published: true, ...galley, ...inIssue(1)});
            await as(C.u.mg, C.path);
            const d = await openDois(C);
            const row = d.row(w.id);
            const o = {};
            await d.expand(row, w.id);
            o.before = await readItem(d, w.id);
            await d.startEditing(row);
            await d.doiBox(row, WORK).fill(`${PREFIX}/i05-unsaved`);
            await d.doiBox(row, WORK).blur().catch(() => {});
            o.typedSnap = await snap('leave-typed-unsaved');
            const t0 = Date.now();
            await page.goto(cu(C.path, '/management/settings/distribution')).catch((e) => { o.gotoErr = flat(e.message, 200); });
            await idle(page).catch(() => {});
            o.dialogs = since(dialogs, t0);
            o.landed = strip(page.url());
            const d2 = await openDois(C);
            o.after = await readItem(d2, w.id);
            o.afterSnap = await snap('leave-after-return');
            o.db = dbDois(C);
            fact('leave', o);
        });
    } finally {
        await close();
    }
});
