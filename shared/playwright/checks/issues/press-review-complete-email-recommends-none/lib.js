// Helpers of walk.js here (spec U28, register OMP2; issue report
// docs/issues/U28-OMP2-press-review-complete-email-recommends-none.md). Requiring this file runs
// nothing. Every helper drives the screens a person uses: the workflow's "Participants" panel and
// its "Assign Participant" window, the reviewer's four review steps, and the install's mailbox.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in review with two
 * unanswered requests. The press's has no editor assigned, so the walk assigns `dbarnes`; the
 * journal's has him already. `recommendation` is the journal's answer under "Recommendation".
 */
const CASES = {
    omp: {
        id: 17, words: 'Open Development', editorMail: 'dbarnes@mailinator.com',
        assign: {role: 'Press editor', person: 'Daniel Barnes'},
        reviewer: {name: 'Julie Janssen', username: 'jjanssen'}, neighbour: {name: 'Paul Hudson', username: 'phudson'},
    },
    ojs: {
        id: 12, words: 'Sodium butyrate', editorMail: 'dbarnes@mailinator.com',
        assign: null, recommendation: 'Accept Submission',
        reviewer: {name: 'Julie Janssen', username: 'jjanssen'}, neighbour: {name: 'Paul Hudson', username: 'phudson'},
    },
};

const column = (page) => page.locator('[data-cy="workflow-secondary-items"]');
const assignWin = (page) => page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();

function wizard(page, app) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    return new ReviewWizardPage(page, app.contextPath);
}

/** The "Participants" rows of the open workflow, one line each. */
function participants(page) {
    return column(page)
        .locator('li')
        .filter({has: page.locator('button')})
        .evaluateAll((items) => items.map((li) => li.innerText.split('\n').map((s) => s.trim()).filter((s) => s && !/More Actions$/.test(s)).join(' | ')));
}

/**
 * As the signed-in editor: the submission's workflow (on the stage it opens on), "Participants" ›
 * "Assign", the role, "Search", the person, "OK". Returns the save's status and the panel's rows.
 */
async function assignParticipant(page, app, id, {role, person}) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await column(page).waitFor({timeout: T});
    await idle(page);
    const before = await participants(page);
    await column(page).getByRole('button', {name: 'Assign', exact: true}).click();
    const win = assignWin(page);
    const roles = win.locator('select[name="filterUserGroupId"]');
    await roles.waitFor({timeout: T});
    await idle(page);
    await roles.selectOption({label: role});
    await idle(page);
    const listed = page.waitForResponse((r) => /fetchGrid|fetch-grid/i.test(r.url()), {timeout: 15_000}).catch(() => null);
    await win.getByRole('button', {name: 'Search', exact: true}).click();
    await listed;
    await idle(page);
    await sleep(400);
    const radio = win.getByRole('row').filter({hasText: person}).locator('input[name="userId"]');
    if (!(await radio.count())) return {before, listed: false};
    await radio.first().check();
    await idle(page);
    await sleep(400);
    const saved = page.waitForResponse((r) => /save-?participant/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.locator('form').getByRole('button', {name: 'OK', exact: true}).last().click();
    const s = await saved;
    await win.waitFor({state: 'detached', timeout: 6000}).catch(() => {});
    await sleep(1500);
    await idle(page);
    return {before, listed: true, status: s ? s.status() : null, after: await participants(page)};
}

/** The signed-in reviewer's review by its address, on the step it opens on. */
async function openReview(page, app, id) {
    const w = wizard(page, app);
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await w.expectOpen();
    return w;
}

/** Step 1: "Accept Review, Continue to Step #2" (the privacy box ticked when shown). */
async function acceptReview(page, app, id) {
    const w = await openReview(page, app, id);
    const heading = flat(await page.getByRole('heading', {level: 1}).first().innerText(), 160);
    await w.accept();
    await idle(page);
    return {heading, tab: flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60)};
}

/** What step 3 offers about a recommendation: the list's entries (null when the step has no list) and whether the word shows. */
async function step3Recommendation(page) {
    const form = page.locator('#reviewStep3Form');
    const list = form.locator('select[name="reviewerRecommendationId"], select[name="recommendation"]');
    return {
        list: (await list.count()) ? (await list.locator('option').allInnerTexts()).map((t) => flat(t, 60)) : null,
        wordShown: /recommendation/i.test(await form.innerText()),
    };
}

/** Step 2's "Continue to Step #3"; step 3: the recommendation when one is given (journal), "Submit Review", "OK". */
async function finishReview(page, app, {recommendation = null} = {}) {
    const w = wizard(page, app);
    await w.continueToStep3();
    await idle(page);
    const out = {step3: await step3Recommendation(page)};
    if (recommendation) {
        await page.locator('#reviewStep3Form select[name="reviewerRecommendationId"], #reviewStep3Form select[name="recommendation"]').selectOption({label: recommendation});
        out.chose = recommendation;
    }
    const dialog = await w.pressSubmitReview();
    out.confirm = flat(await dialog.innerText(), 200);
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await idle(page);
    out.completed = await w.completedHeading.waitFor({timeout: T}).then(() => true, () => false);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    return out;
}

/**
 * The newest email to `to` whose subject holds `subject` and names `words`, received from `since`
 * on (the slot's mailbox is shared by every install): sender, subject, and the body as text and
 * HTML. Polls up to `ms`; null when none came.
 */
async function letter(app, {to, subject, words, since, ms = 30_000}) {
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, subject, since}).catch(() => ({messages: []}));
        const m = (r.messages || []).find((x) => String(x.Subject).includes(words));
        if (m) {
            const full = await app.mail.fullMessage(m.ID).catch(() => null);
            return {
                subject: m.Subject,
                from: m.From && `${m.From.Name} <${m.From.Address}>`,
                to: (m.To || []).map((t) => t.Address),
                text: full ? flat(full.Text, 1500) : null,
                html: full ? String(full.HTML || '').slice(0, 2500) : null,
            };
        }
        if (Date.now() > end) return null;
        await sleep(1000);
    }
}

/** The stored default email texts: the "Review complete" rows, and one hash over every other row. */
function storedTemplates(app) {
    const rows = sql(app, "select locale, subject from email_templates_default_data where email_key = 'REVIEW_COMPLETE' order by locale").split('\n').filter(Boolean);
    const others = sql(
        app,
        "select count(*), md5(string_agg(email_key || '|' || locale || '|' || coalesce(name, '') || '|' || coalesce(subject, '') || '|' || coalesce(body, ''), '~' order by email_key, locale)) from email_templates_default_data where email_key <> 'REVIEW_COMPLETE'"
    ).trim();
    return {reviewComplete: rows, others};
}

module.exports = {T, sleep, flat, CASES, participants, assignParticipant, openReview, acceptReview, step3Recommendation, finishReview, letter, storedTemplates};
