// U65 claim check K2: "Editorial Activity" — what each "Trends" row counts
// (Rule 6, 6a, 6b), the date-range column (Rule 7, A1, A3), yearly averages
// (Rule 8, A2), rates (Rule 9), days to a decision (Rule 10) and the apps'
// own counting (Rule 13, OMP1, OMP2's page, OPS2).
//
// Run: PROBE_FEATURE=U65 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U65/K2/k2.js [seed]
//   `seed` forces fresh scratch contexts; without it the contexts recorded in
//   .reports/U65/ccK2/state-<app>.json are reused (their on-screen actions
//   are not repeated). BLOCKS=td2,rows,status,dates,avg,days,td3,empty,omp,mail
//   runs a subset.
// Scratch contexts only; publicknowledge is never touched. Seeds go through
// POST scenarios/context and scenarios/submission (dateSubmitted back-dates
// a seed, scenarios.md); the decisions a claim needs dated today on a
// back-dated submission are recorded on screen in the decision wizard, and
// "Unpublish" ("Unpost") is pressed on screen.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (d) => d.toISOString().slice(0, 10);
const ago = (n) => iso(new Date(Date.now() - n * 86400000));
const TODAY = ago(0);
const BLOCKS = (process.env.BLOCKS || '').split(',').filter(Boolean);
const want = (b) => !BLOCKS.length || BLOCKS.includes(b);
const FRESH = process.argv.includes('seed');

function dbName(app) {
    const config = fs.readFileSync(path.join(path.resolve(REPO, app.root || path.join('checkouts', app.name)), 'config.test.inc.php'), 'utf8');
    return config.match(/\[database\][\s\S]*?\nname = (\S+)/)[1];
}
// Read-only reads of what the app stored (the premise checks); never a write.
function psql(app, sql) {
    const out = execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', dbName(app), '-AtF', '\t', '-c', sql], {
        env: {...process.env, PGPASSWORD: 'e2e'},
        encoding: 'utf8',
    });
    return out.trim() === '' ? [] : out.trim().split('\n').map((line) => line.split('\t'));
}

function statePath(app) {
    return path.join(REPO, '.reports', process.env.PROBE_FEATURE || 'U65', process.env.PROBE_AGENT || 'ccK2', `state-${app.name}.json`);
}
function loadState(app) {
    if (FRESH || !fs.existsSync(statePath(app))) return {};
    return JSON.parse(fs.readFileSync(statePath(app), 'utf8'));
}
function saveState(app, state) {
    fs.mkdirSync(path.dirname(statePath(app)), {recursive: true});
    fs.writeFileSync(statePath(app), JSON.stringify(state, null, 2));
}

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const state = loadState(app);
    const facts = {app: app.name, today: TODAY};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`);
    };
    const tagFor = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`;
    const deskDecline = isOPS ? 'decline' : 'initialDecline';

    // ---- seeding ------------------------------------------------------------
    async function ctx(key, extra = {}) {
        if (state[key]) return state[key];
        const t = tagFor(`u65k2${key}`);
        await app.api.createContext({
            tag: t,
            users: [{username: `${t}m`, roles: ['manager']}, {username: `${t}u`, roles: ['author']}],
            ...extra,
        });
        state[key] = {path: t, subs: {}};
        saveState(app, state);
        return state[key];
    }
    async function sub(c, key, spec = {}) {
        if (c.subs[key]) return c.subs[key];
        let res;
        try {
            res = await app.api.createSubmission({tag: `${c.path}${key}`, context: c.path, submitter: `${c.path}u`, title: `K2 ${key}`, ...spec});
        } catch (e) {
            c.subs[key] = {error: String(e.message).slice(0, 600), spec};
            saveState(app, state);
            console.log(`[${app.name}] seed ${key} refused: ${String(e.message).slice(0, 300)}`);
            return c.subs[key];
        }
        c.subs[key] = {
            id: res.submissionId,
            publicationId: res.publicationId,
            stageId: res.stageId,
            rounds: res.reviewRounds || [],
            dateSubmitted: res.dateSubmitted ?? null,
            daysShifted: res.daysShifted ?? null,
            spec,
        };
        saveState(app, state);
        return c.subs[key];
    }
    const stored = (s) =>
        s && s.id
            ? {
                  submission: psql(app, `select date_submitted, status, stage_id, submission_progress from submissions where submission_id=${s.id}`)[0],
                  decisions: psql(app, `select decision, stage_id, date_decided from edit_decisions where submission_id=${s.id} order by edit_decision_id`),
                  publications: psql(app, `select date_published, status from publications where submission_id=${s.id} order by publication_id`),
              }
            : s;

    // ---- reading the page ---------------------------------------------------
    async function readTrends(page) {
        const table = page.getByRole('table', {name: 'Trends'});
        await table.waitFor({timeout: T});
        const header = (await table.locator('thead th').allInnerTexts()).map((s) => s.trim());
        const rows = {};
        for (const r of await table.locator('tbody tr').all()) {
            const cells = await r.locator('td, th').allInnerTexts();
            const name = cells[0].split('\n')[0].replace(/ /g, '').trim();
            rows[name] = cells.slice(1).map((s) => s.replace(/\s+/g, ' ').trim());
        }
        return {header, rows};
    }
    function readChart(snap) {
        const aria = snap.aria.main || '';
        const m = aria.match(/heading "(\d+) Active Submissions"/);
        const line = (aria.match(/heading "\d+ Active Submissions"[^\n]*\n\s*- text: ([^\n]*)/) || [])[1] || null;
        return m ? {total: Number(m[1]), stages: line} : null;
    }
    async function snapTrends(page, name) {
        await idle(page);
        const snap = await screen(page);
        record(name, snap);
        await shot(page, name);
        const t = await readTrends(page);
        return {snap: `${name}-${app.name}`, chart: readChart(snap), range: t.header[1], rows: t.rows};
    }
    const statsCall = (page) =>
        page.waitForResponse((r) => /\/api\/v1\/stats\/editorial(\?|$)/.test(r.url()) && r.request().method() === 'GET', {timeout: T});
    async function open(page, c, name) {
        await page.goto(app.url(`/index.php/${c.path}/stats/editorial`));
        await idle(page);
        await page.getByRole('table', {name: 'Trends'}).waitFor({timeout: T});
        return snapTrends(page, name);
    }
    async function customRange(page, from, to, name) {
        await page.getByRole('button', {name: 'Change date range'}).click();
        await page.getByRole('textbox', {name: 'From'}).fill(from);
        await page.getByRole('textbox', {name: 'To'}).fill(to);
        const call = statsCall(page);
        await page.getByRole('button', {name: 'Apply', exact: true}).click();
        const r = await call;
        await idle(page);
        await sleep(400);
        const out = await snapTrends(page, name);
        out.call = {url: r.url().replace(app.baseURL, ''), status: r.status()};
        return out;
    }
    async function preset(page, label, name) {
        await page.getByRole('button', {name: 'Change date range'}).click();
        const call = statsCall(page);
        await page.getByRole('button', {name: label, exact: true}).click();
        const r = await call;
        await idle(page);
        await sleep(400);
        const out = await snapTrends(page, name);
        out.call = {url: r.url().replace(app.baseURL, ''), status: r.status()};
        return out;
    }
    async function filterBy(page, label, name) {
        const filters = page.getByRole('button', {name: 'Filters', exact: true});
        const choice = page.getByRole('button', {name: label, exact: true});
        // The panel's buttons are in the accessibility tree (and report
        // visible) while the panel is closed, and a press on them then does
        // nothing: open the panel with "Filters" first (fresh page).
        await filters.click();
        await sleep(600);
        await choice.waitFor({timeout: T});
        const avg = page.waitForResponse((r) => /\/api\/v1\/stats\/editorial\/averages/.test(r.url()), {timeout: T}).catch(() => null);
        const call = statsCall(page);
        await choice.click();
        const [r, a] = await Promise.all([call, avg]);
        await idle(page);
        await sleep(400);
        const out = await snapTrends(page, name);
        out.call = {url: r.url().replace(app.baseURL, ''), status: r.status()};
        out.avgCall = a ? {url: a.url().replace(app.baseURL, ''), status: a.status()} : null;
        return out;
    }

    // ---- acting on screen ---------------------------------------------------
    async function decideOnScreen(page, c, s, decision, roundId, name) {
        const round = roundId ? `&reviewRoundId=${roundId}` : '';
        await page.goto(app.url(`/index.php/${c.path}/decision/record/${s.id}?decision=${decision}${round}`));
        await idle(page);
        const h1 = page.locator('h1.app__pageHeading');
        await h1.waitFor({timeout: T});
        record(`${name}-wizard`, await screen(page));
        const recordBtn = page.getByRole('button', {name: 'Record Decision', exact: true});
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        const pages = [];
        for (let i = 0; i < 8; i++) {
            await page.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: T}).catch(() => {});
            pages.push((await h1.innerText()).trim());
            if (await recordBtn.isVisible()) break;
            await cont.click();
            await idle(page);
        }
        const posted = page.waitForResponse((r) => r.url().includes('/decisions') && r.request().method() === 'POST', {timeout: 60000});
        await recordBtn.click();
        const resp = await posted;
        await page.getByRole('dialog').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        const done = await screen(page);
        record(`${name}-done`, done);
        return {pages, status: resp.status(), dialog: (done.text.dialog || '').replace(/\s+/g, ' ').slice(0, 200)};
    }
    async function unpublishOnScreen(page, c, s, name) {
        await page.goto(app.url(`/index.php/${c.path}/dashboard/editorial?workflowSubmissionId=${s.id}&workflowMenuKey=publication_${s.publicationId}_titleAbstract`));
        await idle(page);
        const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unpost)$/});
        await btn.waitFor({timeout: T});
        record(`${name}-before`, await screen(page));
        await loc(page, 'Workflow publication page: Unpublish/Unpost', btn);
        await btn.click();
        const dialog = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be (published|posted)\?/});
        await dialog.waitFor({timeout: T});
        const r = page.waitForResponse((x) => x.url().includes('/unpublish'), {timeout: T});
        await dialog.getByRole('button', {name: /^(Unpublish|Unpost)$/}).click();
        const resp = await r;
        await idle(page);
        await sleep(500);
        record(`${name}-after`, await screen(page));
        return {status: resp.status()};
    }

    const {page, close} = await launch(app);
    try {
        // =====================================================================
        // td2 / Rule 6a: one imported (published a year ago, submitted today),
        // one received and left at the Submission stage.
        if (want('td2')) {
            const c = await ctx('td2');
            const imp = await sub(c, 'imp', {published: true, datePublished: ago(365)});
            const recv = await sub(c, 'recv', {});
            fact('td2 seeds', {imp: stored(imp), recv: stored(recv)});
            await signIn(page, `${c.path}m`);
            const o = await open(page, c, 'td2-open');
            await loc(page, 'Editorial Activity: the Trends table', page.getByRole('table', {name: 'Trends'}));
            await loc(page, 'Editorial Activity: Change date range', page.getByRole('button', {name: 'Change date range'}));
            fact('td2 page', o);
        }

        // =====================================================================
        // Rule 6 table: one seed per row, all today.
        if (want('rows')) {
            const extra = isOPS ? {} : {};
            const c = await ctx('rows', extra);
            const seeds = {
                recv: {},
                draft: {submitted: false},
                pub: {published: true},
                imp: {published: true, datePublished: ago(365)},
                desk: {decisions: [deskDecline]},
            };
            if (!isOPS) {
                Object.assign(seeds, {
                    acc: {decisions: ['sendExternalReview', 'accept']},
                    skip: {decisions: ['skipExternalReview']},
                    prod: {decisions: ['skipExternalReview', 'sendToProduction']},
                    rev: {decisions: ['sendExternalReview', 'decline']},
                });
            }
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            fact('rows seeds', out);
            await signIn(page, `${c.path}m`);
            fact('rows page', await open(page, c, 'rows-open'));
            // Leave a decision wizard with a letter changed and unsaved (sweep).
            if (!state.rowsLeave) {
                const s = c.subs.recv;
                const listen = [];
                const onDialog = (d) => {
                    listen.push({type: d.type(), message: d.message()});
                    d.accept().catch(() => {});
                };
                page.on('dialog', onDialog);
                await page.goto(app.url(`/index.php/${c.path}/decision/record/${s.id}?decision=8`));
                await idle(page);
                await page.locator('h1.app__pageHeading').waitFor({timeout: T});
                await page.locator('.composer__loadingTemplateMask').first().waitFor({state: 'detached', timeout: T}).catch(() => {});
                const subject = page.getByRole('textbox', {name: /Subject/}).first();
                let typed = false;
                if (await subject.count()) {
                    await subject.fill('K2 changed subject');
                    await subject.blur();
                    typed = true;
                }
                record('rows-leave-wizard', await screen(page));
                await page.goto(app.url(`/index.php/${c.path}/stats/editorial`)).catch((e) => listen.push({gotoError: String(e.message).slice(0, 200)}));
                await idle(page);
                page.off('dialog', onDialog);
                const decided = psql(app, `select count(*) from edit_decisions where submission_id=${s.id}`)[0][0];
                fact('rows leave wizard (typed subject, then left)', {typed, dialogs: listen, landed: page.url().replace(app.baseURL, ''), decisionsRecorded: decided});
                state.rowsLeave = true;
                saveState(app, state);
            }
        }

        // =====================================================================
        // Rule 6b: counts follow today's status; "Submissions Published" is
        // published now (Unpublish on screen between two reads).
        if (want('status')) {
            const c = await ctx('status');
            const seeds = isOPS
                ? {r1: {decisions: ['decline', 'revertDecline']}, u1: {published: true}, ctl: {decisions: ['decline']}}
                : {
                      r1: {decisions: ['initialDecline', 'revertInitialDecline']},
                      r2: {decisions: ['sendExternalReview', 'decline', 'revertDecline']},
                      r3: {decisions: ['sendExternalReview', 'accept', 'backFromCopyediting', 'decline']},
                      u1: {published: true},
                  };
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            if (!isOPS && c.subs.r3 && c.subs.r3.error) {
                // Fallback path for "accepted, declined later".
                out.r3b = stored(await sub(c, 'r3b', {decisions: ['skipExternalReview', 'backFromCopyediting', 'initialDecline']}));
            }
            fact('status seeds', out);
            await signIn(page, `${c.path}m`);
            fact('status page before unpublish', await open(page, c, 'status-open'));
            if (!state.statusUnpublished) {
                fact('status unpublish', await unpublishOnScreen(page, c, c.subs.u1, 'status-unpublish'));
                state.statusUnpublished = true;
                saveState(app, state);
            }
            fact('status u1 after', stored(c.subs.u1));
            fact('status page after unpublish', await open(page, c, 'status-open-after'));
        }

        // =====================================================================
        // Rule 7 / A1 / A3: each row's own date against the range.
        if (want('dates')) {
            const c = await ctx('dates');
            const seeds = {
                dy: {dateSubmitted: ago(1), decisions: [deskDecline]},
                dy2: {dateSubmitted: ago(1), published: true},
                d2: {dateSubmitted: ago(2)},
                dimp: {dateSubmitted: ago(10), published: true, datePublished: ago(400)},
                dpub: {dateSubmitted: ago(30), published: true, datePublished: ago(20)},
                dx: {dateSubmitted: ago(40)},
                ddec: {dateSubmitted: ago(50), decisions: isOPS ? ['decline'] : ['sendExternalReview', 'decline']},
                draft: {submitted: false},
            };
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            fact('dates seeds', out);
            // A draft started on screen by the author ("Begin Submission"), for
            // the "a draft has no submission date" premise.
            if (!state.screenDraft) {
                await signIn(page, `${c.path}u`);
                await page.goto(app.url(`/index.php/${c.path}/submission`));
                await idle(page);
                record('dates-start-submission', await screen(page));
                const body = page.frameLocator('#startSubmission-title-control_ifr').locator('body');
                await body.click();
                await body.fill('K2 screen draft');
                for (const box of await page.getByRole('checkbox').all()) {
                    if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
                }
                await page.getByRole('button', {name: 'Begin Submission'}).click();
                await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45000});
                await idle(page);
                const id = Number(new URL(page.url()).searchParams.get('id'));
                record('dates-draft-wizard', await screen(page));
                state.screenDraft = {id};
                saveState(app, state);
            }
            fact('dates screen draft stored', stored(state.screenDraft));
            await signIn(page, `${c.path}m`);
            if (!state.datesDecided) {
                fact('dates dx desk decline on screen', await decideOnScreen(page, c, c.subs.dx, 8, null, 'dates-dx-decline'));
                state.datesDecided = true;
                saveState(app, state);
            }
            fact('dates dx after', stored(c.subs.dx));
            fact('dates draft stored', stored(c.subs.draft));
            fact('dates last90', await open(page, c, 'dates-last90'));
            const r = {};
            r.imp = await customRange(page, ago(11), ago(9), 'dates-r-imp');
            r.impLast = await customRange(page, ago(11), ago(10), 'dates-r-imp-lastday');
            r.pubSub = await customRange(page, ago(31), ago(29), 'dates-r-pub-submitted');
            r.pubPub = await customRange(page, ago(21), ago(19), 'dates-r-pub-published');
            r.pubPubLast = await customRange(page, ago(21), ago(20), 'dates-r-pub-published-lastday');
            r.dx = await customRange(page, ago(41), ago(39), 'dates-r-dx');
            r.ddec = await customRange(page, ago(51), ago(49), 'dates-r-ddec');
            r.ddecLast = await customRange(page, ago(51), ago(50), 'dates-r-ddec-lastday');
            r.d2Last = await customRange(page, ago(3), ago(2), 'dates-r-d2-lastday');
            r.d2 = await customRange(page, ago(3), ago(1), 'dates-r-d2-to-yesterday');
            fact('dates ranges', r);
            fact('dates ytd', await preset(page, 'Year to date', 'dates-ytd'));
        }

        // =====================================================================
        // Rule 8 / Rule 9: yearly averages over full years, filters, rates.
        if (want('avg')) {
            const sections = isOMP
                ? {series: [{path: 'sa', title: 'Series A'}, {path: 'sb', title: 'Series B'}]}
                : isOJS
                ? {sections: [{abbrev: 'SA', title: {en: 'Section A'}}, {abbrev: 'SB', title: {en: 'Section B'}}]}
                : {sections: [{abbrev: 'SA', path: 'sa', title: {en: 'Section A'}}, {abbrev: 'SB', path: 'sb', title: {en: 'Section B'}}]};
            const c = await ctx('avg', sections);
            const inA = isOMP ? {series: 'sa'} : {section: 'SA'};
            const inB = isOMP ? {series: 'sb'} : {section: 'SB'};
            const seeds = {
                a1: {dateSubmitted: '2023-03-01', decisions: [deskDecline], ...inB},
                a2: {dateSubmitted: '2023-03-01', decisions: [deskDecline], ...inB},
                a3: {dateSubmitted: '2023-03-01', decisions: [deskDecline], ...inB},
                a4: {dateSubmitted: '2023-03-01', decisions: [deskDecline], ...inB},
                b1: {dateSubmitted: '2024-05-01', decisions: isOPS ? ['decline'] : ['sendExternalReview', 'decline'], ...inB},
                b2: {dateSubmitted: '2024-06-01', published: true, ...inA},
                c1: {dateSubmitted: '2025-05-01', ...(isOPS ? {} : {decisions: ['skipExternalReview']}), ...inA},
                c2: {dateSubmitted: '2025-06-01', published: true, ...inA},
                d1: {dateSubmitted: '2026-02-01', decisions: [deskDecline], ...inA},
                d2: {dateSubmitted: '2026-02-01', ...(isOPS ? {} : {decisions: ['sendExternalReview', 'accept']}), ...inA},
                d3: {dateSubmitted: '2026-02-01', ...inA},
                d4: {dateSubmitted: '2026-02-01', ...inA},
                d5: {dateSubmitted: '2026-02-01', ...inA},
            };
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) {
                const s = await sub(c, k, spec);
                out[k] = s.error ? s : {id: s.id, dateSubmitted: s.dateSubmitted};
            }
            fact('avg seeds', out);
            await signIn(page, `${c.path}m`);
            fact('avg all', await open(page, c, 'avg-open'));
            fact('avg ytd', await preset(page, 'Year to date', 'avg-ytd'));
            fact('avg last year', await preset(page, 'Last year', 'avg-lastyear'));
            await open(page, c, 'avg-reopen');
            fact('avg filter B', await filterBy(page, isOMP ? 'Series B' : 'Section B', 'avg-filter-b'));
            await open(page, c, 'avg-reopen2');
            fact('avg filter A', await filterBy(page, isOMP ? 'Series A' : 'Section A', 'avg-filter-a'));
        }

        // =====================================================================
        // Rule 10: days to a decision (journal and press only; a preprint
        // server has no days rows).
        if (want('days') && !isOPS) {
            const c = await ctx('days');
            const seeds = {
                z1: {decisions: ['initialDecline']},
                z2: {decisions: ['initialDecline']},
                z3: {decisions: ['initialDecline']},
                x: {dateSubmitted: ago(20)},
                v: {dateSubmitted: ago(5)},
                y: {dateSubmitted: ago(10), decisions: ['sendExternalReview']},
                w: {},
            };
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            fact('days seeds', out);
            await signIn(page, `${c.path}m`);
            if (!state.daysDecided) {
                const r = {};
                r.x = await decideOnScreen(page, c, c.subs.x, 8, null, 'days-x-decline');
                r.v = await decideOnScreen(page, c, c.subs.v, 8, null, 'days-v-decline');
                const round = (c.subs.y.rounds || []).find((x) => x.stageId === 3) || (c.subs.y.rounds || [])[0];
                r.y = await decideOnScreen(page, c, c.subs.y, 2, round && round.id, 'days-y-accept');
                fact('days on-screen decisions', r);
                state.daysDecided = true;
                saveState(app, state);
            }
            fact('days stored', {x: stored(c.subs.x), v: stored(c.subs.v), y: stored(c.subs.y)});
            fact('days all', await open(page, c, 'days-open'));
            fact('days range x..v', await customRange(page, ago(21), ago(4), 'days-r-xv'));
            fact('days range y only', await customRange(page, ago(11), ago(9), 'days-r-y'));
        }

        // =====================================================================
        // Rule 6 "dated by their first publication": a second version of a
        // published item, made and published on screen today, then the range
        // around the first publication read again.
        if (want('ver')) {
            const c = await ctx('ver', isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}]} : {});
            const p = await sub(c, 'p', {
                dateSubmitted: ago(30),
                published: true,
                datePublished: ago(20),
                ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {}),
            });
            fact('ver seed', stored(p));
            await signIn(page, `${c.path}m`);
            fact('ver before', await open(page, c, 'ver-open'));
            fact('ver before range', await customRange(page, ago(21), ago(19), 'ver-r-first'));
            if (!state.verDone) {
                const out = {};
                const controls = () => page.locator('[data-cy="workflow-controls-right"]');
                await page.goto(app.url(`/index.php/${c.path}/dashboard/editorial?workflowSubmissionId=${p.id}&workflowMenuKey=publication_${p.publicationId}_titleAbstract`));
                await idle(page);
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1000);
                record('ver-workflow', await screen(page));
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
                await idle(page);
                await sleep(600);
                for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                    const el = w.locator(sel);
                    if ((await el.isVisible().catch(() => false)) && !(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
                }
                record('ver-version-window', await screen(page));
                const vr = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T});
                await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                out.versionStatus = (await vr).status();
                await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
                await sleep(1000);
                const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/}).first();
                await button.waitFor({state: 'visible', timeout: T});
                out.button = (await button.innerText()).trim();
                await sleep(800);
                await button.click();
                const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
                const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public/}).last();
                const which = await Promise.race([
                    panel.locator('select[name="versionStage"], input[name="assignment"], button').first().waitFor({state: 'visible', timeout: 15000}).then(() => 'panel'),
                    confirm.waitFor({state: 'visible', timeout: 15000}).then(() => 'confirm'),
                ]).catch(() => null);
                out.opened = which;
                await idle(page);
                await sleep(600);
                record('ver-publish-window', await screen(page));
                if (which === 'panel') {
                    const back = panel.getByRole('radio', {name: 'Assign To Current/Back Issue'});
                    if (await back.isVisible().catch(() => false)) {
                        await back.check();
                        const sel = panel.locator('select[name="issueId"]');
                        await sel.waitFor({state: 'visible', timeout: T});
                        const opt = sel.locator('option').filter({hasText: /Vol\.? 1/});
                        await opt.first().waitFor({state: 'attached', timeout: T});
                        await sel.selectOption((await opt.first().getAttribute('value')) || '');
                    }
                    out.panel = (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
                    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                    await confirm.waitFor({state: 'visible', timeout: T});
                    await sleep(600);
                }
                out.confirm = (await confirm.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
                const pr = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
                await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click();
                out.publishStatus = (await pr).status();
                await idle(page);
                await sleep(800);
                record('ver-published', await screen(page));
                fact('ver on screen', out);
                state.verDone = true;
                saveState(app, state);
            }
            fact('ver stored after', stored(p));
            fact('ver after', await open(page, c, 'ver-open-after'));
            fact('ver after range', await customRange(page, ago(21), ago(19), 'ver-r-first-after'));
        }

        // =====================================================================
        // td3 / A2: three seeds today.
        if (want('td3')) {
            const c = await ctx('td3');
            const seeds = isOPS
                ? {s1: {}, s2: {}, s3: {decisions: ['decline']}}
                : {s1: {}, s2: {decisions: ['sendExternalReview', 'accept']}, s3: {decisions: ['initialDecline']}};
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            fact('td3 seeds', out);
            await signIn(page, `${c.path}m`);
            fact('td3 open', await open(page, c, 'td3-open'));
            fact('td3 ytd', await preset(page, 'Year to date', 'td3-ytd'));
        }

        // =====================================================================
        // A journal with nothing: every rate and days row with nothing to divide.
        if (want('empty')) {
            const c = await ctx('empty');
            await signIn(page, `${c.path}m`);
            fact('empty open', await open(page, c, 'empty-open'));
        }

        // =====================================================================
        // td6 / Rule 13 / OMP1: Internal Review decisions on a press.
        if (want('omp') && isOMP) {
            const c = await ctx('omp');
            const seeds = {
                i1: {decisions: ['sendInternalReview', 'declineInternal']},
                i2: {decisions: ['sendInternalReview', 'acceptFromInternal']},
                i3: {dateSubmitted: ago(15), decisions: ['sendInternalReview']},
            };
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            fact('omp seeds', out);
            await signIn(page, `${c.path}m`);
            if (!state.ompDecided) {
                const round = (c.subs.i3.rounds || []).find((x) => x.stageId === 2) || (c.subs.i3.rounds || [])[0];
                fact('omp i3 internal decline on screen', await decideOnScreen(page, c, c.subs.i3, 22, round && round.id, 'omp-i3-declineinternal'));
                state.ompDecided = true;
                saveState(app, state);
            }
            fact('omp i3 stored', stored(c.subs.i3));
            fact('omp open', await open(page, c, 'omp-open'));
            // The "Days to First Editorial Decision" icon's text (OMP2's page).
            const icon = page.getByText('Description for Days to First Editorial Decision').first();
            await loc(page, 'Trends: the Days to First Editorial Decision description', icon);
            const iconText = await page.evaluate(() => {
                const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /Description for Days to First Editorial Decision/.test(e.textContent || ''));
                const cell = el && el.closest('td, th');
                return cell ? cell.innerText : null;
            });
            fact('omp days icon cell text', iconText);
        }

        // =====================================================================
        // The "Days to First Editorial Decision" icon's text, read with the
        // mouse pointer resting on it (OMP2's text on a press; the journal
        // as the control).
        if (want('icon') && !isOPS) {
            const c = await ctx('empty');
            await signIn(page, `${c.path}m`);
            await open(page, c, 'icon-open');
            const row = page.getByRole('table', {name: 'Trends'}).getByRole('row').filter({hasText: 'Days to First Editorial Decision'});
            const target = row.locator('.tooltipButton').first();
            await loc(page, 'Trends: the icon after Days to First Editorial Decision', target);
            // The row sits below the 900-pixel fold: scroll it in and let the
            // page settle before the pointer rests on the icon.
            await target.scrollIntoViewIfNeeded();
            await sleep(500);
            const pop = page.locator('.v-popper__popper').filter({hasText: /80% of submissions/});
            for (let i = 0; i < 8 && !(await pop.count()); i++) {
                await target.scrollIntoViewIfNeeded();
                await page.mouse.move(5, 5);
                await sleep(800);
                await target.hover();
                await pop.first().waitFor({timeout: 3000}).catch(() => {});
                if (!(await pop.count())) {
                    // The pointer's hover sometimes lands before the tooltip
                    // directive listens after the full-page screenshot; the
                    // same mouseenter the pointer sends, sent to the icon.
                    await target.dispatchEvent('mouseenter');
                    await pop.first().waitFor({timeout: 3000}).catch(() => {});
                }
            }
            await sleep(300);
            const snap = await screen(page);
            record('icon-hover', snap);
            await shot(page, 'icon-hover');
            const shown = (await pop.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
            fact('icon days hover text', shown);
        }

        // =====================================================================
        // The monthly email's counts for last month (A1's last sentence, OMP1's
        // email sentence): seeds dated on the first and last day of last month.
        if (want('mail')) {
            const c = await ctx('mail');
            const now = new Date();
            const firstThis = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
            const lastPrev = iso(new Date(firstThis.getTime() - 86400000));
            const firstPrev = `${lastPrev.slice(0, 8)}01`;
            const mid = `${lastPrev.slice(0, 8)}15`;
            const seeds = {
                m1: {dateSubmitted: lastPrev},
                m2: {dateSubmitted: firstPrev},
                m4: {dateSubmitted: `${lastPrev.slice(0, 8)}16`, decisions: [deskDecline]},
            };
            if (isOMP) seeds.m3 = {dateSubmitted: mid, decisions: ['sendInternalReview', 'declineInternal']};
            const out = {};
            for (const [k, spec] of Object.entries(seeds)) out[k] = stored(await sub(c, k, spec));
            fact('mail seeds', out);
            if (!state.mailRun) {
                const run = await app.api.runTask({task: 'statisticsReport', context: c.path});
                state.mailRun = run;
                saveState(app, state);
            }
            fact('mail run', state.mailRun);
            const msg = await app.mail.find({to: `${c.path}m@mail.test`, subject: 'activity for', timeoutMs: 30000});
            const full = await app.mail.fullMessage(msg.ID);
            fact('mail text', (full.Text || '').slice(0, 1500));
            fact('mail attachments', (full.Attachments || []).map((a) => a.FileName));
            await signIn(page, `${c.path}m`);
            fact('mail range last month', await (async () => {
                await open(page, c, 'mail-open');
                return customRange(page, firstPrev, lastPrev, 'mail-r-lastmonth');
            })());
        }
    } finally {
        record('k2-facts', facts, {merge: true});
        await close();
    }
});
