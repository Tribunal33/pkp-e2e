// Shared screen helpers for walk.js and neighbour.js (spec U44 register OMP4).
// The URN settings window comes from OMP1's kept script (tick exactly the given "Press Content" boxes and "Save");
// the "Identifiers" page from U44 A4's. This file adds the version's "Publish" button and reads the URN part of
// the confirmation window it opens, then closes the window without publishing.
const {idle} = require('../../../probe');
const OMP1 = require('../urn-settings-chapters-files-alone-refused/lib');
const A4 = require('../urn-resave-refused-already-in-use/lib');

const {T, sleep, flat, wf, isMain, snap, readSubmission, openIdentifiers, pressSave} = A4;

const PUBLISH = /^(Schedule For Publication|Publish)$/;
const publishDialog = (page) => page.getByRole('dialog').filter({hasText: /requirements have been met|publication requirements have not been met|Review Publishing Details/}).last();

/** What the confirmation window says about URNs: the sentence or the table, read as the screen shows them. */
async function readUrnPart(dialog) {
    return dialog.evaluate((root) => {
        const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const tables = [...root.querySelectorAll('table')].map((tb) => ({
            head: [...tb.querySelectorAll('thead th')].map(t),
            rows: [...tb.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => ({text: t(td), warningIcon: !!td.querySelector('.fa-exclamation-triangle')}))),
        }));
        const warnings = [...root.querySelectorAll('.pkpNotification--warning')].map(t);
        const urnSentence = (t(root).match(/The URN for this publication will be [^\s]+/) || [null])[0];
        return {tables, warnings, urnSentence, text: t(root).slice(0, 1500)};
    });
}

/** Steps 4-6 (8-9): the version's "Publish", the confirmation window's URN part, close without publishing. */
async function publishWindow(page, app, sid, pid, name) {
    const menuKey = isMain(app) ? `publication_${pid}_titleAbstract` : 'publication_titleAbstract';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${menuKey}`));
    await idle(page);
    await wf(page).getByRole('heading').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    const right = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: PUBLISH}).filter({visible: true});
    const pb = (await right.count()) ? right.first() : wf(page).getByRole('button', {name: PUBLISH}).filter({visible: true}).last();
    await pb.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    const out = {button: (await pb.innerText()).trim()};
    await pb.click();
    await idle(page);
    let dialog = publishDialog(page);
    await dialog.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    // A "Review Publishing Details" step first, when the line has one: choose the version stage and "Confirm".
    if (/Review Publishing Details/.test(await dialog.innerText())) {
        out.reviewPanel = true;
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = dialog.locator(sel);
            if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
        }
        await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
        await idle(page);
        dialog = page.getByRole('dialog').filter({hasText: /requirements have been met|publication requirements have not been met/}).last();
        await dialog.waitFor({state: 'visible', timeout: T});
        await sleep(800);
    }
    out.urnPart = await readUrnPart(dialog);
    await snap(page, name, {publishWindow: out});
    // Close without publishing.
    const close = dialog.getByRole('button', {name: /^(Close|Cancel)/}).first();
    if (await close.count()) await close.click().catch(() => {});
    else await page.keyboard.press('Escape');
    await idle(page);
    await sleep(800);
    out.closed = !(await dialog.isVisible().catch(() => false));
    return out;
}

/** Step 7: "Identifiers", "Assign", "Save". */
async function assignAndSave(page, app, sid, pid, name) {
    const before = await openIdentifiers(page, app, sid, pid, `${name}-a-identifiers`);
    const field = wf(page).locator('.pkpFormField').filter({hasText: 'URN'}).first();
    const assign = field.getByRole('button', {name: 'Assign', exact: true});
    const out = {before, assignOffered: (await assign.count()) > 0};
    if (out.assignOffered) { await assign.click(); await sleep(400); }
    out.typed = await field.locator('input').first().inputValue().catch(() => null);
    out.save = await pressSave(page, `${name}-b-saved`);
    return out;
}

module.exports = {T, sleep, flat, snap, isMain, readSubmission, trySave: OMP1.trySave, publishWindow, assignAndSave};
