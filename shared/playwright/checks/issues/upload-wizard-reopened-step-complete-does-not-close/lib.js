// Helpers of walk.js (U36 A15: step 2 of the upload wizard reopened from step 3 offers "Complete"
// but does not close; docs/issues/U36-A15-upload-wizard-reopened-step-complete-does-not-close.md).
// Requiring this file runs nothing. The wizard's openers and the upload come from the A14 walk's
// helpers (../change-file-keeps-first-upload/lib).
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle} = require('../../../probe');
const C = require('../change-file-keeps-first-upload/lib');

const {T, flat, sleep} = C;

/** One small PDF named `name` in a temp folder: {path, name}. */
function oneFile(name = 'u36m-file.pdf') {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36m-'));
    const p = path.join(dir, name);
    fs.copyFileSync(src, p);
    return {path: p, name};
}

/** The open upload wizard's window: the dialog that holds the wizard's button. */
const win = (page) => page.getByRole('dialog').filter({has: page.locator('#continueButton')}).last();
/** The wizard's one button under the steps ("Continue" or "Complete"). */
const button = (page) => win(page).locator('#continueButton');
/** A step's name in the strip ("2. Review Details"). */
const stepName = (page, name) => win(page).getByRole('tab', {name, exact: true});

/**
 * What the wizard shows now: whether it is open, the step names with which one is current and which
 * cannot be pressed, the button's label and state, and the current step's text and name box.
 */
async function state(page) {
    const w = win(page);
    if (!(await w.isVisible().catch(() => false))) return {open: false};
    const steps = await w.locator('[role="tab"]').evaluateAll((tabs) => tabs.map((t) => ({
        name: (t.innerText || '').replace(/\s+/g, ' ').trim(),
        current: t.getAttribute('aria-selected') === 'true',
        disabled: t.getAttribute('aria-disabled') === 'true',
    })));
    const panel = w.locator('[role="tabpanel"]:visible').first();
    const nameBox = panel.locator('input[name^="name["]:visible').first();
    return {
        open: true,
        current: (steps.find((s) => s.current) || {}).name || null,
        steps,
        button: flat(await button(page).innerText().catch(() => null), 40),
        buttonEnabled: await button(page).isEnabled().catch(() => null),
        nameBox: (await nameBox.count()) ? await nameBox.inputValue().catch(() => null) : null,
        addAnother: await w.locator('#newFile').isVisible().catch(() => false),
        text: flat(await panel.innerText().catch(() => null), 300),
    };
}

/** Wait until step `name` is the current one (or `ms` have passed), then until the page is quiet. */
async function onStep(page, name, ms = T) {
    await stepName(page, name).and(page.locator('[aria-selected="true"]')).waitFor({timeout: ms}).catch(() => {});
    await idle(page);
    await sleep(300);
}

/** Press the wizard's button whatever it reads; returns the label it had. */
async function press(page) {
    const label = flat(await button(page).innerText().catch(() => null), 40);
    await button(page).click();
    return label;
}

/** Press the button and wait for the window to close or for step `name` to be current. */
async function pressAndSettle(page, name) {
    const label = await press(page);
    await Promise.race([
        win(page).waitFor({state: 'hidden', timeout: T}).catch(() => {}),
        name ? stepName(page, name).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T}).catch(() => {}) : sleep(T),
    ]);
    await idle(page);
    await sleep(600); // a closed window's slot (patterns.md pitfall 4)
    return label;
}

/** Every request the wizard's steps 2 and 3 send from now on: the operation, the name posted, the status. */
function watchSteps(page) {
    const list = [];
    page.on('response', (r) => {
        const q = r.request();
        const op = (q.url().match(/edit-metadata|save-metadata|finish-file-submission|cancel-file-upload|delete-file|upload-file/) || [])[0];
        if (!op) return;
        const post = q.method() === 'POST' && op !== 'upload-file' ? decodeURIComponent(q.postData() || '').replace(/\+/g, ' ') : '';
        const name = (post.match(/name\[en\]=([^&]*)/) || [])[1];
        list.push({op, method: q.method(), status: r.status(), ...(name === undefined ? {} : {name})});
    });
    return list;
}

/** Add a galley labelled `label` on the open "Galleys" page (OPS); the upload wizard then opens by itself. */
async function addGalley(page, label) {
    const manager = page.locator('[data-cy="galley-manager"]').first();
    await manager.locator('table').first().waitFor({timeout: T});
    await manager.locator('button').filter({hasText: /^\s*Add galley\s*$/}).click();
    const box = page.getByRole('dialog').locator('input[name="label"]').last();
    await box.waitFor({timeout: T});
    await idle(page);
    await box.fill(label);
    const saved = page.waitForResponse((r) => r.url().includes('update-galley') && r.request().method() === 'POST', {timeout: T});
    await page.getByRole('dialog').filter({has: page.locator('input[name="label"]')}).last().getByRole('button', {name: 'Save', exact: true}).last().click();
    await saved;
    await C.uploadBox(page).waitFor({state: 'attached', timeout: T});
    await idle(page);
}

/** The galleys' rows on the open "Galleys" page, each as its flat text. */
async function galleyRows(page) {
    const manager = page.locator('[data-cy="galley-manager"]').first();
    return (await manager.locator('tbody tr').allInnerTexts()).map((t) => flat(t, 200));
}

module.exports = {T, flat, sleep, oneFile, win, button, stepName, state, onStep, press, pressAndSettle, watchSteps, addGalley, galleyRows};
