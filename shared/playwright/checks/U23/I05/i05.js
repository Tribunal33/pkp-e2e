// U23 claim check, chunk I05 (housekeeping 2026-10-05): incidentals row R036, a numeric phrase in the
// dashboard's search. Spec: docs/specs/U23-submissions-dashboard.md, Rule 6 (Search within a view) and its
// note g ("the phrase matched a title, a numeric submission ID and an author's family name"); the sidebar's
// global box (Rule 7) is driven as the second box the triage names.
// Question: does a numeric phrase (a submission's number) list that submission, or only text matches?
//
//   PROBE_FEATURE=U23 PROBE_AGENT=ccI05 PROBE_RUN=r1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U23/I05/i05.js
//   (then PROBE_RUN=r2). Every run seeds its own scratch context (tag prefix u23i05); publicknowledge and the
//   roster users are only read. No assertions: the script records, the reader judges.
//
// Scratch context per app and run: a Journal Manager (mg), a Section Editor (se; Series editor on OMP,
// Moderator on OPS), an author (au). Titles and abstracts carry no digit unless named here:
//   S1 "Alpha harbour study"                  no editor
//   S2 "Beta meadow study"                    se assigned
//   S3 "Report number <S1's id> on lakes"     the S1 number as a word in a title
//   S4 "Code <S1's id>7 river notes"          the S1 number inside a longer number
//   S5 "Delta declined study"                 declined at the first stage, se assigned
//   S6 "Epsilon draft study"                  an incomplete draft (never submitted)
// Phases (default all): mgr (the manager: in-page box on "Active submissions", the address, the sidebar
// box, the address with and without a view, "Needs editor", a typed-but-uncommitted phrase left by a view switch), se (the
// Section Editor: in-page box and sidebar box, scope), page (a second scratch context, P: a manager, two authors
// "Ada Author" and "Bo Zephyr", 31 "Filler study" submissions by Ada and "Gamma pond study" by Bo: the search
// from page 2, a family name, "Clear Filters" beside the chips with and without a panel filter, a view switch
// with a phrase and a filter applied), addr (after page: addresses with a phrase and a filter and no view, and a
// Section Editor opening a manager-only view's address with a phrase).
const fs = require('fs');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outFile} = require('../../../probe');

const PHASES = (process.env.PHASES || 'mgr,se,page').split(',');
const on = (p) => PHASES.includes(p);
const RUN = process.env.PROBE_RUN || 'r0';
const T0 = Date.now();
const log = (...a) => console.log(`[i05 ${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    const statePath = outFile('i05-state.json');
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('i05-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const strip = (u) => (u || '').replace(/^https?:\/\/127\.0\.0\.1:\d+/, '');

    // ------------------------------------------------------------------ seed
    if (!S.ctx) {
        const t = tag('u23i05');
        const c = await app.api.createContext({tag: t, users: [
            {username: `${t}mg`, roles: ['manager'], givenName: 'Mara', familyName: 'Manager'},
            {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sena', familyName: 'Editor'},
            {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'}]});
        S.tag = t; S.ctx = c.path || t; S.ids = {};
        const mk = async (k, title, extra = {}) => {
            const r = await app.api.createSubmission({tag: `${t}${k}`, context: S.ctx, submitter: `${t}au`, title,
                abstract: `Plain abstract about ${title.replace(/[0-9]/g, '').toLowerCase()}.`, ...extra});
            S.ids[k] = r.submissionId; save();
        };
        const seAs = [{username: `${t}se`, role: 'sectionEditor'}];
        await mk('s1', 'Alpha harbour study');
        await mk('s2', 'Beta meadow study', {participants: seAs});
        await mk('s3', `Report number ${S.ids.s1} on lakes`);
        await mk('s4', `Code ${S.ids.s1}7 river notes`);
        await mk('s5', 'Delta declined study', {participants: seAs, decisions: [app.name === 'ops' ? 'decline' : 'initialDecline']});
        await mk('s6', 'Epsilon draft study', {submitted: false});
        save();
    }
    fact('seed', {ctx: S.ctx, ids: S.ids});
    const ID = S.ids;
    const dash = (q = '') => app.url(`/index.php/${S.ctx}/en/dashboard/editorial${q}`);

    const {page, close} = await launch(app);
    page.setDefaultTimeout(30_000);
    const reqs = [];
    page.on('request', (r) => { if (/_submissions(\/assigned)?(\?|$)/.test(r.url())) reqs.push({at: Date.now(), u: strip(r.url()).replace(/^\/index\.php\//, '').slice(0, 260)}); });
    const resps = [];
    page.on('response', (r) => { if (/_submissions(\/assigned)?(\?|$)/.test(r.url()) || r.status() >= 400) resps.push({at: Date.now(), s: r.status(), u: strip(r.url()).replace(/^\/index\.php\//, '').slice(0, 200)}); });
    const since = (t0) => ({req: reqs.filter((x) => x.at >= t0).map((x) => x.u), resp: resps.filter((x) => x.at >= t0).map((x) => `${x.s} ${x.u}`)});

    const inPage = () => page.locator('#app-main').getByRole('searchbox', {name: /Search submissions, ID/});
    const sideBox = () => page.locator('#app-nav').getByRole('searchbox', {name: /^Search submissions/});

    /** The list as data: heading, the rows' number cells and titles, chips, both boxes. */
    async function read() {
        return page.evaluate(() => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const main = document.querySelector('#app-main') || document.body;
            const rows = [...main.querySelectorAll('table tbody tr')].map((tr) => {
                const cells = [...tr.querySelectorAll('td, th')].map(t);
                return {id: cells[0], rest: (cells[1] || '').slice(0, 90)};
            });
            const chips = [...main.querySelectorAll('div.bg-selection-light')].map(t);
            const boxes = [...document.querySelectorAll('input[type="search"]')].map((i) => ({inNav: !!i.closest('#app-nav'), label: i.getAttribute('aria-label') || (i.labels && i.labels[0] ? t(i.labels[0]) : null), value: i.value, placeholder: i.placeholder}));
            return {url: location.pathname.replace(/^.*\/dashboard/, '…/dashboard') + location.search, h1: t(main.querySelector('h1')), rows, chips, boxes};
        });
    }
    async function snap(name, extra = {}, png = false) {
        const s = await screen(page);
        const r = await read();
        record(name, {...s, read: r, ...extra});
        if (png) await shot(page, name).catch(() => {});
        return {...r, notices: s.notices};
    }
    async function sect(name, fn) {
        log(`== ${name}`);
        try { return await fn(); } catch (e) {
            fact(`${name}.FAILED`, String(e.stack || e).split('\n').slice(0, 4).join(' | '));
            await snap(`zz-failed-${name}`, {}, true).catch(() => {});
            return null;
        }
    }
    async function go(url) { await page.goto(url); await idle(page); await page.locator('#app-main h1').first().waitFor().catch(() => {}); await idle(page); }
    async function commit(box, phrase) {
        const t0 = Date.now();
        await box.click();
        await box.fill('');
        await box.pressSequentially(String(phrase), {delay: 20});
        await box.press('Enter');
        await idle(page); await sleep(600); await idle(page);
        return since(t0);
    }
    const viewLink = (name) => page.locator('#app-nav a[href*="dashboard/editorial"]').filter({has: page.getByText(name, {exact: true})}).first();
    const step = async (key, fn, png = false) => {
        const net = await fn();
        const r = await snap(`i05-${key}`, {net}, png);
        fact(key, {h1: r.h1, url: r.url, rows: r.rows, chips: r.chips, boxes: r.boxes, notices: r.notices, net});
        return r;
    };

    try {
        // ============================================================ manager
        if (on('mgr')) await sect('mgr', async () => {
            await signIn(page, `${S.tag}mg`, {contextPath: S.ctx});
            await idle(page);
            fact('mgr.landing', strip(page.url()));
            await go(dash('?currentViewId=active'));
            await step('m01-active', async () => null, true);
            await loc(page, 'Dashboard: in-page search box', inPage());
            await loc(page, 'Dashboard: sidebar search box', sideBox());
            // in-page box: a number that is only an ID (S2)
            await step('m02-inpage-id2', () => commit(inPage(), ID.s2), true);
            // reload the address the search left
            await step('m03-inpage-id2-reload', async () => { const t0 = Date.now(); await go(page.url()); return since(t0); });
            // clear through the chip's X
            await step('m04-chip-x', async () => {
                const t0 = Date.now();
                await page.locator('#app-main div.bg-selection-light').filter({hasText: 'Search:'}).getByRole('button').first().click();
                await idle(page); await sleep(500);
                return since(t0);
            });
            // in-page box: S1's number (an ID, also a word in S3's title and inside S4's longer number)
            await step('m05-inpage-id1', () => commit(inPage(), ID.s1), true);
            // the sighting's own phrase
            await step('m06-inpage-20', () => commit(inPage(), '20'));
            // numbers of submissions outside "Active submissions": declined S5, draft S6
            await step('m07-inpage-id5-declined', () => commit(inPage(), ID.s5));
            await step('m08-inpage-id6-draft', () => commit(inPage(), ID.s6));
            // an ID and a word: matching and not matching the same submission
            await step('m09-inpage-id2-meadow', () => commit(inPage(), `${ID.s2} meadow`));
            await step('m10-inpage-id1-meadow', () => commit(inPage(), `${ID.s1} meadow`));
            // the address the row used (typed URL)
            await step('m11-address-id2', async () => { const t0 = Date.now(); await go(dash(`?currentViewId=active&searchPhrase=${ID.s2}`)); return since(t0); }, true);
            // the address with a phrase but no view (the row's '?searchPhrase=20' shape), an unknown view, the search view
            await step('m12-address-phrase-no-view', async () => { const t0 = Date.now(); await go(dash(`?searchPhrase=${ID.s2}`)); return since(t0); }, true);
            await step('m12b-address-phrase-unknown-view', async () => { const t0 = Date.now(); await go(dash(`?currentViewId=nosuchview&searchPhrase=${ID.s2}`)); return since(t0); });
            await step('m12c-address-phrase-search-view', async () => { const t0 = Date.now(); await go(dash(`?currentViewId=search&searchPhrase=${ID.s2}`)); return since(t0); });
            await step('m12d-address-20-no-view', async () => { const t0 = Date.now(); await go(dash('?searchPhrase=20')); return since(t0); });
            // "Needs editor": S1's number (no editor) and S2's (an editor assigned)
            await go(dash('?currentViewId=needs-editor'));
            await step('m13-needs-editor-id1', () => commit(inPage(), ID.s1));
            await step('m13b-needs-editor-id2', () => commit(inPage(), ID.s2));
            // sidebar box: S2's number, S5's (declined), S6's (draft), S1's
            await go(dash('?currentViewId=active'));
            await step('m14-side-id2', () => commit(sideBox(), ID.s2), true);
            await step('m15-side-id5-declined', () => commit(sideBox(), ID.s5));
            await step('m16-side-id6-draft', () => commit(sideBox(), ID.s6));
            await step('m17-side-id1', () => commit(sideBox(), ID.s1));
            // leave a view with a phrase typed but not committed: does anything ask, is it kept?
            await go(dash('?currentViewId=active'));
            await step('m18-typed-uncommitted-then-switch', async () => {
                const t0 = Date.now();
                await inPage().click();
                await inPage().pressSequentially(String(ID.s2), {delay: 20});
                await viewLink('Needs editor').click().catch(async () => viewLink('Assigned to me').click());
                await idle(page); await sleep(800);
                const back = since(t0);
                return back;
            });
            await step('m19-back-to-active', async () => { const t0 = Date.now(); await viewLink('Active submissions').click(); await idle(page); await sleep(500); return since(t0); });
        });

        // ============================================================ section editor
        if (on('se')) await sect('se', async () => {
            await signIn(page, `${S.tag}se`, {contextPath: S.ctx});
            await idle(page);
            fact('se.landing', strip(page.url()));
            await go(dash('?currentViewId=assigned-to-me'));
            await step('s01-assigned', async () => null, true);
            await step('s02-inpage-id2', () => commit(inPage(), ID.s2), true);
            await step('s03-inpage-id1-unassigned', () => commit(inPage(), ID.s1));
            await go(dash('?currentViewId=active'));
            await step('s04-active-inpage-id2', () => commit(inPage(), ID.s2));
            // the address with a phrase: no view (lands on the first view) and the first view named
            await step('s04b-address-id1-no-view', async () => { const t0 = Date.now(); await go(dash(`?searchPhrase=${ID.s1}`)); return since(t0); }, true);
            await step('s04c-address-id1-assigned-view', async () => { const t0 = Date.now(); await go(dash(`?currentViewId=assigned-to-me&searchPhrase=${ID.s1}`)); return since(t0); });
            await step('s05-side-id1-unassigned', () => commit(sideBox(), ID.s1));
            await step('s06-side-id5-declined-assigned', () => commit(sideBox(), ID.s5), true);
            await step('s07-side-id2', () => commit(sideBox(), ID.s2));
        });
        // ============================================================ paging, family name, Clear Filters, view switch
        if (on('page')) await sect('page', async () => {
            if (!S.P) {
                const t = tag('u23i05p');
                const c = await app.api.createContext({tag: t, users: [
                    {username: `${t}mg`, roles: ['manager'], givenName: 'Mara', familyName: 'Manager'},
                    {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
                    {username: `${t}az`, roles: ['author'], givenName: 'Bo', familyName: 'Zephyr'}]});
                S.P = {tag: t, ctx: c.path || t, ids: {}};
                for (let i = 0; i < 31; i += 4) {
                    await Promise.all(Array.from({length: Math.min(4, 31 - i)}, (u, j) => app.api.createSubmission({tag: `${t}f${i + j}`, context: S.P.ctx, submitter: `${t}au`, title: 'Filler study', abstract: 'Plain filler abstract.'})));
                }
                S.P.ids.gamma = (await app.api.createSubmission({tag: `${t}g`, context: S.P.ctx, submitter: `${t}az`, title: 'Gamma pond study', abstract: 'Plain abstract about ponds.'})).submissionId;
                save();
            }
            fact('page.seed', S.P);
            const pd = (q = '') => app.url(`/index.php/${S.P.ctx}/en/dashboard/editorial${q}`);
            const pager = async () => page.evaluate(() => {
                const nav = document.querySelector('nav.pkpPagination');
                if (!nav) return null;
                return {current: [...nav.querySelectorAll('[aria-current]')].map((b) => b.innerText.trim() + ':' + b.getAttribute('aria-current')),
                    buttons: [...nav.querySelectorAll('button')].map((b) => (b.getAttribute('aria-label') || b.innerText.trim()) + (b.disabled ? '(disabled)' : '')),
                    showing: [...document.querySelectorAll('#app-main *')].map((e) => e.childElementCount === 0 ? e.textContent.trim() : '').find((x) => /^Showing \d+ to \d+ of \d+/.test(x)) || null};
            });
            const filtersWin = () => page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Apply Filters', exact: true})}).last();
            const listClear = () => page.locator('#app-main').getByRole('button', {name: 'Clear Filters', exact: true});
            const pstep = async (key, fn, png = false) => {
                const net = await fn();
                const r = await snap(`i05-${key}`, {net}, png);
                const pg = await pager();
                const lc = await listClear().count();
                fact(key, {h1: r.h1, url: r.url, rowCount: r.rows.length, rows: r.rows.slice(0, 3), chips: r.chips, boxes: r.boxes, pager: pg, listClearFilters: lc, notices: r.notices, net});
                return r;
            };
            async function slider(days) {
                await page.locator('#app-main').getByRole('button', {name: 'Filters', exact: true}).first().click();
                await filtersWin().getByRole('button', {name: 'Apply Filters', exact: true}).waitFor();
                await idle(page); await sleep(500);
                const sl = filtersWin().getByRole('slider').first();
                await sl.focus();
                for (let i = 0; i < days; i++) await sl.press('ArrowRight');
                const now = await sl.getAttribute('aria-valuenow');
                await filtersWin().getByRole('button', {name: 'Apply Filters', exact: true}).click();
                await filtersWin().waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
                await idle(page); await sleep(800);
                return now;
            }
            await signIn(page, `${S.P.tag}mg`, {contextPath: S.P.ctx});
            await idle(page);
            await go(pd('?currentViewId=active'));
            await pstep('p01-active-page1', async () => null);
            await pstep('p02-active-page2', async () => {
                const t0 = Date.now();
                await page.locator('nav.pkpPagination button').filter({hasText: /^\s*Next\s*$/}).first().click();
                await idle(page); await sleep(800);
                return since(t0);
            }, true);
            // commit a phrase from page 2 that still matches more than a page
            await pstep('p03-search-from-page2', () => commit(inPage(), 'study'), true);
            // a family name
            await pstep('p04-family-name', () => commit(inPage(), 'Zephyr'));
            // a search only: is there a "Clear Filters" beside the chip?
            await pstep('p05-search-only', () => commit(inPage(), 'Filler'));
            await loc(page, 'Dashboard: the search chip "Search: …"', page.locator('#app-main div.bg-selection-light').filter({hasText: 'Search:'}));
            // add a panel filter: "Days since last activity" at 1
            await pstep('p06-search-and-filter', async () => { const t0 = Date.now(); const v = await slider(1); return {...since(t0), slider: v}; }, true);
            await loc(page, 'Dashboard: the list\'s "Clear Filters" beside the chips', listClear());
            // the list's "Clear Filters"
            await pstep('p07-list-clear-filters', async () => { const t0 = Date.now(); await listClear().first().click(); await idle(page); await sleep(800); return since(t0); });
            await pstep('p07b-reload', async () => { const t0 = Date.now(); await go(page.url()); return since(t0); });
            // a phrase and a filter applied, then another view from the sidebar, then back
            await commit(inPage(), 'Filler');
            await slider(1);
            await pstep('p08-before-switch', async () => null);
            await pstep('p09-switch-to-assigned', async () => { const t0 = Date.now(); await viewLink('Assigned to me').click(); await idle(page); await sleep(800); return since(t0); }, true);
            await pstep('p10-back-to-active', async () => { const t0 = Date.now(); await viewLink('Active submissions').click(); await idle(page); await sleep(800); return since(t0); });
        });
        // ============================================================ addresses without a view the account has
        if (on('addr')) await sect('addr', async () => {
            if (!S.P) throw new Error('run the page phase first');
            const pd = (q = '') => app.url(`/index.php/${S.P.ctx}/en/dashboard/editorial${q}`);
            await signIn(page, `${S.P.tag}mg`, {contextPath: S.P.ctx});
            await idle(page);
            await step('a01-mg-phrase-filter-no-view', async () => { const t0 = Date.now(); await go(pd('?searchPhrase=Filler&daysInactive=1')); return since(t0); }, true);
            await step('a02-mg-phrase-filter-active', async () => { const t0 = Date.now(); await go(pd('?currentViewId=active&searchPhrase=Filler&daysInactive=1')); return since(t0); });
            await signIn(page, `${S.tag}se`, {contextPath: S.ctx});
            await idle(page);
            await step('a03-se-needs-editor-address', async () => { const t0 = Date.now(); await go(dash(`?currentViewId=needs-editor&searchPhrase=${ID.s1}`)); return since(t0); }, true);
            await step('a04-se-search-view-address', async () => { const t0 = Date.now(); await go(dash(`?currentViewId=search&searchPhrase=${ID.s1}`)); return since(t0); });
        });
    } finally {
        await close();
    }
});
