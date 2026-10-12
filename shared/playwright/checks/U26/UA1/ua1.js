// U26 claim check, chunk UA1: the two top entries of docs/tracking/UNASSIGNED.md (housekeeping
// "Quiet mornings", 2026-10-12): "AFFW-701, AFFW-703, AFFW-704 — legacy author-dashboard round
// surfaces" and "GRID-011, GRID-024 — legacy author review-attachment / revisions grids". Both rest
// on the review-stage spec's Rule 17, its scenario bullet "Old addresses" and footnote o.
// Checklist: .reports/U26/claims-UA1.txt (UA1-1 .. UA1-4).
//
// OJS, OMP: a scratch context (default review mode "Open") with ed (Journal/Press editor), au and
// au2 (Authors), rv1 (external reviewer). Submissions:
//   A  (au)  round 1, rv1 invited. On screen: rv1 accepts, uploads a reviewer file, submits; ed
//            records "Request Revisions" with the reviewer's file attached to the letter; au reads
//            the round view (the letter under "Notifications", "Read Review"), uploads a revised
//            file ("Upload revisions"), leaves a second upload by "Cancel" with its file attached.
//   C  (au)  seeded: rv1 completed, requestRevisions, a new round → the author's view of each round.
//   B  (au2) seeded: rv1 completed, requestRevisions → au2 is "an Author of another submission".
//   D  (a second scratch context on the install's default, anonymous review mode, with its own ed,
//      au, rv1) round 1, rv1 invited. On screen: rv1 uploads a reviewer file and submits; au reads
//      the round and types the two grids' addresses while the file is attached to no letter; ed
//      records "Request Revisions" with the file attached; au reads and types again.
//   I  (au, OMP only) seeded: Internal Review, requestRevisionsInternal; au uploads a revised file.
// Then the addresses a role types (each as a full page load, the answer read as the screen shows it):
//   authorDashboard/submission/{id}; authorDashboard/reviewRoundInfo/{id}, without an id, with the
//   old tab's query, under /en/; the two grids' own component addresses (fetch-grid) for A (and I,
//   C, B, D), as au, au2, ed, rv1 and signed out.
// Every screen's traffic is kept per phase (`traffic-…`): the component and API paths it asked for.
// OPS: a scratch server with mgr, au, au2 and one preprint: the author's workflow, then the same
// addresses (no review stage: the grids' addresses are typed with the Production stage and no round).
//
//   PROBE_RUN=r1 PROBE_FEATURE=U26 PROBE_AGENT=ccUA1 node bin/probe.js <app> shared/playwright/checks/U26/UA1/ua1.js
//   PROBE_RUN=r2 …  (the second, independent run: its own scratch context)
//   PHASES=build,anon,author,typed,editor (default all); REUSE=1 takes the run's earlier scratch context
//   (state-<run>-<app>.json) instead of seeding one, for a phase run on its own; its facts are added
//   to the run's facts-<run>-<app>.json and its traffic goes to traffic-<phases>-<run>-<app>.json.
//   2026-10-12 runs: r1, r2 on ojs, omp, ops (ojs r1 before D existed); r3 PHASES=anon on ojs;
//   REUSE=1 PHASES=editor on r1, r2 of ojs and omp (the editor's "Read Review" on B).
// Report: .reports/U26/cc-UA1.md. Read a run by its facts file: `typed-<who>-<sub>-<address>` per
// typed address, `<sub>-<role>-<screen>` per screen (`marks`: what of the old panel is in the
// document; `asked`: the requests the screen sent), `old-grid-requests-outside-typed` (must be []).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, serverLog, outFile, settled} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ['build', 'anon', 'author', 'typed', 'editor'];
const on = (p) => PHASES.includes(p);
const T = 30_000;
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (url) => String(url).replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]*/, 'csrfToken=…');

// A legacy grid's JSON answer, its `content` read as the markup it is: which grid, its title, its
// header and row controls, its rows, its "no items" line.
const parseGrid = (html) => {
    const d = new DOMParser().parseFromString(html, 'text/html');
    const t = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : null);
    return {
        gridIds: [...d.querySelectorAll('.pkp_controllers_grid')].map((g) => g.id),
        title: t(d.querySelector('.header h4') || d.querySelector('h4')),
        headerActions: [...d.querySelectorAll('.header a')].map(t).filter(Boolean),
        columns: [...d.querySelectorAll('thead th')].map(t),
        rows: [...d.querySelectorAll('tr.gridRow')].map((r) => t(r).slice(0, 200)),
        rowLinks: [...d.querySelectorAll('tr.gridRow a, tr.row_controls a')].map(t).filter(Boolean),
        empty: [...d.querySelectorAll('tbody.empty')].map(t),
        jsHandlers: [...new Set(html.match(/\$\.pkp\.controllers\.[A-Za-z.]+Handler/g) || [])],
        addresses: [...new Set((html.match(/\$\$\$call\$\$\$[^"'\\ ]*/g) || []).map((x) => x.replace(/\\\//g, '/').replace(/\?.*$/, '')))],
        text: t(d.body).slice(0, 500),
    };
};

// What of the old author-dashboard round panel is in the document (reviewRoundInfo.tpl,
// submissionEmails.tpl and the grids they mount), and every legacy grid that is.
const legacyMarks = (page) => page.evaluate(() => {
    const q = (s) => document.querySelectorAll(s).length;
    return {
        emailLinkList: q('.pkp_submission_emails'),
        emailLinks: q('a[id^="submissionEmail-"]'),
        emailBody: q('.pkp_submission_email'),
        roundNotification: q('[id^="reviewRoundNotification_"]'),
        reviewersGridMount: q('[id^="reviewersGrid-round_"]'),
        reviewAttachmentsMount: [...document.querySelectorAll('[id^="reviewAttachmentsGridContainer"]')].map((e) => e.id),
        revisionsGridMount: q('[id^="revisionsGrid-"]'),
        authorGrids: q('[id*="authorreviewrevisionsgrid" i], [id*="authorreviewattachmentsgrid" i], [id*="authorreviewergrid" i]'),
        legacyGrids: [...document.querySelectorAll('.pkp_controllers_grid')].map((g) => g.id),
    };
});

// The open workflow window as data: its headings, its tables with their rows, its controls.
const viewInfo = (page) => page.evaluate(() => {
    const vis = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const dlgs = [...document.querySelectorAll('[role=dialog]')].filter(vis);
    const root = dlgs[0] || document.body;
    const tx = (e) => e.innerText.trim().replace(/\s+/g, ' ');
    return {
        dialogs: dlgs.length,
        headings: [...root.querySelectorAll('h1,h2,h3,h4')].filter(vis).map((h) => `${h.tagName} ${tx(h)}`),
        tables: [...root.querySelectorAll('table')].filter(vis).map((t) => ({
            name: (t.getAttribute('aria-labelledby') && document.getElementById(t.getAttribute('aria-labelledby'))?.innerText.trim()) || t.getAttribute('aria-label') || null,
            rows: [...t.querySelectorAll('tbody tr')].filter(vis).map((tr) => tx(tr).slice(0, 220)),
        })),
        lists: [...root.querySelectorAll('ul, ol')].filter(vis).filter((l) => !l.closest('nav')).map((l) => [...l.children].map((li) => tx(li).slice(0, 160))).filter((l) => l.length).slice(0, 12),
        controls: [...new Set([...root.querySelectorAll('button, a')].filter(vis).map((b) => tx(b) || b.getAttribute('aria-label') || '').filter(Boolean))].slice(0, 80),
        menu: [...root.querySelectorAll('nav a, nav button, [role=navigation] a, [role=navigation] button')].filter(vis).map(tx).filter(Boolean).slice(0, 30),
    };
});

forEachApp(async (app) => {
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    // With REUSE the run's earlier facts are kept and this process adds to them.
    const factsFile = outFile('facts.json');
    const facts = process.env.REUSE && fs.existsSync(factsFile) ? JSON.parse(fs.readFileSync(factsFile, 'utf8')) : {};
    const log = (...a) => console.log(`[${RUN} ${app.name}]`, ...a);
    const fact = (k, v) => { facts[k] = v; record('facts', facts); log(k, flat(typeof v === 'string' ? v : JSON.stringify(v), 700)); };

    const stateFile = outFile('state.json');
    let state = process.env.REUSE && fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
    const t = state ? state.t : tag('u26ua1');
    let ct = t; // the context in play: `t`, or the anonymous-review one (`${t}n`) while D is driven
    const u = (k) => `${ct}${k}`;
    const ctx = (p) => app.url(`/index.php/${ct}${p}`);
    const slog = serverLog(app);

    const {page, close} = await launch(app);
    const nativeDialogs = [];
    page.on('dialog', async (d) => { nativeDialogs.push({at: Date.now(), type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
    // The traffic of each phase: every component ($$$call$$$), API and author-dashboard request.
    const traffic = [];
    let phase = 'start';
    page.context().on('response', (r) => {
        const url = r.url();
        if (!/\$\$\$call\$\$\$|\/api\/v1\/|authorDashboard/.test(url)) return;
        traffic.push({phase, method: r.request().method(), status: r.status(), path: strip(url)});
    });
    const asked = (ph) => [...new Set(traffic.filter((x) => x.phase === ph).map((x) => `${x.method} ${x.status} ${x.path.replace(/\?.*$/, '')}`))];
    const namesOldGrids = (ph) => traffic.filter((x) => (ph ? x.phase === ph : true) && /author-review-(attachments|revisions)-grid|authorDashboard\/reviewRoundInfo/i.test(x.path)).map((x) => `${x.phase}: ${x.method} ${x.status} ${x.path}`);

    const sect = async (name, fn) => {
        try { await fn(); } catch (e) { fact(`${name}-FAILED`, flat(e.stack || e.message, 1200)); await snap(`${name}-failed`).catch(() => {}); }
    };
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        if (extra) Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    }
    const signInAs = async (k) => { await signIn(page, u(k), {contextPath: ct}); await idle(page); };
    const menuKey = (round) => (round ? `&workflowMenuKey=workflow_${round.stageId}_${round.id}` : '');
    const openWorkflow = async (view, id, round) => {
        await page.goto('about:blank');
        await page.goto(ctx(`/en/dashboard/${view}?workflowSubmissionId=${id}${menuKey(round)}`));
        await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
        await idle(page);
        await page.waitForFunction(() => { const d = document.querySelector('[role=dialog]'); return d && /Status|Production|Tasks/.test(d.innerText); }, null, {timeout: 20_000}).catch(() => {});
        await idle(page);
    };
    const openAuthor = (id, round) => openWorkflow('mySubmissions', id, round);
    const openEditor = (id, round) => openWorkflow('editorial', id, round);
    const closeTop = async () => {
        const d = page.getByRole('dialog').last();
        await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(700); // the closed window's slot (patterns.md pitfall 4)
        await idle(page);
    };
    // A workflow view read whole: the snapshot, the window as data, the old panel's marks, the traffic.
    const readView = async (label) => {
        const s = await snap(label);
        const out = {url: strip(s.url), view: await viewInfo(page).catch((e) => ({error: flat(e.message)})), marks: await legacyMarks(page), asked: asked(phase), oldGridRequests: namesOldGrids(phase)};
        fact(label, out);
        return out;
    };

    // An address typed into the address bar: the answer's status, where it landed, what the screen shows.
    async function typed(label, who, address) {
        phase = `typed:${label}`;
        await page.goto('about:blank');
        const from = slog.mark();
        let resp = null;
        let error = null;
        try { resp = await page.goto(address, {waitUntil: 'load', timeout: 60_000}); } catch (e) { error = flat(e.message, 240); }
        await Promise.race([idle(page), sleep(45_000)]);
        const chain = [];
        for (let rq = resp && resp.request(); rq; rq = rq.redirectedFrom()) chain.unshift(strip(rq.url()));
        const s = await snap(label);
        const body = await page.locator('body').innerText().catch(() => null);
        const raw = resp ? await resp.text().catch(() => null) : null;
        let json = null;
        try { json = JSON.parse(raw); } catch { /* not JSON */ }
        let grid = null;
        if (json && typeof json.content === 'string' && json.content.includes('<')) grid = await page.evaluate(parseGrid, json.content).catch((e) => ({error: flat(e.message)}));
        const workflowOpen = await page.locator('[data-cy="sidemodal-header"]').count().catch(() => 0);
        const out = {
            as: who, asked: strip(address), status: resp ? resp.status() : null, contentType: resp ? resp.headers()['content-type'] || null : null,
            redirects: chain.length > 1 ? chain : null, landed: strip(page.url()), title: s.title, screen: flat(body, 500),
            json: json ? {status: json.status, keys: Object.keys(json), contentChars: typeof json.content === 'string' ? json.content.length : null, content: typeof json.content === 'string' ? (json.content.includes('<') ? null : json.content.slice(0, 300)) : json.content} : null,
            grid, workflowOpen, sent: asked(phase), server: slog.since(from).slice(0, 6).map((l) => flat(l, 300)), error,
        };
        if (workflowOpen) out.workflowHeader = flat(await page.locator('[data-cy="sidemodal-header"]').first().innerText().catch(() => null), 200);
        fact(`typed-${label}`, out);
        return out;
    }
    const call = (component, q) => ctx(`/$$$call$$$/${component}/fetch-grid?${q}`);
    const REVISIONS = 'grid/files/review/author-review-revisions-grid';
    const ATTACHMENTS = 'grid/files/attachment/author-review-attachments-grid';
    const gridQuery = (sub, round) => `submissionId=${sub.id}&stageId=${round ? round.stageId : 5}${round ? `&reviewRoundId=${round.id}` : ''}`;
    const oldAddresses = async (who, key, sub, round, {full = false} = {}) => {
        if (full) {
            const o = await typed(`${who}-${key}-old-submission`, who, ctx(`/authorDashboard/submission/${sub.id}`));
            if (o.workflowOpen) { phase = `typed:${who}-${key}-old-submission`; await readView(`${who}-${key}-old-submission-view`); }
        }
        await typed(`${who}-${key}-old-round-id`, who, ctx(`/authorDashboard/reviewRoundInfo/${sub.id}`));
        if (!full) return;
        await typed(`${who}-${key}-old-round-noid`, who, ctx('/authorDashboard/reviewRoundInfo'));
        await typed(`${who}-${key}-old-round-query`, who, ctx(`/authorDashboard/reviewRoundInfo?${gridQuery(sub, round)}`));
        await typed(`${who}-${key}-old-round-locale`, who, ctx(`/en/authorDashboard/reviewRoundInfo/${sub.id}`));
    };
    const gridAddresses = async (who, key, sub, round) => {
        await typed(`${who}-${key}-grid-revisions`, who, call(REVISIONS, gridQuery(sub, round)));
        await typed(`${who}-${key}-grid-attachments`, who, call(ATTACHMENTS, gridQuery(sub, round)));
    };

    try {
        // ------------------------------------------------------------------ OPS: no review stage
        if (isOPS) {
            await sect('ops', async () => {
                if (!state) {
                    await app.api.createContext({tag: t, context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`}, users: [
                        {username: u('mgr'), roles: ['manager']}, {username: u('au'), roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                        {username: u('au2'), roles: ['author'], givenName: 'Bea', familyName: 'Otherauthor'}]});
                    let refused = null;
                    try { await app.api.createSubmission({tag: `${t}x`, context: t, submitter: u('au'), reviewRounds: [{reviewers: []}]}); } catch (e) { refused = flat(e.message, 300); }
                    const s = await app.api.createSubmission({tag: `${t}p`, context: t, submitter: u('au'), title: `P preprint ${t}`});
                    state = {t, subs: {P: {id: s.submissionId, rounds: s.reviewRounds || []}}, reviewRoundsKey: refused || 'accepted'};
                    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
                }
                fact('state', state);
                const P = state.subs.P;
                await signInAs('au');
                phase = 'P-author-workflow';
                await openAuthor(P.id);
                await readView('P-author-workflow');
                await oldAddresses('au', 'P', P, null, {full: true});
                await gridAddresses('au', 'P', P, null);
                await signInAs('au2');
                await oldAddresses('au2', 'P', P, null);
                await gridAddresses('au2', 'P', P, null);
                await signInAs('mgr');
                phase = 'P-manager-workflow';
                await openEditor(P.id);
                await readView('P-manager-workflow');
                await oldAddresses('mgr', 'P', P, null);
                await gridAddresses('mgr', 'P', P, null);
                await signOut(page);
                await oldAddresses('anon', 'P', P, null);
                await gridAddresses('anon', 'P', P, null);
            });
            return;
        }

        // ------------------------------------------------------------------ OJS, OMP: seed
        const send = isOMP ? ['skipInternalReview'] : ['sendExternalReview'];
        const stage = isOMP ? {stage: 'external'} : {};
        const comp = isOMP ? 'Book Manuscript' : 'Article Text';
        const RV_FILE = `u26ua1-reviewer-${RUN}.txt`;
        const REV_FILE = `u26ua1-revision-${RUN}.txt`;
        const LEFT_FILE = `u26ua1-left-${RUN}.txt`;
        const INT_FILE = `u26ua1-internal-${RUN}.txt`;
        const textFile = (name) => ({name, mimeType: 'text/plain', buffer: Buffer.from(`u26ua1 ${name}`)});
        if (!state) {
            await app.api.createContext({
                tag: t,
                context: {contactName: `Contact ${t}`, contactEmail: `${t}c@mail.test`},
                review: {defaultReviewMode: 'open'},
                users: [
                    {username: u('ed'), roles: ['editor'], givenName: 'Eda', familyName: 'Editorson'},
                    {username: u('au'), roles: ['author'], givenName: 'Alex', familyName: 'Authorson'},
                    {username: u('au2'), roles: ['author'], givenName: 'Bea', familyName: 'Otherauthor'},
                    {username: u('rv1'), roles: ['externalReviewer'], givenName: 'Rhea', familyName: 'Oneview'},
                ],
            });
            const subs = {};
            const parts = [{username: u('ed'), role: 'editor'}];
            const seed = async (key, submitter, body) => {
                try {
                    const s = await app.api.createSubmission({tag: `${t}${key.toLowerCase()}`, context: t, submitter: u(submitter), title: `${key} round ${t}`, files: [{file: 'article.pdf'}], participants: parts, ...body});
                    subs[key] = {id: s.submissionId, rounds: s.reviewRounds, title: `${key} round ${t}`};
                } catch (e) { fact(`seed-${key}-refused`, flat(e.message, 600)); }
            };
            const rv = (status, extra = {}) => ({username: u('rv1'), status, ...extra});
            await seed('A', 'au', {decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('invited')]}]});
            await seed('C', 'au', {decisions: [...send, 'requestRevisions', 'newExternalReviewRound'], reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('completed', {comments: `u26ua1 seeded remark ${t}`})]}]});
            await seed('B', 'au2', {decisions: [...send, 'requestRevisions'], reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [rv('completed', {comments: `u26ua1 seeded remark B ${t}`})]}]});
            if (isOMP) await seed('I', 'au', {decisions: ['sendInternalReview', 'requestRevisionsInternal'], reviewRounds: [{stage: 'internal', files: [{file: 'notes.md'}], reviewers: []}]});
            // the anonymous-review context (the install's default review mode) and D
            const tn = `${t}n`;
            await app.api.createContext({
                tag: tn,
                context: {contactName: `Contact ${tn}`, contactEmail: `${tn}c@mail.test`},
                users: [
                    {username: `${tn}ed`, roles: ['editor'], givenName: 'Edna', familyName: 'Anoneditor'},
                    {username: `${tn}au`, roles: ['author'], givenName: 'Arno', familyName: 'Anonauthor'},
                    {username: `${tn}rv1`, roles: ['externalReviewer'], givenName: 'Runa', familyName: 'Anonview'},
                ],
            });
            try {
                const s = await app.api.createSubmission({tag: `${tn}d`, context: tn, submitter: `${tn}au`, title: `D round ${tn}`, files: [{file: 'article.pdf'}], participants: [{username: `${tn}ed`, role: 'editor'}],
                    decisions: send, reviewRounds: [{...stage, files: [{file: 'notes.md'}], reviewers: [{username: `${tn}rv1`, status: 'invited'}]}]});
                subs.D = {id: s.submissionId, rounds: s.reviewRounds, title: `D round ${tn}`};
            } catch (e) { fact('seed-D-refused', flat(e.message, 600)); }
            state = {t, tn, subs, built: {}};
            fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
        }
        const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
        fact('state', state);
        const {A, B, C, I, D} = state.subs;
        const ANON_FILE = `u26ua1-anon-reviewer-${RUN}.txt`;
        const roundOf = (sub, n = 0) => sub.rounds[n];

        // The upload wizard, from the press of `button` to "Complete" (or left by "Cancel" after the file is in).
        const wizard = () => page.getByRole('dialog').filter({has: page.locator('.pkp_controller_fileUpload')}).last();
        async function uploadThrough(button, file, {leave = false, label} = {}) {
            await button.first().click();
            await wizard().locator('.pkp_controller_fileUpload').first().waitFor({state: 'attached', timeout: T});
            await idle(page);
            const step1 = await snap(`${label}-wizard-step1`);
            const selects = await wizard().locator('select').evaluateAll((els) => els.map((s) => ({id: s.id.replace(/-?[0-9a-f]{10,}$/, ''), options: [...s.options].map((o) => o.textContent.trim())})));
            const genre = wizard().locator('select[id^="genreId"]');
            if (await genre.count()) await genre.selectOption({label: comp});
            const answered = page.waitForResponse((r) => /upload-file/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
            await wizard().locator('input[type="file"]').first().setInputFiles(file);
            const up = await answered;
            await wizard().locator('.pkp_controller_fileUpload').first().getByText(file.name).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            await idle(page);
            const out = {title: flat(step1.text && step1.text.dialog, 160), selects, upload: up.status()};
            if (leave) {
                const n0 = nativeDialogs.length;
                await snap(`${label}-wizard-file-in`);
                const w = wizard();
                await w.locator('a:visible, button:visible').filter({hasText: /^\s*Cancel\s*$/}).last().click();
                await sleep(2000); // a leave question is real only if it is still there (patterns.md "Probe kit")
                const asking = await page.getByRole('dialog').last().innerText().catch(() => null);
                await snap(`${label}-wizard-after-cancel`);
                out.leave = {nativeDialogs: nativeDialogs.slice(n0), topWindowAfterCancel: flat(asking, 300), wizardStillOpen: await w.isVisible().catch(() => false)};
                await idle(page);
                return out;
            }
            const passed = [];
            for (const next of ['2. Review Details', '3. Confirm']) {
                const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: next, exact: true})}).last();
                await dlg.getByRole('button', {name: 'Continue', exact: true}).click();
                await dlg.getByRole('tab', {name: next, exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
                await idle(page);
                passed.push(next);
            }
            const dlg = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '3. Confirm', exact: true})}).last();
            await dlg.getByRole('button', {name: 'Complete', exact: true}).click();
            await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            await sleep(700);
            return {...out, passed, closed: !(await wizard().isVisible().catch(() => false))};
        }
        const panelTable = (title) => page.getByRole('table', {name: title, exact: true});
        const panelUpload = (title) => page.locator('div')
            .filter({has: page.getByRole('heading', {name: title, exact: true, level: 3})})
            .filter({has: panelTable(title)}).last().getByRole('button', {name: /^Upload( File)?$/});
        const panelRows = async (title) => (await panelTable(title).locator('tbody tr').allInnerTexts().catch(() => [])).map((x) => flat(x, 160));
        const uploadRevisions = () => page.getByRole('button', {name: /^Upload revisions$/i});

        // ------------------------------------------------------------------ build: the review, the decision letter
        // The reviewer's wizard on `key`: accept, step 3 with a file and a remark, "Submit Review".
        async function reviewerReviews(key, sub, file) {
            phase = `${key}-reviewer`;
            await signInAs('rv1');
            const {ReviewWizardPage} = require(path.join(REPO, 'shared/playwright/pages/ReviewerPages.js'));
            const w = new ReviewWizardPage(page, ct, isOMP ? {privateBoxLabel: 'For editor only'} : {});
            await page.goto(ctx(`/reviewer/submission/${sub.id}`));
            await w.expectOpen();
            await w.accept();
            await w.continueToStep3();
            await w.uploadReviewerFile(file);
            await w.typeComments(`u26ua1 shared remark ${ct}`);
            if (!isOMP) await w.chooseRecommendation('Revisions Required');
            await snap(`${key}-reviewer-step3`);
            await w.submitReview();
            await w.expectCompleted();
            await idle(page);
            await snap(`${key}-reviewer-completed`);
            fact(`${key}-reviewer`, {file, asked: asked(phase), oldGridRequests: namesOldGrids(phase)});
        }
        // The editor's "Request Revisions" on `key`, the reviewer's file attached to the author's letter.
        async function requestRevisions(key, sub, file) {
            phase = `${key}-editor-before-decision`;
            await signInAs('ed');
            await openEditor(sub.id, roundOf(sub));
            await readView(`${key}-editor-review-before-decision`);
            phase = `${key}-decision`;
            await page.getByRole('button', {name: 'Request Revisions', exact: true}).first().click();
            const win = page.getByRole('dialog', {name: 'Request Revisions', exact: true});
            await win.getByRole('button', {name: 'Next', exact: true}).waitFor({timeout: T});
            await snap(`${key}-decision-choice`);
            await win.getByRole('button', {name: 'Next', exact: true}).click();
            const DW = require(path.join(REPO, 'apps', app.name, 'playwright/pages/DecisionWizardPages.js'));
            const wiz = new DW.DecisionWizardPage(page);
            const composer = new DW.ComposerPage(page);
            await page.locator('h1').filter({hasText: 'Request Revisions'}).first().waitFor({timeout: T});
            await wiz.awaitComposerLoaded();
            await idle(page);
            let attached;
            try {
                await composer.openAttachWindow();
                const sources = await composer.attachSourceLabels();
                const rf = await composer.openAttachSource('Attach Review Files', DW.REVIEW_FILES_WINDOW);
                const listed = flat(await rf.innerText(), 300);
                await snap(`${key}-decision-attach-review-files`);
                await composer.attachSelected(rf, file, file);
                attached = {sources, listed, chips: (await composer.attachmentChips().allInnerTexts()).map((x) => flat(x, 80))};
            } catch (e) {
                attached = {error: flat(e.message, 400)};
                await snap(`${key}-decision-attach-failed`);
                await page.reload();
                await page.locator('h1').filter({hasText: 'Request Revisions'}).first().waitFor({timeout: T});
                await wiz.awaitComposerLoaded();
            }
            await snap(`${key}-decision-notify-authors`);
            const steps = [flat(await page.locator('h1').first().innerText(), 80)];
            for (let i = 0; i < 4 && !(await wiz.recordButton.isVisible().catch(() => false)); i++) {
                await wiz.continueStep();
                await idle(page);
                await wiz.awaitComposerLoaded();
                steps.push(flat(await page.locator('h1').first().innerText(), 80));
            }
            const posted = page.waitForResponse((r) => /\/decisions/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
            await wiz.recordButton.click();
            const r = await posted;
            await wiz.viewSubmissionLink.waitFor({timeout: T});
            const done = await snap(`${key}-decision-recorded`);
            fact(`${key}-decision`, {attached, steps, status: r.status(), done: flat(done.text && done.text.dialog, 300)});
            return r.status() < 300 && !attached.error;
        }
        if (on('build') && A && !state.built.review) await sect('build-review', async () => {
            await reviewerReviews('A', A, RV_FILE);
            state.built.review = true; saveState();
        });
        if (on('build') && A && state.built.review && !state.built.decision) await sect('build-decision', async () => {
            if (await requestRevisions('A', A, RV_FILE)) { state.built.decision = true; saveState(); }
        });

        // ------------------------------------------------------------------ D: an anonymous review, the reviewer's file before
        // and after the editor attaches it to the letter (what the attachments grid's address answers at each end)
        if (on('anon') && D) await sect('anon', async () => {
            ct = state.tn;
            const RD = roundOf(D);
            if (!state.built.dReview) { await reviewerReviews('D', D, ANON_FILE); state.built.dReview = true; saveState(); }
            if (!state.built.dDecision) {
                await signInAs('au');
                phase = 'D-author-round-before-decision';
                await openAuthor(D.id, RD);
                await readView('D-author-round-before-decision');
                await gridAddresses('au', 'D0', D, RD);
                if (await requestRevisions('D', D, ANON_FILE)) { state.built.dDecision = true; saveState(); }
            }
            await signInAs('au');
            phase = 'D-author-round';
            await openAuthor(D.id, RD);
            await readView('D-author-round');
            await oldAddresses('au', 'D', D, RD);
            await gridAddresses('au', 'D', D, RD);
            await signOut(page);
        });
        ct = t;

        // ------------------------------------------------------------------ the author's round view (UA1-2, UA1-3 traffic)
        if (on('author') && A) await sect('author', async () => {
            await signInAs('au');
            phase = 'A-author-round';
            await openAuthor(A.id, roundOf(A));
            const before = await readView('A-author-round');
            await loc(page, 'author view: the "Notifications" heading (the letters list)', page.getByRole('heading', {name: 'Notifications', exact: true}));
            await loc(page, 'author view: a reviewer row\'s "Read Review"', page.getByRole('button', {name: 'Read Review', exact: true}));
            await loc(page, 'author view: the bottom "Upload revisions" button', uploadRevisions());
            await loc(page, 'author view: the "Revisions Uploaded" table', panelTable('Revisions Uploaded'));

            // the letter under "Notifications"
            const heading = page.getByRole('heading', {name: 'Notifications', exact: true});
            if (await heading.count()) {
                const list = page.locator('div').filter({has: heading}).last();
                const items = (await list.getByRole('listitem').allInnerTexts()).map((x) => flat(x, 160));
                phase = 'A-author-letter';
                await list.getByRole('listitem').first().locator('a').first().click();
                await idle(page); await sleep(600);
                await settled(page, page.getByRole('dialog').last());
                const s = await snap('A-author-letter');
                fact('A-author-letter', {items, window: flat(s.text && s.text.dialog, 500), marks: await legacyMarks(page), asked: asked(phase)});
                await closeTop();
            } else fact('A-author-letter', {items: null, note: 'no "Notifications" heading on the round view'});

            // "Read Review"
            const rr = page.getByRole('button', {name: 'Read Review', exact: true});
            if (await rr.count()) {
                phase = 'A-author-read-review';
                await rr.first().click();
                const modal = page.getByRole('dialog').filter({has: page.locator('form#readReviewForm')});
                await modal.first().waitFor({timeout: T});
                await idle(page); await sleep(800); await idle(page);
                const s = await snap('A-author-read-review');
                fact('A-author-read-review', {window: flat(s.text && s.text.dialog, 700), marks: await legacyMarks(page), asked: asked(phase), oldGridRequests: namesOldGrids(phase)});
                await closeTop();
            } else fact('A-author-read-review', {note: 'no "Read Review" on the round view', reviewersTable: await panelTable('Reviewers').count()});

            // a revised file (once per scratch context)
            if (!state.built.revision) {
                phase = 'A-author-upload';
                const viaButton = await uploadRevisions().first().isVisible().catch(() => false);
                const up = await uploadThrough(viaButton ? uploadRevisions() : panelUpload('Revisions Uploaded'), textFile(REV_FILE), {label: 'A-author-upload'});
                await snap('A-author-after-upload');
                fact('A-author-upload', {via: viaButton ? 'Upload revisions' : 'the panel\'s Upload', ...up, rowsSamePage: await panelRows('Revisions Uploaded'), notices: nativeDialogs.slice(-2), asked: asked(phase), oldGridRequests: namesOldGrids(phase)});
                state.built.revision = true; saveState();
            }
            phase = 'A-author-round-revised';
            await openAuthor(A.id, roundOf(A));
            const after = await readView('A-author-round-revised');
            fact('A-author-revision-rows-after-reload', await panelRows('Revisions Uploaded'));

            // sweep: a second upload left by "Cancel" with its file attached
            phase = 'A-author-leave';
            const offered = {uploadRevisions: await uploadRevisions().first().isVisible().catch(() => false), panelUpload: await panelUpload('Revisions Uploaded').first().isVisible().catch(() => false)};
            if (offered.uploadRevisions || offered.panelUpload) {
                const left = await uploadThrough(offered.uploadRevisions ? uploadRevisions() : panelUpload('Revisions Uploaded'), textFile(LEFT_FILE), {leave: true, label: 'A-author-leave'});
                await sleep(800); await idle(page);
                const s = await snap('A-author-after-leave');
                const same = await panelRows('Revisions Uploaded');
                await openAuthor(A.id, roundOf(A));
                await snap('A-author-after-leave-reloaded');
                fact('A-author-leave', {offered, ...left, notices: s.notices, rowsSamePage: same, rowsAfterReload: await panelRows('Revisions Uploaded'), asked: asked(phase)});
            } else fact('A-author-leave', {offered, note: 'no upload control offered after the first revised file'});
            fact('A-author-headings', {before: before.view.headings, after: after.view.headings});

            // C: the author's view of each of two rounds (seeded "Request Revisions", then a new round)
            if (C) for (const [n, round] of C.rounds.entries()) {
                phase = `C-author-round${n + 1}`;
                await openAuthor(C.id, round);
                await readView(`C-author-round${n + 1}`);
            }
            // I (OMP): the Internal Review round, its revised file
            if (I) {
                phase = 'I-author-round';
                await openAuthor(I.id, roundOf(I));
                await readView('I-author-round');
                if (!state.built.internal) {
                    phase = 'I-author-upload';
                    const viaButton = await uploadRevisions().first().isVisible().catch(() => false);
                    const up = await uploadThrough(viaButton ? uploadRevisions() : panelUpload('Revisions Uploaded'), textFile(INT_FILE), {label: 'I-author-upload'}).catch((e) => ({error: flat(e.message, 300)}));
                    await snap('I-author-after-upload');
                    fact('I-author-upload', {via: viaButton ? 'Upload revisions' : 'the panel\'s Upload', ...up, rowsSamePage: await panelRows('Revisions Uploaded'), asked: asked(phase)});
                    if (!up.error) { state.built.internal = true; saveState(); }
                    phase = 'I-author-round-revised';
                    await openAuthor(I.id, roundOf(I));
                    await readView('I-author-round-revised');
                }
            }
        });

        // ------------------------------------------------------------------ the editor's round view (control for UA1-3)
        if (on('editor') && A) await sect('editor', async () => {
            await signInAs('ed');
            phase = 'A-editor-round';
            await openEditor(A.id, roundOf(A));
            await readView('A-editor-round');
            // the editor's "Read Review" window, on B (a seeded completed review; A's row offers "Revert Decision" by now)
            if (B) {
                phase = 'B-editor-round';
                await openEditor(B.id, roundOf(B));
                const v = await readView('B-editor-round');
                const rr = page.getByRole('button', {name: 'Read Review', exact: true});
                if (await rr.count()) {
                    phase = 'B-editor-read-review';
                    await rr.first().click();
                    await page.getByRole('dialog', {name: /^Review Details/}).first().waitFor({timeout: T}).catch(() => {});
                    await idle(page); await sleep(800); await idle(page);
                    const s = await snap('B-editor-read-review');
                    fact('B-editor-read-review', {window: flat(s.text && s.text.dialog, 500), marks: await legacyMarks(page), asked: asked(phase), oldGridRequests: namesOldGrids(phase)});
                    await closeTop();
                } else fact('B-editor-read-review', {note: 'no "Read Review" on the editor\'s row', reviewers: (v.view.tables || []).find((x) => x.name === 'Reviewers')});
            }
        });

        // ------------------------------------------------------------------ the addresses a role types (UA1-1, UA1-3)
        if (on('typed') && A) await sect('typed', async () => {
            const RA = roundOf(A);
            await signInAs('au');
            await oldAddresses('au', 'A', A, RA, {full: true});
            await gridAddresses('au', 'A', A, RA);
            if (C) for (const [n, round] of C.rounds.entries()) await gridAddresses('au', `C${n + 1}`, C, round);
            if (I) { await oldAddresses('au', 'I', I, roundOf(I)); await gridAddresses('au', 'I', I, roundOf(I)); }
            if (B) { await oldAddresses('au', 'B', B, roundOf(B)); await gridAddresses('au', 'B', B, roundOf(B)); }
            await signInAs('au2');
            await oldAddresses('au2', 'A', A, RA);
            await gridAddresses('au2', 'A', A, RA);
            if (I) await gridAddresses('au2', 'I', I, roundOf(I));
            if (B) { await oldAddresses('au2', 'B', B, roundOf(B), {full: true}); await gridAddresses('au2', 'B', B, roundOf(B)); }
            await signInAs('ed');
            await oldAddresses('ed', 'A', A, RA);
            await gridAddresses('ed', 'A', A, RA);
            await signInAs('rv1');
            await oldAddresses('rv1', 'A', A, RA);
            await gridAddresses('rv1', 'A', A, RA);
            await signOut(page);
            await oldAddresses('anon', 'A', A, RA);
            await gridAddresses('anon', 'A', A, RA);
        });
    } finally {
        const sfx = process.env.REUSE ? `-${PHASES.join('-')}` : '';
        fact(`old-grid-requests-outside-typed${sfx}`, namesOldGrids().filter((x) => !x.startsWith('typed:')));
        fact(`native-dialogs${sfx}`, nativeDialogs.map((d) => ({type: d.type, message: flat(d.message, 200)})));
        record(process.env.REUSE ? `traffic-${PHASES.join('-')}` : 'traffic', traffic);
        await close();
    }
});
