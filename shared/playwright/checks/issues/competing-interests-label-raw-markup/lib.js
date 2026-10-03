// Helpers of walk.js here (U41 OPS2). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Per app, on PKP's default test dataset: a submission whose current version takes new contributors. */
const CASES = {
    ojs: {id: 7, contributor: 'Domatilia Sokoloff'},
    omp: {id: 1, contributor: 'Arthur Clark'},
    ops: {id: 1, contributor: 'Carlo Corino'},
};

/**
 * Settings › Workflow › "Submission" › "Metadata": tick "Require submitting Authors to file a
 * Competing Interest (CI) statement …" and press the tab's "Save". Returns the save's answer.
 */
async function requireCompetingInterests(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    await page.getByRole('main').getByRole('tab', {name: 'Submission', exact: true}).first().click();
    await page.locator('#metadata-button').click();
    const panel = page.locator('#metadata');
    const box = panel.getByRole('checkbox', {name: /Require submitting Authors to file a Competing Interest/});
    await box.waitFor({timeout: T});
    const before = await box.isChecked();
    if (!before) await box.check();
    const answer = page
        .waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
    const r = await answer;
    await idle(page);
    const section = flat(await box.locator('xpath=ancestor::fieldset[1]').innerText().catch(() => null), 300);
    return {section, wasTicked: before, status: r ? r.status() : null, nowTicked: await box.isChecked()};
}

/** Open the workflow of `sub` and its publication page whose menu entry matches `label` (string or RegExp). */
async function openPage(wf, page, sub, label) {
    await wf.gotoEditorial(sub);
    await idle(page);
    await wf.expandLatestVersionNode().catch(() => {}); // 3.5 has no version nodes
    const links = typeof label === 'string' ? wf.menuLink(label) : wf.menu().getByRole('link', {name: label});
    const n = await links.count();
    for (let i = n - 1; i >= 0; i--) {
        if (await links.nth(i).isVisible().catch(() => false)) {
            await links.nth(i).click();
            await idle(page);
            await sleep(500);
            return true;
        }
    }
    return false;
}

/** The contributors list's add button (the list panel's header, whatever the language); opens the form. */
async function openAdd(page, wf) {
    const header = wf.dialog().locator('.listPanel__header').first();
    await header.waitFor({timeout: T});
    const buttons = await header.getByRole('button').allInnerTexts();
    const add = header.getByRole('button', {name: /Add Contributor|Ajouter/}).first();
    if (!(await add.count())) return {buttons: buttons.map((b) => flat(b, 60)), dlg: null};
    await add.click();
    const dlg = page.getByRole('dialog').filter({has: page.locator('form')}).last();
    await dlg.locator('.pkpFormField--affiliations, .pkpFormField').first().waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    return {buttons: buttons.map((b) => flat(b, 60)), dlg};
}

/** Row "Edit" on the contributor `name`; returns the form's dialog. */
async function openEdit(page, wf, name) {
    const item = wf.dialog().locator('li.listPanel__item').filter({hasText: name}).first();
    await item.waitFor({timeout: T});
    await item.getByRole('button', {name: /^(Edit|Modifier)/}).first().click();
    const dlg = page.getByRole('dialog').filter({has: page.locator('form')}).last();
    await dlg.locator('.pkpFormField').first().waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    return dlg;
}

/**
 * The competing-interests field as drawn: its label's visible text and markup, the label just
 * before it, the guidance under it, the required mark, and the accessible name of its editor.
 */
async function ciField(dlg) {
    const label = dlg.locator('label[for*="competingInterests"]').first();
    if (!(await label.count())) return {shown: false};
    return label.evaluate((l) => {
        const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const field = l.closest('.pkpFormField');
        const all = [...document.querySelectorAll('label.pkpFormFieldLabel')].filter((x) => field && field.closest('form') && field.closest('form').contains(x));
        const i = all.indexOf(l);
        const desc = field ? field.querySelector('.pkpFormField__description') : null;
        return {
            shown: true,
            labelText: f(l.innerText),
            labelHtml: f(l.innerHTML).slice(0, 600),
            labelHasLinkElement: !!l.querySelector('a'),
            previousLabel: i > 0 ? f(all[i - 1].innerText) : null,
            description: desc ? f(desc.innerText) : null,
            required: !!(field && field.querySelector('.pkpFormFieldLabel__required, .pkpFormFieldLabel__required')),
        };
    });
}

/** Close an open form with its own "Close" (never Escape: the workflow is a dialog too). */
async function closeForm(page, dlg) {
    await dlg.getByRole('button', {name: /^(Close|Fermer)$/}).first().click().catch(() => {});
    await sleep(800);
    await idle(page);
}

/** The initials menu › "Change Language" › the language whose link matches; waits for the address to carry `locale`. */
async function changeLanguage(page, label, locale) {
    await page.locator('[data-cy="app-user-nav"] button').first().click();
    const menu = page.locator('[data-cy="app-user-nav"] nav:visible').first();
    await menu.getByRole('link', {name: label}).first().click();
    await page.waitForURL(new RegExp(`/${locale}(/|$|\\?|#)`), {timeout: T});
    await idle(page);
}

module.exports = {T, flat, sleep, CASES, requireCompetingInterests, openPage, openAdd, openEdit, ciField, closeForm, changeLanguage};
