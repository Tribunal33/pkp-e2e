// Helpers of the two "Previous Reviews" walks (issue reports
// docs/issues/U28-A12-reviewer-own-round-listed-under-previous-reviews.md and
// docs/issues/U28-A2-previous-reviews-unfinished-round-reads-submitted-on.md). Requiring this file
// runs nothing. Every helper drives the screens a person uses: the reviewer's review page with its
// "Previous Reviews" box, the editor's workflow with its decision buttons and "Add Reviewer".
const {idle, screen, record, shot, signIn} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 900) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The box above the review page's tabs, headed "Previous Reviews". */
function previousReviewsBox(page) {
    return page.locator('div').filter({has: page.getByRole('heading', {name: 'Previous Reviews', exact: true})}).last();
}

/**
 * Open the signed-in reviewer's review of the submission and read it: the heading, the tab the page
 * is on, and the "Previous Reviews" box (its lines verbatim, each "Read Round {N} Review" window's
 * text). Never throws on a missing box: `box.shown` says.
 */
async function readReviewPage(page, app, id, label, {openWindows = true} = {}) {
    const out = {};
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    // the tabs load their step by AJAX; the box is server state, drawn with the page
    await page.locator('#reviewTabs, .ui-tabs').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
    out.heading = flat(await page.getByRole('heading', {level: 1}).first().innerText().catch(() => null), 200);
    out.tab = flat(await page.locator('li.ui-tabs-active, li.ui-state-active').first().innerText().catch(() => null), 80);
    out.stepButtons = (await page.locator('main button:visible, main a.pkp_button:visible, main .pkp_button:visible').allInnerTexts().catch(() => []))
        .map((t) => flat(t, 80))
        .filter((t) => /Accept Review|Continue to Step|Submit Review|Save for Later|Save and continue/i.test(t));
    const box = previousReviewsBox(page);
    out.box = {shown: await box.isVisible().catch(() => false)};
    record(`${label}`, await screen(page));
    await shot(page, label).catch(() => {});
    if (!out.box.shown) return out;
    out.box.text = flat(await box.innerText());
    // the line as the page prints it, the trailing space kept: textContent of each <p>'s first <span>
    out.box.lines = await box.locator('p').evaluateAll((ps) =>
        ps.map((p) => ({
            line: (p.querySelector('span') || p).textContent.replace(/\s+/g, ' ').replace(/^ /, ''),
            button: ((p.querySelector('button') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
        }))
    );
    if (!openWindows) return out;
    out.box.windows = [];
    for (const l of out.box.lines) {
        if (!l.button) continue;
        const w = {button: l.button};
        try {
            await box.getByRole('button', {name: l.button, exact: true}).click();
            const dialog = page.getByRole('dialog').last();
            await dialog.waitFor({timeout: T});
            await page
                .waitForFunction(() => {
                    const d = document.querySelectorAll('[role="dialog"]');
                    return d.length && d[d.length - 1].innerText.length > 150;
                }, undefined, {timeout: T})
                .catch(() => {});
            await idle(page);
            w.text = flat(await dialog.innerText(), 1500);
            record(`${label}-window-${l.button.replace(/\D+/g, '')}`, await screen(page));
            await shot(page, `${label}-window-${l.button.replace(/\D+/g, '')}`).catch(() => {});
            await dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
            await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(600); // the modal store keeps a closed window's slot for 450 ms
        } catch (e) {
            w.threw = flat(e.message, 300);
        }
        out.box.windows.push(w);
    }
    return out;
}

/** On the open review page, step 1: "Accept Review, Continue to Step #2" (the consent box ticked when shown). */
async function acceptReview(page) {
    const accept = page.getByRole('button', {name: /Accept Review, Continue to Step #2/});
    await accept.waitFor({timeout: T});
    const consent = page.locator('input[type="checkbox"][name="privacyConsent"]');
    if (await consent.count()) await consent.check();
    await accept.click();
    await page.getByRole('button', {name: 'Continue to Step #3'}).waitFor({timeout: T});
    await idle(page);
    return {accepted: true, tab: flat(await page.locator('li.ui-tabs-active, li.ui-state-active').first().innerText().catch(() => null), 80)};
}

/** The editor's workflow of the submission, on the stage and round it opens on. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="workflow-action-items"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The workflow's heading ("Workflow: Review (Round 2)"). */
async function workflowHeading(modal) {
    return flat(await modal.getByRole('heading', {name: /^Workflow:/}).first().innerText().catch(() => null), 120);
}

/**
 * Press a decision button of the workflow ("Create New Review Round", "Send to External Review")
 * and go through its page with "Continue" to "Record Decision".
 */
async function recordDecision(page, modal, label) {
    const R = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js'); // the decision page is the same on a journal
    const buttons = (await modal.locator('[data-cy="workflow-action-items"]').getByRole('button').allInnerTexts()).map((t) => flat(t, 60));
    await modal.locator('[data-cy="workflow-action-items"]').getByRole('button', {name: label, exact: true}).click();
    await page.getByRole('heading', {level: 1}).filter({hasText: /Review/}).first().waitFor({timeout: T});
    const heading = flat(await page.getByRole('heading', {level: 1}).first().innerText(), 120);
    await R.walkDecisionWizard(page);
    return {buttons, heading, recorded: true};
}

/**
 * On the open workflow's round: "Add Reviewer", search the list by name, press the entry's button
 * ("Select Reviewer", or "Reassign" for a reviewer of an earlier round), then "Add Reviewer".
 */
async function addReviewer(page, modal, {search, name}) {
    const {waitForLegacyFormSettled} = require('../../../support/legacy.js');
    const out = {name};
    await modal.locator('[data-cy="reviewer-manager"]').getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const win = page.getByRole('dialog').filter({has: page.locator('.listPanel--selectReviewer')});
    const box = win.locator('.listPanel--selectReviewer input.pkpSearch__input');
    await box.waitFor({timeout: T});
    await box.fill(search);
    await box.press('Enter');
    const item = win.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: name});
    await item.waitFor({timeout: T});
    await page.waitForFunction(() => {
        const textarea = document.querySelector('#reviewerFormFooter textarea[name="personalMessage"]');
        const mce = window.tinyMCE || window.tinymce;
        return !!(textarea && mce && mce.get(textarea.id) && mce.get(textarea.id).initialized);
    }, undefined, {timeout: T});
    await idle(page);
    const pick = item.getByRole('button', {name: new RegExp(`^(Select|Reassign) ${name}`)});
    out.entryButton = flat(await pick.first().innerText().catch(() => null), 60);
    out.entryButtonName = await pick.first().getAttribute('aria-label').catch(() => null);
    for (let i = 0; i < 6 && !(await win.locator('#regularReviewerForm').isVisible().catch(() => false)); i++) {
        await pick.first().click({timeout: 5000}).catch(() => {});
        await win.locator('#regularReviewerForm').waitFor({timeout: 3000}).catch(() => {});
    }
    await idle(page);
    const letter = win.frameLocator('iframe[id^="personalMessage"]').last().locator('body');
    for (let i = 0; i < 60 && !((await letter.innerText().catch(() => '')).trim()); i++) await sleep(500); // the request letter arrives by AJAX
    await waitForLegacyFormSettled(page, win).catch(() => {});
    const saved = page.waitForResponse((r) => /update-reviewer|updateReviewer/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Add Reviewer', exact: true}).click();
    const s = await saved;
    out.status = s ? s.status() : null;
    const row = modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name});
    await row.first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    out.row = flat(await row.first().innerText().catch(() => null), 200);
    return out;
}

/**
 * The neighbour both fixes must leave alone: a reviewer who submitted round 1 and is asked again on
 * round 2 reads "Round 1 Review Submitted on {date}" in the box. Recorded, never thrown.
 */
async function reassignedAfterSubmitted(page, app, c, step, label) {
    await step('nbRound2', async () => {
        await signIn(page, 'dbarnes');
        const modal = await openWorkflow(page, app, c.id);
        const d = await recordDecision(page, modal, 'Create New Review Round');
        const again = await openWorkflow(page, app, c.id);
        return {...d, heading2: await workflowHeading(again), added: await addReviewer(page, again, {search: c.search, name: c.name})};
    });
    await step('nbReviewer', async () => {
        await signIn(page, c.reviewer);
        return readReviewPage(page, app, c.id, `${label}-reviewer`);
    });
}

module.exports = {T, sleep, flat, previousReviewsBox, readReviewPage, acceptReview, openWorkflow, workflowHeading, recordDecision, addReviewer, reassignedAfterSubmitted};
