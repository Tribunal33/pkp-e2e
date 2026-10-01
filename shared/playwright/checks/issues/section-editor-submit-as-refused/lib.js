// Helpers of walk.js and neighbour.js (issue report docs/issues/U21-A14-section-editor-submit-as-refused.md)
// and of ../submit-as-preselects-editorial-role/walk.js. Requiring this file runs nothing.
// Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const {typeRich} = require('../wizard-refused-save-hangs-saving/lib.js');
const {WORDS, L, giveRole} = require('../section-editors-not-assigned-second-journal/lib.js');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app editorial role names of the dataset's users. */
const ROLES = {
    ojs: {se: 'Section editor', editor: 'Journal editor', section: 'Articles'},
    omp: {se: 'Series editor', editor: 'Press editor', section: null},
    ops: {se: 'Moderator', editor: 'Preprint Server manager', section: null},
};

/**
 * As `admin`: Administration › "Hosted …" › the context's arrow › "Settings wizard",
 * "Users" tab, search the user, "Edit User", tick the role, "OK".
 */
async function giveRoleInContext(page, app, {username, role}) {
    const {HostedContextsPage} = require('../../../pages/UsersManagementPages.js');
    const hosted = new HostedContextsPage(page, {hostedLabel: WORDS[app.name].hosted});
    await hosted.gotoFromAdministration();
    await hosted.openSettingsWizard(app.contextPath);
    return giveRole(page, app, {username, role});
}

/** Open the start page ("Make a Submission") of the context. */
async function openStart(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/submission`));
    await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
    await idle(page);
}

const submitAsSet = (page) => page.getByRole('group', {name: /^Submit As\b/});

/** "Submit As" as shown: the radios in order with the checked one, its description; null when absent. */
async function readSubmitAs(page) {
    const set = submitAsSet(page);
    if (!(await set.count())) return null;
    const radios = await set.locator('input[type="radio"]').evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
        value: e.value,
        checked: e.checked,
    })));
    return {
        options: radios.map((r) => r.label),
        checked: (radios.find((r) => r.checked) || {}).label || null,
        values: Object.fromEntries(radios.map((r) => [r.value, r.label])),
        text: flat(await set.innerText()),
    };
}

/** Fill the start form (title, section when offered, English when offered, the boxes); choose a "Submit As" role when given. */
async function fillStart(page, {title, section, submitAs}) {
    await typeRich(page, 'startSubmission-title-control', title);
    if (section) {
        const r = page.getByRole('radio', {name: section, exact: true});
        if (await r.count()) await r.check();
    }
    const en = page.getByRole('radio', {name: 'English', exact: true});
    if (await en.count()) await en.check();
    for (const name of [/meets all of these requirements/, /agree to have my data collected/]) {
        const b = page.getByRole('checkbox', {name});
        if (await b.count()) await b.check();
    }
    if (submitAs) await submitAsSet(page).getByRole('radio', {name: submitAs, exact: true}).check();
}

/**
 * Press "Begin Submission" and report what happened: the POST's status and answer, then
 * either the wizard's submission id or the form's error under "Submit As".
 */
async function pressBegin(page) {
    const roles = await submitAsSet(page).locator('input[type="radio"]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.value, ((e.closest('label') || {}).innerText || '').trim()]))).catch(() => ({}));
    const posted = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/submissions(\?|$)/.test(r.url()), {timeout: T});
    await page.getByRole('button', {name: 'Begin Submission'}).click();
    const r = await posted;
    const sent = (() => { try { return r.request().postDataJSON() || {}; } catch (e) { return {}; } })();
    const out = {status: r.status(), postedRole: sent.userGroupId == null ? null : (roles[String(sent.userGroupId)] || `group ${sent.userGroupId}`), answer: null, id: null, error: null, url: null};
    if (r.status() >= 400) out.answer = await r.json().catch(() => null);
    if (r.status() < 400) {
        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
        await page.locator('.pkpSteps__step__label--current').waitFor({timeout: T});
        out.id = Number(new URL(page.url()).searchParams.get('id'));
    } else {
        await idle(page);
        out.error = flat(await submitAsSet(page).locator('.pkpFieldError').innerText({timeout: 5000}).catch(() => null));
    }
    await idle(page);
    out.url = page.url();
    return out;
}

module.exports = {T, flat, ROLES, WORDS, giveRoleInContext, openStart, readSubmitAs, fillStart, pressBegin};
