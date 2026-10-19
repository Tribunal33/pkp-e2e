// Helpers of walk.js (issue report on U40 OJS1: "Change" beside "Current Submission Language" stays
// on an article published as "Author's Original" or "Published Manuscript Under Review", and every
// change is refused). Requiring this file runs nothing. Every helper presses what a person presses,
// or types an address. openWorkflow, openEntry, readout and changeLanguage are copied from
// ../change-language-offered-then-refused/lib.js so this folder stands alone.
const path = require('path');
const {idle, screen} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The workflow dialog (the workflow page is itself a dialog over the dashboard). */
const wf = (page) => page.locator('[role="dialog"]:visible').first();
const rightControls = (page) => page.locator('[data-cy="workflow-controls-right"]');
const PUBLISH_RE = /^(Schedule For Publication|Publish|Post)$/;

/** Open a submission's workflow by its address and wait for it to settle. */
async function openWorkflow(page, app, sid) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${sid}`)).catch(() => {});
    await idle(page).catch(() => {});
    await wf(page).waitFor({timeout: T}).catch(() => {});
    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15_000}).catch(() => {});
    await idle(page).catch(() => {});
}

/** A Publication page of the side menu ("Title & Abstract"), opened; heading "Publication: …" ("Preprint: …"). */
async function openEntry(page, name) {
    const d = wf(page);
    const entry = d.getByRole('link', {name, exact: true}).first();
    if (!(await entry.isVisible().catch(() => false))) {
        const group = d.getByRole('link', {name: /^(Publication|Preprint)$/}).first();
        if (await group.count()) { await group.click().catch(() => {}); await idle(page).catch(() => {}); }
    }
    if (!(await entry.isVisible().catch(() => false))) return false;
    await entry.click();
    await d.getByRole('heading', {name: new RegExp(`^(Publication|Preprint): ${name}$`)}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await pause(1200);
    return true;
}

/** The "Current Submission Language: …" readout, its "Change" button, and the header's controls. */
async function readout(page) {
    const line = page.getByText('Current Submission Language:', {exact: false}).first();
    const present = (await line.count()) > 0 && (await line.isVisible().catch(() => false));
    const text = present ? flat(await line.locator('xpath=..').innerText().catch(() => null), 120) : null;
    const btn = page.getByRole('button', {name: 'Change', exact: true});
    const n = await btn.count().catch(() => 0);
    const change = n ? {present: true, enabled: await btn.first().isEnabled().catch(() => null)} : {present: false};
    const left = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => null), 200);
    const right = flat(await rightControls(page).innerText().catch(() => null), 200);
    return {readout: text, change, controlsLeft: left, controlsRight: right};
}

/**
 * Press "Change", wait for the panel to settle (its subtitle shows the title), pick `language`,
 * type into every editor the panel reveals (Title; Abstract where the section asks for it), press
 * "Confirm". Returns what the browser sent and got, the toast, and whether the panel stayed.
 */
async function changeLanguage(page, {title, language, words, snap}) {
    const o = {};
    const btn = page.getByRole('button', {name: 'Change', exact: true}).first();
    if (!(await btn.count())) return {pressed: false};
    await btn.click();
    const panel = page.getByRole('dialog', {name: /Change Submission Language/i});
    await panel.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
    if (title) await panel.getByText(title).first().waitFor({state: 'visible', timeout: T}).catch(() => { o.titleNotSettled = true; });
    await idle(page).catch(() => {}); await pause(800);
    o.radios = await panel.getByRole('radio').evaluateAll((els) => els.map((e) => `${e.checked ? '(o)' : '( )'} ${(e.labels && e.labels[0] ? e.labels[0].innerText : e.value).trim()}`)).catch(() => []);
    if (snap) await snap('panel-open');
    const radio = panel.getByRole('radio', {name: language});
    if (!(await radio.count())) {
        o.noRadio = language;
        await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
        return o;
    }
    await radio.first().check().catch((e) => { o.checkErr = flat(e.message, 120); });
    await pause(1200);
    const ids = await panel.locator('iframe[id$="_ifr"]').evaluateAll((els) => els.map((e) => e.id.replace(/_ifr$/, ''))).catch(() => []);
    o.editors = [];
    for (const id of ids) {
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        const before = await page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
        if (!before || !before.trim()) {
            await page.frameLocator(`#${id}_ifr`).locator('body').click({timeout: 5000}).catch(() => {});
            await page.keyboard.type(/abstract/i.test(id) ? `${words} (résumé)` : words);
            await pause(300);
        }
        o.editors.push({id: id.replace(/-[a-z0-9]+$/i, ''), prefilled: !!(before && before.trim())});
    }
    if (snap) await snap('panel-filled');
    const answered = page.waitForResponse((r) => /\/changeLocale$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { o.confirmErr = flat(e.message, 150); });
    const r = await answered;
    if (r) {
        let body = null;
        try { body = flat(await r.text(), 300); } catch { body = null; }
        o.request = {method: r.request().headers()['x-http-method-override'] || r.request().method(), path: new URL(r.url()).pathname.replace(/^.*\/api\/v1/, '/api/v1'), status: r.status(), body};
    } else o.request = null;
    await pause(1500);
    await idle(page).catch(() => {});
    o.panelOpenAfter = await panel.isVisible().catch(() => false);
    o.panelErrors = await panel.locator('.pkpFieldError').allInnerTexts().catch(() => []);
    const after = snap ? await snap('after-confirm') : await screen(page);
    o.toasts = ((after && after.notices) || []).map((x) => flat(typeof x === 'string' ? x : x.text, 200));
    if (o.panelOpenAfter) await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    await pause(600);
    return o;
}

/**
 * OJS main: on an open Publication page, "Publish" › the "Review Publishing Details" panel
 * ("Publication Stage" = `stage`, "Revision Significance" major where asked, "Don't Assign To An
 * Issue") › "Confirm" › "Publish" in the question. Uses the suite's PublicationScreen for the
 * panel's settling. Returns the stage options offered, the panel's and the question's text, the
 * publish answer.
 */
async function publishOJS(page, app, stage, snap) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const o = {stage};
    const panel = await pub.pressPublish();
    const sel = panel.locator('select[name="versionStage"]');
    o.stageOptions = await sel.evaluate((s) => [...s.options].map((x) => x.innerText.trim()).filter(Boolean)).catch(() => null);
    await sel.selectOption(stage);
    await pause(400);
    const minor = panel.locator('select[name="versionIsMinor"]');
    if (await minor.count()) await minor.selectOption('false').catch((e) => { o.minorErr = flat(e.message, 150); });
    if ((await pub.issueAssignmentGroup(panel).count()) > 0) {
        await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
        o.assignment = "Don't Assign To An Issue";
    }
    await pause(400);
    o.panel = flat(await panel.innerText().catch(() => null), 900);
    if (snap) await snap('publish-panel');
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const question = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
    await question.waitFor({state: 'visible', timeout: T});
    o.question = flat(await question.innerText().catch(() => null), 500);
    if (snap) await snap('publish-question');
    const answered = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
    await question.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await answered;
    o.publishStatus = r ? r.status() : null;
    await rightControls(page).getByRole('button', {name: /^Unpublish$/}).first().waitFor({timeout: T}).catch(() => { o.noUnpublish = true; });
    await idle(page).catch(() => {}); await pause(1000);
    return o;
}

/**
 * OMP main: the header's "Publish" › its window ("Schedule For Publication") › "Publish". Returns
 * the window's text (which names the version stage the press's publish assigns) and the answer.
 */
async function publishWindow(page, snap) {
    const o = {};
    await rightControls(page).getByRole('button', {name: 'Publish', exact: true}).click();
    const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
    await modal.waitFor({state: 'visible', timeout: T});
    await idle(page).catch(() => {}); await pause(600);
    o.window = flat(await modal.innerText().catch(() => null), 900);
    o.stageSelect = (await modal.locator('select[name="versionStage"]').count()) > 0;
    if (snap) await snap('publish-window');
    const answered = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
    await modal.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await answered;
    o.publishStatus = r ? r.status() : null;
    await rightControls(page).getByRole('button', {name: /^Unpublish$/}).first().waitFor({timeout: T}).catch(() => { o.noUnpublish = true; });
    await idle(page).catch(() => {}); await pause(1000);
    return o;
}

/**
 * Any app and line: press the header's publish button on an open Publication page and record
 * what opens (a panel with a "Publication Stage" list, or a window), then leave it with "Cancel"
 * (or "Close") without publishing.
 */
async function readPublishOffer(page, snap) {
    const o = {};
    const button = rightControls(page).getByRole('button', {name: PUBLISH_RE}).first();
    await button.waitFor({timeout: T}).catch(() => {});
    o.button = flat(await button.innerText().catch(() => null), 60);
    if (!o.button) return o;
    await pause(600);
    await button.click();
    const opened = page.locator('[role="dialog"]:visible, [data-cy="active-modal"]:visible')
        .filter({hasText: /Publication Stage|Are you sure|requirements|Select an issue|Publish|Post/}).last();
    await opened.waitFor({state: 'visible', timeout: 10_000}).catch(async () => { o.retried = true; await button.click().catch(() => {}); });
    await opened.waitFor({state: 'visible', timeout: T}).catch(() => { o.nothingOpened = true; });
    await idle(page).catch(() => {}); await pause(1500);
    const sel = page.locator('select[name="versionStage"]:visible');
    o.stageOptions = (await sel.count()) ? await sel.first().evaluate((s) => [...s.options].map((x) => x.innerText.trim()).filter(Boolean)).catch(() => null) : null;
    o.text = flat(await opened.innerText().catch(() => null), 900);
    if (snap) await snap('publish-offer');
    const cancel = opened.getByRole('button', {name: /^(Cancel|Close)$/}).last();
    await cancel.click().catch((e) => { o.cancelErr = flat(e.message, 120); });
    await idle(page).catch(() => {}); await pause(800);
    return o;
}

module.exports = {T, pause, flat, wf, openWorkflow, openEntry, readout, changeLanguage, publishOJS, publishWindow, readPublishOffer};
