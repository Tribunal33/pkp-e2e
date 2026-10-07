// U40 claim check, chunk I07 (housekeeping 2026-10-07): incidentals rows 47 and 48 (.reports/hk07/chunks/U40.md).
// Spec: docs/specs/U40-publication-metadata.md — Actors "Change the submission language", Rule 13a/13b/13c,
// scenario 6's "An article in an unpublished issue" bullet, register OJS1, A5's closing sentence, A15
// (footnotes f-ojs1, f-a15).
//
// Seeds its own bilingual (English + French (Canada), both submission languages) scratch context per app and
// run, with a throwaway manager "Mona Manager" and author "Ada Author", and drives everything as the manager.
// Phases (PHASES=ojs1,stage,type; default all):
//   ojs1   {OJS} row 47. Journal seeded with the unpublished issue "Vol. 2 No. 1 (2015)"; a second future
//          issue "Vol. 9 No. 9 (2099)" made on Issues › Future Issues › "Create Issue". Four items at
//          Production: F published with "Assign To Future Issue and Publish Immediately" into 2015, N into
//          2099, Z with "Don't Assign To An Issue" (control), S scheduled with "Assign To Future Issue and
//          Schedule Only" into 2015 (A5's state). Each: the readout and "Change" on Title & Abstract,
//          Contributors and Metadata, "Status", what is stored; where "Change" shows: French (Canada), Title
//          (+ Abstract), "Confirm"; reload.
//   stage  {OJS OMP OPS} row 47's other trigger: a first version published under each Publication Stage the
//          app offers (OJS, OMP: Author Original, Published Manuscript Under Review, Version of Record; OPS:
//          Author Original, its only one), no issue. Same reads and Confirm as above. Sweep: on the first
//          item, Title & Abstract's English title typed and left unsaved by the side menu's "Metadata".
//   type   {OJS OMP OPS} row 48. Three unpublished one-version items: E1 "Change", French (Canada) picked as
//          soon as the choices show, the Title clicked and typed from the keyboard at once (no throttling);
//          E2 the same with the browser's network throttled (8 kbit/s down, 1000 up) from the press of
//          "Change" until the typing ends; E3 throttled the same way, the pick made once the subtitle shows
//          the title (the publication loaded, A15's cause gone) and the typing at once, before the editor
//          has started; C (control) the pick and the typing only once the panel's
//          subtitle shows the title and the editors are initialized. Each: the panel's boxes right after the
//          typing and once settled, "Confirm" (the Abstract typed first where it is empty and initialized),
//          the changeLocale request's title, the stored titles.
// Run twice, one app and one phase per process (a whole OJS run takes about 15 min; each process seeds its own
// context, so phases and apps run side by side):
//   PHASES=stage PROBE_RUN=r1stage PROBE_FEATURE=U40 PROBE_AGENT=ccI07 node bin/probe.js ojs shared/playwright/checks/U40/I07/i07.js
//   (PHASES=ojs1 on ojs only; PHASES=stage|type on ojs, omp, ops; then the same under r2…). Facts:
//   i07-facts-<run>-<app>.json; snapshots i07-<phase>-…-<run>-<app>.
// No assertions: the script records, the reader judges. psql reads are evidence only.
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, sql} = require('../../../probe');
const {changeLanguage} = require('../../issues/change-language-offered-then-refused/lib');
const {throttle, panelState, typeInto} = require('../../issues/language-panel-early-pick-keeps-old-title/lib');

const PHASES = (process.env.PHASES || 'ojs1,stage,type').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const PUBLISH_RE = /^(Schedule For Publication|Publish|Post)$/;
const UNPUB_RE = /^(Unpublish|Unpost|Unschedule)$/;
const WINDOW_RE = /Are you sure you want to|requirements must be met|requirements have been met|All requirements/;
const SLOW = {kbitDown: 8, kbitUp: 1000, latency: 0};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs', isOPS = app.name === 'ops';
    const T0 = Date.now();
    const log = (...a) => console.log(`[i07 ${process.env.PROBE_RUN || '-'} ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record('i07-facts', {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const q = (query) => { try { return sql(app, query); } catch (e) { return `SQL ERROR ${flat(e.message, 300)}`; } };

    const t = tag('u40i07');
    const people = [
        {username: `${t}mg`, givenName: 'Mona', familyName: 'Manager', email: `${t}mg@mail.test`, roles: ['manager']},
        {username: `${t}au`, givenName: 'Ada', familyName: 'Author', email: `${t}au@mail.test`, roles: ['author']},
    ];
    const ctx = await app.api.createContext({
        tag: t,
        users: people,
        context: {name: {en: `U40 I07 ${t}`}, acronym: 'UI07', contactName: 'Pat Principal', contactEmail: `${t}pc@mail.test`,
            primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        ...(isOJS ? {issues: [{volume: 2, number: 1, year: 2015}]} : {}),
    });
    const C = ctx.path || t;
    fact('context', {path: C, issues: ctx.issues || null});
    const PROD = isOPS ? {} : {decisions: ['skipExternalReview', 'sendToProduction']};
    const mkSub = async (k, extra = {}) => {
        const title = `I07 ${k} ${t}`;
        const r = await app.api.createSubmission({tag: `${t}${k}`, context: C, submitter: `${t}au`, title, ...extra});
        return {id: r.submissionId, title};
    };

    const {page, close} = await launch(app);
    const traffic = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u)) return;
        const m = r.request().headers()['x-http-method-override'] || r.request().method();
        traffic.push({at: Date.now(), m, url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status(),
            body: m !== 'GET' && r.status() >= 400 ? await r.text().then((b) => b.slice(0, 300)).catch(() => null) : undefined});
    });
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({at: Date.now(), type: d.type(), message: d.message().slice(0, 200)});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const writesSince = (t0) => traffic.filter((x) => x.at >= t0 && x.m !== 'GET').map(({at, ...x}) => x);
    const badSince = (t0) => traffic.filter((x) => x.at >= t0 && x.status >= 400).map(({at, ...x}) => x);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 300)}; }
        if (extra) s.facts = extra;
        record(`i07-${name}`, s);
        await shot(page, `i07-${name}`).catch(() => {});
        return s;
    }
    async function gotoWorkflow(sid) {
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${C}/en/dashboard/editorial?workflowSubmissionId=${sid}`)).catch(() => {});
        await idle(page).catch(() => {});
        await wf().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
        await idle(page).catch(() => {});
    }
    async function openEntry(name) {
        const d = wf();
        const entry = d.getByRole('link', {name, exact: true}).first();
        if (!(await entry.isVisible().catch(() => false))) {
            const group = d.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
            if (await group.count()) { await group.click().catch(() => {}); await idle(page).catch(() => {}); }
        }
        if (!(await entry.isVisible().catch(() => false))) return false;
        await entry.click();
        await d.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name}$`)}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1200);
        return true;
    }
    async function readout() {
        const line = page.getByText('Current Submission Language:', {exact: false}).first();
        const present = (await line.count()) > 0 && (await line.isVisible().catch(() => false));
        const text = present ? flat(await line.locator('xpath=..').innerText().catch(() => null), 120) : null;
        const btn = page.getByRole('button', {name: 'Change', exact: true});
        const n = await btn.count().catch(() => 0);
        const change = n ? {present: true, enabled: await btn.first().isEnabled().catch(() => null)} : {present: false};
        const left = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);
        const right = flat(await controls().innerText().catch(() => null), 200);
        return {readout: text, change, controlsLeft: left, controlsRight: right};
    }
    // "pubId|publication status|version stage|[issue|issue published|]submission status|submission locale"
    const stored = (sid) => q(isOJS
        ? `select p.publication_id, p.status, coalesce(p.version_stage,'-'), coalesce(p.issue_id::text,'-'), coalesce(i.published::text,'-'), s.status, s.locale from publications p join submissions s using (submission_id) left join issues i on i.issue_id = p.issue_id where p.submission_id = ${sid}`
        : `select p.publication_id, p.status, coalesce(p.version_stage,'-'), s.status, s.locale from publications p join submissions s using (submission_id) where p.submission_id = ${sid}`);
    const titles = (sid) => q(`select ps.locale || '=' || left(ps.setting_value, 90) from publication_settings ps join submissions s on s.current_publication_id = ps.publication_id where s.submission_id = ${sid} and ps.setting_name = 'title' order by 1`).split('\n');

    // ---- publish through the screens (panel or version window, then the confirmation window)
    const stageBox = () => page.locator('[data-cy="active-modal"], [role="dialog"]').filter({has: page.locator('select[name="versionStage"]:visible')}).last();
    const windowLoc = () => page.getByRole('dialog').filter({hasText: WINDOW_RE}).last();
    async function fillStage(box, stage, o) {
        const sel = box.locator('select[name="versionStage"]');
        o.stageOptions = await sel.evaluate((s) => [...s.options].map((x) => `${x.value}:${x.innerText.trim()}`)).catch(() => null);
        await sel.selectOption(stage).catch((e) => { o.stageErr = flat(e.message, 150); });
        await sleep(300);
        const minor = box.locator('select[name="versionIsMinor"]');
        if (await minor.count()) await minor.selectOption('false').catch((e) => { o.minorErr = flat(e.message, 150); });
    }
    /** `assign`: null (leave), 'none' ("Don't Assign To An Issue"), {radio, issue: RegExp}. */
    async function publish(name, stage, assign) {
        const o = {stage};
        const button = controls().getByRole('button', {name: PUBLISH_RE}).first();
        await button.waitFor({timeout: T}).catch(() => {});
        o.label = flat(await button.innerText().catch(() => null), 60);
        await sleep(800);
        await button.click();
        const any = stageBox().or(windowLoc()).first();
        if (!(await any.waitFor({state: 'visible', timeout: 8000}).then(() => true).catch(() => false))) {
            o.retried = true; await button.click().catch(() => {});
            await any.waitFor({state: 'visible', timeout: T}).catch(() => {});
        }
        await idle(page).catch(() => {}); await sleep(1200);
        if (await stageBox().isVisible().catch(() => false)) {
            const box = stageBox();
            const radios = box.locator('input[name="assignment"]');
            if (await radios.count()) {
                await box.locator('input[name="assignment"]:checked').first().waitFor({state: 'attached', timeout: 10_000}).catch(() => {});
                await sleep(500);
                if (assign === 'none') await box.getByRole('radio', {name: "Don't Assign To An Issue"}).check().catch((e) => { o.assignErr = flat(e.message, 150); });
                else if (assign && assign.radio) {
                    await box.getByRole('radio', {name: assign.radio}).check().catch((e) => { o.assignErr = flat(e.message, 150); });
                    const sel = box.locator('select[name="issueId"]').first();
                    await sel.waitFor({state: 'visible', timeout: T}).catch(() => {});
                    const opt = sel.locator('option').filter({hasText: assign.issue});
                    await opt.first().waitFor({state: 'attached', timeout: T}).catch(() => {});
                    await sel.selectOption((await opt.first().getAttribute('value').catch(() => '')) || '').catch((e) => { o.issueErr = flat(e.message, 150); });
                }
            }
            await fillStage(box, stage, o);
            await snap(`${name}-panel`, {o});
            const t0 = Date.now();
            await box.getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { o.panelConfirmErr = flat(e.message, 150); });
            await windowLoc().waitFor({timeout: 20_000}).catch(() => {});
            await idle(page).catch(() => {}); await sleep(900);
            o.panelWrites = writesSince(t0);
        }
        const w = windowLoc();
        if (!(await w.isVisible().catch(() => false))) { o.noWindow = true; await snap(`${name}-nowindow`, {o}); return o; }
        if (await w.locator('select[name="versionStage"]').count()) await fillStage(w, stage, o);
        o.window = flat(await w.innerText().catch(() => null), 700);
        const buttons = await w.locator('button:visible').allInnerTexts().catch(() => []);
        const b = buttons.map((x) => x.trim()).find((x) => PUBLISH_RE.test(x));
        await snap(`${name}-window`, {o});
        if (!b) { o.confirmed = false; await w.getByRole('button', {name: /^(Cancel|Close)$/}).last().click().catch(() => {}); return o; }
        const t1 = Date.now();
        const resp = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: b, exact: true}).click();
        const r = await resp;
        o.pressed = b; o.publishStatus = r ? r.status() : null;
        await controls().getByRole('button', {name: UNPUB_RE}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(900);
        o.writes = writesSince(t1);
        return o;
    }

    /** Readout on several Publication pages; then, where "Change" shows, the full change; reload. */
    async function readAndTry(name, sub, pages) {
        const out = {sid: sub.id};
        out.pages = {};
        for (const p of pages) {
            await gotoWorkflow(sub.id);
            out.pages[p] = {opened: await openEntry(p)};
            Object.assign(out.pages[p], await readout());
            await snap(`${name}-${p.replace(/\W+/g, '')}`, {readout: out.pages[p]});
        }
        // a stage screen
        await gotoWorkflow(sub.id);
        const stageLink = wf().getByRole('link', {name: isOPS ? 'Production' : 'Production', exact: true}).last();
        if (await stageLink.isVisible().catch(() => false)) {
            await stageLink.click().catch(() => {});
            await idle(page).catch(() => {}); await sleep(800);
            out.stageScreen = await readout();
            await snap(`${name}-stage`, {readout: out.stageScreen});
        }
        out.stored = stored(sub.id);
        await gotoWorkflow(sub.id);
        await openEntry('Title & Abstract');
        const r = await readout();
        if (r.change.present && r.change.enabled) {
            let n = 0;
            const t0 = Date.now();
            out.change = await changeLanguage(page, {title: sub.title, language: 'French (Canada)', words: `Titre ${t} ${name}`,
                snap: async (st) => snap(`${name}-change-${String(++n).padStart(2, '0')}-${st}`)});
            out.changeBad = badSince(t0);
            await gotoWorkflow(sub.id);
            await openEntry('Title & Abstract');
            out.afterReload = await readout();
            await snap(`${name}-reloaded`, {readout: out.afterReload});
            out.storedAfter = stored(sub.id);
            out.titlesAfter = titles(sub.id);
        }
        return out;
    }

    try {
        await signIn(page, `${t}mg`, {contextPath: C});

        if (on('ojs1') && isOJS) {
            const F = await mkSub('F', PROD), N = await mkSub('N', PROD), Z = await mkSub('Z', PROD), S = await mkSub('S', PROD);
            fact('ojs1Subs', {F, N, Z, S});
            // The footnote's route: a future issue made on Issues › Future Issues › "Create Issue".
            const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
            const issues = new IssuesAdmin(page, C);
            const made = await (async () => {
                await issues.goto('Future Issues');
                const {form} = await issues.openCreate();
                await form.volumeBox().fill('9');
                await form.numberBox().fill('9');
                await form.yearBox().fill('2099');
                await form.titleBox().fill('I07 Future Issue');
                const r = await form.save();
                return r ? r.status() : null;
            })().catch((e) => `error ${flat(e.message, 300)}`);
            fact('issueCreated', made);
            await snap('ojs1-issues-future');
            fact('issuesStored', q(`select issue_id, volume, number, year, published from issues where journal_id = (select journal_id from journals where path = '${C}') order by 1`));

            for (const [k, sub, assign] of [
                ['F', F, {radio: 'Assign To Future Issue and Publish Immediately', issue: /Vol\. 2 No\. 1 \(2015\)/}],
                ['N', N, {radio: 'Assign To Future Issue and Publish Immediately', issue: /Vol\. 9 No\. 9 \(2099\)/}],
                ['Z', Z, 'none'],
            ]) {
                await gotoWorkflow(sub.id);
                await openEntry('Title & Abstract');
                const before = await readout();
                const pub = await publish(`ojs1-${k}`, 'VoR', assign);
                const after = await readout();
                await snap(`ojs1-${k}-published`, {after});
                fact(`ojs1${k}`, {before, publish: pub, after, read: await readAndTry(`ojs1-${k}`, sub, ['Title & Abstract', 'Contributors', 'Metadata'])});
                if (k !== 'Z') {
                    await page.goto(app.url(`/index.php/${C}/article/view/${sub.id}`)).catch(() => {});
                    const s = await snap(`ojs1-${k}-article-page`);
                    fact(`ojs1${k}ArticlePage`, flat((s.text && (s.text.main || s.text.body)) || '', 300));
                }
            }
            // A5's state: "Assign To Future Issue and Schedule Only" (Publication Settings saved first, then the panel).
            await gotoWorkflow(S.id);
            const sched = await (async () => {
                const o = {};
                await openEntry('Publication Settings');
                const radio = wf().getByRole('radio', {name: 'Assign To Future Issue and Schedule Only'});
                await radio.waitFor({timeout: T});
                await radio.check();
                const sel = wf().locator('select[name="issueId"]').first();
                await sel.waitFor({state: 'visible', timeout: T});
                const opt = sel.locator('option').filter({hasText: /Vol\. 2 No\. 1 \(2015\)/});
                await sel.selectOption((await opt.first().getAttribute('value')) || '');
                const t0 = Date.now();
                await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
                await idle(page).catch(() => {}); await sleep(1200);
                o.settingsSave = writesSince(t0);
                await openEntry('Title & Abstract');
                o.publish = await publish('ojs1-S', 'VoR', {radio: 'Assign To Future Issue and Schedule Only', issue: /Vol\. 2 No\. 1 \(2015\)/});
                return o;
            })().catch((e) => ({error: flat(e.message, 300)}));
            const afterS = await readout();
            await snap('ojs1-S-scheduled', {afterS});
            fact('ojs1S', {schedule: sched, after: afterS, read: await readAndTry('ojs1-S', S, ['Title & Abstract'])});
        }

        if (on('stage')) {
            const stages = isOPS ? ['AO'] : ['AO', 'PMUR', 'VoR'];
            for (const st of stages) {
                // A PMUR version needs a review round to publish (U49 Rule 7): that item goes through review.
                const sub = await mkSub(`V${st}`, st === 'PMUR' && isOJS ? {decisions: ['sendExternalReview', 'accept', 'sendToProduction']} : PROD);
                await gotoWorkflow(sub.id);
                await openEntry('Title & Abstract');
                const before = await readout();
                const pub = await publish(`stage-${st}`, st, isOJS ? 'none' : null);
                const after = await readout();
                await snap(`stage-${st}-published`, {after});
                const read = await readAndTry(`stage-${st}`, sub, ['Title & Abstract', 'Contributors']);
                read.dashboard = await (async () => {
                    await page.goto(app.url(`/index.php/${C}/en/dashboard/editorial`)).catch(() => {});
                    await idle(page).catch(() => {}); await sleep(800);
                    const s = await snap(`stage-${st}-dashboard`);
                    return flat((s.text && s.text.main) || '', 600);
                })();
                fact(`stage${st}`, {sub, before, publish: pub, after, read});
                if (st === stages[0]) {
                    // Sweep: a Publication page left with an unsaved edit by the side menu.
                    await gotoWorkflow(sub.id);
                    await openEntry('Title & Abstract');
                    const id = await page.evaluate(() => (window.tinymce?.get() || []).map((e) => e.id).find((i) => /titleAbstract-title-control-en$/.test(i))).catch(() => null);
                    const sweep = {editor: id};
                    if (id) {
                        await page.frameLocator(`#${id}_ifr`).locator('body').click().catch(() => {});
                        await page.keyboard.press('End');
                        await page.keyboard.type(' unsaved');
                        const d0 = dialogs.length, t0 = Date.now();
                        await openEntry('Metadata');
                        await sleep(2000);
                        sweep.dialogs = dialogs.slice(d0);
                        sweep.writes = writesSince(t0);
                        sweep.heading = flat(await wf().getByRole('heading').first().innerText().catch(() => null), 80);
                        await snap(`stage-${st}-left-unsaved`, {sweep});
                        await openEntry('Title & Abstract');
                        sweep.titleBack = await page.evaluate((i) => window.tinymce?.get(i)?.getContent({format: 'text'}), id).catch(() => null);
                        await gotoWorkflow(sub.id);
                        await openEntry('Title & Abstract');
                        sweep.titleReloaded = await page.evaluate(() => { const e = (window.tinymce?.get() || []).find((x) => /titleAbstract-title-control-en$/.test(x.id)); return e ? e.getContent({format: 'text'}) : null; }).catch(() => null);
                    }
                    fact(`sweep${st}`, sweep);
                }
            }
        }

        if (on('type')) {
            const cdp = await page.context().newCDPSession(page);
            const panel = () => page.getByRole('dialog', {name: /Change Submission Language/i});
            const subtitleShows = (title) => page.waitForFunction((tt) => {
                const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
                return !!d && !!(document.getElementById(d.getAttribute('aria-describedby')) || {}).textContent?.includes(tt);
            }, title, {timeout: 60_000}).then(() => true).catch(() => false);
            const editorsReady = () => page.waitForFunction(() => {
                const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Change Submission Language/i.test((document.getElementById(x.getAttribute('aria-labelledby')) || {}).textContent || ''));
                const eds = d ? (window.tinymce?.get() || []).filter((e) => d.contains(e.getElement())) : [];
                return eds.length > 0 && eds.every((e) => e.initialized);
            }, undefined, {timeout: 60_000}).then(() => true).catch(() => false);
            const titleEditor = () => page.evaluate(() => {
                const e = (window.tinymce?.get() || []).find((x) => /changeSubmissionLanguageMetadata-title-control/.test(x.id) && x.getElement().isConnected);
                return e ? {id: e.id, initialized: !!e.initialized, content: e.initialized ? e.getContent({format: 'text'}) : null} : null;
            }).catch(() => null);
            for (const mode of ['E1', 'E2', 'E3', 'C']) {
                const sub = await mkSub(`T${mode}`);
                const o = {sub, mode, throttled: mode === 'E2' || mode === 'E3'};
                const typed = `Titre tape ${mode} ${t}`;
                const reqs = [];
                const onReq = (rq) => { if (/changeLocale/.test(rq.url())) reqs.push({method: rq.headers()['x-http-method-override'] || rq.method(), body: flat(rq.postData(), 1200)}); };
                page.on('request', onReq);
                try {
                    await gotoWorkflow(sub.id);
                    await openEntry('Title & Abstract');
                    o.before = await readout();
                    await snap(`type-${mode}-1-title-abstract`);
                    if (o.throttled) await throttle(cdp, SLOW);
                    const tc = Date.now();
                    await page.getByRole('button', {name: 'Change', exact: true}).first().click();
                    const french = panel().getByRole('radio', {name: /French|Français/});
                    await french.waitFor({state: 'visible', timeout: 120_000}).catch(() => {});
                    o.choicesAfterMs = Date.now() - tc;
                    if (mode === 'C' || mode === 'E3') { o.subtitleBeforePick = await subtitleShows(sub.title); }
                    const atPick = await panelState(page);
                    o.atPick = {subtitle: atPick.subtitle, editors: atPick.editors};
                    await french.check({timeout: T}).catch((e) => { o.pickErr = flat(e.message, 150); });
                    o.pickedAtMs = Date.now() - tc;
                    if (mode === 'C') { o.editorsReadyBeforeType = await editorsReady(); }
                    // Type into the Title from the keyboard: click into its box as soon as it exists.
                    const frame = panel().locator('iframe[id*="changeSubmissionLanguageMetadata-title-control"]').first();
                    await frame.waitFor({state: 'attached', timeout: 120_000}).catch(() => {});
                    o.frameAtMs = Date.now() - tc;
                    o.titleAtTypeStart = await titleEditor();
                    const id = o.titleAtTypeStart ? o.titleAtTypeStart.id : await frame.getAttribute('id').then((x) => x && x.replace(/_ifr$/, '')).catch(() => null);
                    o.typeStartMs = Date.now() - tc;
                    if (id) await typeInto(page, id, typed).catch((e) => { o.typeErr = flat(e.message, 200); });
                    o.typeEndMs = Date.now() - tc;
                    o.titleAtTypeEnd = await titleEditor();
                    o.rightAfterTyping = await panelState(page);
                    await snap(`type-${mode}-2-typed`, {o});
                    if (o.throttled) await throttle(cdp, null);
                    o.subtitleSettled = await subtitleShows(sub.title);
                    o.editorsSettled = await editorsReady();
                    await idle(page).catch(() => {}); await sleep(800);
                    o.settled = await panelState(page);
                    await snap(`type-${mode}-3-settled`, {o});
                    // An empty Abstract (journal, preprint server) typed after init, so the Confirm turns on the Title.
                    for (const e of o.settled.editors || []) {
                        if (/abstract/i.test(e.id) && e.initialized && !flat((e.content || '').replace(/<[^>]+>/g, ''))) {
                            await typeInto(page, e.id, `Resume ${mode} ${t}`);
                            o.abstractTyped = true;
                        }
                    }
                    const t0 = Date.now();
                    const reloaded = page.waitForEvent('load', {timeout: 20_000}).then(() => true).catch(() => false);
                    await panel().getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { o.confirmErr = flat(e.message, 150); });
                    o.reloaded = await reloaded;
                    await idle(page).catch(() => {}); await sleep(800);
                    o.requests = reqs.slice();
                    o.writes = writesSince(t0);
                    if (!o.reloaded) {
                        const st = await panelState(page);
                        o.panelAfterConfirm = {open: st.open, text: st.text && st.text.slice(0, 1200)};
                        await snap(`type-${mode}-4-refused`, {o});
                        if (st.open) await panel().getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                    } else {
                        await page.getByText('Current Submission Language:', {exact: false}).first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                        await idle(page).catch(() => {});
                        o.after = await readout();
                        await snap(`type-${mode}-4-reloaded`, {o});
                    }
                    o.storedTitles = titles(sub.id);
                    o.submissionLocale = q(`select locale from submissions where submission_id = ${sub.id}`);
                } catch (e) {
                    o.error = flat(e.stack, 800);
                    await throttle(cdp, null).catch(() => {});
                    await snap(`type-${mode}-error`).catch(() => {});
                } finally {
                    page.off('request', onReq);
                }
                fact(`type${mode}`, o);
            }
            await loc(page, 'Title & Abstract: "Change" beside the language readout', page.getByRole('button', {name: 'Change', exact: true}));
        }
        fact('dialogs', dialogs.map(({at, ...d}) => d));
    } catch (e) {
        fact('error', flat(e.stack, 1500));
        await snap('error').catch(() => {});
    } finally {
        await close();
    }
});
