// Helpers of the two Dublin Core walks (issue reports U19 A7 and A8):
//   oai-dc-peer-reviewed-type-gone-after-section-save/walk.js
//   oai-dc-source-keeps-empty-part/walk.js
// Requiring this file runs nothing. Every helper drives a screen a person uses, or reads an OAI
// address as a harvester does (no session).
const path = require('path');
const {idle, screen, shot} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const {SectionsTab} = require('../../../pages/SectionsPages.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const old = (app) => !!app.line && app.line !== 'main';

/**
 * One OAI address read as a harvester: per record its identifier and the `dc:type` and
 * `dc:source` elements exactly as the XML holds them (the page object's reader trims each value,
 * which would hide a trailing "; ").
 */
async function readDc(app, ctx, params) {
    const a = await readOai(app.baseURL, ctx, params);
    const elements = (xml, name) => [...String(xml || '').matchAll(new RegExp(`<dc:${name}(?:\\s[^>]*)?>[\\s\\S]*?</dc:${name}>`, 'g'))].map((m) => m[0]);
    return {
        address: `/index.php/${ctx}/oai?${params}`,
        status: a.status,
        error: a.error ? `${a.error.code}: ${a.error.message}` : null,
        records: a.records.map((r) => ({
            identifier: r.header ? r.header.identifier : null,
            deleted: r.header ? r.header.deleted : null,
            type: elements(r.metadata, 'type'),
            source: elements(r.metadata, 'source'),
        })),
    };
}

/** The same address in the browser view: the rows named `key` ("Resource Type", "Source") of each record. */
async function viewDc(page, app, ctx, params, name) {
    const r = await page.goto(app.url(`/index.php/${ctx}/oai?${params}`), {waitUntil: 'load'}).catch(() => null);
    await sleep(500);
    const rows = await page
        .locator('tr')
        .filter({has: page.locator('td.key')})
        .evaluateAll((trs) => trs.map((tr) => [tr.querySelector('td.key').innerText.trim(), tr.querySelector('td.value') ? tr.querySelector('td.value').innerText : '']))
        .catch(() => []);
    await shot(page, name).catch(() => {});
    const s = await screen(page).catch(() => null);
    return {
        status: r ? r.status() : null,
        title: s ? s.title : null,
        'Resource Type': rows.filter((x) => x[0] === 'Resource Type').map((x) => x[1]),
        Source: rows.filter((x) => x[0] === 'Source').map((x) => x[1]),
    };
}

/** Settings › Journal › "Sections" of a journal, open. */
async function sectionsTab(page, app, ctx) {
    const tab = new SectionsTab(page, ctx, {locale: old(app) ? '' : 'en'});
    await tab.goto();
    return tab;
}

const TYPE_BOX = 'identifyType[en]';
const NOT_REVIEWED = 'Will not be peer-reviewed';

/** A section's window as it stands: the "Identify items…" box and the "Will not be peer-reviewed" box. */
async function readSectionWindow(win) {
    return {
        identifyLabel: flat(await win.form().locator('label, .label').filter({hasText: /Identify items published in this section/}).first().innerText().catch(() => null), 120),
        identify: await win.box(TYPE_BOX).inputValue(),
        notPeerReviewed: await win.checkbox(NOT_REVIEWED).isChecked(),
    };
}

/**
 * "Sections" › a row's "Edit": what the window holds; then, when `change` is given, the boxes
 * set as it says (`identify` typed, `notPeerReviewed` ticked or unticked; `{}` changes nothing)
 * and "Save"; without `change`, "Cancel".
 */
async function editSection(page, app, ctx, title, change = null) {
    const tab = await sectionsTab(page, app, ctx);
    const win = await tab.openEdit(title);
    const out = {before: await readSectionWindow(win)};
    if (!change) {
        await win.cancel();
        return out;
    }
    if (change.identify !== undefined) await win.type(TYPE_BOX, change.identify);
    if (change.notPeerReviewed !== undefined) await win.checkbox(NOT_REVIEWED).setChecked(change.notPeerReviewed);
    out.saved = await readSectionWindow(win);
    const r = await win.saveAndClose();
    out.status = r.status();
    return out;
}

/** The workflow's publication page that holds "Pages" ("Publication Settings" on main, "Issue" on 3.5), open. */
async function openPublicationSettings(page, app, ctx, sid) {
    const base = `/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${sid}`;
    await page.goto(app.url(old(app) ? `${base}&workflowMenuKey=publication_issue` : base));
    await idle(page).catch(() => {});
    if (!old(app)) {
        const nav = page.locator('[role="dialog"] nav');
        const entry = nav.locator('a, button').filter({hasText: /^\s*Publication Settings\s*$/}).last();
        await entry.waitFor({state: 'attached', timeout: T});
        await sleep(1000);
        if (!(await entry.isVisible())) await nav.locator('a, button').filter({hasText: /\d+\.\d+\s*$/}).last().click();
        await entry.click();
        await idle(page).catch(() => {});
    }
}

/** "Publication Settings": "Pages" typed, "Save". Returns what the box held and the save's status. */
async function setPages(page, app, ctx, sid, pages) {
    await openPublicationSettings(page, app, ctx, sid);
    const box = page.locator('input[name="pages"]').first();
    await box.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    const before = await box.inputValue();
    await box.fill(pages);
    const form = page.locator('form').filter({has: box}).last();
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page).catch(() => {});
    await sleep(800);
    return {before, typed: pages, status: r ? r.status() : null};
}

/**
 * A submission's workflow › "Title & Abstract" (a publication page, where the publish button
 * always shows) › the publish button › "Review Publishing Details": "Don't Assign To An Issue"
 * where the journal has issues (or "Assign To Current/Back Issue" and `issue`, a pattern of its
 * name) › "Confirm" › "Publish". A version whose details were confirmed before (a save on
 * "Publication Settings" counts) gets the question at once, without the panel. Returns the
 * button's word, what it opened, the question and the status line.
 */
async function publish(page, app, ctx, sid, {issue = null} = {}) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, ctx);
    // A workflow already open on this submission is left first: the same address again does not
    // reload the page.
    await page.goto('about:blank');
    await pub.gotoWorkflow(sid);
    await idle(page).catch(() => {});
    await sleep(1000);
    await pub.openEntry('Title & Abstract');
    await idle(page).catch(() => {});
    const out = {button: flat(await pub.publishButton().first().innerText().catch(() => null), 60)};
    const question = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    const panel = await pub.pressPublish({or: question});
    out.opened = panel ? 'Review Publishing Details' : 'the question';
    if (panel) {
        for (const [name, value] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
            const sel = panel.locator(`select[name="${name}"]`);
            if ((await sel.count()) && (await sel.isEnabled().catch(() => false))) await sel.selectOption(value).catch(() => {});
        }
        if (issue) {
            await pub.awaitAssignmentPreselected(panel);
            await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
            await pub.selectIssueOption(panel, issue);
        } else if ((await pub.issueAssignmentGroup(panel).count()) > 0) {
            await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
        }
        await sleep(500);
        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    }
    await question.waitFor({state: 'visible', timeout: T});
    out.question = flat((await question.innerText()).replace(/^[\s\S]*?Close/, ''), 300);
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await question.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
    const r = await answered;
    out.publish = r ? r.status() : null;
    await page.getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    out.status = flat(await pub.leftControls().innerText().catch(() => ''), 120);
    return out;
}

module.exports = {T, sleep, flat, old, readDc, viewDc, sectionsTab, readSectionWindow, editSection, openPublicationSettings, setPages, publish};
