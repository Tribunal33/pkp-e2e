// Helpers for walk.js (docs/issues/U13-OPS1-preview-new-version-called-outdated.md). Requiring this file runs nothing.
// The workflow's version controls on a dataset fleet: open a submission's workflow on a version's page,
// "Create New Version" (main: the version window, its choices kept, "Confirm"; 3.5: the button, "Yes"),
// "Publish" / "Post" with the details window's choices kept, and a public page's notices.
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const VIS = '[role="dialog"]:visible';

/** The submission's publications, `id:status` per line, oldest first. */
function publications(app, sid) {
    return sql(app, `select publication_id || ':' || status from publications where submission_id = ${sid} order by publication_id`).split('\n').filter(Boolean);
}

function latestPublicationId(app, sid) {
    return Number(sql(app, `select max(publication_id) from publications where submission_id = ${sid}`));
}

/**
 * The workflow the Submissions list's "View" opens, on a publication page of the menu
 * (`key`: `publication_<id>_titleAbstract` on main, `publication_titleAbstract` on 3.5).
 */
async function openWorkflow(page, app, sid, key) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${key}`));
    await idle(page);
    await page.locator(VIS).first().waitFor({timeout: T}).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
    await idle(page); await sleep(1000);
}

async function keepVersionChoices(scope) {
    for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
        const el = scope.locator(sel);
        if (await el.isVisible().catch(() => false)) {
            if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {});
        }
    }
}

/** "Create New Version" in the side menu; returns {opened, window, status, before, after}. */
async function createNewVersion(page, app, sid) {
    const out = {before: latestPublicationId(app, sid)};
    const wf = page.locator(VIS).first();
    const answer = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    const link = wf.getByRole('link', {name: 'Create New Version', exact: true}).or(wf.getByRole('button', {name: 'Create New Version', exact: true})).first();
    await link.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    await link.click();
    const win = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
    const yes = page.getByRole('dialog').filter({hasText: 'Create New Version'}).last().getByRole('button', {name: 'Yes', exact: true});
    out.opened = await Promise.race([
        win.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T}).then(() => 'window'),
        yes.waitFor({state: 'visible', timeout: T}).then(() => 'yes'),
    ]).catch(() => null);
    await idle(page); await sleep(1000);
    if (out.opened === 'window') {
        await keepVersionChoices(win);
        out.window = flat(await win.innerText().catch(() => ''), 400);
        await win.getByRole('button', {name: 'Confirm', exact: true}).click();
    } else {
        await yes.click();
    }
    const r = await answer;
    out.status = r ? r.status() : null;
    await idle(page); await sleep(1500);
    out.after = latestPublicationId(app, sid);
    return out;
}

/** The right-hand publishing control by label ("Preview", "Publish", "Post", …). */
function publishingControl(page, label) {
    const controls = page.locator('[data-cy="workflow-controls-right"]');
    return controls.getByRole('button', {name: label, exact: true}).or(controls.getByRole('link', {name: label, exact: true})).first();
}

/** "Publish" / "Post": the details window when it opens (its choices kept, "Confirm"), then the question. */
async function publishOnScreen(page) {
    const out = {};
    const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Post)$/}).first();
    await button.waitFor({state: 'visible', timeout: T});
    out.button = flat(await button.innerText().catch(() => ''), 60);
    await sleep(800);
    await button.click();
    const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to|make this catalog entry public|All (publication|posting) requirements/}).last();
    out.opened = await Promise.race([
        panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
        confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
    ]).catch(() => null);
    await idle(page); await sleep(600);
    if (out.opened === 'panel') {
        await keepVersionChoices(panel);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        await confirm.waitFor({state: 'visible', timeout: T});
    }
    await idle(page); await sleep(600);
    await keepVersionChoices(confirm);
    const answer = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: /^(Publish|Post)$/}).last().click();
    const r = await answer;
    out.status = r ? r.status() : null;
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unpost)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page); await sleep(600);
    return out;
}

/** The notices at the top of a public page (and a reader's notice), verbatim. */
async function notices(page) {
    await idle(page); await sleep(500);
    const boxes = await page.locator('.cmp_notification.notice, .galley_view_notice_message, .viewable_file_frame_with_notice [role="alert"]').allInnerTexts().catch(() => []);
    return boxes.map((t) => flat(t, 300)).filter(Boolean);
}

module.exports = {T, sleep, flat, VIS, publications, latestPublicationId, openWorkflow, createNewVersion, publishingControl, publishOnScreen, notices};
