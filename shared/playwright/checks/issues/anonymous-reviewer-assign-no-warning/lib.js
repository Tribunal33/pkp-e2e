// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U35-A11-anonymous-reviewer-assign-no-warning.md). Requiring this file runs nothing.
// Every helper drives the screens a person uses: the workflow's "Reviewers" panel with its
// "Add Reviewer" window, and the "Participants" panel with its "Assign Participant" window.
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const WARNING = /assigned to conduct an anonymous review/i;

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const CASES = {
    // id: a submission in Review; other: one in Review the person does not review (the neighbour)
    ojs: {id: 12, role: 'Section editor', person: 'Minoti Inoue', search: 'Minoti', other: {id: 7, menuKey: null}},
    omp: {id: 2, role: 'Series editor', person: 'Minoti Inoue', search: 'Minoti', other: {id: 16, menuKey: null}},
    // a preprint server has no review: only the neighbour runs there (Production)
    ops: {id: null, role: 'Moderator', person: 'Minoti Inoue', search: 'Minoti', other: {id: 1, menuKey: 'workflow_5'}},
};

/** Open the submission's workflow (on its current stage unless `menuKey` names one); returns the Participants panel. */
async function openWorkflow(page, app, id, menuKey = null) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath);
    await page.goto('about:blank');
    await panel.goto(id, {menuKey});
    await idle(page);
    return panel;
}

/**
 * "Reviewers" › "Add Reviewer" › "Enroll Existing User": type under "Search By Name", pick the person,
 * leave "Review Type" as it stands and press "Add Reviewer". Returns what the form showed and the answer.
 */
async function enrollReviewer(page, {search, person, label}) {
    const {ReviewerRequestWindow} = require('../../../pages/ReviewerSuggestionPages.js');
    const out = {};
    await page.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
    const win = new ReviewerRequestWindow(page);
    await win.dialog().waitFor({timeout: T});
    await idle(page);
    const enroll = win.dialog().locator('a, button').filter({hasText: /^\s*Enroll Existing User\s*$/}).first();
    await enroll.waitFor({timeout: T});
    await enroll.click();
    await win.enrollHeading().waitFor({timeout: T});
    await win.expectOpen();
    await win.searchByName().click();
    await win.searchByName().pressSequentially(search, {delay: 60});
    const pick = page.locator('ul.ui-autocomplete li').filter({hasText: person}).first();
    await pick.waitFor({timeout: T});
    await pick.click();
    await idle(page);
    out.picked = await win.searchByName().inputValue();
    out.reviewerRole = await win.userGroupSelect().evaluate((s) => s.options[s.selectedIndex].text.trim()).catch(() => null);
    out.reviewType = await win
        .dialog()
        .locator('input[name="reviewMethod"]')
        .evaluateAll((els) => els.map((e) => ({label: ((e.closest('label') || {}).innerText || '').trim(), checked: e.checked})))
        .catch(() => []);
    record(`${label}-enroll-form`, await screen(page));
    const answered = await win.submit();
    out.status = answered.status();
    out.answer = flat(await answered.text().catch(() => ''), 200);
    await win.dialog().waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
    await idle(page);
    await sleep(1000);
    const after = await screen(page);
    record(`${label}-enrolled`, after);
    out.notices = (after.notices || []).map((n) => flat(n.text || n));
    return out;
}

/** The "Reviewers" panel's rows naming the person, as text. */
async function reviewerRows(page, person) {
    return page
        .locator('[role="dialog"]:visible')
        .first()
        .locator('tr, li')
        .filter({hasText: person})
        .evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.length < 400));
}

/** The warning box, when one is open: its text and buttons. */
async function readWarning(page, ms = 4000) {
    const box = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, .pkp_modal:visible').filter({hasText: WARNING}).last();
    const shown = await box
        .waitFor({timeout: ms})
        .then(() => true)
        .catch(() => false);
    if (!shown) return {shown: false, box: null};
    return {
        shown: true,
        box,
        text: flat(await box.innerText(), 700),
        buttons: (await box.getByRole('button').allTextContents()).map((t) => t.trim()).filter(Boolean),
    };
}

/**
 * "Participants" › "Assign": choose the role, press "Search", choose the person, and read what opens.
 * Then (with `ok`) dismiss a warning by its own "OK" when one opened and press the window's "OK".
 * `ids` is the list of anonymous reviewers the window's own form carried (the browser's own traffic).
 */
async function assign(page, panel, {role, person, label, ok = true}) {
    const out = {role, person};
    let formBody = '';
    const onResponse = async (r) => {
        if (/add-participant/i.test(r.url())) formBody = await r.text().catch(() => '');
    };
    page.on('response', onResponse);
    const win = await panel.openAssign();
    await idle(page);
    page.off('response', onResponse);
    const m = formBody.match(/anonymousReviewerIds\\?"?\s*:\s*(\[[^\]]*\])/);
    out.ids = m ? m[1] : null;
    out.roles = await win.roleOptions();
    await win.chooseRole(role);
    await win.search();
    out.people = await win.peopleNames();
    if (!out.people.includes(person)) {
        out.listed = false;
        record(`${label}-not-listed`, await screen(page));
        return out;
    }
    out.listed = true;
    out.chosenValue = await win.person(person).locator('input[name="userId"]').getAttribute('value');
    await win.choosePerson(person);
    const w = await readWarning(page);
    out.warning = w.shown ? {text: w.text, buttons: w.buttons} : false;
    record(`${label}-chosen`, await screen(page));
    if (!ok) return out;
    if (w.shown) {
        await w.box.getByRole('button', {name: 'OK', exact: true}).click();
        await w.box.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await idle(page);
        out.stillChosen = await win.person(person).locator('input[name="userId"]').isChecked().catch(() => null);
        out.windowOpenAfterWarning = await win.roleSelect().isVisible().catch(() => false);
    }
    const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T}).catch(() => null);
    await win.root.getByRole('button', {name: 'OK', exact: true}).click();
    const s = await saved;
    out.save = {status: s ? s.status() : null};
    await win.root.waitFor({state: 'detached', timeout: 8000}).catch(() => {});
    await idle(page);
    const after = await screen(page);
    record(`${label}-after-ok`, after);
    out.save.windowOpen = await win.roleSelect().isVisible().catch(() => false);
    out.save.notices = (after.notices || []).map((n) => flat(n.text || n));
    await panel.reland();
    await idle(page);
    out.participants = (await panel.rowLines()).filter((r) => JSON.stringify(r).includes(person));
    return out;
}

module.exports = {T, sleep, flat, CASES, WARNING, openWorkflow, enrollReviewer, reviewerRows, readWarning, assign};
