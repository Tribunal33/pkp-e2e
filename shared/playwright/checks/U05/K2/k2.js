// U05 claim check, chunk K2 — what the Notifications tab's boxes do and the
// roster of events (docs/process/briefs/claim-check.md).
//
// Drives, per app, on its own scratch context: the box round trip on the
// "…needs to be assigned." row (Rule 5c), three wizard submissions as the
// Author (scenario 3: "Enable…" unticked → no task, email anyway [A10];
// re-ticked → task and email again [5a/5c]; scenario 4: the email box ticked
// → task, no email [5b]), a discussion and its replies with the "Discussion
// activity." control (Rule 6 rows, A1), a context announcement without and
// with its email box and the OJS issue email with "Enable…" unticked on
// another Manager (Rule 5a/5b, rows 260–261), the site-level tab for a
// two-journal Manager, a one-journal Manager and admin plus a second journal's
// own set (Rule 5d) and a site announcement (A4), registration presets (Rule
// 5e), a Section Editor assigned to the section before a wizard submission
// (row 263, U21 A8's premise), a publish through the workflow on OMP and OPS
// (row 264) and a review on OJS and OMP (row 268).
//
//   PROBE_FEATURE=U05 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U05/K2/k2.js
//   PHASES=tab,subA … re-runs named phases on the saved scratch context.
//
// No assertions: every screen is recorded with screen()/shot(); the summary
// per app is `k2-summary-<app>.json` in the agent's output folder.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir, outFile} =
    require('../../../probe');
const {runJobs} = require('../../../support/jobs');

const REPO = path.resolve(__dirname, '../../../../..');
const FIXTURES = {
    ojs: path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf'),
    ops: path.join(REPO, 'apps/ops/playwright/fixtures/files/preprint.pdf'),
};
const SCRATCH_FILE = outFile(`k2-scratch-${process.env.PROBE_APPS}.json`);
const scratchAll = fs.existsSync(SCRATCH_FILE) ? JSON.parse(fs.readFileSync(SCRATCH_FILE, 'utf8')) : {};
const ONLY_PHASES = process.env.PHASES ? process.env.PHASES.split(',') : null;
const email = (u) => `${u}@mail.test`;

function saveScratch() {
    fs.writeFileSync(SCRATCH_FILE, JSON.stringify(scratchAll, null, 2));
}

async function safeScreen(page) {
    try {
        return await screen(page);
    } catch (error) {
        return {url: page.url(), screenError: String(error.message).split('\n')[0]};
    }
}

// ---------------------------------------------------------------- tab helpers
async function readTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({timeout: 15000});
    return form.evaluate((f) => {
        const order = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
        const boxes = [...f.querySelectorAll('input[type=checkbox]')];
        const sections = [...new Set(boxes.map((b) => b.closest('.section')))].filter(Boolean);
        const items = [...f.querySelectorAll('h4'), ...sections].sort(order);
        const out = {groups: [], rows: []};
        let group = null;
        for (const el of items) {
            if (el.tagName === 'H4') {
                group = el.innerText.trim();
                out.groups.push(group);
                continue;
            }
            const labelEl = el.querySelector(':scope > ul > label:not([for]), :scope > .label, :scope > label:not([for])');
            const row = {group, sentence: labelEl ? labelEl.innerText.trim() : null, boxes: []};
            for (const input of el.querySelectorAll('input[type=checkbox]')) {
                row.boxes.push({id: input.id, checked: input.checked, disabled: input.disabled});
            }
            out.rows.push(row);
        }
        return out;
    });
}

function tabSummary(tab) {
    return tab.rows.map((r) => ({group: r.group, sentence: r.sentence, enable: r.boxes[0] && r.boxes[0].checked, email: r.boxes[1] && r.boxes[1].checked, emailDisabled: r.boxes[1] && r.boxes[1].disabled, ids: r.boxes.map((b) => b.id)}));
}

async function selectedTab(page) {
    return page.locator('[role="tab"][aria-selected="true"], .ui-tabs-active a').first().innerText().catch(() => null);
}

async function openTab(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/user/profile/notificationSettings`));
    await idle(page);
    return readTab(page);
}

function findRow(tab, regex) {
    return tab.rows.find((r) => regex.test(r.sentence || ''));
}

/** Press Save, wait for the form's POST, and describe the toast (text, position, left edge, how long it stayed). */
async function saveTab(page) {
    const form = page.locator('form#notificationSettingsForm');
    const action = await form.getAttribute('action');
    const saved = page.waitForResponse((r) => r.url().startsWith(action.split('?')[0]) && r.request().method() === 'POST', {timeout: 20000});
    const pressedAt = Date.now();
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const status = (await saved).status();
    const toast = page.locator('.pkpNotification').last();
    const out = {status};
    try {
        await toast.waitFor({timeout: 10000});
        out.toast = {
            text: (await toast.innerText()).replace(/\s+/g, ' ').trim(),
            classes: await toast.getAttribute('class'),
            box: await toast.boundingBox(),
            viewport: page.viewportSize(),
            borderLeft: await toast.evaluate((e) => {
                const s = getComputedStyle(e);
                return `${s.borderLeftWidth} ${s.borderLeftStyle} ${s.borderLeftColor}`;
            }),
        };
        await toast.waitFor({state: 'hidden', timeout: 20000});
        out.toast.goneAfterSeconds = (Date.now() - pressedAt) / 1000;
    } catch (error) {
        out.toastProblem = String(error.message).split('\n')[0];
    }
    return out;
}

async function recordTab(page, app, contextPath, name) {
    const tab = await openTab(page, app, contextPath);
    await shot(page, name);
    record(name, {...(await safeScreen(page)), selectedTab: await selectedTab(page), tab: tabSummary(tab)});
    return tab;
}

/**
 * As the signed-in user: open the tab, set the row's boxes, record the state
 * before Save, save, reload and record the state after. `enable`/`email`
 * undefined = leave as is.
 */
async function setRow(page, app, contextPath, rowRegex, {enable, email: emailBox}, name) {
    const tab = await openTab(page, app, contextPath);
    const row = findRow(tab, rowRegex);
    if (!row) throw new Error(`setRow: no row matching ${rowRegex}`);
    const form = page.locator('form#notificationSettingsForm');
    const enableBox = form.locator(`#${row.boxes[0].id}`);
    const mailBox = form.locator(`#${row.boxes[1].id}`);
    const out = {sentence: row.sentence, ids: row.boxes.map((b) => b.id), before: row.boxes};
    if (enable !== undefined && (await enableBox.isChecked()) !== enable) await enableBox.setChecked(enable);
    if (emailBox !== undefined && (await mailBox.isChecked()) !== emailBox) {
        if (await mailBox.isDisabled()) out.emailBoxDisabledSoNotSet = true;
        else await mailBox.setChecked(emailBox);
    }
    out.beforeSave = findRow(await readTab(page), rowRegex).boxes;
    await shot(page, `${name}-before-save`);
    record(`${name}-before-save`, {...(await safeScreen(page)), row: out.beforeSave});
    out.save = await saveTab(page);
    const after = await openTab(page, app, contextPath);
    out.afterReload = findRow(after, rowRegex).boxes;
    await shot(page, `${name}-after-reload`);
    record(`${name}-after-reload`, {...(await safeScreen(page)), row: out.afterReload, tab: tabSummary(after)});
    return out;
}

// ------------------------------------------------------------ Tasks helpers
async function tasksWindow(page, app, contextPath, name, dashboard = 'dashboard/editorial') {
    await page.goto(app.url(`/index.php/${contextPath}/${dashboard}`));
    const bell = page.getByRole('button', {name: /^Tasks/});
    await bell.waitFor({timeout: 30000});
    const bellText = (await bell.innerText()).replace(/\s+/g, ' ').trim();
    await bell.click();
    const dialog = page.locator('[role="dialog"]:visible').last();
    await dialog.waitFor({timeout: 30000});
    await dialog.getByText('Mark New').waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    const rows = await dialog.locator('tr.gridRow').evaluateAll((els) => els.map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), unread: !!e.querySelector('.unread')})));
    const gridText = (await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 600);
    await shot(page, name);
    record(name, {...(await safeScreen(page)), bellText, rows, gridText});
    await page.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
    return {bellText, rows, noItems: /No Items/.test(gridText)};
}

// ------------------------------------------------------------- mail helpers
async function describeMessage(app, m) {
    const full = await app.mail.fullMessage(m.ID);
    let headers = null;
    try {
        headers = await app.mail._get(`/api/v1/message/${m.ID}/headers`);
    } catch {
        headers = null;
    }
    const text = full.Text || '';
    const html = full.HTML || '';
    const htmlLinks = [...html.matchAll(/<a\b[^>]*href=(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => ({href: x[2].replace(/&amp;/g, '&'), text: x[3].replace(/<[^>]+>/g, '').trim()}));
    const unsubscribeLink = app.mail.extractLink(html, /^unsubscribe$/i) || app.mail.extractLink(html, /unsubscribe/i);
    return {
        found: true,
        id: m.ID,
        created: m.Created,
        subject: m.Subject,
        from: m.From,
        to: m.To,
        textHead: text.slice(0, 400),
        textTail: text.slice(-500),
        hasDashLine: /\n—\s*\n/.test(text) || text.includes('\n—'),
        unsubscribeWord: /unsubscribe/i.test(text),
        unsubscribeLink,
        htmlLinks,
        listUnsubscribe: headers && headers['List-Unsubscribe'] ? headers['List-Unsubscribe'] : null,
        listUnsubscribePost: headers && headers['List-Unsubscribe-Post'] ? headers['List-Unsubscribe-Post'] : null,
    };
}

async function mailFor(app, to, contains, timeoutMs = 20000) {
    try {
        const m = await app.mail.find({to, contains, timeoutMs});
        return describeMessage(app, m);
    } catch (error) {
        return {found: false, error: String(error.message).split('\n')[0]};
    }
}

async function mailCount(app, to, contains) {
    try {
        return await app.mail.count({to, contains});
    } catch (error) {
        return `error: ${String(error.message).split('\n')[0]}`;
    }
}

function drainJobs(app) {
    process.env.PKP_CONFIG_FILE = app.configFile;
    const out = runJobs({appRoot: app.root});
    return out.split('\n').filter((l) => l.trim()).slice(-8).join('\n');
}

function onProbeServer(app, link) {
    return link.replace(/^https?:\/\/[^/]+/, app.baseURL);
}

// ----------------------------------------------------------- wizard helpers
function currentStep(page) {
    return page.locator('.pkpSteps__step__label--current');
}

async function continueTo(page, label) {
    const button = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
    for (let attempt = 0; ; attempt++) {
        await button.click();
        try {
            await currentStep(page).filter({hasText: label}).waitFor({timeout: 5000});
            return;
        } catch (error) {
            if (attempt >= 2) throw error;
        }
    }
}

async function openReview(page) {
    const validated = page.waitForResponse((r) => r.url().includes('/submit') && r.request().method() === 'POST' && r.status() < 500, {timeout: 45000});
    await continueTo(page, 'Review');
    await validated;
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
}

async function uploadWizardFile(page, app, marker) {
    if (app.name === 'ojs') {
        const [chooser] = await Promise.all([
            page.waitForEvent('filechooser'),
            page.getByRole('button', {name: 'Add File', exact: true}).click(),
        ]);
        await chooser.setFiles(FIXTURES.ojs);
        await page.getByRole('button', {name: 'Article Text', exact: true}).click();
        await page.locator('.listPanel__item--submissionFile').filter({hasText: 'article.pdf'}).getByText('Article Text').waitFor({timeout: 30000});
    } else if (app.name === 'omp') {
        await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles({name: `ms-${marker}.txt`, mimeType: 'text/plain', buffer: Buffer.from(`Manuscript ${marker}`)});
        const genreButton = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button', {name: 'Book Manuscript', exact: true});
        await genreButton.waitFor({timeout: 30000});
        const saved = page.waitForResponse((r) => r.url().includes('/files/') && r.ok());
        await genreButton.click();
        await saved;
        await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: 'Book Manuscript'}).first().waitFor({timeout: 20000});
    } else {
        const labelDialog = page.getByRole('dialog').filter({has: page.locator('#preprintGalleyForm')});
        await idle(page);
        for (let attempt = 0; ; attempt++) {
            await page.getByRole('link', {name: 'Add File', exact: true}).click();
            try {
                await labelDialog.first().waitFor({timeout: 5000});
                break;
            } catch (error) {
                if (attempt >= 2) throw error;
            }
        }
        await labelDialog.locator('input[name="label"]').fill('PDF');
        await labelDialog.getByRole('button', {name: 'Save', exact: true}).click();
        const upload = page.getByRole('dialog').filter({has: page.locator('div[id^="fileUploadWizard"]')});
        const genreSelect = upload.locator('select[name="genreId"]').first();
        await genreSelect.waitFor({timeout: 30000});
        await genreSelect.selectOption({label: 'Preprint Text'});
        await upload.locator('input[type="file"]').setInputFiles(FIXTURES.ops);
        const cont = upload.getByRole('button', {name: 'Continue', exact: true});
        await cont.waitFor({timeout: 30000});
        await page.waitForFunction(() => {
            const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Continue');
            return b && !b.disabled;
        }, null, {timeout: 30000});
        await cont.click();
        await upload.getByRole('tab', {name: '2. Review Details'}).waitFor({timeout: 30000});
        await upload.getByRole('button', {name: 'Continue', exact: true}).click();
        await upload.getByRole('tab', {name: '3. Confirm'}).waitFor({timeout: 30000});
        await upload.getByRole('button', {name: 'Complete', exact: true}).click();
        await upload.waitFor({state: 'hidden', timeout: 30000});
        await idle(page);
        await page.locator('.submissionWizard').getByRole('link', {name: 'PDF'}).first().waitFor({timeout: 20000});
    }
}

/** Walk a seeded draft through the wizard as the signed-in Author. */
async function submitThroughWizard(page, app, contextPath, submissionId, marker, name) {
    await page.goto(app.url(`/index.php/${contextPath}/submission?id=${submissionId}`));
    await page.getByRole('heading', {name: /Make a Submission/}).waitFor({timeout: 30000});
    await currentStep(page).filter({hasText: 'Upload Files'}).waitFor({timeout: 30000});
    await uploadWizardFile(page, app, marker);
    await continueTo(page, 'Details');
    await continueTo(page, 'Contributors');
    if (app.name === 'ops') {
        await continueTo(page, 'For Readers');
        await page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'}).check();
    } else {
        await continueTo(page, 'For the Editors');
    }
    await openReview(page);
    const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
    await submit.click();
    const dialog = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
    await dialog.waitFor({timeout: 30000});
    const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    const pressedAt = new Date();
    await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
    await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45000});
    record(name, {...(await safeScreen(page)), dialogText, pressedAt: pressedAt.toISOString()});
    await shot(page, name);
    return {dialogText, pressedAt: pressedAt.toISOString()};
}

/** Seed a draft and submit it through the wizard as the Author; returns the seed and the wizard result. */
async function authorSubmits(page, app, scratch, suffix, name) {
    const title = `Needs editor ${scratch.tag}${suffix}`;
    const seeded = await app.api.createSubmission({tag: `${scratch.tag}${suffix}`, context: scratch.path, submitter: scratch.au, title, submitted: false, participants: []});
    await signIn(page, scratch.au);
    const wizard = await submitThroughWizard(page, app, scratch.path, seeded.submissionId, `${scratch.tag}${suffix}`, name);
    await signOut(page);
    return {title, submissionId: seeded.submissionId, wizard};
}

// ------------------------------------------------------- discussion helpers
async function discussionPanel(page) {
    const panel = page.locator('[data-cy="discussion-manager"]').first();
    try {
        await panel.waitFor({timeout: 15000});
    } catch {
        // OPS Author's view: the panel sits behind the side-menu entry.
        const entry = page.getByRole('link', {name: /Tasks & Discussions/}).or(page.getByRole('button', {name: /Tasks & Discussions/})).first();
        await entry.click();
        await panel.waitFor({timeout: 30000});
    }
    return panel;
}

/** As the signed-in Manager: open a discussion on the submission with the matching participants ticked. */
async function openDiscussion(page, app, contextPath, submissionId, discussionName, message, participantRegexes, name) {
    await page.goto(app.url(`/index.php/${contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    const panel = await discussionPanel(page);
    const panelHeading = await panel.locator('h2, h3, h4').first().innerText().catch(() => null);
    record(`${name}-workflow-${app.name}`, {...(await safeScreen(page)), panelHeading});
    await shot(page, `${name}-workflow-${app.name}`);
    await panel.getByRole('button', {name: 'Add', exact: true}).click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    await modal.locator('input[name="title"]').waitFor({timeout: 30000});
    await modal.locator('input[name="participants"]').first().waitFor({timeout: 30000});
    const participants = await modal.locator('input[name="participants"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: (e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || null})));
    const modalText = (await modal.innerText()).replace(/\s+/g, ' ');
    record(`${name}-form-${app.name}`, {...(await safeScreen(page)), participants, modalText: modalText.slice(0, 3000)});
    await shot(page, `${name}-form-${app.name}`);
    await modal.locator('input[name="title"]').fill(discussionName);
    const ticked = [];
    for (const p of participants) {
        if (participantRegexes.some((re) => re.test(p.label || '')) && !p.checked) {
            await modal.locator(`input[name="participants"][value="${p.value}"]`).check();
            ticked.push(p.label);
        }
    }
    const frame = modal.frameLocator('iframe').last();
    await frame.locator('body').click();
    await frame.locator('body').fill(message);
    const saveResponse = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/tasks$/.test(r.url().split('?')[0]) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    const pressedAt = new Date();
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const errorDialog = page.getByRole('dialog', {name: 'Error'});
    const outcome = await Promise.race([
        errorDialog.waitFor({timeout: 30000}).then(() => 'error'),
        modal.waitFor({state: 'hidden', timeout: 30000}).then(() => 'saved'),
    ]).catch(() => 'timeout');
    const response = await saveResponse;
    const result = {outcome, pressedAt: pressedAt.toISOString(), ticked, participants, saveStatus: response ? response.status() : null, panelHeading, modalHasEmailChoice: /e-?mail/i.test(modalText)};
    if (outcome === 'error') {
        result.errorDialog = await errorDialog.innerText();
        record(`${name}-save-error-${app.name}`, await safeScreen(page));
        await shot(page, `${name}-save-error-${app.name}`);
        await errorDialog.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
        await modal.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    } else {
        await panel.getByText(discussionName).first().waitFor({timeout: 30000}).catch(() => {});
        record(`${name}-after-save-${app.name}`, await safeScreen(page));
        await shot(page, `${name}-after-save-${app.name}`);
    }
    return result;
}

/** As the signed-in user: open the named discussion from the given workflow view and add a message. */
async function replyToDiscussion(page, app, contextPath, submissionId, discussionName, replyText, dashboard, name) {
    await page.goto(app.url(`/index.php/${contextPath}/${dashboard}?workflowSubmissionId=${submissionId}`));
    const panel = await discussionPanel(page);
    await panel.getByText(discussionName).first().waitFor({timeout: 30000});
    await panel.getByText(discussionName).first().click();
    const modal = page.locator('[data-cy="active-modal"]').last();
    await modal.getByRole('button', {name: 'Add New Message', exact: true}).waitFor({timeout: 30000});
    const out = {modalText: (await modal.innerText()).replace(/\s+/g, ' ').slice(0, 2000)};
    record(`${name}-display-${app.name}`, {...(await safeScreen(page)), modalText: out.modalText});
    await shot(page, `${name}-display-${app.name}`);
    await modal.getByRole('button', {name: 'Add New Message', exact: true}).click();
    const frame = modal.frameLocator('iframe').last();
    await frame.locator('body').waitFor({timeout: 30000});
    await frame.locator('body').click();
    await frame.locator('body').fill(replyText);
    const saved = page.waitForResponse((r) => /\/tasks\/\d+/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: 30000}).catch(() => null);
    out.pressedAt = new Date().toISOString();
    await modal.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await saved;
    out.replyStatus = response ? response.status() : null;
    out.replyUrl = response ? `${response.request().method()} ${response.url().replace(/^https?:\/\/[^/]+/, '')}` : null;
    const errorDialog = page.getByRole('dialog', {name: 'Error'});
    out.outcome = await Promise.race([
        errorDialog.waitFor({timeout: 15000}).then(() => 'error'),
        modal.getByRole('button', {name: 'Add New Message', exact: true}).waitFor({timeout: 15000}).then(() => 'saved'),
    ]).catch(() => 'neither');
    if (out.outcome === 'error') {
        out.errorDialog = await errorDialog.innerText();
        await errorDialog.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
    }
    record(`${name}-after-${app.name}`, {...(await safeScreen(page)), out});
    await shot(page, `${name}-after-${app.name}`);
    await modal.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
    return out;
}

// ---------------------------------------------------- announcement helpers
async function enableAnnouncements(page, app, contextPath, name) {
    await page.goto(app.url(`/index.php/${contextPath}/management/settings/website`));
    await page.locator('#setup-button').waitFor({timeout: 30000});
    await page.locator('#setup-button').click();
    const annTab = page.getByRole('tab', {name: 'Announcements', exact: true});
    await annTab.waitFor({timeout: 15000});
    await annTab.click();
    const box = page.getByRole('checkbox', {name: /Enable announcements/i});
    await box.waitFor({timeout: 15000});
    const form = box.locator('xpath=ancestor::form[1]');
    const wasChecked = await box.isChecked();
    record(`${name}-settings-${app.name}`, {...(await safeScreen(page)), wasChecked});
    if (wasChecked) return {wasChecked};
    await box.check();
    const saved = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/api\/v1\/contexts/.test(r.url()), {timeout: 20000});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    return {wasChecked, saveStatus: (await saved).status()};
}

async function addAnnouncement(page, app, listUrl, title, sendEmail, name) {
    await page.goto(app.url(listUrl));
    const add = page.getByRole('button', {name: /Add Announcement/i}).first();
    await add.waitFor({timeout: 30000});
    await add.click();
    const sendBox = page.getByRole('checkbox', {name: 'Send an email about this to all registered users.'});
    await sendBox.waitFor({timeout: 30000});
    const form = sendBox.locator('xpath=ancestor::form[1]');
    const titleInput = form.locator('input[name^="title"], input[id^="title"]').first();
    await titleInput.waitFor({timeout: 15000});
    const sendDefault = await sendBox.isChecked();
    await titleInput.fill(title);
    const body = form.frameLocator('iframe').first().locator('body');
    await body.click();
    await body.fill(`Short description ${title}`);
    if (sendEmail && !(await sendBox.isChecked())) await sendBox.check();
    record(`${name}-form-${app.name}`, {...(await safeScreen(page)), sendDefault, sendEmail});
    await shot(page, `${name}-form-${app.name}`);
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/announcements/.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const response = await posted;
    await form.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
    record(`${name}-after-save-${app.name}`, await safeScreen(page));
    return {title, sendDefault, postStatus: response ? response.status() : null};
}

// ------------------------------------------------------------ registration
async function registerOn(page, app, registerPath, username, {emailConsent, contextBoxes = true}, name) {
    await page.goto(app.url(registerPath));
    await page.locator('#username').waitFor({timeout: 30000});
    await page.locator('#givenName').fill('Reg');
    await page.locator('#familyName').fill(username.slice(-2).toUpperCase());
    await page.locator('#affiliation').fill('Scratch University').catch(() => {});
    await page.locator('#country').selectOption('CZ').catch(() => {});
    await page.locator('#email').fill(email(username));
    await page.locator('#username').fill(username);
    for (const id of ['#password', '#password2']) {
        const field = page.locator(id);
        await field.evaluate((e) => e.removeAttribute('maxlength'));
        await field.fill(`${username}${username}`);
    }
    const consentBoxes = page.locator('input[name^="privacyConsent"]');
    const consentCount = await consentBoxes.count();
    if (contextBoxes) {
        for (let i = 0; i < consentCount; i++) await consentBoxes.nth(i).check();
    }
    const emailBox = page.locator('input[name="emailConsent"]');
    const emailConsentPresent = await emailBox.count();
    const emailConsentDefault = emailConsentPresent ? await emailBox.isChecked() : null;
    if (emailConsentPresent && emailConsent !== undefined) await emailBox.setChecked(emailConsent);
    record(`${name}-form-${app.name}`, {...(await safeScreen(page)), consentCount, emailConsentPresent, emailConsentDefault});
    await shot(page, `${name}-form-${app.name}`);
    await page.getByRole('button', {name: 'Register', exact: true}).click();
    await page.waitForLoadState('domcontentloaded');
    await page.getByText(/Registration complete|Registration/).first().waitFor({timeout: 30000}).catch(() => {});
    const landing = {url: page.url(), title: await page.title(), errors: await page.locator('.pkp_form_error, .error, [id$="-error"], .formError').allInnerTexts().catch(() => [])};
    record(`${name}-landing-${app.name}`, {...(await safeScreen(page)), ...landing});
    await shot(page, `${name}-landing-${app.name}`);
    return {consentCount, emailConsentPresent, emailConsentDefault, landing};
}

// --------------------------------------------------------------------- main
forEachApp(async (app) => {
    const summary = {app: app.name, problems: [], skipped: []};
    let scratch = scratchAll[app.name];
    if (!scratch) {
        const t = tag('u05k2');
        const users = [
            {username: `${t}m1`, givenName: 'Mira', familyName: 'ManagerOne', roles: ['manager']},
            {username: `${t}m2`, givenName: 'Milo', familyName: 'ManagerTwo', roles: ['manager']},
            {username: `${t}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']},
            {username: `${t}rd`, givenName: 'Rita', familyName: 'Reader', roles: ['reader']},
        ];
        const spec = {tag: t, users};
        // A Section Editor assigned to the one section (row 263: automatic assignment on a scratch journal).
        if (app.name === 'ojs') {
            spec.sections = [{abbrev: 'ART', title: 'Articles'}];
            users.push({username: `${t}se`, givenName: 'Sena', familyName: 'SectionEd', roles: ['sectionEditor'], sections: ['ART']});
        } else if (app.name === 'ops') {
            spec.sections = [{abbrev: 'PRE', title: 'Preprints'}];
            users.push({username: `${t}se`, givenName: 'Sena', familyName: 'SectionEd', roles: ['sectionEditor'], sections: ['PRE']});
        } else {
            users.push({username: `${t}se`, givenName: 'Sena', familyName: 'SectionEd', roles: ['sectionEditor']});
        }
        const created = await app.api.createContext(spec);
        scratch = {tag: t, path: created.path || t, contextId: created.contextId, m1: `${t}m1`, m2: `${t}m2`, au: `${t}au`, rd: `${t}rd`, se: `${t}se`, created};
        // Discussion carrier (submitted, nobody assigned).
        scratch.discussion = await app.api.createSubmission({tag: `${t}d`, context: scratch.path, submitter: scratch.au, title: `Discuss ${t}`, submitted: true, participants: []});
        // A second journal where M1 also holds a role (Rule 5d).
        try {
            const created2 = await app.api.createContext({tag: `${t}x`, users: [{username: `${t}m1`, roles: ['manager']}]});
            scratch.second = {path: created2.path || `${t}x`, contextId: created2.contextId};
        } catch (error) {
            scratch.second = {error: String(error.message).split('\n')[0].slice(0, 300)};
        }
        scratchAll[app.name] = scratch;
        saveScratch();
    }
    const {m1, m2, au, rd, se} = scratch;
    const cp = scratch.path;
    const NEEDS = /needs to be assigned\.|moderator needs to be assigned\./;
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        (summary.browserDialogs = summary.browserDialogs || []).push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    const phase = async (label, fn) => {
        if (ONLY_PHASES && !ONLY_PHASES.includes(label)) {
            summary.skipped.push(label);
            return;
        }
        try {
            await fn();
        } catch (error) {
            summary.problems.push({phase: label, error: String(error.stack || error).slice(0, 700)});
            await shot(page, `problem-${label}-${app.name}`).catch(() => {});
            await signOut(page).catch(() => {});
        }
        record(`k2-summary-${app.name}`, summary);
    };
    try {
        // ---- tab: Rule 5c round trip on the needs-editor row as M1; M1's announcement/issue email boxes ticked (5b);
        // M2's "Enable…" unticked on the announcement (and OJS issue) row (5a). Side effects: no email on Save.
        await phase('tab', async () => {
            summary.tab = {};
            await signIn(page, m1);
            summary.tab.m1MailBefore = await mailCount(app, email(m1));
            summary.tab.baseline = tabSummary(await recordTab(page, app, cp, `tab-baseline-m1-${app.name}`));
            summary.tab.tasksBefore = await tasksWindow(page, app, cp, `tab-tasks-m1-before-${app.name}`);
            summary.tab.step1_emailTicked = await setRow(page, app, cp, NEEDS, {email: true}, `tab-1-email-ticked-${app.name}`);
            summary.tab.step2_enableUnticked = await setRow(page, app, cp, NEEDS, {enable: false}, `tab-2-enable-unticked-${app.name}`);
            // M1: announcement (and OJS issue) rows keep "Enable…" ticked with the email box ticked (Rule 5b for those emails).
            summary.tab.m1Announcement = await setRow(page, app, cp, /announcement/i, {email: true}, `tab-3-m1-announcement-email-${app.name}`);
            if (app.name === 'ojs') summary.tab.m1Issue = await setRow(page, app, cp, /issue has been published/i, {email: true}, `tab-3-m1-issue-email-${app.name}`);
            summary.tab.m1MailAfterSaves = await mailCount(app, email(m1));
            summary.tab.tasksAfterSaves = await tasksWindow(page, app, cp, `tab-tasks-m1-after-saves-${app.name}`);
            await signOut(page);
            await signIn(page, m2);
            summary.tab.m2Announcement = await setRow(page, app, cp, /announcement/i, {enable: false}, `tab-4-m2-announcement-unticked-${app.name}`);
            if (app.name === 'ojs') summary.tab.m2Issue = await setRow(page, app, cp, /issue has been published/i, {enable: false}, `tab-4-m2-issue-unticked-${app.name}`);
            await signOut(page);
        });

        // ---- subA: scenario 3 — the Author submits; M1 ("Enable…" unticked) gets no task but the email (A10); M2 both.
        await phase('subA', async () => {
            summary.subA = await authorSubmits(page, app, scratch, 'a', `subA-complete-${app.name}`);
            summary.subA.m2Mail = await mailFor(app, email(m2), summary.subA.title, 30000);
            summary.subA.m1Mail = await mailFor(app, email(m1), summary.subA.title, 15000);
            summary.subA.m1MailCountAll = await mailCount(app, email(m1));
            await signIn(page, m1);
            summary.subA.m1Tasks = await tasksWindow(page, app, cp, `subA-tasks-m1-${app.name}`);
            await signOut(page);
            await signIn(page, m2);
            summary.subA.m2Tasks = await tasksWindow(page, app, cp, `subA-tasks-m2-${app.name}`);
            await signOut(page);
        });

        // ---- retick: M1 re-ticks "Enable…" (the email box offered again, unticked); nothing arrives for A after the fact.
        await phase('retick', async () => {
            summary.retick = {};
            await signIn(page, m1);
            summary.retick.step3_enableReticked = await setRow(page, app, cp, NEEDS, {enable: true}, `retick-3-enable-reticked-${app.name}`);
            summary.retick.m1TasksAfter = await tasksWindow(page, app, cp, `retick-tasks-m1-${app.name}`);
            await signOut(page);
            summary.retick.m1MailCountAll = await mailCount(app, email(m1));
        });

        // ---- subB: with "Enable…" re-ticked and the email box unticked, M1 gets the task and the email again (5a/5c).
        await phase('subB', async () => {
            summary.subB = await authorSubmits(page, app, scratch, 'b', `subB-complete-${app.name}`);
            summary.subB.m1Mail = await mailFor(app, email(m1), summary.subB.title, 30000);
            summary.subB.m2Mail = await mailFor(app, email(m2), summary.subB.title, 15000);
            await signIn(page, m1);
            summary.subB.m1Tasks = await tasksWindow(page, app, cp, `subB-tasks-m1-${app.name}`);
            await signOut(page);
        });

        // ---- subC: scenario 4 — M1 ticks the email box; the Author submits; M1 the task and no email, M2 both.
        await phase('subC', async () => {
            summary.subC = {};
            await signIn(page, m1);
            summary.subC.emailBoxTicked = await setRow(page, app, cp, NEEDS, {email: true}, `subC-email-ticked-${app.name}`);
            await signOut(page);
            Object.assign(summary.subC, await authorSubmits(page, app, scratch, 'c', `subC-complete-${app.name}`));
            summary.subC.m2Mail = await mailFor(app, email(m2), summary.subC.title, 30000);
            summary.subC.m1MailForC = await mailCount(app, email(m1), summary.subC.title);
            summary.subC.m1MailCountAll = await mailCount(app, email(m1));
            await signIn(page, m1);
            summary.subC.m1Tasks = await tasksWindow(page, app, cp, `subC-tasks-m1-${app.name}`);
            await signOut(page);
            await signIn(page, m2);
            summary.subC.m2Tasks = await tasksWindow(page, app, cp, `subC-tasks-m2-${app.name}`);
            await signOut(page);
        });

        // ---- disc: rows "Discussion added." / "Discussion activity." and A1.
        await phase('disc', async () => {
            summary.disc = {};
            const subId = scratch.discussion.submissionId;
            const dname = `Discussion ${scratch.tag}d`;
            const opening = `Opening message ${scratch.tag}d`;
            await signIn(page, m1);
            summary.disc.open = await openDiscussion(page, app, cp, subId, dname, opening, [/Author/], 'disc-open');
            summary.disc.m1TasksAfterOpen = await tasksWindow(page, app, cp, `disc-tasks-m1-after-open-${app.name}`);
            await signOut(page);
            summary.disc.auMail = await mailFor(app, email(au), opening, 30000);
            summary.disc.m1MailOwnCopy = await mailFor(app, email(m1), opening, 10000);
            await signIn(page, au);
            summary.disc.auTasks = await tasksWindow(page, app, cp, `disc-tasks-au-${app.name}`, 'dashboard/mySubmissions');
            await signOut(page);
            // The Unsubscribe page reached from the Author's discussion email: which rows it offers (A1's second sentence).
            if (summary.disc.auMail.found && summary.disc.auMail.unsubscribeLink) {
                await page.goto(onProbeServer(app, summary.disc.auMail.unsubscribeLink));
                const boxes = await page.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({id: e.id, checked: e.checked, label: (document.querySelector(`label[for="${e.id}"]`) || {}).innerText || null})));
                summary.disc.unsubscribePage = {url: page.url(), boxes};
                record(`disc-unsubscribe-page-au-${app.name}`, {...(await safeScreen(page)), boxes});
                await shot(page, `disc-unsubscribe-page-au-${app.name}`);
            }
            // A1 control: M1 unticks "Enable…" under "Discussion activity."; the Author replies.
            await signIn(page, m1);
            summary.disc.m1ActivityUnticked = await setRow(page, app, cp, /Discussion activity\./, {enable: false}, `disc-m1-activity-unticked-${app.name}`);
            summary.disc.m1MailBeforeReply1 = await mailCount(app, email(m1));
            await signOut(page);
            await signIn(page, au);
            summary.disc.reply1 = await replyToDiscussion(page, app, cp, subId, dname, `Reply ${scratch.tag}r1`, 'dashboard/mySubmissions', 'disc-reply1-au');
            await signOut(page);
            summary.disc.m1ReplyMail = await mailFor(app, email(m1), `Reply ${scratch.tag}r1`, 30000);
            summary.disc.auOwnReplyCopy = await mailCount(app, email(au), `Reply ${scratch.tag}r1`);
            await signIn(page, m1);
            summary.disc.m1TasksAfterReply1 = await tasksWindow(page, app, cp, `disc-tasks-m1-after-reply1-${app.name}`);
            // Rule 5b for discussions: M1 ticks the email box under "Discussion added."; the Author replies again.
            summary.disc.m1AddedEmailTicked = await setRow(page, app, cp, /Discussion added\./, {email: true}, `disc-m1-added-email-ticked-${app.name}`);
            await signOut(page);
            await signIn(page, au);
            summary.disc.reply2 = await replyToDiscussion(page, app, cp, subId, dname, `Reply ${scratch.tag}r2`, 'dashboard/mySubmissions', 'disc-reply2-au');
            await signOut(page);
            summary.disc.auOwnReply2 = await mailFor(app, email(au), `Reply ${scratch.tag}r2`, 20000);
            summary.disc.m1Reply2MailCount = await mailCount(app, email(m1), `Reply ${scratch.tag}r2`);
            await signIn(page, m1);
            summary.disc.m1TasksAfterReply2 = await tasksWindow(page, app, cp, `disc-tasks-m1-after-reply2-${app.name}`);
            await signOut(page);
        });

        // ---- ann: row 260 — an announcement without its email box (nobody mailed), then with it (every user with a
        // role; M1's email box and M2's "Enable…" stop theirs); the Reader's Tasks window afterwards.
        await phase('ann', async () => {
            summary.ann = {};
            await signIn(page, m1);
            summary.ann.enable = await enableAnnouncements(page, app, cp, 'ann');
            const t1 = `Quiet announcement ${scratch.tag}`;
            const t2 = `Mailed announcement ${scratch.tag}`;
            summary.ann.first = await addAnnouncement(page, app, `/index.php/${cp}/management/settings/announcements`, t1, false, 'ann-first');
            summary.ann.second = await addAnnouncement(page, app, `/index.php/${cp}/management/settings/announcements`, t2, true, 'ann-second');
            await signOut(page);
            summary.ann.jobs = drainJobs(app);
            summary.ann.rdMailSecond = await mailFor(app, email(rd), t2, 30000);
            summary.ann.counts = {
                first: {rd: await mailCount(app, email(rd), t1), au: await mailCount(app, email(au), t1), m1: await mailCount(app, email(m1), t1), m2: await mailCount(app, email(m2), t1)},
                second: {rd: await mailCount(app, email(rd), t2), au: await mailCount(app, email(au), t2), se: await mailCount(app, email(se), t2), m1: await mailCount(app, email(m1), t2), m2: await mailCount(app, email(m2), t2)},
            };
            await signIn(page, rd);
            summary.ann.rdTasks = await tasksWindow(page, app, cp, `ann-tasks-rd-${app.name}`, 'user/profile');
            await signOut(page);
        });

        // ---- issue (OJS): row 261 — "Publish Issue" with its box ticked; M2 ("Enable…" unticked) and M1 (email box) get nothing.
        if (app.name === 'ojs') {
            await phase('issue', async () => {
                summary.issue = {};
                await signIn(page, m1);
                await page.goto(app.url(`/index.php/${cp}/manageIssues`));
                await idle(page);
                const create = page.getByRole('link', {name: 'Create Issue', exact: true}).first();
                await create.waitFor({timeout: 30000});
                const issueTitle = `Issue ${scratch.tag}`;
                if (!(await page.getByText(issueTitle).count())) {
                    await create.click();
                    const issueForm = page.locator('form#issueForm');
                    await issueForm.locator('input[name=volume]').waitFor({timeout: 30000});
                    await issueForm.locator('input[name=volume]').fill('1');
                    await issueForm.locator('input[name=number]').fill('1');
                    await issueForm.locator('input[name=year]').fill('2026');
                    await issueForm.locator('input[name^=title]').first().fill(issueTitle).catch(() => {});
                    await issueForm.getByRole('button', {name: 'Save', exact: true}).click();
                    await issueForm.waitFor({state: 'hidden', timeout: 30000});
                    await idle(page);
                }
                const publish = page.getByRole('link', {name: 'Publish Issue', exact: true}).first();
                if (!(await publish.isVisible())) {
                    await page.locator('tr.gridRow').filter({hasText: issueTitle}).first().locator('a.show_extras, .show_extras').first().click();
                    await idle(page);
                }
                await publish.waitFor({timeout: 15000});
                await publish.click();
                const dialog = page.locator('[role="dialog"]:visible').last();
                await dialog.locator('#sendIssueNotification').waitFor({timeout: 30000});
                summary.issue.dialog = {text: (await dialog.innerText()).replace(/\s+/g, ' '), boxDefault: await dialog.locator('#sendIssueNotification').isChecked()};
                record(`issue-publish-dialog-${app.name}`, {...(await safeScreen(page)), ...summary.issue.dialog});
                await shot(page, `issue-publish-dialog-${app.name}`);
                const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /publish-issue/.test(r.url()), {timeout: 30000}).catch(() => null);
                await dialog.getByRole('button', {name: 'OK', exact: true}).click();
                const response = await posted;
                summary.issue.postStatus = response ? response.status() : null;
                await dialog.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                await idle(page);
                record(`issue-after-publish-${app.name}`, await safeScreen(page));
                await signOut(page);
                summary.issue.jobs = drainJobs(app);
                summary.issue.rdMail = await mailFor(app, email(rd), issueTitle, 30000);
                summary.issue.counts = {rd: await mailCount(app, email(rd), issueTitle), au: await mailCount(app, email(au), issueTitle), m1: await mailCount(app, email(m1), issueTitle), m2: await mailCount(app, email(m2), issueTitle)};
                await signIn(page, rd);
                summary.issue.rdTasks = await tasksWindow(page, app, cp, `issue-tasks-rd-${app.name}`, 'user/profile');
                await signOut(page);
            });
        }

        // ---- site: Rule 5d — the second journal's own set for M1; the site-level address for M1 (two journals),
        // M2 (one journal) and admin; a site announcement with its email box (A4).
        await phase('site', async () => {
            summary.site = {};
            await signIn(page, m1);
            if (scratch.second && scratch.second.path) {
                summary.site.m1SecondJournalTab = tabSummary(await recordTab(page, app, scratch.second.path, `site-tab-m1-second-journal-${app.name}`));
                summary.site.m1FirstJournalTab = tabSummary(await recordTab(page, app, cp, `site-tab-m1-first-journal-${app.name}`));
            } else {
                summary.site.second = scratch.second;
            }
            await page.goto(app.url('/index.php/index/user/profile/notificationSettings'));
            await idle(page).catch(() => {});
            summary.site.m1SiteAddress = {url: page.url(), selectedTab: await selectedTab(page), hasForm: await page.locator('form#notificationSettingsForm').count()};
            if (summary.site.m1SiteAddress.hasForm) summary.site.m1SiteTab = tabSummary(await readTab(page));
            record(`site-profile-m1-${app.name}`, {...(await safeScreen(page)), ...summary.site.m1SiteAddress});
            await shot(page, `site-profile-m1-${app.name}`);
            await page.goto(app.url('/index.php/index'));
            const links = await page.locator('#navigationUserWrapper a').evaluateAll((els) => els.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})));
            summary.site.m1SiteHomeMenu = links;
            record(`site-home-m1-${app.name}`, {...(await safeScreen(page)), links});
            await signOut(page);
            await signIn(page, m2);
            await page.goto(app.url('/index.php/index/user/profile/notificationSettings'));
            await idle(page).catch(() => {});
            summary.site.m2SiteAddress = {url: page.url(), selectedTab: await selectedTab(page), hasForm: await page.locator('form#notificationSettingsForm').count()};
            record(`site-profile-m2-${app.name}`, {...(await safeScreen(page)), ...summary.site.m2SiteAddress});
            await shot(page, `site-profile-m2-${app.name}`);
            await signOut(page);
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/user/profile/notificationSettings'));
            await idle(page).catch(() => {});
            summary.site.adminSiteAddress = {url: page.url(), selectedTab: await selectedTab(page), hasForm: await page.locator('form#notificationSettingsForm').count()};
            if (summary.site.adminSiteAddress.hasForm) summary.site.adminSiteTab = tabSummary(await readTab(page));
            record(`site-profile-admin-${app.name}`, {...(await safeScreen(page)), ...summary.site.adminSiteAddress});
            await shot(page, `site-profile-admin-${app.name}`);
            // A4: a site announcement posted with the email box ticked.
            await page.goto(app.url('/index.php/index/admin/settings'));
            const annTab = page.getByRole('tab', {name: 'Announcements', exact: true}).first();
            await annTab.waitFor({timeout: 30000});
            await annTab.click();
            const enableBox = page.getByRole('checkbox', {name: /Enable announcements/i}).first();
            if (await enableBox.count()) {
                summary.site.siteAnnouncementsWereEnabled = await enableBox.isChecked();
                if (!summary.site.siteAnnouncementsWereEnabled) {
                    await enableBox.check();
                    const saved = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && /^(PUT|POST)$/.test(r.request().method()), {timeout: 20000});
                    await enableBox.locator('xpath=ancestor::form[1]').getByRole('button', {name: 'Save', exact: true}).click();
                    await saved;
                    await page.reload();
                    await annTab.waitFor({timeout: 30000});
                    await annTab.click();
                }
            }
            const sub = page.getByRole('tab', {name: 'Announcements', exact: true}).nth(1);
            if (await sub.count()) await sub.click();
            const siteTitle = `Site announcement ${scratch.tag}`;
            const add = page.getByRole('button', {name: /Add Announcement/i}).first();
            await add.waitFor({timeout: 30000});
            await add.click();
            const sendBox = page.getByRole('checkbox', {name: 'Send an email about this to all registered users.'});
            await sendBox.waitFor({timeout: 30000});
            const form = sendBox.locator('xpath=ancestor::form[1]');
            await form.locator('input[name^="title"], input[id^="title"]').first().fill(siteTitle);
            const body = form.frameLocator('iframe').first().locator('body');
            await body.click();
            await body.fill(`Short description ${siteTitle}`);
            await sendBox.check();
            record(`site-announcement-form-${app.name}`, await safeScreen(page));
            await shot(page, `site-announcement-form-${app.name}`);
            const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/announcements/.test(r.url()), {timeout: 30000}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const response = await posted;
            summary.site.siteAnnouncement = {title: siteTitle, postStatus: response ? response.status() : null, postUrl: response ? response.url().replace(/^https?:\/\/[^/]+/, '') : null};
            await form.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            record(`site-announcement-after-save-${app.name}`, await safeScreen(page));
            await signOut(page);
            summary.site.siteAnnouncement.jobs = drainJobs(app);
            summary.site.siteAnnouncement.counts = {rd: await mailCount(app, email(rd), siteTitle), au: await mailCount(app, email(au), siteTitle), se: await mailCount(app, email(se), siteTitle), m2: await mailCount(app, email(m2), siteTitle)};
        });

        // ---- reg: Rule 5e — registration with the email consent box unticked, then ticked; a site-level registration
        // with no journal (a user with a role in none) and its site-level tab.
        await phase('reg', async () => {
            summary.reg = {};
            const r1 = `${scratch.tag}r1`;
            const r2 = `${scratch.tag}r2`;
            const r3 = `${scratch.tag}r3`;
            summary.reg.r1 = await registerOn(page, app, `/index.php/${cp}/user/register`, r1, {emailConsent: false}, 'reg-r1');
            summary.reg.r1.tab = tabSummary(await recordTab(page, app, cp, `reg-tab-r1-${app.name}`));
            await signOut(page);
            summary.reg.r2 = await registerOn(page, app, `/index.php/${cp}/user/register`, r2, {emailConsent: true}, 'reg-r2');
            summary.reg.r2.tab = tabSummary(await recordTab(page, app, cp, `reg-tab-r2-${app.name}`));
            await signOut(page);
            summary.reg.r3 = await registerOn(page, app, '/index.php/index/user/register', r3, {emailConsent: false, contextBoxes: false}, 'reg-r3');
            await page.goto(app.url('/index.php/index/user/profile/notificationSettings'));
            await idle(page).catch(() => {});
            summary.reg.r3.siteAddress = {url: page.url(), selectedTab: await selectedTab(page), hasForm: await page.locator('form#notificationSettingsForm').count()};
            if (summary.reg.r3.siteAddress.hasForm) summary.reg.r3.siteTab = tabSummary(await readTab(page));
            record(`reg-site-profile-r3-${app.name}`, {...(await safeScreen(page)), ...summary.reg.r3.siteAddress});
            await shot(page, `reg-site-profile-r3-${app.name}`);
            await signOut(page);
        });

        // ---- assign (OJS, OPS): row 263 — the section form shows the Section Editor under "Editorial Assignments";
        // the Author submits; what the Section Editor and the Managers get.
        if (app.name !== 'omp') {
            await phase('assign', async () => {
                summary.assign = {};
                await signIn(page, m1);
                await page.goto(app.url(`/index.php/${cp}/management/settings/context`));
                const tab = page.getByRole('tab', {name: 'Sections', exact: true});
                await tab.waitFor({timeout: 30000});
                await tab.click();
                const grid = page.locator('#sectionsGridContainer');
                await grid.locator('tr.gridRow').first().waitFor({timeout: 30000});
                await grid.locator('tr.gridRow').first().locator('a.show_extras').click();
                await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
                const form = page.locator('form#sectionForm');
                await form.locator('input[name^="subEditors"]').first().waitFor({timeout: 30000});
                summary.assign.sectionForm = {
                    title: await form.locator('input[name^="title"]').first().inputValue().catch(() => null),
                    subEditors: await form.locator('input[name^="subEditors"]').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value, checked: e.checked, label: (e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || {}).innerText || null}))),
                    headings: await form.locator('legend, .section > label, .section > .label, h3, h4').allInnerTexts().catch(() => []),
                };
                record(`assign-section-form-${app.name}`, {...(await safeScreen(page)), ...summary.assign.sectionForm});
                await shot(page, `assign-section-form-${app.name}`);
                await form.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                await signOut(page);
                summary.assign.seMailBefore = await mailCount(app, email(se));
                Object.assign(summary.assign, await authorSubmits(page, app, scratch, 'e', `assign-complete-${app.name}`));
                summary.assign.m2Mail = await mailFor(app, email(m2), summary.assign.title, 30000);
                summary.assign.seMailForE = await mailFor(app, email(se), summary.assign.title, 8000);
                summary.assign.seMailCountAll = await mailCount(app, email(se));
                await signIn(page, se);
                summary.assign.seTasks = await tasksWindow(page, app, cp, `assign-tasks-se-${app.name}`);
                await page.goto(app.url(`/index.php/${cp}/dashboard/editorial?workflowSubmissionId=${summary.assign.submissionId}`));
                await page.locator('[data-cy="discussion-manager"], .pkpWorkflow, main').first().waitFor({timeout: 30000}).catch(() => {});
                summary.assign.seWorkflowText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 1500);
                record(`assign-workflow-se-${app.name}`, await safeScreen(page));
                await shot(page, `assign-workflow-se-${app.name}`);
                await signOut(page);
            });
        } else {
            summary.skipped.push('assign (OMP: a scratch press has no series; assignment is per series)');
        }

        // ---- publish (OMP, OPS): row 264 — the Manager publishes through the workflow; the Author's task and email.
        if (app.name !== 'ojs') {
            await phase('publish', async () => {
                summary.publish = {};
                if (!scratch.publish) {
                    const s2Spec = {tag: `${scratch.tag}p`, context: cp, submitter: au, title: `Publish me ${scratch.tag}`, submitted: true, participants: []};
                    if (app.name === 'omp') s2Spec.decisions = ['skipExternalReview', 'sendToProduction'];
                    scratch.publish = await app.api.createSubmission(s2Spec);
                    saveScratch();
                }
                const title = `Publish me ${scratch.tag}`;
                await signIn(page, m1);
                await page.goto(app.url(`/index.php/${cp}/dashboard/editorial?workflowSubmissionId=${scratch.publish.submissionId}`));
                const publishBtn = page.getByRole('button', {name: app.name === 'ops' ? 'Post' : 'Publish', exact: true});
                const stageAction = page.getByRole('button', {name: app.name === 'ops' ? 'Post the preprint' : 'Schedule For Publication', exact: true});
                await publishBtn.or(stageAction).first().waitFor({timeout: 45000});
                record(`publish-workflow-${app.name}`, await safeScreen(page));
                if (await stageAction.isVisible()) await stageAction.click();
                await publishBtn.waitFor({timeout: 30000});
                await publishBtn.click();
                const dialog = app.name === 'ops' ? page.getByRole('dialog').filter({hasText: /post/i}).last() : page.getByRole('dialog', {name: /Schedule For Publication/});
                await dialog.waitFor({timeout: 30000});
                summary.publish.dialogText = (await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 800);
                record(`publish-dialog-${app.name}`, await safeScreen(page));
                await shot(page, `publish-dialog-${app.name}`);
                const published = page.waitForResponse((r) => /\/publish$/.test(r.url().split('?')[0]) && r.request().method() === 'PUT', {timeout: 30000}).catch(() => null);
                await dialog.getByRole('button', {name: app.name === 'ops' ? 'Post' : 'Publish', exact: true}).last().click();
                const response = await published;
                summary.publish.publishStatus = response ? response.status() : null;
                await dialog.waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
                record(`publish-after-${app.name}`, await safeScreen(page));
                await signOut(page);
                summary.publish.auMail = await mailFor(app, email(au), title, 20000);
                await signIn(page, au);
                summary.publish.auTasks = await tasksWindow(page, app, cp, `publish-tasks-au-${app.name}`, 'dashboard/mySubmissions');
                await signOut(page);
            });
        } else {
            summary.skipped.push('publish (OJS: needs an issue in the Publish window; K4 left it too)');
        }

        // ---- review (OJS, OMP): row 268 — a reviewer submits; the assigned Section Editor is emailed, an unassigned
        // Manager is not, and the Section Editor's Tasks window lists nothing for it.
        if (app.name !== 'ops') {
            await phase('review', async () => {
                summary.review = {};
                let rs = scratch.review;
                if (!rs) {
                    const t = tag('u05k2r');
                    const users = [
                        {username: `${t}se`, givenName: 'Sena', familyName: 'SectionEd', roles: ['sectionEditor']},
                        {username: `${t}rm`, givenName: 'Rada', familyName: 'ManagerR', roles: ['manager']},
                        {username: `${t}au`, givenName: 'Ada', familyName: 'Author', roles: ['author']},
                        {username: `${t}rv`, givenName: 'Rex', familyName: 'Reviewer', roles: ['externalReviewer']},
                    ];
                    const created = await app.api.createContext({tag: t, users});
                    const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `Review me ${t}`, submitted: true, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: `${t}rv`, status: 'accepted'}]}], participants: [{username: `${t}se`, role: 'sectionEditor'}]});
                    rs = {tag: t, path: t, se: `${t}se`, rm: `${t}rm`, au: `${t}au`, rv: `${t}rv`, created, sub};
                    scratch.review = rs;
                    saveScratch();
                }
                const title = `Review me ${rs.tag}`;
                await signIn(page, rs.rv);
                await page.goto(app.url(`/index.php/${rs.path}/reviewer/submission/${rs.sub.submissionId}`));
                await idle(page).catch(() => {});
                for (let i = 0; i < 4; i++) {
                    const consent = page.locator('input[name="privacyConsent"], input[type=checkbox][name*="onsent"]');
                    if (await consent.count()) await consent.first().check().catch(() => {});
                    const next = page.getByRole('button', {name: /Accept Review, Continue to Step|Continue to Step|Save and continue/i}).first();
                    if (!(await next.count()) || !(await next.isVisible().catch(() => false))) break;
                    await next.click();
                    await idle(page).catch(() => {});
                }
                const submit = page.getByRole('button', {name: 'Submit Review', exact: true}).first();
                await submit.waitFor({timeout: 30000});
                const frames = page.locator('iframe');
                const n = await frames.count();
                for (let i = 0; i < n; i++) {
                    const body = page.frameLocator('iframe').nth(i).locator('body');
                    await body.click();
                    await body.fill(`Review comment ${rs.tag} (${i + 1})`);
                }
                const rec = page.locator('select#reviewerRecommendationId, select[name="reviewerRecommendationId"]').first();
                if (await rec.count()) await rec.selectOption({label: 'Accept Submission'});
                record(`review-form-filled-${app.name}`, await safeScreen(page));
                await shot(page, `review-form-filled-${app.name}`);
                const pressedAt = new Date();
                await submit.click();
                const confirm = page.locator('[role="dialog"]:visible').last();
                await confirm.waitFor({timeout: 10000}).catch(() => {});
                const ok = confirm.getByRole('button', {name: /^(OK|Submit|Confirm)$/}).first();
                if (await ok.count()) await ok.click();
                await page.getByText('Review Submitted', {exact: false}).first().waitFor({timeout: 20000}).catch(() => {});
                record(`review-after-submit-${app.name}`, await safeScreen(page));
                await shot(page, `review-after-submit-${app.name}`);
                await signOut(page);
                summary.review.seMail = await mailFor(app, email(rs.se), title, 30000);
                if (summary.review.seMail.found) summary.review.mailDelaySeconds = (new Date(summary.review.seMail.created) - pressedAt) / 1000;
                summary.review.rmMailCount = await mailCount(app, email(rs.rm), title);
                summary.review.auMailCount = await mailCount(app, email(rs.au), 'Review complete');
                await signIn(page, rs.se);
                summary.review.seTasks = await tasksWindow(page, app, rs.path, `review-tasks-se-${app.name}`);
                await signOut(page);
                await signIn(page, rs.rm);
                summary.review.rmTasks = await tasksWindow(page, app, rs.path, `review-tasks-rm-${app.name}`);
                await signOut(page);
            });
        } else {
            summary.skipped.push('review (OPS has no review stage)');
        }
    } finally {
        record(`k2-summary-${app.name}`, summary);
        await close();
    }
});
