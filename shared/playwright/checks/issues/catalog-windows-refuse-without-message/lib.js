// Helpers for the U74 A15 walk {OMP}: what the "Metadata" tab's sales-rights and market windows
// show after "OK". The format's "Metadata" tab, `step` and `flat` come from ir2's market lib, the
// notification-fetch watcher from the U09 A11 lib. Requiring this file runs nothing.
const path = require('path');
const {idle, screen, sql} = require('../../../probe');
const M = require('../market-tax-rate-fails-native-export/lib');
const {watchFetches} = require('../static-page-refusal-repeated-after-save/lib');

const ROOT = path.resolve(__dirname, '../../../../..');
const omp = (file) => require(path.join(ROOT, 'apps/omp/playwright/pages', file));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const {flat, step, BOOK} = M;

/**
 * The window as it stands: open or not, its text, the messages inside it (a field's
 * `label.error`, an in-place notification box), how many "Required fields…" lines it holds,
 * and the boxes' values.
 */
async function windowState(win) {
    const open = (await win.dialog().count()) > 0;
    if (!open) return {open};
    const dialog = win.dialog();
    const fieldErrors = await dialog.locator('label.error, .sub_label.error, .error')
        .evaluateAll((els) => [...new Set(els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))]).catch(() => null);
    const boxes = await dialog.locator('.pkp_notification').evaluateAll((els) =>
        els.map((e) => ({visible: !!(e.offsetWidth || e.offsetHeight), text: e.innerText.replace(/\s+/g, ' ').trim()}))).catch(() => null);
    const out = {
        open,
        requiredNotes: await win.requiredNotes().count(),
        fieldErrors,
        messageBoxes: boxes,
        text: flat(await dialog.innerText().catch(() => null), 600),
    };
    if (win.dateBox || win.valueBox) {
        if (win.dateBox) out.date = await win.dateBox().inputValue().catch(() => null);
        if (win.priceBox) out.price = await win.priceBox().inputValue().catch(() => null);
        if (win.valueBox) out.value = await win.valueBox().inputValue().catch(() => null);
    } else {
        out.rowTicked = await win.rowBox().isChecked().catch(() => null);
    }
    return out;
}

/**
 * Press "OK" and read: the window at once (an in-place message fades after 6 s), then 3 s on
 * (the window, the page notices shown meanwhile, the notification fetches answered meanwhile).
 */
async function pressOk(page, win, fetches) {
    await screen(page); // drops the notices shown before
    const from = fetches.length;
    const answered = page.waitForResponse((r) => win.saveUrl.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000});
    await win.okButton().click();
    const res = await answered;
    let body = null;
    try {
        const j = await res.json();
        body = {status: j.status, content: typeof j.content === 'string' ? `html ${j.content.length} chars` : j.content, event: j.event ? j.event.name || true : null};
    } catch { body = 'unreadable'; }
    await idle(page).catch(() => {});
    await sleep(300);
    const atOnce = await windowState(win);
    await sleep(3000);
    const later = await windowState(win);
    const s = await screen(page);
    return {answer: {status: res.status(), body}, atOnce, later, notices: s.notices, fetches: fetches.slice(from)};
}

/** "Cancel": the window gone, and the notices and fetches of the next 3 s. */
async function cancel(page, win, fetches) {
    await screen(page);
    const from = fetches.length;
    await win.cancelLink().click();
    await idle(page).catch(() => {});
    await sleep(3000);
    const s = await screen(page);
    return {closed: (await win.dialog().count()) === 0, notices: s.notices, fetches: fetches.slice(from)};
}

/** "Add Sales Rights", open (the type it arrives on is kept). */
async function openAddRights(meta) {
    const {openAddSalesRights} = omp('OnixPages.js');
    return openAddSalesRights(meta);
}

async function openAddMarket(meta) {
    const {openAddMarket: open} = omp('OnixPages.js');
    return open(meta);
}

/**
 * The format's "Add Code" and "Add publication date" windows, given what `windowState` and
 * `pressOk` read (their page objects have no `dialog()`): `which` is 'code' | 'date'.
 */
async function openOther(page, meta, which) {
    const win = which === 'code' ? await meta.openAddCode() : await meta.openAddDate();
    const formId = which === 'code' ? 'addIdentificationCodeForm' : 'addPubDateForm';
    win.saveUrl = which === 'code' ? /identification-code-grid\/update-code/ : /publication-date-grid\/update-date/;
    win.dialog = () => page.locator('[role="dialog"]').filter({has: page.locator(`form#${formId}`)});
    win.requiredNotes = () => win.dialog().getByText('Required fields are marked with an asterisk: *', {exact: true});
    if (which === 'code') win.priceBox = win.valueBox;
    return win;
}

/** A list's rows, as text. */
async function listRows(meta, container) {
    return meta.listRows(container).evaluateAll((rows) => rows.map((r) => r.innerText.replace(/\s+/g, ' ').trim())).catch(() => null);
}

/** What the format holds (Evidence only; the steps read the lists). */
function stored(app) {
    return sql(app, `select 'rights', count(*), coalesce(sum(case when s.row_setting = 1 then 1 else 0 end),0) from sales_rights s
        join publication_formats pf on pf.publication_format_id = s.publication_format_id where pf.publication_id = ${BOOK.publicationId}
        union all select 'markets', count(*), 0 from markets m
        join publication_formats pf on pf.publication_format_id = m.publication_format_id where pf.publication_id = ${BOOK.publicationId}`);
}

module.exports = {flat, step, sleep, watchFetches, windowState, pressOk, cancel, openAddRights, openAddMarket, openOther, listRows, stored, openMetadata: M.openMetadata};
