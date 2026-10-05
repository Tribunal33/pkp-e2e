// Issue report docs/issues/U40-A21-review-round-taken-from-other-version.md (U40 A21): saving a
// version's "Associated review round" with a round another version holds is accepted, and the
// other version (here the published one) silently loses the round.
// Takes the report's Steps on PKP's default test dataset, OJS submission 1 (version 1.0
// published with review round 1, version 1.1 unpublished), as dbarnes in two tabs of one browser:
//   A: 1.0's "Issue" page, untick round 1, "Save"      B: 1.1's "Issue" page (round 1 offered)
//   A: tick round 1 again, "Save"                      B (not reloaded): tick round 1, "Save"
//   then both versions' "Issue" pages afresh.
// Modes (first argument):
//   steps (default)  the Steps above.
//   nb               what a fix must leave alone, on a fresh reset: a round no version holds is
//                    still taken. A: 1.0 untick round 1, "Save"; B opened afterwards: 1.1 tick
//                    round 1, "Save" (accepted), both pages afresh.
// stable-3_5_0 (PKP_E2E_LINE): records whether a version's "Issue" tab has the control at all.
// Only OJS has the control (WorkflowPublicationForm adds it to the OJS "Issue" form only).
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=fix|nb-in|nb-out] ONLY=ojs node bin/probe.js ojs shared/playwright/checks/issues/review-round-taken-from-other-version/walk.js [steps|nb]
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
const T = 30_000;
const SID = 1;
const LABEL = 'Associated review round';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

function frame(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath);
}

/** Which version each review round belongs to (a read for the facts, not a step). */
function rounds(app) {
    return sql(app, `select review_round_id, round, coalesce(publication_id::text, 'none') from review_rounds where submission_id = ${SID} order by review_round_id`)
        .split('\n').filter(Boolean).map((l) => { const [id, round, pub] = l.split('|'); return {id: Number(id), round: Number(round), publicationId: pub}; });
}

/** A version's "Issue" page by the workflow address its menu entry sets. */
async function openIssue(page, app, publicationId) {
    const wf = frame(page, app);
    await wf.gotoEditorial(SID, {menuKey: `publication_${publicationId}_issue`});
    await idle(page).catch(() => {});
    await wf.dialog().getByRole('heading', {name: 'Publication: Issue'}).first().waitFor({timeout: T}).catch(() => {});
    await wf.dialog().getByRole('combobox', {name: LABEL}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return wf;
}

/** The control as shown: the trigger's text, and each option with its ticked / disabled state. */
async function control(page, wf) {
    const box = wf.dialog().getByRole('combobox', {name: LABEL}).first();
    if (!(await box.count())) return {shown: false};
    const out = {shown: true, text: flat(await box.innerText()), disabled: await box.isDisabled()};
    if (out.disabled) return out;
    await box.click();
    const opts = page.getByRole('option');
    await opts.first().waitFor({timeout: T}).catch(() => {});
    out.options = [];
    for (let i = 0; i < (await opts.count()); i++) {
        const o = opts.nth(i);
        out.options.push({
            label: flat(await o.innerText(), 80),
            disabled: (await o.getAttribute('data-disabled')) !== null || (await o.getAttribute('aria-disabled')) === 'true',
            selected: (await o.getAttribute('aria-selected')) === 'true' || (await o.getAttribute('data-state')) === 'checked',
        });
    }
    await closeList(page, wf);
    return out;
}

/** Close the open list by pressing on the field's own description (outside the list). */
async function closeList(page, wf) {
    await wf.dialog().getByText(/^Link this version to the review round/).first().click({force: true}).catch(() => {});
    await page.getByRole('listbox').waitFor({state: 'hidden', timeout: 5_000}).catch(() => {});
    await sleep(300);
}

/** Press "Round 1 …" in the list (ticks or unticks it), then close the list. */
async function toggleRound(page, wf, round) {
    const box = wf.dialog().getByRole('combobox', {name: LABEL}).first();
    await box.click();
    const opt = page.getByRole('option', {name: new RegExp(`^Round ${round}\\b`)}).first();
    await opt.waitFor({timeout: T});
    const disabled = (await opt.getAttribute('data-disabled')) !== null;
    if (!disabled) await opt.click();
    await closeList(page, wf);
    return {pressed: !disabled, text: flat(await box.innerText())};
}

/** The Issue form's "Save": the publication's write and its answer, and any message shown. */
async function save(page, wf) {
    const form = wf.dialog().locator('form').filter({has: page.getByRole('combobox', {name: LABEL})}).first();
    const answer = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const body = r ? await r.text().catch(() => null) : null;
    await idle(page).catch(() => {});
    await sleep(1200);
    const errs = await form.locator('.pkpFormField__error, [id$="-error"]').allInnerTexts().catch(() => []);
    return {
        request: r ? `${r.request().method()} ${new URL(r.url()).pathname.replace(/^.*\/api\//, '/api/')}` : null,
        status: r ? r.status() : null,
        body: r && !r.ok() ? flat(body, 300) : undefined,
        sentReviewRoundIds: r ? (() => { try { return JSON.parse(r.request().postData() || '{}').reviewRoundIds; } catch (e) { return 'unreadable'; } })() : undefined,
        errors: errs.map((e) => flat(e, 200)),
        footer: flat(await form.locator('.pkpFormPage__footer, .pkpFormPage__status').first().innerText().catch(() => null), 200),
    };
}

async function step(facts, name, fn) {
    try {
        facts[name] = await fn();
    } catch (e) {
        facts[name] = {error: flat(String(e.message).split('\n')[0], 300)};
    }
    console.log(`[fact] ${facts.app} ${name}: ${flat(JSON.stringify(facts[name]), 1500)}`);
    return facts[name];
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[a21r ${app.name}] no "Associated review round" control`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null};

    if (app.line && app.line !== 'main') {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            const wf = frame(page, app);
            await wf.gotoEditorial(SID);
            await idle(page).catch(() => {});
            const issue = await wf.revealPublicationEntry('Issue').catch(() => null);
            if (issue) await issue.click();
            await idle(page).catch(() => {});
            await sleep(1500);
            await step(facts, 'r35-issue-page', async () => {
                const text = await wf.dialog().innerText().catch(() => '');
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), menu: (await wf.menuEntries().catch(() => [])).map((e) => e.label), reviewRoundControl: /review round/i.test(text.replace(/Review Round \d/g, '')), page: flat(text.slice(text.indexOf('PUBLICATION')), 800)};
            });
            record(`a21r-r35-issue`, await screen(page));
        } finally {
            await close();
        }
        record(`a21r-facts-${app.line}`, facts);
        return;
    }

    facts.before = rounds(app);
    const pubs = sql(app, `select publication_id, status from publications where submission_id = ${SID} order by publication_id`).split('\n').filter(Boolean).map((l) => l.split('|').map(Number));
    const [v1, v2] = [pubs[0][0], pubs[1][0]];
    facts.versions = {published: v1, unpublished: v2};
    const {context, page: a, close} = await launch(app);
    try {
        await signIn(a, 'dbarnes');
        // 1-2 (tab A): 1.0's "Issue" page; untick round 1, "Save".
        let wfA = await openIssue(a, app, v1);
        await step(facts, 'a1-v1-control', () => control(a, wfA));
        record('a21r-a1-v1', await screen(a));
        await step(facts, 'a2-untick', () => toggleRound(a, wfA, 1));
        await step(facts, 'a2-save', () => save(a, wfA));
        facts.afterA2 = rounds(app);
        // 3 (tab B): 1.1's "Issue" page: round 1 offered.
        const b = await context.newPage();
        const wfB = await openIssue(b, app, v2);
        await step(facts, 'b3-v2-control', () => control(b, wfB));
        record('a21r-b3-v2', await screen(b));
        if (MODE === 'steps') {
            // 4 (tab A): tick round 1 again, "Save".
            await a.bringToFront();
            await step(facts, 'a4-tick', () => toggleRound(a, wfA, 1));
            await step(facts, 'a4-save', () => save(a, wfA));
            facts.afterA4 = rounds(app);
        }
        // 5 (tab B, not reloaded): tick round 1, "Save".
        await b.bringToFront();
        await step(facts, 'b5-tick', () => toggleRound(b, wfB, 1));
        await step(facts, 'b5-save', () => save(b, wfB));
        record('a21r-b5-saved', await screen(b));
        facts.afterB5 = rounds(app);
        // 6: both versions' "Issue" pages afresh.
        wfA = await openIssue(a, app, v1);
        await step(facts, 'c6-v1-control', () => control(a, wfA));
        record('a21r-c6-v1', await screen(a));
        const wfB2 = await openIssue(b, app, v2);
        await step(facts, 'c6-v2-control', () => control(b, wfB2));
        record('a21r-c6-v2', await screen(b));
    } finally {
        await close();
    }
    record(`a21r-${MODE}-facts`, facts);
});
