// Helpers of the three U27 Add Reviewer walks (requiring this file runs nothing):
// ./walk.js (A19, the template chooser with nothing to choose),
// ../press-add-reviewer-list-both-stages/walk.js (OMP2) and
// ../reviewer-assigned-today-reads-yesterday/walk.js (A36).
// Every helper drives the screens a person uses: the workflow's "Reviewers" panel, its "Add
// Reviewer" window ("Locate a Reviewer", "Select Reviewer", the request form) and Settings ›
// Workflow › Emails › "Add and edit templates".
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The journal's review page objects (the Reviewers panel and the Add Reviewer window are the same on a press). */
const R = () => require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');

/** The editor's workflow of the submission, on the stage and round it opens on. Returns the workflow dialog. */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    const modal = page.locator('[data-cy="active-modal"]').first();
    await modal.locator('[data-cy="reviewer-manager"]').waitFor({timeout: T});
    await idle(page);
    return modal;
}

/** The workflow's heading lines (the stage and round the Reviewers panel belongs to). */
async function stageHeading(modal) {
    return flat(await modal.locator('h2, h3').filter({hasText: /Review/}).allInnerTexts().then((a) => a.join(' | ')), 300);
}

/** "Reviewers" › "Add Reviewer": the window with its "Locate a Reviewer" list. */
async function openAdd(page) {
    const win = await R().openAddReviewerModal(page);
    await idle(page);
    await win.locator('.listPanel--selectReviewer .listPanel__item').first().waitFor({timeout: T}).catch(() => {});
    return win;
}

/** The list's entries as shown: name, the brief line (completed count · days since last assignment) and the whole text. */
async function listEntries(win) {
    return win.locator('.listPanel--selectReviewer .listPanel__item').evaluateAll((items) =>
        items.map((li) => {
            const t = (s) => ((li.querySelector(s) || {}).innerText || '').replace(/\s+/g, ' ').trim();
            return {
                // the expand arrow's name, "Show more details about {name}" (the title also holds the "{N} active" badge)
                name: t('button.expander').replace(/^Show more details about\s*/, '').replace(/^Hide expanded details about\s*/, ''),
                title: t('.listPanel__itemTitle'),
                last: t('.listPanel__item--reviewer__last'),
                complete: t('.listPanel__item--reviewer__complete'),
                text: (li.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
            };
        })
    );
}

/** The list's "No items found." line, when shown. */
async function emptyLine(win) {
    const e = win.locator('.listPanel--selectReviewer').getByText('No items found.', {exact: true});
    return (await e.isVisible().catch(() => false)) ? 'No items found.' : null;
}

/** Type in the list's search box and press Enter; returns the entries and the empty line after the list's fetch. */
async function search(page, win, text) {
    const box = win.locator('.listPanel--selectReviewer input.pkpSearch__input');
    const fetched = page.waitForResponse((r) => /\/api\/v1\/users\/reviewers/.test(r.url()), {timeout: 15_000}).catch(() => null);
    await box.fill(text);
    await box.press('Enter');
    const r = await fetched;
    await idle(page);
    await sleep(500);
    const q = r ? new URL(r.url()).searchParams : null;
    return {
        typed: text,
        request: r ? {status: r.status(), reviewStage: q.get('reviewStage'), searchPhrase: q.get('searchPhrase')} : null,
        entries: (await listEntries(win)).map((e) => e.name),
        empty: await emptyLine(win),
    };
}

/** Press "Select Reviewer" on the entry (from the list as it stands, or after a search). */
async function select(page, win, name, {fromSearch = true} = {}) {
    await R().selectReviewer(page, win, name, {search: fromSearch});
    await idle(page);
}

/** The request form's template chooser: shown or not, its options, and the hidden template field when no chooser. */
async function readChooser(win) {
    const label = 'Choose a predefined message to use, or fill out the form below.';
    const shown = await win.getByText(label, {exact: true}).isVisible().catch(() => false);
    const select = win.locator('#reviewerFormFooter select[name="template"]');
    const options = (await select.count())
        ? await select.first().evaluate((s) => [...s.options].map((o) => ({value: o.value, text: o.text.trim(), selected: o.selected})))
        : null;
    const hidden = win.locator('#reviewerFormFooter input[type="hidden"][name="template"]');
    const hiddenValue = (await hidden.count()) ? await hidden.first().inputValue() : null;
    const letter = flat(await win.frameLocator('iframe[id^="personalMessage"]').last().locator('body').innerText().catch(() => null), 160);
    return {chooserShown: shown, label: shown ? label : null, options, hiddenValue, letter};
}

/** Press the form's "Add Reviewer" and read the answer, the page notice and the window's fate. */
async function submitAdd(page, win) {
    const saved = page.waitForResponse((r) => /update-reviewer|updateReviewer/i.test(r.url()), {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Add Reviewer', exact: true}).last().click();
    const s = await saved;
    const notice = page.locator('.app__notifications .pkpNotification').first();
    const noticeText = await notice
        .waitFor({timeout: 8_000})
        .then(() => notice.innerText())
        .catch(() => null);
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    const body = s ? await s.text().catch(() => '') : '';
    return {status: s ? s.status() : null, ok: /"status"\s*:\s*true/.test(body), notice: flat(noticeText, 300)};
}

/** The window's own "Cancel" or its "Close" arrow. */
async function closeAdd(page, win) {
    const cancel = win.locator('a.cancelButton, button').filter({hasText: /^\s*Cancel\s*$/}).last();
    if (await cancel.isVisible().catch(() => false)) await cancel.click();
    else await win.getByRole('button', {name: /^Close$/}).first().click();
    await win.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await sleep(700); // the modal store keeps a closed window's slot for 450 ms (patterns.md pitfall 4)
    await idle(page);
}

/** The "Reviewers" panel's row naming the person, as text (null when there is none). */
async function reviewerRow(modal, name) {
    const row = modal.locator('[data-cy="reviewer-manager"]').getByRole('row').filter({hasText: name});
    await row.first().waitFor({timeout: 10_000}).catch(() => {});
    return (await row.count()) ? flat(await row.first().innerText(), 240) : null;
}

/** Press an entry's expand arrow ("Show more details about {name}") and read the expanded figures. */
async function expandEntry(win, name) {
    const item = win.locator('.listPanel--selectReviewer .listPanel__item').filter({hasText: name}).first();
    await item.locator('button.expander').click();
    const exp = item.locator('.listPanel__itemExpanded');
    await exp.waitFor({timeout: T});
    const rows = await exp.locator('li, .listItem, tr').evaluateAll((els) => els.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    const text = flat(await exp.innerText(), 800);
    const m = text.match(/(\d+)\s*Days since last review assigned/) || text.match(/Days since last review assigned\s*(\d+)/);
    return {daysFigure: m ? Number(m[1]) : null, rows: rows.slice(0, 12), text};
}

/**
 * Settings › Workflow › Emails › "Add and edit templates" › "Review Request" › "Add Template":
 * a further template for the email, saved. Returns the email window's template rows.
 */
async function addRequestTemplate(page, app, name) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const emails = new ManageEmailsPage(page, app.contextPath);
    await emails.goto();
    const win = await emails.openMailable('Review Request');
    // the page object's addTemplate() matches every language's "Name" box (the dataset has two)
    await win.getByRole('button', {name: 'Add Template', exact: true}).click();
    const form = emails.templateWindow();
    await form.locator('input[name="name-en"]').waitFor({timeout: T});
    await form.locator('input[name="name-en"]').fill(name);
    await form.locator('input[name="subject-en"]').fill(`Review request (${name})`);
    await emails.typeBody('Dear reviewer, a short review request.', {locale: 'en'});
    await emails.save(form);
    await win.getByRole('listitem').filter({hasText: name}).first().waitFor({timeout: T}).catch(() => {});
    const rows = await emails.templateRowsRead(win).catch(() => null);
    return rows;
}

/**
 * "Add Reviewer" › "Enroll Existing User" (a person holding no reviewer role) or "Create New
 * Reviewer" (a new account), with the role the form offers for the stage, then "Add Reviewer".
 * `mode` is 'enroll' ({search, person}) or 'create' ({given, family, email, username}).
 * Returns the role offered, the save's status and the page notice; the caller reads the row.
 */
async function addOtherWay(page, mode, who) {
    const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const out = {mode};
    await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
    const win = new ReviewerRequestWindow(page);
    await win.dialog().waitFor({timeout: T});
    await idle(page);
    const linkText = mode === 'enroll' ? /^\s*Enroll Existing User\s*$/ : /^\s*Create New Reviewer\s*$/;
    const link = win.dialog().locator('a, button').filter({hasText: linkText}).first();
    await link.waitFor({timeout: T});
    await link.click();
    await (mode === 'enroll' ? win.enrollHeading() : win.createHeading()).waitFor({timeout: T});
    await win.expectOpen();
    if (mode === 'enroll') {
        await win.searchByName().click();
        await win.searchByName().pressSequentially(who.search, {delay: 60});
        const pick = page.locator('ul.ui-autocomplete li').filter({hasText: who.person}).first();
        await pick.waitFor({timeout: T});
        await pick.click();
        await idle(page);
    } else {
        await win.createGivenName().fill(who.given);
        await win.createFamilyName().fill(who.family);
        await win.createEmail().fill(who.email);
        await win.createAffiliation().fill('u27k6').catch(() => {});
        await win.username().fill(who.username);
    }
    out.roleOffered = await win
        .userGroupSelect()
        .evaluate((s) => [...s.options].map((o) => o.text.trim()))
        .catch(() => null);
    const answered = await win.submit();
    out.status = answered.status();
    const body = await answered.text().catch(() => '');
    out.ok = /"status"\s*:\s*true/.test(body);
    const notice = page.locator('.app__notifications .pkpNotification').first();
    out.notice = flat(await notice.waitFor({timeout: 8_000}).then(() => notice.innerText()).catch(() => null), 300);
    await win.dialog().waitFor({state: 'detached', timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(800);
    return out;
}

module.exports = {
    T, sleep, flat, R,
    openWorkflow, stageHeading, openAdd, listEntries, emptyLine, search, select, readChooser,
    submitAdd, closeAdd, reviewerRow, expandEntry, addRequestTemplate, addOtherWay,
};
