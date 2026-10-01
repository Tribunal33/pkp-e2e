// Helpers for walk.js (U69 A13, A17, A20). Requiring this file runs nothing.
const {screen, record, idle} = require('../../../probe');
const {T, sleep, flat, rel, workflowFrame} = require('../older-version-tab-current-title/lib');

const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');

/** A book's or a chapter's page as a reader sees it: the notices above the title and the side column's date block. */
async function readPage(page) {
    const data = await page.evaluate(() => {
        const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
        const full = document.querySelector('.obj_monograph_full');
        const dp = full && full.querySelector('.item.date_published');
        const body = document.body ? document.body.innerText : '';
        return {
            tab: document.title,
            blank: body.trim().length === 0,
            chapterPage: !!document.querySelector('.obj_chapter'),
            bookPage: !!full && !document.querySelector('.obj_chapter'),
            heading: txt(full && full.querySelector('h1')) || txt(document.querySelector('h1')),
            notices: full ? [...full.querySelectorAll(':scope > .cmp_notification')].map((n) => ({text: txt(n), links: [...n.querySelectorAll('a')].map((a) => `${txt(a)} -> ${a.getAttribute('href')}`)})) : [],
            dateLabel: dp ? txt(dp.querySelector(':scope > .sub_item:not(.versions) .label')) : null,
            dateValue: dp ? txt(dp.querySelector(':scope > .sub_item:not(.versions) .value')) : null,
            versions: dp ? [...dp.querySelectorAll('.sub_item.versions li')].map((li) => txt(li)) : [],
            notFound: /404 Not Found/.test(body),
            text: body.replace(/\s+/g, ' ').trim().slice(0, 160),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
    return {url: rel(page.url()), ...data, notices: (data.notices || []).map((n) => ({text: n.text, links: n.links.map(rel)}))};
}

/** Take one action (a typed address or a pressed link), then say how the navigation was answered and what the page shows. */
async function arrive(page, app, label, act) {
    const chain = [];
    const onResponse = (r) => {
        if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) chain.push(`${r.status()} ${rel(r.url())}`);
    };
    page.on('response', onResponse);
    let error = null;
    try {
        await act();
        await page.waitForLoadState('load');
    } catch (e) {
        error = flat(e.message, 200);
    }
    await idle(page).catch(() => {});
    page.off('response', onResponse);
    record(label, await screen(page));
    const out = {chain, ...(await readPage(page)), error};
    console.log(`[fact] ${app.name} ${label}: ${JSON.stringify(out)}`);
    return out;
}

/** The chapter's link in the table of contents of the open book page. */
function contentsLink(page, name) {
    return page.locator('.item.chapters').getByRole('link', {name}).first();
}

/** A book's workflow by its address, optionally on one of its pages (the menu entry's key). */
async function openWorkflow(page, app, submissionId, menuKey = null, withControls = true) {
    const frame = workflowFrame(page, app);
    await frame.gotoEditorial(submissionId, menuKey ? {menuKey} : {});
    await idle(page).catch(() => {});
    if (withControls) await controls(page).waitFor({timeout: T});
    await sleep(1200);
    return frame;
}

/**
 * Press a publishing control of the open workflow ("Unpublish",
 * "Unschedule") and the same word in the window that asks. Returns the
 * question and the request's status.
 */
async function pressAndConfirm(page, label, pathPattern) {
    await controls(page).getByRole('button', {name: label, exact: true}).click();
    const win = page.getByRole('dialog').filter({has: page.getByRole('button', {name: label, exact: true})}).last();
    const button = win.getByRole('button', {name: label, exact: true});
    await button.waitFor({state: 'visible', timeout: T});
    await sleep(600);
    const question = flat(await win.innerText().catch(() => null), 300);
    const answered = page.waitForResponse((r) => pathPattern.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await button.click();
    const r = await answered;
    await idle(page).catch(() => {});
    await sleep(1200);
    return {question, status: r ? r.status() : null, controls: flat(await controls(page).innerText().catch(() => null), 200)};
}

/**
 * The header's "Publish" or "Schedule For Publication", then whatever
 * confirms it, until the publish call answers. Returns the button pressed,
 * each window's text and the publication's status in the answer.
 */
async function publishOrSchedule(page) {
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    let done = false;
    published.then(() => { done = true; }).catch(() => { done = true; });
    const header = controls(page).getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText()), windows: []};
    await header.click();
    for (let i = 0; i < 5 && !done; i++) {
        const btn = page.getByRole('dialog').last().getByRole('button', {name: /^(Confirm|Publish|Schedule For Publication)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(600);
        out.windows.push(flat(await page.getByRole('dialog').last().innerText().catch(() => null), 300));
        await btn.click();
        await sleep(1200);
    }
    const r = await published;
    const body = await r.json().catch(() => ({}));
    out.publish = r.status();
    out.status = body.status;
    out.datePublished = body.datePublished;
    await idle(page).catch(() => {});
    await sleep(1000);
    return out;
}

/** "Publication" › "Catalog Entry" of the open workflow: "Date Published" typed, "Save". */
async function setBookDate(page, date) {
    const box = page.locator('input[name="datePublished"]').last();
    await box.waitFor({state: 'visible', timeout: T});
    const before = await box.inputValue();
    await box.fill(date);
    const form = page.locator('form').filter({has: box}).last();
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const body = await r.json().catch(() => ({}));
    await idle(page).catch(() => {});
    return {before, typed: date, save: r.status(), stored: body.datePublished, error: r.ok() ? undefined : flat(JSON.stringify(body), 300)};
}

module.exports = {T, sleep, flat, rel, controls, readPage, arrive, contentsLink, openWorkflow, pressAndConfirm, publishOrSchedule, setBookDate};
