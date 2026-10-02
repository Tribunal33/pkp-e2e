// Issue report docs/issues/U49-A6-new-version-draft-rewrites-published-date.md
// (U49 A6): creating a new, still unpublished version of a published
// article, book or preprint changes the live reader page's date line to
// "Published {the day the page is read} — Updated on {real date}".
// Takes the report's Steps on PKP's default test dataset, as dbarnes:
//   OJS submission 17, OMP submission 14, OPS submission 2:
//   "Unpublish" / "Unpost", the entry page's date typed 2024-12-31, "Save",
//   "Publish" / "Post"; the reader page signed out (control); "Create New
//   Version" › "Confirm" (3.5: the button, "Yes"); the reader page again.
// PHASE=nb (a separate run, on the state the steps leave): the neighbour a
// fix must leave as it is: the new version published, then the reader page
// ("Published 2024-12-31 — Updated on {today}") and the older version's page
// ("Published 2024-12-31").
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PHASE=nb] node bin/probe.js all shared/playwright/checks/issues/new-version-draft-rewrites-published-date/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const {sleep, rel, workflowFrame, createNewVersion} = require('../older-version-tab-current-title/lib');
const {pressAndConfirm, controls} = require('../chapter-page-dates-and-preview-notice/lib');
const {readDates, publishShown, setVersionDate} = require('./lib');

const PHASE = process.env.PHASE || 'steps';
const DATE = '2024-12-31';
const SUBMISSION = {ojs: 17, omp: 14, ops: 2};
const READER = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'};

/** The stored versions (a read for the facts, not a step). */
function stored(app, sid) {
    const version = app.line === 'stable-3_5_0' ? `p.version::text` : `p.version_stage || ' ' || p.version_major || '.' || p.version_minor`;
    return sql(app, `select p.publication_id, ${version}, p.status, coalesce(p.date_published::text, 'null') from publications p where p.submission_id = ${sid} order by p.publication_id`)
        .split('\n')
        .filter(Boolean)
        .map((l) => {
            const [id, v, status, date] = l.split('|');
            return {id: Number(id), version: v, status: Number(status), datePublished: date};
        });
}

/** A visitor's read of one address in a fresh, signed-out browser. */
async function visitor(app, label, address) {
    const {page, close} = await launch(app);
    try {
        const resp = await page.goto(app.url(address));
        await idle(page).catch(() => {});
        record(`a6-${PHASE}-${label}`, await screen(page));
        const out = {status: resp ? resp.status() : null, ...(await readDates(page))};
        console.log(`[fact] ${app.name} ${label}: ${JSON.stringify(out)}`);
        return out;
    } finally {
        await close();
    }
}

async function step(facts, name, fn) {
    try {
        facts[name] = await fn();
    } catch (e) {
        facts[name] = {error: String(e.message).split('\n')[0].slice(0, 300)};
    }
    console.log(`[fact] ${facts.app} ${name}: ${JSON.stringify(facts[name])}`);
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const sid = SUBMISSION[app.name];
    const reader = `/index.php/${app.contextPath}/${READER[app.name]}/${sid}`;
    const facts = {app: app.name, line: app.line || 'main', phase: PHASE, submission: sid, before: stored(app, sid)};
    const off = app.name === 'ops' ? 'Unpost' : 'Unpublish';

    if (PHASE === 'steps') {
        const first = facts.before[0];
        const {page, close} = await launch(app);
        try {
            // 1. dbarnes opens the workflow.
            await signIn(page, 'dbarnes');
            const frame = workflowFrame(page, app);
            await frame.gotoEditorial(sid);
            await controls(page).waitFor({timeout: 30_000});
            await idle(page).catch(() => {});
            await sleep(1200);
            record(`a6-steps-1-workflow`, await screen(page));
            // 2. "Unpublish" / "Unpost", confirmed.
            await step(facts, 'step2Unpublish', () => pressAndConfirm(page, off, /\/unpublish$/));
            // 3. The entry page's date, "Save".
            await step(facts, 'step3Date', () => setVersionDate(page, frame, app, sid, first.id, DATE));
            record(`a6-steps-3-date`, await screen(page));
            // 4. "Publish" / "Post", confirmed.
            await step(facts, 'step4Publish', () => publishShown(page));
            record(`a6-steps-4-published`, await screen(page));
        } finally {
            await close();
        }
        // 5. The reader page, signed out (control).
        facts.step5Reader = await visitor(app, '5-reader-before', reader);
        facts.afterPublish = stored(app, sid);

        // 6. "Create New Version" › "Confirm" (3.5: the button, "Yes").
        const b = await launch(app);
        try {
            await signIn(b.page, 'dbarnes');
            const frame = workflowFrame(b.page, app);
            await frame.gotoEditorial(sid);
            await idle(b.page).catch(() => {});
            await sleep(1200);
            if (app.line === 'stable-3_5_0') {
                await frame.menuLink('Title & Abstract').first().click();
                await idle(b.page).catch(() => {});
            }
            await step(facts, 'step6Create', () => createNewVersion(b.page, app));
            record(`a6-steps-6-created`, await screen(b.page));
            await signOut(b.page).catch(() => {});
        } finally {
            await b.close();
        }
        facts.afterCreate = stored(app, sid);

        // 7. The reader page again, signed out.
        facts.step7Reader = await visitor(app, '7-reader-after', reader);
        record('a6-steps-facts', facts);
        return;
    }

    // PHASE=nb: publish the new version, then the reader's two pages.
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const frame = workflowFrame(page, app);
        await frame.gotoEditorial(sid);
        await controls(page).waitFor({timeout: 30_000});
        await idle(page).catch(() => {});
        await sleep(1200);
        if (app.line === 'stable-3_5_0') {
            await frame.menuLink('Title & Abstract').first().click();
            await idle(page).catch(() => {});
        }
        await step(facts, 'nb8Publish', () => publishShown(page));
        record(`a6-nb-8-published`, await screen(page));
    } finally {
        await close();
    }
    facts.afterNb = stored(app, sid);
    facts.nb9Current = await visitor(app, '9-reader-current', reader);
    // The older version: the "Versions" entry whose address names the first publication.
    const firstId = facts.before[0].id;
    const link = (facts.nb9Current.versionLinks || []).find((l) => new RegExp(`/version/${firstId}(/|$)`).test(l.href));
    facts.nb9Older = link ? await visitor(app, '9-reader-older', rel(link.href)) : {missing: 'no version link'};
    record('a6-nb-facts', facts);
});
