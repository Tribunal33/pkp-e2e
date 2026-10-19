// Helpers of the walk for issue report U04 A22 (the ORCID landing after an emailed authorization
// for a published work saying nothing of the deposit). Requiring this file runs nothing.
const path = require('path');
const {idle, screen, shot} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The "ORCID Authorization" page's message block, line by line, as the reader sees it. */
async function readLanding(page) {
    const block = page.locator('.page_message .description').first();
    return {
        success: (await page.locator('.page_message .orcid-success').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        failure: (await page.locator('.page_message .orcid-failure').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        redirect: flat(await page.locator('.page_message .orcid-redirect').first().innerText({timeout: 2000}).catch(() => null), 200),
        description: flat(await block.innerText({timeout: 2000}).catch(() => null), 800),
    };
}

/**
 * OMP: publish the monograph's version the workflow shows (the header's "Publish", the "Schedule
 * For Publication" window's "Publish"), as the signed-in editor, through the suite's page object.
 * Records the screen; returns what happened, never throws.
 */
async function publishMonographOnScreen(page, app, submissionId, rec) {
    const out = {};
    try {
        const {publishShownVersion} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
        await idle(page);
        await page.getByRole('link', {name: 'Title & Abstract', exact: true}).first().click().catch(() => {});
        await idle(page);
        await publishShownVersion(page);
    } catch (e) {
        out.error = flat(e.message, 500);
    }
    await idle(page).catch(() => {});
    const after = await screen(page);
    rec('07-published', after);
    await shot(page, (rec.prefix || '') + '07-published').catch(() => {});
    return out;
}

module.exports = {flat, readLanding, publishMonographOnScreen};
