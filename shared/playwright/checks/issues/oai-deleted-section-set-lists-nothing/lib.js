// Helpers of walk.js (issue report docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md).
// Requiring this file runs nothing. Every helper drives a screen a person uses, or reads an OAI
// address as a harvester does.
const {idle, screen, shot} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const {SectionsTab} = require('../../../pages/SectionsPages.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

/** Per app: the workflow page that holds "Section" (its menu key and its name on `main` / on 3.5) and the publish word. */
const WORDS = {
    ojs: {key: 'issue', page: {main: 'Publication Settings', old: 'Issue'}, publish: /^(Schedule For Publication|Publish)$/},
    ops: {key: 'preprintEntry', page: {main: 'Preprint entry', old: 'Preprint entry'}, publish: /^Post$/},
};

/** One OAI address read as a harvester (no session): the error, the record headers, the sets with their names. */
async function ask(page, app, name, ctx, params) {
    const a = await readOai(app.baseURL, ctx, params);
    const out = {
        step: name,
        address: `/index.php/${ctx}/oai?${params}`,
        status: a.status,
        error: a.error ? `${a.error.code}: ${a.error.message}` : null,
        headers: a.headers.map((h) => `${h.deleted ? 'DELETED ' : ''}${h.identifier} ${h.datestamp} [${h.setSpecs.join(', ')}]`),
        sets: a.sets.length ? a.sets.map((s) => `${s.spec} = ${s.name}`) : undefined,
    };
    out.count = out.headers.length;
    out.deleted = out.headers.filter((h) => h.startsWith('DELETED ')).map((h) => h.replace(/^DELETED /, ''));
    if (page) {
        const r = await page.goto(app.url(out.address), {waitUntil: 'load'}).catch(() => null);
        out.pageStatus = r ? r.status() : null;
        const s = await screen(page).catch(() => null);
        out.shown = s ? flat(s.text.main || (await page.locator('body').innerText().catch(() => '')), 500) : null;
        await shot(page, name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()).catch(() => {});
    }
    return out;
}

/** The line a walk prints per address. */
const line = (app, r) =>
    `[fact] ${app.name} ${r.step.padEnd(40)} ${r.status} records ${r.count}` +
    `${r.deleted.length ? ` (deleted: ${r.deleted.join('; ')})` : ''}${r.error ? ` error "${r.error}"` : ''}` +
    `${r.sets ? ` sets: ${r.sets.join(' | ')}` : ''} | ${r.address.replace(/^.*\?/, '')}`;

/** Settings › Journal (Server) › "Sections", open. */
async function sectionsTab(page) {
    const tab = new SectionsTab(page, 'publicknowledge', {locale: 'en'});
    await tab.goto();
    return tab;
}

/** "Sections" › a row's "Edit": "Abbreviation" typed, "Save". Returns the save's status. */
async function setAbbreviation(page, title, abbrev) {
    const tab = await sectionsTab(page);
    const win = await tab.openEdit(title);
    const before = await win.box('abbrev[en]').inputValue();
    await win.type('abbrev[en]', abbrev);
    const r = await win.saveAndClose();
    return {before, typed: abbrev, status: r.status()};
}

/** "Sections" › "Create Section": title, abbreviation (and on OPS the path), "Save". */
async function createSection(page, app, {title, abbrev, path}) {
    const tab = await sectionsTab(page);
    const win = await tab.openAdd();
    await win.type('title[en]', title);
    await win.type('abbrev[en]', abbrev);
    if (app.name === 'ops') await win.type('path', path);
    const r = await win.saveAndClose();
    return {status: r.status(), rows: (await tab.titleCells().allInnerTexts()).map((t) => flat(t))};
}

/** "Sections" › a row's "Delete", "OK". Returns the question, the answer and the rows left. */
async function deleteSection(page, title) {
    const tab = await sectionsTab(page);
    const win = await tab.openDelete(title);
    const question = flat(await win.question().innerText().catch(() => null));
    const r = await tab.confirm(win);
    const body = flat(await r.text().catch(() => null), 200);
    await sleep(800);
    return {question, status: r.status(), body, rows: (await tab.titleCells().allInnerTexts()).map((t) => flat(t))};
}

/**
 * A submission's workflow on the publication page that holds "Section" ("Publication Settings" on
 * OJS, "Issue" on OJS 3.5, "Preprint entry" on OPS): the section chosen by its title, "Save".
 * On `main` the page is reached as a person does, by its entry in the workflow's menu; on 3.5 by
 * the entry's address (its key, `publication_issue` / `publication_preprintEntry`).
 */
async function setSection(page, app, sid, title) {
    const w = WORDS[app.name];
    const old = !!app.line && app.line !== 'main';
    const base = `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=${sid}`;
    await page.goto(app.url(old ? `${base}&workflowMenuKey=publication_${w.key}` : base));
    await idle(page).catch(() => {});
    if (!old) {
        const nav = page.locator('[role="dialog"] nav');
        const entry = nav.locator('a, button').filter({hasText: new RegExp(`^\\s*${w.page.main}\\s*$`)}).last();
        await entry.waitFor({state: 'attached', timeout: T});
        await sleep(1000);
        if (!(await entry.isVisible())) await nav.locator('a, button').filter({hasText: /\d+\.\d+\s*$/}).last().click();
        await entry.click();
        await idle(page).catch(() => {});
    }
    const sel = page.locator('select[name="sectionId"]').first();
    await sel.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    const before = flat(await sel.locator('option:checked').innerText().catch(() => null));
    const options = (await sel.locator('option').allInnerTexts()).map((t) => flat(t));
    await sel.selectOption({label: options.find((o) => o === title) || title});
    const form = page.locator('form').filter({has: sel}).last();
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await idle(page).catch(() => {});
    await sleep(800);
    return {page: old ? w.page.old : w.page.main, before, options, chosen: title, status: r ? r.status() : null};
}

/**
 * The open workflow's "Schedule For Publication" / "Publish" ("Post"), then whatever confirms it,
 * until the publish call answers. (chapter-page-dates-and-preview-notice/lib.js has the same for
 * OJS and OMP; this one also knows "Post".)
 */
async function publish(page, app) {
    const word = WORDS[app.name].publish;
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    let done = false;
    published.then(() => { done = true; }).catch(() => { done = true; });
    const header = controls(page).getByRole('button', {name: word}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText()), windows: []};
    await header.click();
    for (let i = 0; i < 5 && !done; i++) {
        const btn = page.getByRole('dialog').last().getByRole('button', {name: /^(Confirm|Publish|Schedule For Publication|Post)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(600);
        out.windows.push(flat(await page.getByRole('dialog').last().innerText().catch(() => null), 200));
        await btn.click();
        await sleep(1200);
    }
    const r = await published;
    const body = await r.json().catch(() => ({}));
    out.status = r.status();
    out.publicationStatus = body.status;
    await idle(page).catch(() => {});
    await sleep(1000);
    return out;
}

module.exports = {T, sleep, flat, WORDS, ask, line, sectionsTab, setAbbreviation, createSection, deleteSection, setSection, publish};
