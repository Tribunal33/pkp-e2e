// Helpers of walk.js (U47 A4 and U36 A21: a file over PHP's request limit, on "Upload Media File"
// and in the submission wizard's files panel; joined to
// docs/issues/U09-A18-picture-over-request-limit-server-error.md). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle, signIn} = require('../../../probe');
const P = require('../picture-over-upload-limit-server-error/lib');

const T = 30_000;
const MIB = 1024 * 1024;
const {sleep, flat} = P;

/** A file of exactly `bytes`, named `name`, under <dir>/files (a PDF header, then filler). */
function sized(dir, name, bytes) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, name);
    if (!fs.existsSync(f) || fs.statSync(f).size !== bytes) {
        const b = Buffer.alloc(bytes, 0x20);
        b.write('%PDF-1.4\n%u47r3\n', 0);
        fs.writeFileSync(f, b);
    }
    return f;
}

/** A small real PNG padded after its end to exactly `bytes` (browsers and Dropzone read it by its name). */
function pngSized(dir, name, bytes) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, name);
    if (!fs.existsSync(f) || fs.statSync(f).size !== bytes) {
        const head = P.png(40, 30, false);
        fs.writeFileSync(f, Buffer.concat([head, Buffer.alloc(bytes - head.length, 0)]));
    }
    return f;
}

/** A real PNG of about `mb` MB (random pixels, stored), under <dir>/files. */
function photo(dir, name, w, h) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const f = path.join(d, name);
    if (!fs.existsSync(f)) fs.writeFileSync(f, P.png(w, h, true));
    return f;
}

/** The walk's files: three PNGs (about 9, 3 and 1 MB) and three PDF-named files of 8 MiB exactly, 9 MiB and 1 MiB. */
function makeFiles(dir) {
    const files = {
        png9: photo(dir, 'u47r3-figure-9mb.png', 1800, 1700),
        png3: photo(dir, 'u47r3-figure-3mb.png', 1100, 950),
        png1: photo(dir, 'u47r3-figure-1mb.png', 600, 560),
        exact8: sized(dir, 'u47r3-manuscript-8mib.pdf', 8 * MIB),
        over9: sized(dir, 'u47r3-manuscript-9mib.pdf', 9 * MIB),
        small1: sized(dir, 'u47r3-manuscript-1mib.pdf', 1 * MIB),
        mid15: sized(dir, 'u47r3-manuscript-1_5mib.pdf', 1.5 * MIB),
        half: sized(dir, 'u47r3-manuscript-0_5mib.pdf', 0.5 * MIB),
        logo8: pngSized(dir, 'u47r3-logo-8mib.png', 8 * MIB),
        logo1: pngSized(dir, 'u47r3-logo-1mib.png', 1 * MIB),
    };
    for (const k of Object.keys(files)) files[k] = {path: files[k], name: path.basename(files[k]), bytes: fs.statSync(files[k]).size};
    return files;
}

/**
 * Steps 2–4 of the media part: open the submission's workflow, the side menu's "Media" under the
 * newest version, and "Add Media File". Returns the "Upload Media File" window.
 */
async function openMediaUpload(page, app, submissionId, origin) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, UploadMediaWindow} = require('../../../pages/MediaFilesPages.js');
    const labels = app.name === 'ops' ? {publicationGroup: 'Preprint'} : {};
    const wf = new WorkflowPage(page, app.contextPath, {labels});
    await page.goto(`${origin}${wf.editorialUrl(submissionId)}`);
    await wf.expectOpen(submissionId);
    await idle(page);
    await wf.selectPage('Media');
    await idle(page);
    const mfm = new MediaFileManager(page, wf);
    await mfm.addButton().waitFor({timeout: T});
    await mfm.addButton().click();
    const win = new UploadMediaWindow(page);
    await win.expectOpen();
    return win;
}

/**
 * Steps 5–6: "Click to upload files" with `file`; the upload's answer and the file's card once it
 * shows either the media-type list (uploaded) or an error line.
 */
async function mediaUpload(page, win, file) {
    const answered = page.waitForResponse((r) => /\/api\/v1\/temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    await win.chooseFiles([file.path]);
    const r = await answered.catch(() => null);
    const body = r ? flat(await r.text().catch(() => null), 300) : null;
    const card = win.card(file.name);
    const t0 = Date.now();
    let cardText = null;
    let uploaded = false;
    while (Date.now() - t0 < 20_000) {
        uploaded = (await win.mediaTypeSelect(file.name).count()) > 0;
        cardText = flat(await card.innerText().catch(() => null), 400);
        if (uploaded || (cardText && !/%/.test(cardText) && cardText !== file.name && cardText.replace(file.name, '').trim())) break;
        await sleep(250);
    }
    await sleep(300);
    cardText = flat(await card.innerText().catch(() => null), 400);
    const submit = win.uploadFilesButton();
    const uploadFilesEnabled = (await submit.count()) ? await submit.isEnabled() : null;
    return {status: r ? r.status() : null, body, cardText, uploaded, uploadFilesEnabled};
}

/**
 * Steps 1–2 of the files part on `origin`: sign in, "Make a Submission" with `title`, the required
 * boxes, the first choice of any unanswered radio group (the language, a press's work type),
 * "Begin Submission". Lands on "Upload Files"; returns the submission's id.
 */
async function startSubmission(page, app, origin, user, title) {
    await signIn(page, user, {origin});
    const lang = /3_[34]/.test(app.line || '') ? '' : '/en';
    await page.goto(`${origin}/index.php/${app.contextPath}${lang}/submission`);
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await idle(page);
    const body = page.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
    await body.click();
    await body.fill(title);
    for (const box of [page.getByRole('checkbox', {name: /meets all of these requirements/}), page.getByRole('checkbox', {name: /agree to have my data collected/})]) {
        if (await box.count()) await box.check();
    }
    const radios = await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
    const groups = {};
    for (const x of radios) (groups[x.name] ||= []).push(x);
    for (const [g, list] of Object.entries(groups)) if (!list.some((x) => x.checked)) await page.locator(`input[type=radio][name="${g}"]`).first().check();
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
    const current = page.locator('.pkpSteps__step__label--current');
    await current.waitFor({timeout: T});
    await idle(page);
    // 3.5 opens on "Details": "Continue" in the footer (the steps say so in a bracket).
    if (!/Upload Files/.test(await current.innerText())) {
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
    }
    await current.filter({hasText: 'Upload Files'}).waitFor({timeout: T});
    await idle(page);
    return Number(new URL(page.url()).searchParams.get('id'));
}

/**
 * Step 3–4 of the files part: "Add File" with `file`, then the panel's text once the file's row
 * settled (a link, an error, or a refusal in the browser). `request` says whether an upload was sent.
 */
async function panelUpload(page, file) {
    const panel = page.locator('.submissionFilesListPanel');
    let sent = null;
    const onReq = (q) => { if (/\/submissions\/\d+\/files(\?|$)/.test(q.url()) && q.method() === 'POST') sent = q; };
    page.on('request', onReq);
    const answered = page.waitForResponse((r) => /\/submissions\/\d+\/files(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000})
    answered.catch(() => null); // a file refused in the browser sends nothing: no answer comes
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), panel.getByRole('button', {name: 'Add File', exact: true}).first().click()]);
    await chooser.setFiles(file.path);
    const t0 = Date.now();
    let r = null;
    while (Date.now() - t0 < 60_000) {
        const text = await panel.innerText().catch(() => '');
        if (/File is too big/.test(text) && !sent) break;
        r = await Promise.race([answered, sleep(250).then(() => null)]).catch(() => null);
        if (r) break;
    }
    page.off('request', onReq);
    await sleep(1500);
    await idle(page);
    const body = r ? flat(await r.text().catch(() => null), 300) : null;
    const text = flat(await panel.innerText().catch(() => null), 900);
    return {sent: !!sent, status: r ? r.status() : null, body, panel: text};
}

/**
 * Settings › Website › "Appearance" › "Setup", the "Logo" box's "Upload File" with `file`: whether an
 * upload was sent, its answer, and the box's text once it settled (a refusal, an error or the file).
 */
async function logoUpload(page, app, origin, file) {
    const lang = /3_[34]/.test(app.line || '') ? '' : '/en';
    await page.goto(`${origin}/index.php/${app.contextPath}${lang}/management/settings/website`);
    await idle(page);
    await page.locator('[id="appearance-button"]').first().click();
    const side = page.locator('[id="appearance-setup-button"]').first();
    await side.waitFor({timeout: T});
    await side.click();
    await idle(page);
    const button = page.locator('[id="appearanceSetup-pageHeaderLogoImage-clickable-en"]');
    await button.waitFor({timeout: T});
    const control = page.locator('[id="appearanceSetup-pageHeaderLogoImage-control-en"]');
    const field = control.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " pkpFormField ")][1]');
    let sent = null;
    const onReq = (q) => { if (/\/temporaryFiles/.test(q.url()) && q.method() === 'POST') sent = q; };
    page.on('request', onReq);
    const answered = page.waitForResponse((r) => /\/temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    answered.catch(() => null);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), button.click()]);
    await chooser.setFiles(file.path);
    const t0 = Date.now();
    let r = null;
    while (Date.now() - t0 < 60_000) {
        const text = await field.innerText().catch(() => '');
        if (/too big|larger than/i.test(text) && !sent) break;
        r = await Promise.race([answered, sleep(250).then(() => null)]).catch(() => null);
        if (r) break;
    }
    page.off('request', onReq);
    await sleep(1500);
    const body = r ? flat(await r.text().catch(() => null), 300) : null;
    return {sent: !!sent, status: r ? r.status() : null, body, field: flat(await field.innerText().catch(() => null), 500)};
}

/** A file's row "Cancel upload" / "Remove" when the panel offers one, so the next upload starts clean. */
async function clearRow(page, name) {
    const panel = page.locator('.submissionFilesListPanel');
    const row = panel.locator('li, .listPanel__item').filter({hasText: name}).first();
    for (const label of ['Cancel upload', 'Remove']) {
        const b = row.getByRole('button', {name: label}).first();
        if (await b.count()) {
            await b.click().catch(() => {});
            const yes = page.getByRole('dialog').getByRole('button', {name: 'Yes', exact: true});
            if (await yes.count().catch(() => 0)) await yes.first().click().catch(() => {});
            await sleep(800);
            await idle(page);
            return label;
        }
    }
    return null;
}

module.exports = {T, MIB, sleep, flat, makeFiles, openMediaUpload, mediaUpload, startSubmission, panelUpload, logoUpload, clearRow, startServer: P.startDefaultLimitsServer};
