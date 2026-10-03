// Helpers for the U40 OPS3 walk (ops-french-author-banner-copyright-codes): the workflow
// window opened as an editor or as an author, its side menu, and the two pages' texts.
// Requiring this file runs nothing.
const {idle, rawKeys} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
const nav = (page) => workflow(page).getByRole('navigation');

/** Open a submission's workflow window: `editorial` (editor) or `mySubmissions` (author), in `lang`. */
async function openWorkflow(page, app, lang, id, view = 'editorial') {
    await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/${view}?workflowSubmissionId=${id}`));
    await workflow(page).locator('[data-cy="sidemodal-header"]').waitFor({timeout: 60_000});
    await idle(page);
}

/** Press a side-menu entry, unfolding the publication / version node above it when hidden; returns the entries seen. */
async function pressMenu(page, label) {
    const target = nav(page).getByRole('link', typeof label === 'string' ? {name: label, exact: true} : {name: label});
    await nav(page).getByRole('link').first().waitFor({timeout: T});
    for (let i = 0; i < 4; i++) {
        if (await target.last().isVisible().catch(() => false)) break;
        const groups = nav(page).getByRole('link').filter({hasText: /^\s*(##[^#]+##.*|Publication|Prépublication|Preprint|Unassigned version|Author Original.*|Version of Record.*|Version.*|Toutes les versions|All Versions)\s*$/});
        const n = await groups.count();
        if (!n) break;
        await groups.nth(n - 1 - (i % n)).click();
        await idle(page);
    }
    const entries = await nav(page).getByRole('link').allInnerTexts().catch(() => []);
    await target.last().click();
    await idle(page);
    return entries.map((e) => flat(e, 120));
}

/** The codes (`##key##`) inside the workflow window. */
async function windowKeys(page) {
    const keys = await rawKeys(page, {scope: '[role="dialog"]'}).catch((e) => `rawKeys failed: ${e.message}`);
    return Array.isArray(keys) ? [...new Set(keys.map((k) => (typeof k === 'string' ? k : k.key)))] : keys;
}

/** The Title & Abstract page as the author sees it: the banner above the form (null when none) and whether Save is offered. */
async function readTitlePage(page) {
    const form = workflow(page).locator('form').first();
    await form.waitFor({timeout: T});
    await idle(page);
    const banner = workflow(page).locator('div.bg-attention').first();
    await banner.waitFor({timeout: 10_000}).catch(() => null);
    return {
        heading: flat(await workflow(page).locator('.pkp-modal-scroll-container h2').first().innerText().catch(() => null)),
        banner: (await banner.count()) ? flat(await banner.innerText()) : null,
        saveOffered: await workflow(page).getByRole('button', {name: /^(Save|Enregistrer)$/}).first().isVisible().catch(() => false),
        rawKeys: await windowKeys(page),
    };
}

/** The Permissions & Disclosure page: each field's label and description. */
async function readPermissionsPage(page) {
    const holder = workflow(page).locator('[id*="copyrightHolder"][id*="-description"]').first();
    await holder.waitFor({timeout: T});
    await idle(page);
    const field = async (name) => ({
        label: flat(await workflow(page).locator(`label[for*="${name}"], legend[id*="${name}"]`).first().innerText().catch(() => null)),
        description: flat(await workflow(page).locator(`[id*="${name}"][id*="-description"]`).first().innerText().catch(() => null), 400),
    });
    return {
        heading: flat(await workflow(page).locator('.pkp-modal-scroll-container h2').first().innerText().catch(() => null)),
        copyrightHolder: await field('copyrightHolder'),
        copyrightYear: await field('copyrightYear'),
        licenseUrl: await field('licenseUrl'),
        rawKeys: await windowKeys(page),
    };
}

module.exports = {T, flat, workflow, nav, openWorkflow, pressMenu, windowKeys, readTitlePage, readPermissionsPage};
