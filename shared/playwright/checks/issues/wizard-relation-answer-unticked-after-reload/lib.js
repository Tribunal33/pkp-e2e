// Helpers for walk.js (U75 A10): the wizard's "For Readers" relation question and the workflow's "Relations" panel.
// Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const PUB_WRITE = /\/api\/v1\/submissions\/\d+\/publications\/\d+$/;

const TEXT = {
    unknown: "This preprint's relations have not been entered.",
    none: 'This preprint has not been published elsewhere.',
    published: 'This preprint has been published elsewhere.',
};

/** Every publication write the page sends (a Vue save is a POST with X-Http-Method-Override), with its body and answer. */
function watchWrites(page) {
    const list = [];
    page.on('response', async (r) => {
        const req = r.request();
        if (req.method() === 'GET' || !PUB_WRITE.test(new URL(r.url()).pathname)) return;
        list.push({at: Date.now(), url: r.url(), op: req.headers()['x-http-method-override'] || req.method(), status: r.status(), body: flat(req.postData(), 400)});
    });
    return {list, since: (t) => list.filter((x) => x.at >= t)};
}

/** Wait (bounded) for a write after `t` whose body matches `re` and that the server accepted. Returns it or null. */
async function waitForWrite(writes, t, re, ms = 20_000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
        const w = writes.since(t).find((x) => re.test(x.body || '') && x.status < 400);
        if (w) return w;
        await sleep(250);
    }
    return null;
}

const current = (page) => page.locator('.pkpSteps__step__label--current');
async function currentStep(page) { return flat(await current(page).innerText().catch(() => ''), 80); }

/** The footer's "Continue" until the named step is current (bounded; a press swallowed by a re-render is repeated). */
async function continueTo(page, label) {
    for (let i = 0; i < 8 && !endAnchored(label).test(await currentStep(page)); i++) {
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click({timeout: 10_000});
        await sleep(800);
        await idle(page).catch(() => {});
    }
    return currentStep(page);
}

/** A reached step from the rail. */
async function railTo(page, label) {
    for (let attempt = 0; attempt < 3; attempt++) {
        if (await page.locator('.pkpSteps--collapsed').count()) await page.locator('.pkpSteps__controls button').click().catch(() => {});
        await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).first().click();
        try { await current(page).filter({hasText: endAnchored(label)}).waitFor({timeout: 5000}); await idle(page).catch(() => {}); return currentStep(page); } catch (e) { if (attempt === 2) throw e; }
    }
    return currentStep(page);
}

/** A step by the rail when the rail offers it (a step reached since the page loaded), else by "Continue". Returns {step, via}. */
async function goToStep(page, label) {
    if (endAnchored(label).test(await currentStep(page))) return {step: await currentStep(page), via: 'already'};
    if (await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored(label)}).count()) return {step: await railTo(page, label), via: 'rail'};
    return {step: await continueTo(page, label), via: 'Continue'};
}

/** "For Readers": the "Relation status" group as shown (its heading, each choice ticked or not, the DOI box). */
async function readRelationStep(page) {
    const group = page.locator('fieldset').filter({has: page.locator('input[name="relationStatus"]')}).first();
    await group.waitFor({state: 'visible', timeout: T}).catch(() => {});
    const radios = await page.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(),
        value: e.value,
        checked: e.checked,
    }))).catch(() => []);
    const doiEl = page.locator('input[name="vorDoi"]');
    const doi = (await doiEl.count())
        ? {shown: await doiEl.first().isVisible().catch(() => false), value: await doiEl.first().inputValue().catch(() => null)}
        : {shown: false, value: null, inPage: false};
    return {legend: flat(await group.locator('legend').first().innerText().catch(() => null), 120), radios, ticked: radios.filter((r) => r.checked).map((r) => r.label), doi};
}

/** The Review step's "Relation status" panel text (after its check has answered). */
async function readReviewRelation(page) {
    const panel = page.locator('.submissionWizard__reviewPanel').filter({has: page.getByRole('heading', {name: 'Relation status', exact: true})});
    await panel.first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await page.locator('.submissionWizard__loadingReview').waitFor({state: 'detached', timeout: 20_000}).catch(() => {});
    const link = panel.first().locator('a[href]').filter({hasNotText: /^\s*Edit\s*$/});
    return {
        text: flat(await panel.first().innerText().catch(() => null), 300),
        link: (await link.count()) ? await link.first().getAttribute('href').catch(() => null) : null,
    };
}

/** Reload the wizard; answer an "Unsaved Changes" question with `answer` when one shows. Returns the question's text or null. */
async function reloadWizard(page, answer = 'No, discard unsaved changes') {
    await page.reload();
    await current(page).waitFor({timeout: T});
    await idle(page).catch(() => {});
    await sleep(1500);
    const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
    let asked = null;
    if (await unsaved.isVisible().catch(() => false)) {
        asked = flat(await unsaved.innerText().catch(() => null), 300);
        await unsaved.getByRole('button', {name: answer, exact: true}).click().catch(() => {});
        await idle(page).catch(() => {});
    }
    return asked;
}

/** What the database holds for a publication's relation (the evidence beside the screens). */
function storedRelation(sql, app, publicationId) {
    return sql(app, `SELECT setting_name || '=' || coalesce(setting_value, 'NULL') FROM publication_settings WHERE publication_id = ${Number(publicationId)} AND setting_name IN ('relationStatus', 'vorDoi') ORDER BY 1`).split('\n').filter(Boolean);
}

/** The workflow's "Relations" panel of the open publication page: each choice and the DOI box. */
async function readRelationsPanel(page) {
    const panel = page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content').first();
    if (!(await panel.isVisible().catch(() => false))) return {open: false};
    const radios = await panel.locator('input[name="relationStatus"]').evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || e.parentElement).innerText || '').replace(/\s+/g, ' ').trim(), checked: e.checked,
    }))).catch(() => []);
    const doiEl = panel.locator('input[name="vorDoi"]');
    return {
        open: true,
        ticked: radios.filter((r) => r.checked).map((r) => r.label),
        radios,
        doi: (await doiEl.count()) ? await doiEl.first().inputValue().catch(() => null) : null,
    };
}

module.exports = {T, sleep, flat, endAnchored, PUB_WRITE, TEXT, watchWrites, waitForWrite, current, currentStep, continueTo, railTo, goToStep, readRelationStep, readReviewRelation, reloadWizard, storedRelation, readRelationsPanel};
