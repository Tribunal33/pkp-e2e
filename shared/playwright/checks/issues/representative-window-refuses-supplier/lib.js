// Helpers for the U74 A12, A13, A14 walks {OMP}: a book's "Marketing" › "Representatives" table,
// its representative window ("Add Representative", "Edit"), its "Delete" window, and a market that
// names a representative. Requiring this file runs nothing; the suite page objects are required
// inside the calls (they read PKP_APP_ROOT, which forEachApp sets).
const path = require('path');
const {idle, screen, shot, record, sql} = require('../../../probe');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));

/** The default dataset's book the steps use: submission 4, in Production, one format "PDF". */
const BOOK = {id: 4, publicationId: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture', format: 'PDF'};

const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

/** Run one step: its result, or `{error}` recorded with a screenshot, so a walk goes on through the state a fix brings. */
async function step(page, name, fn) {
    try {
        const out = await fn();
        return out === undefined ? {ok: true} : out;
    } catch (e) {
        const error = flat(e && e.message, 1500);
        console.log(`[step ${name}] ${error}`);
        await shot(page, `error-${name}`).catch(() => {});
        record(`error-${name}`, {error, screen: await screen(page).catch(() => null)});
        return {error};
    }
}

/** Collect the page notices that show from now on (the toasts expire after 5 s). */
function watchNotices(page) {
    const seen = [];
    const timer = setInterval(async () => {
        const texts = await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => []);
        for (const t of texts.map((x) => flat(x, 300))) if (t && !seen.includes(t)) seen.push(t);
    }, 150);
    return {seen, stop: () => clearInterval(timer)};
}

/** Record every POST to the representatives table's handler (save, delete) with its answer. */
function watchGridPosts(page) {
    const posts = [];
    const on = (r) => {
        if (r.request().method() === 'POST' && /representatives-grid\/(update|delete)-representative/.test(r.url())) {
            posts.push(r.text().then((t) => ({op: r.url().match(/(update|delete)-representative/)[0], status: r.status(), body: flat(t, 600)})).catch(() => ({status: r.status()})));
        }
    };
    page.on('response', on);
    return {all: () => Promise.all(posts), stop: () => page.off('response', on)};
}

/** The book's "Representatives" page (3.5 keys it the same way). */
async function openRepresentatives(app, page) {
    const {RepresentativesPage} = omp('OnixPages.js');
    const reps = new RepresentativesPage(page, app.contextPath);
    await reps.gotoEditorial(BOOK.id);
    return reps;
}

/** Each group's rows as [name, role] (an empty group: []), and the "No Items" lines shown. */
async function groups(reps) {
    const {rowCells} = omp('OnixPages.js');
    const out = {};
    for (const group of ['Agents', 'Suppliers']) {
        const rows = reps.rows(group);
        const n = await rows.count();
        out[group] = [];
        for (let i = 0; i < n; i++) out[group].push(await rowCells(rows.nth(i)).catch(() => null));
        out[`${group}Empty`] = await reps.groupEmpty(group).isVisible().catch(() => null);
    }
    return out;
}

/** The representative window as it stands: title, type, and each "Role" list's state and place. */
async function windowState(win) {
    const list = async (type) => {
        const sel = win.roleList(type);
        return sel.evaluate((s) => {
            const cs = getComputedStyle(s);
            const box = s.getBoundingClientRect();
            return {
                visible: !!(s.offsetWidth || s.offsetHeight || s.getClientRects().length) && cs.display !== 'none',
                display: cs.display,
                classAttr: s.getAttribute('class'),
                styleAttr: s.getAttribute('style'),
                parentClass: s.parentElement && s.parentElement.getAttribute('class'),
                left: Math.round(box.left),
                chosen: s.selectedOptions[0] ? (s.selectedOptions[0].textContent || '').trim() : null,
                options: s.options.length,
                required: s.required,
                id: s.id,
            };
        }).catch((e) => ({error: flat(e.message, 200)}));
    };
    const errors = await win.form().locator('label.error:visible').evaluateAll((ls) =>
        ls.map((l) => ({for: l.getAttribute('for'), text: (l.textContent || '').trim()}))).catch(() => []);
    return {
        title: flat(await win.title().textContent().catch(() => null)),
        agentChecked: await win.typeRadio('agent').isChecked().catch(() => null),
        supplierChecked: await win.typeRadio('supplier').isChecked().catch(() => null),
        radioIds: await win.form().locator('input[name="isSupplier"]').evaluateAll((rs) => rs.map((r) => r.id)).catch(() => null),
        agentList: await list('agent'),
        supplierList: await list('supplier'),
        name: await win.nameBox().inputValue().catch(() => null),
        errors,
    };
}

/**
 * Press "OK" and read what follows, refused or saved: the window still open or not, the
 * field messages, the requests the press sent and the notices shown.
 */
async function pressOk(page, win) {
    const posts = watchGridPosts(page);
    const notes = watchNotices(page);
    await win.okButton().click();
    await pause(1500);
    await idle(page).catch(() => {});
    await pause(500);
    const open = (await win.dialog().count()) > 0;
    const out = {open, after: open ? await windowState(win) : null};
    posts.stop();
    notes.stop();
    out.requests = await posts.all();
    out.notices = notes.seen;
    if (!open) await pause(500);
    return out;
}

/** "Add Representative": the window as it opens. */
async function openAdd(reps) {
    const win = await reps.openAdd();
    return {win, arrived: await windowState(win)};
}

/** A row's "Edit": the window as it opens. */
async function openEdit(reps, group, name) {
    const win = await reps.openEdit(group, name);
    return {win, arrived: await windowState(win)};
}

/** The representatives as stored (Evidence only). */
function stored(app) {
    return sql(app, `select representative_id, name, role, is_supplier from representatives where submission_id = ${BOOK.id} order by representative_id`);
}

/** Submission 4 › "Publication Formats" › "PDF" › "Edit" › "Metadata" (3.5 keys the page without the version). */
async function openMetadata(app, page) {
    const {PublicationFormatsPage} = omp('PublicationFormatPages.js');
    const pf = new PublicationFormatsPage(page, app.contextPath);
    if (app.line === 'stable-3_5_0') {
        await pf.frame.gotoEditorial(BOOK.id, {menuKey: 'publication_publicationFormats'});
        await pf.expectLoaded();
    } else {
        await pf.gotoEditorial(BOOK.id, BOOK.publicationId);
    }
    const win = await pf.openEdit(BOOK.format);
    return win.openMetadata();
}

/** "Market Territories" › "Add Market": a country, date, price and an agent or supplier by name; "OK". */
async function addMarket(app, page, {country, date, price, agent, supplier}) {
    const {openAddMarket, rowCells} = omp('OnixPages.js');
    const meta = await openMetadata(app, page);
    const win = await openAddMarket(meta);
    const labels = await win.labels().catch(() => null);
    await win.territoryList('countries', 'Included').selectOption([{label: country}]);
    await win.dateBox().fill(date);
    await win.priceBox().fill(price);
    const agents = await win.options(win.agentList()).catch(() => null);
    const suppliers = await win.options(win.supplierList()).catch(() => null);
    if (agent) await win.agentList().selectOption({label: agent});
    if (supplier) await win.supplierList().selectOption({label: supplier});
    const notes = watchNotices(page);
    await win.ok();
    await pause(1500);
    notes.stop();
    const rows = meta.listRows('marketsGridContainer');
    const cells = [];
    for (let i = 0; i < (await rows.count()); i++) cells.push(await rowCells(rows.nth(i)).catch(() => null));
    return {labels, agents, suppliers, notices: notes.seen, rows: cells};
}

/** The "Delete" window as it stands: open, its text, a spinner, its buttons' state. */
async function deleteWindowState(page) {
    const d = page.getByRole('dialog', {name: 'Delete', exact: true});
    if (!(await d.isVisible().catch(() => false))) return {open: false};
    return {
        open: true,
        text: flat(await d.innerText().catch(() => '')),
        spinner: await d.locator('[class*="pinner"]').count().catch(() => 0),
        buttons: await d.getByRole('button').evaluateAll((bs) => bs.map((b) => ({text: (b.textContent || '').trim(), disabled: b.disabled}))).catch(() => null),
    };
}

/**
 * A row's "Delete" › "OK"; then, while the window stays open, read it 4 s on, press "OK" again,
 * then "Cancel". Browser alerts are collected through `dialogs` (watchDialogs, PublicationFormatPages).
 */
async function deleteRow(page, reps, group, name, dialogs) {
    const out = {};
    const dlg = await reps.openDelete(group, name);
    out.window = await deleteWindowState(page);
    const posts = watchGridPosts(page);
    const notes = watchNotices(page);
    const alertsBefore = dialogs.seen.length;
    await dlg.dialog().getByRole('button', {name: 'OK', exact: true}).click();
    await pause(1500);
    await idle(page).catch(() => {});
    out.alerts = dialogs.seen.slice(alertsBefore);
    out.afterOk = await deleteWindowState(page);
    if (out.afterOk.open) {
        await pause(4000);
        out.afterOk4s = await deleteWindowState(page);
        const again = dialogs.seen.length;
        const ok = page.getByRole('dialog', {name: 'Delete', exact: true}).getByRole('button', {name: 'OK', exact: true});
        out.okAgain = await ok.click({timeout: 5000}).then(() => 'pressed').catch((e) => flat(e.message, 200));
        await pause(1500);
        out.alertsAgain = dialogs.seen.slice(again);
        out.afterOkAgain = await deleteWindowState(page);
        const cancel = page.getByRole('dialog', {name: 'Delete', exact: true}).getByRole('button', {name: 'Cancel', exact: true});
        out.cancel = await cancel.click({timeout: 5000}).then(() => 'pressed').catch((e) => flat(e.message, 200));
        await pause(1000);
        out.afterCancel = await deleteWindowState(page);
    }
    posts.stop();
    notes.stop();
    out.requests = await posts.all();
    out.notices = notes.seen;
    await pause(600);
    out.groups = await groups(reps);
    return out;
}

module.exports = {BOOK, flat, pause, step, watchNotices, watchGridPosts, openRepresentatives, groups, windowState, pressOk, openAdd, openEdit, stored, openMetadata, addMarket, deleteWindowState, deleteRow};
