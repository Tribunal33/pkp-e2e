// Helpers of walk.js (issue report docs/issues/U52-A11-merged-payer-breaks-payments-list-and-publishing.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle} = require('../../../probe');
const {serverLog} = require('../book-without-abstract-oai-lists-fail/lib');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const url = (app, tail) => app.url(`/index.php/${app.contextPath}${tail}`);

/** Every visible window's text and buttons, bottom to top. */
function windows(page) {
    return page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => ({
        text: d.innerText.replace(/\s+/g, ' ').trim().slice(0, 500),
        buttons: [...d.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 12),
    }))).catch(() => []);
}

/** The "Payments" page, one tab pressed: its list's rows (or what stands in their place) and the list request's answer. */
async function readTab(page, app, tabName) {
    const answers = [];
    const onResponse = (r) => {
        if (/fetch-grid/.test(r.url())) answers.push(`${r.status()} ${new URL(r.url()).pathname.replace(/^.*\$\$\$call\$\$\$/, '')}`);
    };
    page.on('response', onResponse);
    await page.goto(url(app, '/payments')).catch(() => {});
    await idle(page).catch(() => {});
    await page.getByRole('tab', {name: tabName, exact: true}).click();
    await idle(page).catch(() => {});
    await sleep(2500);
    page.off('response', onResponse);
    const panel = page.getByRole('tabpanel', {name: tabName, exact: true});
    const data = await panel.evaluate((p) => {
        const t = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const vis = (e) => e.getClientRects().length > 0;
        return {
            rows: [...p.querySelectorAll('tbody tr.gridRow')].filter(vis).map((r) => [...r.children].map((c) => t(c.innerText).replace(/^Settings\s*/, ''))),
            noItems: [...p.querySelectorAll('tbody.empty td')].filter(vis).map((c) => t(c.innerText)).join(' ') || null,
            text: t(p.innerText).slice(0, 300),
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
    return {...data, listAnswers: answers.filter((a) => (tabName === 'Payments' ? /payments-grid/.test(a) : true))};
}

/** A submission's workflow opened by its address: the windows it opens over itself and the answers of 400 and more. */
async function openWorkflow(page, app, id) {
    const failed = [];
    const onResponse = (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname.replace(/^.*index\.php/, '')}`);
    };
    page.on('response', onResponse);
    await page.goto(url(app, `/en/dashboard/editorial?workflowSubmissionId=${id}`)).catch(() => {});
    await page.locator('[data-cy="workflow-controls-right"], [data-cy="sidemodal-header"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(2000);
    page.off('response', onResponse);
    const errorWindow = (await windows(page)).find((w) => /^Error\b/.test(w.text)) || null;
    return {failed, errorWindow};
}

const menu = (page) => page.locator('.pkpWorkflow__submissionPayments');

/** The open workflow's "Payments" button pressed: what its panel holds. */
async function readFeeMenu(page) {
    const errorOk = page.getByRole('dialog').filter({hasText: /^\s*Error/}).last().getByRole('button', {name: 'OK', exact: true});
    if (await errorOk.count()) {
        await errorOk.click().catch(() => {});
        await sleep(800);
    }
    const button = menu(page).getByRole('button', {name: 'Payments', exact: true});
    if (!(await button.count())) return {button: false};
    const content = menu(page).locator('.pkpDropdown__content');
    if (!(await content.isVisible().catch(() => false))) await button.click();
    await sleep(2500);
    await idle(page).catch(() => {});
    return {
        button: true,
        options: (await content.locator('label').allInnerTexts().catch(() => [])).map((s) => flat(s)),
        chosen: flat(await content.locator('label').filter({has: page.locator('input[type=radio]:checked')}).first().innerText({timeout: 2000}).catch(() => null)),
        text: flat(await content.innerText().catch(() => null), 200),
    };
}

/** The open workflow's "Payments" menu: an option chosen and "Save" pressed. */
async function saveFee(page, option) {
    const content = menu(page).locator('.pkpDropdown__content');
    if (!(await content.isVisible().catch(() => false))) await menu(page).getByRole('button', {name: 'Payments', exact: true}).click();
    await content.getByRole('radio', {name: option, exact: true}).waitFor({timeout: T});
    await content.getByRole('radio', {name: option, exact: true}).check({force: true});
    const answered = page.waitForResponse((r) => /\/payment(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).then((r) => r.status()).catch(() => null);
    await content.getByRole('button', {name: 'Save', exact: true}).click();
    const status = await answered;
    const saved = await content.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 5000}).then(() => true).catch(() => false);
    return {option, status, saved};
}

/** The open workflow's "Schedule For Publication" (or "Publish") pressed, "Review Publishing Details" confirmed: the window that follows. Nothing is published. */
async function pressPublish(page, app) {
    const errorOk = page.getByRole('dialog').filter({hasText: /^\s*Error/}).last().getByRole('button', {name: 'OK', exact: true});
    if (await errorOk.count()) {
        await errorOk.click().catch(() => {});
        await sleep(800);
    }
    const failed = [];
    const onResponse = (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${new URL(r.url()).pathname.replace(/^.*index\.php/, '')}`);
    };
    page.on('response', onResponse);
    // the publishing button sits on the publication's pages: "Publication" › "Title & Abstract" in the workflow's menu
    const {workflowFrame} = require('../older-version-tab-current-title/lib');
    const entry = await workflowFrame(page, app).revealPublicationEntry('Title & Abstract').catch(() => null);
    if (entry) await entry.click().catch(() => {});
    await idle(page).catch(() => {});
    await sleep(1500);
    const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
    await button.waitFor({timeout: 8000}).catch(() => {});
    if (!(await button.count())) {
        page.off('response', onResponse);
        return {button: null};
    }
    const label = flat(await button.innerText());
    await button.click();
    await idle(page).catch(() => {});
    await sleep(2500);
    // "Review Publishing Details": the stage "Version of Record", a major version, the first issue offered; "Confirm"
    const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
    const details = {shown: (await panel.count()) > 0};
    if (details.shown) {
        await panel.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
        await panel.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
        const issue = panel.locator('select[name="issueId"]');
        if (await issue.count()) {
            const value = await issue.inputValue().catch(() => '');
            details.preselected = value ? flat(await issue.locator('option:checked').innerText().catch(() => null), 80) : null;
            if (!value) {
                const first = await issue.locator('option').evaluateAll((os) => (os.find((o) => o.value) || {}).value).catch(() => null);
                if (first) await issue.selectOption(first).catch(() => {});
            }
            details.issue = flat(await issue.locator('option:checked').innerText().catch(() => null), 80);
        }
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
        await idle(page).catch(() => {});
        await sleep(3000);
    }
    // 3.5: "Select an issue to schedule for publication" first; the first issue offered, "Save"
    const chooser = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
    if (await chooser.count()) {
        const issue = chooser.locator('select').first();
        const first = await issue.locator('option').evaluateAll((os) => (os.find((o) => o.value && !o.disabled) || {}).value).catch(() => null);
        if (first) await issue.selectOption(first).catch(() => {});
        details.issue = flat(await issue.locator('option:checked').innerText().catch(() => null), 80);
        await chooser.getByRole('button', {name: 'Save', exact: true}).click();
        await idle(page).catch(() => {});
        await sleep(3000);
    }
    page.off('response', onResponse);
    const all = await windows(page);
    const top = all[all.length - 1] || {};
    const text = all.map((w) => w.text).join(' | ');
    return {
        button: label, details, failed, window: flat(top.text, 400), buttons: top.buttons,
        feeLine: /Publication Fee not paid/.test(text),
        allMet: /All publication requirements have been met/.test(text),
        unexpectedError: /An unexpected error has occurred/.test(text),
    };
}

module.exports = {T, sleep, flat, url, windows, readTab, openWorkflow, readFeeMenu, saveFee, pressPublish, serverLog};
