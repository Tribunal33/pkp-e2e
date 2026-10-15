// Helpers for the walk of docs/issues/U49-OJS5-refused-publish-confirm-opens-blank-panel.md (OJS "Review Publishing
// Details" on PKP's default test dataset), copied from plain-summary-required-refuses-other-saves/lib.js so this folder
// stands alone. Requiring this file runs nothing.
const path = require('path');
const {idle, screen, record, shot} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); // sampling only
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wf = (page) => page.locator('[role="dialog"]:visible').first();

const PLS_BOX = 'Enable plain language summary metadata';
const PLS_REQUIRE = 'Require the author to provide a plain language summary before accepting their submission.';

async function snap(page, name, extra) {
    let s;
    try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300), text: {}}; }
    if (extra) s.facts = extra;
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/**
 * Record every /api/v1/ write the page sends (the Vue forms tunnel PUT as POST + X-Http-Method-Override),
 * with the body of a refusal. Returns {all, since(t)}.
 */
function watchWrites(page) {
    const all = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u) || /_test\//.test(u) || r.request().method() === 'GET') return;
        const e = {at: Date.now(), op: r.request().headers()['x-http-method-override'] || r.request().method(),
            url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status()};
        all.push(e);
        if (r.status() >= 400) e.body = flat(await r.text().catch(() => null), 400);
    });
    return {all, since: (t) => all.filter((x) => x.at >= t).map(({at, ...x}) => x)};
}

/** Settings › Workflow › "Submission" › "Metadata": the summary at "Require …", "Save". Returns the answer and statuses. */
async function requireSummary(app, page) {
    const {WorkflowSubmissionSettings, saveWatchingStatus} = require('../../../pages/SubmissionIntakePages.js');
    const s = new WorkflowSubmissionSettings(page, app.contextPath);
    await s.goto('Metadata');
    const box = s.metadata.box(PLS_BOX);
    if (!(await box.count())) return {offered: false, items: await s.metadata.panel.getByRole('checkbox').evaluateAll((els) => els.map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim()))};
    await box.check();
    await s.metadata.choice(PLS_BOX, PLS_REQUIRE).check();
    const {response, statuses} = await saveWatchingStatus(page, s.metadata);
    return {offered: true, status: response.status(), statuses};
}

/** Open a submission's workflow as an editor (the editorial dashboard's own address for it). */
async function openWorkflow(app, page, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}`));
    await wf(page).waitFor({timeout: T});
    await idle(page);
}

/** A Publication page from the workflow's side menu ("Metadata", "Title & Abstract", …). */
async function openEntry(page, name) {
    const dialog = wf(page);
    const entry = dialog.getByRole('link', {name, exact: true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
        const group = dialog.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) await group.click();
        await idle(page);
    }
    await entry.click({timeout: T});
    await dialog.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${esc(name)}$`, 'i')}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    const save = dialog.getByRole('button', {name: 'Save', exact: true});
    await save.first().waitFor({timeout: 20_000}).catch(() => {});
    await idle(page);
}

/**
 * OJS: "Schedule For Publication" from the open Publication page, then in "Review Publishing Details" the Version of
 * Record, "Major Revision", "Assign To Current/Back Issue" and the issue matching `issue`, "Confirm". Records what
 * follows (never throws on the state a fix brings): the writes, whether the confirmation opened, whether the panel
 * stayed open, the marks inside it and the notices shown. Returns {panel, confirm, out}.
 */
async function confirmPublishPanel(app, page, writes, issue = /Vol\. 1 No\. 2/) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const panel = await pub.openPublishPanel();
    await pub.fillVersionDetails(panel);
    await pub.awaitAssignmentPreselected(panel);
    await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
    await pub.selectIssueOption(panel, issue);
    await screen(page).catch(() => null); // empties the notice queue before the press
    const t = Date.now();
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    await confirm.waitFor({timeout: 8000}).catch(() => {});
    await idle(page);
    const out = {writes: writes.since(t)};
    const s = await screen(page).catch(() => ({}));
    out.notices = s.notices || [];
    out.confirmOpened = await confirm.isVisible().catch(() => false);
    // The side panels nest (the SideModal wrappers have no box of their own), so they are read by their contents.
    out.panelStillOpen = (await publishPanelsOpen(page)) > 0;
    out.fieldMarks = await page.locator('.pkpFormErrors, .pkpFieldError').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    out.panelText = out.panelStillOpen ? flat(await page.locator('[data-cy="active-modal"]').last().innerText().catch(() => null), 1500) : null;
    // How many "Review Publishing Details" panels are open now, and what the top one's selects hold.
    out.panelsOpen = await publishPanelsOpen(page);
    out.topPanelValues = await page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last()
        .locator('select').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value}))).catch(() => null);
    return {panel, confirm, out};
}

/** How many "Review Publishing Details" panels are on screen (stacked side panels; the lower ones are inert). */
async function publishPanelsOpen(page) {
    return page.locator('h1, h2, h3').evaluateAll((els) => els.filter((e) => e.innerText.trim() === 'Review Publishing Details' && e.getClientRects().length).length).catch(() => null);
}

module.exports = {T, sleep, flat, wf, snap, watchWrites, requireSummary, openWorkflow, openEntry, confirmPublishPanel, publishPanelsOpen};
