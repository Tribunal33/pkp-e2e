// Helpers of walk.js (U49 A11: a review revision's "Summary of Changes" holding markup runs as script
// when the editor opens "Insert Content"; docs/issues/U49-A11-revision-summary-markup-runs-on-insert-content.md).
// Requiring this file runs nothing. Reused: the author's workflow opener and "Upload revisions" button of
// ../author-revisions-upload-offered-then-refused/lib.js, the upload wizard's helpers of
// ../change-file-keeps-first-upload/lib.js, the small file of ../author-update-file-details-offered-then-refused/lib.js.
const {idle, sql} = require('../../../probe');
const A = require('../author-revisions-upload-offered-then-refused/lib.js');
const W = require('../change-file-keeps-first-upload/lib.js');
const L = require('../author-update-file-details-offered-then-refused/lib.js');

const {T, flat, sleep} = W;

/** The "Summary of Changes" editor's body inside the open upload wizard's "2. Review Details". */
const wizardSummary = (page) => W.wizard(page).frameLocator('iframe[id*="summaryOfChanges-control"]').first().locator('body');

/**
 * Put `text` into an open TinyMCE body the way a person does: `how` 'type' types it on the
 * keyboard; 'paste' pastes it with the clipboard holding it as HTML (and as plain text), as a copy
 * from a web page or a word processor gives; 'bold' types it, selects it all (Ctrl+A) and makes it
 * bold (Ctrl+B).
 */
async function enter(page, body, text, how) {
    await body.click();
    if (how === 'type') {
        await page.keyboard.type(text);
    } else if (how === 'paste') {
        await body.evaluate((b, html) => {
            const dt = new DataTransfer();
            dt.setData('text/html', html);
            dt.setData('text/plain', html);
            b.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
        }, text);
    } else if (how === 'bold') {
        await page.keyboard.type(text);
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+b');
    }
    await sleep(300);
    return body.evaluate((b) => b.innerHTML);
}

/**
 * As the signed-in author, on the open workflow: "Upload revisions", the component, `file`,
 * "Continue" to "2. Review Details", `summary` into "Summary of Changes" by `how`, "Continue",
 * "Complete". Returns the editor's HTML before the save and the steps passed.
 */
async function uploadWithSummary(page, component, file, summary, how) {
    await A.uploadRevisionsButton(page).first().click();
    await W.uploadBox(page).waitFor({state: 'attached', timeout: T});
    await idle(page);
    await W.wizard(page).locator('select[id^="genreId"]').selectOption({label: component});
    await W.pick(page, file);
    const dlg = (tab) => page.getByRole('dialog').filter({has: page.getByRole('tab', {name: tab, exact: true})}).last();
    await dlg('2. Review Details').getByRole('button', {name: 'Continue', exact: true}).click();
    await dlg('2. Review Details').getByRole('tab', {name: '2. Review Details', exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
    await idle(page);
    const body = wizardSummary(page);
    await body.waitFor({state: 'visible', timeout: T});
    const label = flat(await W.wizard(page).getByText(/Summary of Changes/).first().innerText().catch(() => null), 80);
    const editorHtml = await enter(page, body, summary, how);
    const saved = page.waitForResponse((r) => /save-metadata|saveMetadata/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dlg('3. Confirm').getByRole('button', {name: 'Continue', exact: true}).click();
    const sr = await saved;
    const request = sr ? {url: sr.request().url(), fields: multipartFields(sr.request().postData() || '')} : null;
    await dlg('3. Confirm').getByRole('tab', {name: '3. Confirm', exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
    await idle(page);
    await dlg('3. Confirm').getByRole('button', {name: 'Complete', exact: true}).click();
    await dlg('3. Confirm').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
    return {label, editorHtml, saveStatus: sr ? sr.status() : null, request};
}

/** The fields of a multipart body, in order, as [name, value] pairs. */
function multipartFields(body) {
    const out = [];
    const re = /name="([^"]+)"\r\n(?:[^\r\n]+\r\n)*\r\n([\s\S]*?)\r\n--/g;
    let m;
    while ((m = re.exec(body))) out.push([m[1], m[2]]);
    return out;
}

/** The request's address and fields as text for the facts, the CSRF token masked. */
function shown(request) {
    if (!request) return null;
    return {
        url: request.url.replace(/^https?:\/\/[^/]+/, ''),
        fields: request.fields.map(([k, v]) => [k, k === 'csrfToken' ? '…' : flat(v, 200)]),
    };
}

/**
 * The author's own browser sends the save the "Review Details" step sent (`request`, from
 * uploadWithSummary) once more, from the signed-in page, with `summaryOfChanges` set to `summary`
 * and every other field as the wizard sent it. Returns the answer.
 */
async function resendSave(page, request, summary) {
    const fields = request.fields.map(([k, v]) => [k, k === 'summaryOfChanges' ? summary : v]);
    const answer = await page.evaluate(async ({url, fields}) => {
        const body = new FormData();
        for (const [k, v] of fields) body.append(k, v);
        const r = await fetch(url, {method: 'POST', body, credentials: 'same-origin'});
        return {status: r.status, body: (await r.text()).slice(0, 300)};
    }, {url: request.url, fields});
    return {sent: shown({url: request.url, fields}), answer};
}

/** The summaries stored on the submission's review revision files (a read for the facts, not a step). */
function storedSummaries(app, submissionId) {
    const rows = sql(app, `select sf.submission_file_id, sf.file_stage, s.setting_value from submission_files sf
        join submission_file_settings s on s.submission_file_id = sf.submission_file_id and s.setting_name = 'summaryOfChanges'
        where sf.submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [id, stage, ...v] = l.split('|'); return {id: Number(id), stage: Number(stage), summary: v.join('|')}; }) : [];
}

/**
 * As the signed-in editor, on the open workflow: the latest version's entry page `entry`
 * ("Publication Settings" / "Catalog Entry"), then "Insert Content" on the English "Summary of
 * Changes" box (after `prepare()`, when given, on the entry page). Returns the panel's text, its items and the alerts raised (`alerts`, filled by the
 * caller's dialog listener) while it opened.
 */
async function openInsertContent(page, frame, entry, alerts, prepare = null) {
    const link = frame.menuLink(entry);
    if (!(await link.last().isVisible().catch(() => false))) await frame.latestVersionNode().click().catch(() => {});
    await link.last().waitFor({state: 'visible', timeout: T});
    await link.last().click();
    await idle(page);
    const box = page.locator('iframe[id*="summaryOfChanges-control-en"]').first();
    await box.waitFor({state: 'visible', timeout: T});
    if (prepare) await prepare();
    await page.frameLocator('iframe[id*="summaryOfChanges-control-en"]').first().locator('body').click();
    const button = page.getByRole('button', {name: 'Insert Content', exact: true});
    await button.first().waitFor({state: 'visible', timeout: T});
    const buttons = await button.count();
    const before = alerts.length;
    await button.first().click();
    const panel = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Insert Content'})}).last();
    await panel.waitFor({state: 'visible', timeout: T});
    await page.getByText('Loading', {exact: false}).last().waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(1500); // an image's error handler fires once the failed load is answered
    return {
        buttons,
        panel: flat(await panel.innerText().catch(() => null), 600),
        items: (await panel.locator('.insertContent__item__value').allInnerTexts()).map((x) => flat(x, 200)),
        alertsWhileOpening: alerts.slice(before),
        panelLocator: panel,
    };
}

/** In the open "Insert Content" panel: "Insert" on the item reading `value`; returns the English box's HTML after. */
async function insertItem(page, panel, value) {
    const item = panel.locator('.insertContent__item').filter({hasText: value}).first();
    await item.getByRole('button', {name: 'Insert', exact: true}).click();
    await panel.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
    return page.frameLocator('iframe[id*="summaryOfChanges-control-en"]').first().locator('body').evaluate((b) => b.innerHTML).catch((e) => `threw ${flat(e.message, 120)}`);
}

/**
 * In the open "Insert Content" panel: "Insert" on the item reading `value`, then at once "Save" on the
 * entry page's form. Returns what the save request sent and answered for the summary, what the box
 * shows after, and the stored value (a read for the facts, not a step).
 */
async function insertThenSave(page, panel, value, app, submissionId) {
    const form = page.locator('form').filter({has: page.locator('iframe[id*="summaryOfChanges-control-en"]')}).first();
    const saved = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    const item = panel.locator('.insertContent__item').filter({hasText: value}).first();
    await item.getByRole('button', {name: 'Insert', exact: true}).click();
    await panel.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    const save = form.getByRole('button', {name: 'Save', exact: true});
    const saveButtons = {count: await save.count(), enabled: await save.first().isEnabled().catch(() => null)};
    await save.first().click();
    const r = await saved.catch(() => null);
    if (!r) {
        return {
            noSaveRequest: true,
            saveButtons,
            formText: flat(await form.innerText().catch(() => null), 1500),
            box: await page.frameLocator('iframe[id*="summaryOfChanges-control-en"]').first().locator('body').evaluate((b) => b.innerHTML).catch(() => null),
        };
    }
    let sentSummary = null;
    try {
        sentSummary = JSON.parse(r.request().postData() || '{}').summaryOfChanges ?? null;
    } catch {
        sentSummary = flat(r.request().postData(), 400);
    }
    let answered = null;
    try {
        answered = (await r.json()).summaryOfChanges ?? null;
    } catch {}
    await idle(page);
    await sleep(500);
    const box = await page.frameLocator('iframe[id*="summaryOfChanges-control-en"]').first().locator('body').evaluate((b) => b.innerHTML).catch((e) => `threw ${flat(e.message, 120)}`);
    const stored = sql(app, `select ps.locale, ps.setting_value from publication_settings ps join submissions s on s.current_publication_id = ps.publication_id
        where s.submission_id = ${Number(submissionId)} and ps.setting_name = 'summaryOfChanges' order by 1`);
    return {status: r.status(), sentSummary, answered, box, stored};
}

module.exports = {insertThenSave, T, flat, sleep, smallFile: L.smallFile, openAuthor: A.openWorkflow, enter, uploadWithSummary, multipartFields, shown, resendSave, storedSummaries, openInsertContent, insertItem};
