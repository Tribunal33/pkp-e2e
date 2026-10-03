// Helpers of walk.js here (spec U75 A1, A2). Requiring this file runs nothing. Every helper drives
// the preprint's workflow as a person does: a version's "Title & Abstract" page and its "Relations"
// control, and the preprint page.
const {expect} = require('@playwright/test');
const {idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A relation save: the panel's POST (X-Http-Method-Override PUT) to the publication or its `/relate`. */
const isRelationSave = (r) =>
    r.request().method() === 'POST' && /\/submissions\/\d+\/publications\/\d+(\/relate)?(\?.*)?$/.test(r.url());

/** The frame, the "Relations" control and the preprint page objects for `page`. */
function objects(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {RelationsControl} = require('../../../pages/PreprintRelationsPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});
    return {frame, relations: new RelationsControl(page, frame)};
}

/**
 * Open the submission's workflow (the author's "My Submissions" view or the editorial one, as
 * the list's "View" does), then "Preprint" › the version › "Title & Abstract".
 */
async function openTitleAbstract(page, app, submissionId, {author = false} = {}) {
    const {frame, relations} = objects(page, app);
    await page.goto('about:blank');
    if (author) await frame.gotoAuthor(submissionId);
    else await frame.gotoEditorial(submissionId);
    await idle(page);
    const link = frame.menuLink('Title & Abstract');
    if (!(await link.last().isVisible().catch(() => false))) {
        if (app.line !== 'stable-3_5_0' && (await frame.latestVersionNode().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        else await frame.publicationGroup().click();
    }
    await expect(link.last()).toBeVisible({timeout: T});
    await link.last().click();
    await frame.expectPageHeading('Title & Abstract');
    await idle(page);
    // the page's form renders after idle (patterns.md "Probe kit"): wait for its footer
    await expect(frame.dialog().getByRole('button', {name: 'Save', exact: true}).first()).toBeVisible({timeout: T});
    return {frame, relations};
}

/** Press "Relations" when its panel is closed and wait for its legend (3.5 lists two choices, main three). */
async function openPanel(relations) {
    await expect(relations.button()).toBeVisible({timeout: T});
    if (!(await relations.panel().isVisible())) await relations.button().click();
    await expect(relations.legend()).toHaveText('Relation status', {timeout: T});
    await expect(relations.radios().first()).toBeVisible({timeout: T});
}

/** The page as the person sees it before "Relations" is opened: the status line, any banner, the form's "Save". */
async function readPage(frame) {
    const saves = frame.dialog().getByRole('button', {name: 'Save', exact: true});
    const n = await saves.count();
    const save = [];
    for (let i = 0; i < n; i++) save.push({visible: await saves.nth(i).isVisible(), disabled: await saves.nth(i).isDisabled()});
    return {
        status: flat(await frame.publicationStatusLine().first().innerText().catch(() => null)),
        controlsLeft: flat(await frame.controlsLeft().innerText().catch(() => null)),
        banner: (await frame.dialog().innerText().catch(() => '')).split('\n').map((l) => flat(l)).filter((l) => /^This version/.test(l)),
        formSave: save,
    };
}

/** The open "Relations" panel: which choice is ticked, whether the choices and "Save" are active, the box. */
async function readPanel(relations) {
    const radios = relations.radios();
    const n = await radios.count();
    const choices = [];
    for (let i = 0; i < n; i++) {
        const r = radios.nth(i);
        choices.push({checked: await r.isChecked(), disabled: await r.isDisabled()});
    }
    const box = relations.doiBox();
    return {
        lines: await relations.panelLines(),
        choices,
        doi: (await box.count()) ? {value: await box.inputValue(), disabled: await box.isDisabled()} : null,
        save: {visible: await relations.saveButton().isVisible(), disabled: await relations.saveButton().isDisabled()},
    };
}

/** The page notices on screen now (the toasts of `.app__notifications`). */
async function notices(page) {
    return (await page.locator('.app__notifications').allInnerTexts().catch(() => [])).map((t) => flat(t)).filter(Boolean);
}

/**
 * Tick `choice`, type `doi` when given, press "Save"; returns the request, its answer, the
 * notices and what the panel shows a moment later.
 */
async function saveRelation(page, relations, choice, doi) {
    await relations.choose(choice);
    if (doi !== undefined) await relations.typeDoi(doi);
    const answered = page.waitForResponse(isRelationSave, {timeout: T});
    await relations.saveButton().click();
    const r = await answered;
    let body = null;
    try {
        body = await r.json();
    } catch {
        body = null;
    }
    const seen = [];
    for (let i = 0; i < 6; i++) {
        for (const t of await notices(page)) if (!seen.includes(t)) seen.push(t);
        await sleep(300);
    }
    return {
        request: r.url().replace(/^https?:\/\/[^/]+/, ''),
        status: r.status(),
        errorMessage: body && !Array.isArray(body) ? body.errorMessage || body.error || null : null,
        notices: seen,
        savedShown: await relations.savedStatus().isVisible().catch(() => false),
        panel: await readPanel(relations),
    };
}

/** After a reload: the page reopened and "Relations" pressed. */
async function readAfterReload(page, app, submissionId, {author = false} = {}) {
    const {relations} = await openTitleAbstract(page, app, submissionId, {author});
    await openPanel(relations);
    return readPanel(relations);
}

/** The preprint page's notices (the relation notice is one of them). */
async function preprintNotices(page, app, submissionId) {
    const {ArticleLandingPage} = require('../../../pages/ArticleLandingPages.js');
    const landing = new ArticleLandingPage(page, app.contextPath, {op: 'preprint'});
    const response = await landing.goto(submissionId);
    return {status: response && response.status(), notices: (await landing.notices().allInnerTexts()).map((t) => flat(t))};
}

/** The stored relation of each version of the submission: publication|status|relationStatus|vorDoi. */
function storedRelations(app, submissionId) {
    const rows = sql(app, `select p.publication_id, p.status,
        coalesce((select setting_value from publication_settings s where s.publication_id = p.publication_id and s.setting_name = 'relationStatus'), ''),
        coalesce((select setting_value from publication_settings s where s.publication_id = p.publication_id and s.setting_name = 'vorDoi'), '')
        from publications p where p.submission_id = ${Number(submissionId)} order by p.publication_id`);
    return rows ? rows.split('\n') : [];
}

/**
 * Production › Participants › the person's row › "More Actions" › "Edit": set the "Assignment
 * privileges" box (recommend only) and press "OK". Returns the box's state before and after.
 */
async function setRecommendOnly(page, app, submissionId, name, role, on) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});
    await page.goto('about:blank');
    await panel.goto(submissionId, {menuKey: 'workflow_5'});
    await idle(page);
    const win = await panel.openEdit(name, role);
    const box = win.recommendOnlyBox();
    await expect(box).toBeVisible({timeout: T});
    const before = await box.isChecked();
    const permissions = await win.metadataBox().isChecked();
    await box.setChecked(on);
    await win.ok();
    return {before, after: on, permissions};
}

module.exports = {setRecommendOnly, T, sleep, flat, isRelationSave, objects, openTitleAbstract, openPanel, readPage, readPanel, notices, saveRelation, readAfterReload, preprintNotices, storedRelations};
