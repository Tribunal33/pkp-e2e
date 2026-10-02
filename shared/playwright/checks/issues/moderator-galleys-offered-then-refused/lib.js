// Helpers of walk.js here (spec U46 OPS2) and of ../author-galley-change-file-refused/walk.js
// (spec U46 OPS3). Requiring this file runs nothing. Every helper drives the preprint's
// "Galleys" page and the workflow's "Participants" panel as a person does.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {expect} = require('@playwright/test');
const {idle, sql, screen} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A copy of an OPS fixture under the name the steps use, in a temp folder: {path, name}. */
function namedFile(fixture, name) {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ops', 'playwright', 'fixtures', 'files', fixture);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u46w6-'));
    const p = path.join(dir, name);
    fs.copyFileSync(src, p);
    return {path: p, name};
}

/** Record every browser dialog (and accept it, so a page-leave question lets the page go). */
function watchDialogs(page) {
    const seen = [];
    page.on('dialog', async (d) => {
        seen.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    return seen;
}

/**
 * Open the submission's workflow (the editorial or the author's view, as its list's "View"
 * does) and then the side menu "Preprint" › the version › "Galleys". Returns the page object.
 */
async function openGalleys(page, app, submissionId, {author = false} = {}) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});
    await page.goto('about:blank');
    if (author) await frame.gotoAuthor(submissionId);
    else await frame.gotoEditorial(submissionId);
    await idle(page);
    const link = frame.menuLink('Galleys');
    if (!(await link.last().isVisible().catch(() => false))) {
        if (app.line !== 'stable-3_5_0' && (await frame.latestVersionNode().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        else await frame.publicationGroup().click();
    }
    await expect(link.last()).toBeVisible({timeout: T});
    await link.last().click();
    const galleys = new GalleyManager(page, frame);
    await galleys.expectLoaded();
    await idle(page);
    return galleys;
}

/** What the "Galleys" page offers: the list, "Order", "Add galley", and each row's menu. */
async function offers(galleys) {
    const labels = await galleys.labels();
    const rows = {};
    for (const l of labels) {
        const button = galleys.menuButton(l);
        rows[l] = (await button.count()) && (await button.first().isVisible()) ? await galleys.menuOffers(l) : null;
    }
    return {
        labels,
        order: await galleys.orderButton().isVisible().catch(() => false),
        addGalley: await galleys.addButton().isVisible().catch(() => false),
        rows,
    };
}

/** The open galley window as the person sees it: title, each box's value and state, the buttons, its text. */
async function readWindow(win) {
    const dlg = win.dialog();
    const fields = [];
    const n = await win.fields().count();
    for (let i = 0; i < n; i++) {
        const f = win.fields().nth(i);
        fields.push({
            name: await f.getAttribute('name'),
            visible: await f.isVisible().catch(() => false),
            disabled: await f.isDisabled().catch(() => null),
            value: (await f.getAttribute('type')) === 'checkbox' ? await f.isChecked().catch(() => null) : await f.inputValue().catch(() => null),
        });
    }
    const save = win.saveButton();
    return {
        title: win.title,
        open: await dlg.isVisible().catch(() => false),
        fields,
        save: (await save.count()) ? {visible: await save.isVisible(), disabled: await save.isDisabled()} : null,
        cancel: await win.cancelControl().count(),
        text: flat(await dlg.innerText().catch(() => null), 900),
    };
}

/** The version's galleys as stored: id|label|seq|file id|uploader username. */
function storedGalleys(app, publicationId) {
    const rows = sql(app, `select g.galley_id, g.label, g.seq, coalesce(g.submission_file_id::text, ''), coalesce(u.username, ''), coalesce(g.remote_url, '')
        from publication_galleys g left join submission_files sf on sf.submission_file_id = g.submission_file_id left join users u on u.user_id = sf.uploader_user_id
        where g.publication_id = ${Number(publicationId)} order by g.seq, g.galley_id`);
    return rows ? rows.split('\n') : [];
}

/** A galley's file as stored: the file's name and the path of the upload it serves. */
function storedFile(app, galleyLabel, publicationId) {
    return sql(app, `select sf.submission_file_id, (select setting_value from submission_file_settings s where s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale = 'en' limit 1), f.path, coalesce(u.username, '')
        from publication_galleys g join submission_files sf on sf.submission_file_id = g.submission_file_id join files f on f.file_id = sf.file_id left join users u on u.user_id = sf.uploader_user_id
        where g.publication_id = ${Number(publicationId)} and g.label = '${galleyLabel.replace(/'/g, "''")}'`);
}

/** The submission's assignments as stored: username|role id|can_change_metadata. */
function storedAssignments(app, submissionId) {
    const rows = sql(app, `select u.username, ug.role_id, sa.can_change_metadata from stage_assignments sa join users u on u.user_id = sa.user_id join user_groups ug on ug.user_group_id = sa.user_group_id where sa.submission_id = ${Number(submissionId)} order by sa.stage_assignment_id`);
    return rows ? rows.split('\n') : [];
}

/**
 * Production › Participants › the person's row › "More Actions" › "Edit": set the "Permissions" box
 * ("Allow this person to make changes to the publication, …") and press "OK".
 * Returns the box's state before and after.
 */
async function setPermissions(page, app, submissionId, name, role, on) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath, {labels: {publicationGroup: 'Preprint'}});
    await page.goto('about:blank');
    // the Production stage's page: a posted preprint's workflow opens elsewhere
    await panel.goto(submissionId, {menuKey: 'workflow_5'});
    await idle(page);
    const win = await panel.openEdit(name, role);
    const box = win.metadataBox();
    await expect(box).toBeVisible({timeout: T});
    const before = await box.isChecked();
    const text = flat(await win.form().innerText(), 500);
    await box.setChecked(on);
    await win.ok();
    return {before, after: on, text};
}

/** The header "Close" of an open window, and wait for it to go. */
async function closeWindow(page, dialog) {
    await dialog.getByRole('button', {name: 'Close', exact: true}).first().click();
    await expect(dialog).toHaveCount(0, {timeout: T}).catch(() => {});
    await idle(page);
    await sleep(700); // the modal store's close window (patterns.md pitfall 4)
}

module.exports = {T, sleep, flat, namedFile, watchDialogs, openGalleys, offers, readWindow, storedGalleys, storedFile, storedAssignments, setPermissions, closeWindow, screen};
