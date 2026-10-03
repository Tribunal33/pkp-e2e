// Helpers for walk.js (U41 A20). Requiring this file runs nothing.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 2000) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The submission each app's steps open: unpublished, English its only publication language. */
const SUBMISSION = {
    ojs: {id: 7, title: 'Developing efficacy beliefs in the classroom'},
    omp: {id: 1, title: 'The ABCs of Human Survival: A Paradigm for Global Citizenship'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

/**
 * Steps 2-3: Settings › Website › "Setup" › "Languages", untick French under "Metadata" on
 * "Submission Languages". Returns the French rows before and after and the answer.
 */
async function untickFrenchMetadata(page, app) {
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const tab = new JournalLanguagesTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    const read = async () => {
        const r = {};
        for (const [grid, cols] of [[tab.website, ['uiLocale', 'formLocale']], [tab.submission, ['submissionLocale', 'submissionMetadataLocale']]]) {
            for (const c of cols) r[c] = await grid.cell('fr_CA', c).isChecked().catch(() => null);
        }
        return r;
    };
    const before = await read();
    const {response, alerts} = await tab.pressSubmission('fr_CA', 'submissionMetadataLocale');
    await sleep(500);
    const shown = await screen(page);
    const after = await read();
    return {before, status: response.status(), alerts, notices: shown.notices, after};
}

/** Steps 4-5: the submission's workflow, Publication › "Contributors". */
async function openContributors(page, app, id) {
    const prefix = app.line && /3_[43]/.test(app.line) ? '' : '/en';
    await page.goto(app.url(`/index.php/${app.contextPath}${prefix}/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    await page.getByRole('link', {name: 'Contributors', exact: true}).first().click();
    await page.getByRole('button', {name: 'Add Contributor'}).first().waitFor({timeout: T});
    await idle(page);
    return rows(page);
}

/** The Contributors list's rows as read. */
async function rows(page) {
    return (await page.locator('.listPanel--contributor li.listPanel__item').allInnerTexts().catch(() => [])).map((t) => flat(t, 200));
}

/** The open contributor panel (Add or Edit) by the form it holds. */
function panel(page, name) {
    return page.getByRole('dialog', {name, exact: true});
}

/** Fill the shown fields of the form; only the fields given. */
async function fill(dlg, f) {
    if (f.type) {
        // 3.5 and older have no "Contributor Type": every contributor is a person there.
        const radio = dlg.getByRole('radio', {name: f.type, exact: true});
        if (await radio.count()) await radio.check();
        else if (f.type !== 'Person') return {noType: true};
        await sleep(300);
    }
    for (const [name, value] of Object.entries({'givenName-en': f.given, 'familyName-en': f.family, 'organizationName-en': f.org, email: f.email})) {
        if (value === undefined) continue;
        await dlg.locator(`input[name="${name}"]`).fill(value);
    }
    if (f.country) await dlg.locator('select[name="country"]').selectOption({label: f.country});
    if (f.role) {
        // "Contributor Roles" boxes on main; the "Contributor's role" radios on 3.5.
        const box = dlg.getByRole('checkbox', {name: f.role, exact: true});
        const radio = dlg.getByRole('radio', {name: f.role, exact: true});
        if ((await box.count()) && !(await box.isChecked())) await box.check();
        else if (!(await box.count()) && (await radio.count()) && !(await radio.first().isChecked())) await radio.first().check();
    }
    return {noType: false};
}

/** What the open panel shows: present, the foot, the field messages, Save's state, the shown fields. */
async function panelState(page, dlg) {
    const open = (await dlg.count()) > 0 && (await dlg.isVisible().catch(() => false));
    if (!open) return {open};
    const save = dlg.getByRole('button', {name: 'Save', exact: true});
    return {
        open,
        foot: flat(await dlg.locator('.pkpFormPage__footer, .pkpFormPages__footer, .pkpForm__footer, [class*="ormFooter"]').first().innerText().catch(() => null), 800),
        goTo: (await dlg.getByRole('button', {name: /^Go to /}).allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        fieldErrors: (await dlg.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
        saveDisabled: (await save.count()) ? await save.first().isDisabled() : null,
        shownFields: await dlg.locator('input[name], select[name], textarea[name]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null || e.type === 'hidden').map((e) => e.name)).catch(() => []),
    };
}

/**
 * "Save" on the open panel: the request the form sends and its answer, then the panel and the
 * page notices 1.5 s and 10 s after the press.
 */
async function pressSave(page, dlg) {
    const answer = page.waitForResponse((r) => /\/contributors(\/\d+)?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const out = {};
    if (r) {
        out.request = {url: r.url().replace(/^https?:\/\/[^/]+/, ''), override: r.request().headers()['x-http-method-override'] || null, body: safeJson(r.request().postData())};
        out.status = r.status();
        out.answer = safeJson(await r.text().catch(() => null));
    } else out.request = null;
    await sleep(1500);
    out.at1500 = await panelState(page, dlg);
    out.notices = (await screen(page)).notices;
    await sleep(8500);
    out.at10s = await panelState(page, dlg);
    return out;
}

/** Close the open panel by its own "Close" (never Escape: the workflow is a dialog too). */
async function closePanel(page, dlg) {
    const close = dlg.getByRole('button', {name: 'Close', exact: true}).first();
    if (await close.count()) await close.click().catch(() => {});
    await sleep(1000);
    await idle(page);
    return {stillOpen: await dlg.isVisible().catch(() => false)};
}

function safeJson(s) {
    if (s == null) return null;
    try {
        return JSON.parse(s);
    } catch (e) {
        return flat(s, 1500);
    }
}

module.exports = {T, flat, sleep, SUBMISSION, untickFrenchMetadata, openContributors, rows, panel, fill, panelState, pressSave, closePanel};
