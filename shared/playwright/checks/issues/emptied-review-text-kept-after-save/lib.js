// Helpers of the U28 A4 walk (issue report
// docs/issues/U28-A4-emptied-review-text-kept-after-save.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses: the reviewer's review page, step 3's two text
// boxes with "Save for Later" and "Submit Review", and the editor's "Read Review".
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 900) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The review wizard's page object; required lazily, since base-test reads the app's env (patterns.md "Probe kit"). */
function wizard(page, app) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    return new ReviewWizardPage(page, app.contextPath);
}

/** Step 3's two rich-text boxes are initialized (text typed earlier is wiped). */
async function editorsReady(page) {
    await page.waitForFunction(() => {
        const mce = window.tinyMCE || window.tinymce;
        const ids = ['comments', 'commentsPrivate'].map((n) => (document.querySelector(`#reviewStep3Form textarea[name="${n}"]`) || {}).id);
        return !!mce && ids.every((id) => id && mce.get(id) && mce.get(id).initialized);
    }, undefined, {timeout: T});
}

/**
 * Open the signed-in reviewer's review of the submission on step 3. With `accept`, step 1's
 * "Accept Review, Continue to Step #2" and step 2's "Continue to Step #3" are pressed on the way;
 * without, the page is loaded afresh (a reload) and step 3 selected when another step opened.
 */
async function openStep3(page, app, id, {accept = false} = {}) {
    const w = wizard(page, app);
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await w.expectOpen();
    const out = {heading: flat(await page.getByRole('heading', {level: 1}).first().innerText(), 160)};
    if (accept) {
        await w.accept();
        await w.continueToStep3();
    } else {
        out.openedOn = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
        if (!/^3\./.test(out.openedOn || '')) await w.selectStep(3);
        await w.expectStep(3);
    }
    await w.step3Form.waitFor({timeout: T});
    await editorsReady(page);
    await idle(page);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    return out;
}

/** The labels the two boxes carry on screen, in order. */
async function boxLabels(page) {
    return page.locator('#reviewStep3Form').evaluate((form) =>
        ['comments', 'commentsPrivate'].map((n) => {
            const section = form.querySelector(`textarea[name="${n}"]`).closest('.section');
            const label = section && section.querySelector('label, .label');
            return label ? label.textContent.replace(/\s+/g, ' ').trim() : null;
        })
    );
}

/** What each box shows (the editing area's text) and what its editor holds. */
async function readBoxes(page) {
    await editorsReady(page);
    const w = wizard(page, {contextPath: ''});
    return {
        author: flat(await w.commentsBody.innerText()),
        editor: flat(await w.privateCommentsBody.innerText()),
        content: await page.evaluate(() => {
            const mce = window.tinyMCE || window.tinymce;
            const get = (n) => mce.get(document.querySelector(`#reviewStep3Form textarea[name="${n}"]`).id).getContent();
            return {comments: get('comments'), commentsPrivate: get('commentsPrivate')};
        }),
    };
}

/** Type into the boxes named (`author`, `editor`), through the editor as a person does. */
async function typeBoxes(page, app, texts) {
    const w = wizard(page, app);
    if (texts.author != null) await w.typeComments(texts.author);
    if (texts.editor != null) await w.typePrivateComments(texts.editor);
}

/** Delete all the text of the boxes: click into the box, select all, Delete. */
async function clearBoxes(page, {author = true, editor = true} = {}) {
    await editorsReady(page);
    const w = wizard(page, {contextPath: ''});
    for (const body of [author && w.commentsBody, editor && w.privateCommentsBody]) {
        if (!body) continue;
        await body.click();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.press('Delete');
        for (let i = 0; i < 20 && (await body.innerText()).trim(); i++) await sleep(100);
    }
    // leave the box, as a person does on the way to the button
    await page.getByRole('heading', {level: 1}).first().click();
}

/** The two texts a posted step-3 form carried (null when the form had no such field). */
function postedTexts(request) {
    const p = new URLSearchParams(request.postData() || '');
    return {comments: p.get('comments'), commentsPrivate: p.get('commentsPrivate'), isSave: p.get('isSave')};
}

/** Press a step-3 button and return what the form posted and what the request answered. */
async function pressAndCatch(page, press) {
    const sent = page.waitForRequest((r) => r.method() === 'POST' && /save-step|saveStep/i.test(r.url()), {timeout: T});
    await press();
    const request = await sent;
    const response = await request.response();
    let status = null;
    try { status = JSON.parse(await response.text()).status; } catch (e) { /* not JSON */ }
    return {posted: postedTexts(request), http: response.status(), status};
}

/** "Save for Later": what was posted, the answer, and the notice shown. */
async function saveForLater(page) {
    const w = wizard(page, {contextPath: ''});
    const out = await pressAndCatch(page, () => w.saveForLaterButton.click());
    const notice = page.getByText('Your changes have been saved.').first();
    out.notice = await notice.waitFor({timeout: T}).then(() => 'Your changes have been saved.', () => null);
    await idle(page);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    // the notice expires after five seconds; the next save's must be its own
    await notice.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
    return out;
}

/** (Journal) choose the recommendation, "Submit Review", "OK"; the page then shows "Review Submitted". */
async function submitReview(page, app, recommendation) {
    const w = wizard(page, app);
    // the list is `reviewerRecommendationId` on main, `recommendation` on 3.5
    if (recommendation) await page.locator('#reviewStep3Form select[name="reviewerRecommendationId"], #reviewStep3Form select[name="recommendation"]').selectOption({label: recommendation});
    const dialog = await w.pressSubmitReview();
    const out = {confirm: flat(await dialog.innerText(), 200)};
    Object.assign(out, await pressAndCatch(page, () => dialog.getByRole('button', {name: 'OK', exact: true}).click()));
    out.completed = await w.completedHeading.waitFor({timeout: T}).then(() => true, () => false);
    await idle(page);
    out.tab = flat(await page.locator('li.ui-tabs-active').first().innerText().catch(() => null), 60);
    return out;
}

/** The editor opens the submission's workflow and presses "Read Review" on the reviewer's row. */
async function editorReadsReview(page, app, id, name) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const manager = page.locator('[data-cy="reviewer-manager"]');
    const row = manager.getByRole('row').filter({hasText: name});
    await row.first().waitFor({timeout: T});
    await idle(page);
    const out = {
        workflow: flat(await page.getByRole('heading', {name: /^Workflow:/}).first().innerText().catch(() => null), 120),
        row: flat(await row.first().innerText(), 200),
    };
    await row.first().getByRole('button', {name: 'Read Review', exact: true}).click();
    const dialog = page.getByRole('dialog').last();
    await page.waitForFunction((n) => {
        const d = document.querySelectorAll('[role="dialog"]');
        const last = d[d.length - 1];
        return !!last && last.innerText.includes(n) && last.innerText.length > 150 && !/Loading/.test(last.innerText);
    }, name, {timeout: T}).catch(() => {});
    await idle(page);
    await sleep(1000); // the window's review content arrives after its frame
    out.title = flat(await dialog.getByRole('heading').first().innerText().catch(() => null), 160);
    out.text = flat(await dialog.innerText(), 2500);
    // the window's own editable boxes, where it has them (main's "Review Details")
    out.fields = await dialog.locator('textarea').evaluateAll((areas) =>
        areas.map((a) => {
            const mce = window.tinyMCE || window.tinymce;
            const ed = mce && mce.get(a.id);
            return {name: a.name || a.id, content: ed ? ed.getContent() : a.value};
        })
    ).catch(() => []);
    return out;
}

/** The review's stored text rows (database read, evidence only): `comment_id|viewable|comments`. */
function savedRows(app, id, username) {
    return sql(app, `SELECT c.comment_id, c.viewable, c.comments FROM submission_comments c
        JOIN review_assignments r ON r.review_id = c.assoc_id JOIN users u ON u.user_id = r.reviewer_id
        WHERE r.submission_id = ${Number(id)} AND u.username = '${String(username).replace(/[^a-z0-9]/gi, '')}' AND c.comment_type = 1
        ORDER BY c.comment_id`).split('\n').filter(Boolean);
}

module.exports = {T, sleep, flat, openStep3, boxLabels, readBoxes, typeBoxes, clearBoxes, saveForLater, submitReview, editorReadsReview, savedRows};
