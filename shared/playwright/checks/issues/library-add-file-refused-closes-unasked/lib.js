// Helpers of the U39 A11 walk (the libraries' "Add a file" window pressed "OK" with no file):
// library-add-file-refused-closes-unasked/walk.js. Requiring this file runs nothing. Each helper
// drives or reads the screens a person uses and records what it saw rather than throwing, so a fix
// trial reads the state the fix brings.
const {idle, screen} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** A person's pause between two actions: PACE_MS (0 unless set). */
const pause = () => sleep(Number(process.env.PACE_MS || 0));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The Publisher Library's name per app: the Settings › Workflow tab's label and the list's heading. */
const LIBRARY_TAB = {ojs: 'Publisher Library', omp: 'Press Library', ops: 'Preprint Server Library'};
/** The refusal the app holds for an "OK" without a file (`settings.libraryFiles.fileRequired`). */
const FILE_REQUIRED = 'A library file is required. Please ensure that you have chosen and uploaded a file.';

/**
 * One dialog listener for the page: records every browser dialog with the step it came in and
 * answers a `confirm()` as `state.next` says ('accept' by default, reset after each use).
 */
function watchDialogs(page) {
    const state = {dialogs: [], step: null, next: 'accept'};
    page.on('dialog', async (d) => {
        const answer = d.type() === 'beforeunload' ? 'accept' : state.next;
        state.dialogs.push({step: state.step, type: d.type(), message: d.message(), answer});
        state.next = 'accept';
        if (answer === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    return state;
}

/**
 * One response listener for the page: keeps the answer of every library save (`save-file`,
 * `update-file`) and of every notification fetch (`fetchNotification`), body included, with the
 * step it came in.
 */
function watchSaves(page) {
    const state = {calls: [], step: null};
    page.on('response', async (r) => {
        const url = r.url();
        const kind = /\/(save-file|update-file)\b/.test(url) ? 'save' : /fetchNotification/i.test(url) ? 'notification' : null;
        if (!kind) return;
        const call = {step: state.step, kind, method: r.request().method(), status: r.status(),
            url: url.replace(/^https?:\/\/[^/]+/, '').replace(/([?&]_=)\d+/, '$1…').slice(0, 200),
            post: flat(r.request().postData(), 120)};
        state.calls.push(call);
        call.body = flat(await r.text().catch((e) => `unread: ${e.message}`), 700);
    });
    return state;
}

/** Settings › Workflow and the app's library tab; returns the tab's list (`LibraryList`). */
async function openPublisherLibrary(page, app) {
    const {PublisherLibraryTab} = require('../../../pages/LibraryPages.js');
    const tab = new PublisherLibraryTab(page, app.contextPath, LIBRARY_TAB[app.name]);
    await tab.goto();
    await idle(page);
    return tab.list();
}

/**
 * A submission's workflow by its dashboard address, then "Library" in the workflow header;
 * returns the "Submission Library" window's list.
 */
async function openSubmissionLibrary(page, app, submissionId) {
    const {LibraryList, SUBMISSION_LIBRARY} = require('../../../pages/LibraryPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await idle(page);
    await page.getByRole('button', {name: 'Library', exact: true}).first().click({timeout: 30_000});
    const dialog = page.getByRole('dialog', {name: SUBMISSION_LIBRARY, exact: true});
    const list = new LibraryList(page, dialog);
    await list.expectLoaded();
    await idle(page);
    return list;
}

/** "Add a file" from a list, with "Name" typed and "Type" chosen (blurred, as a person tabs on); no file. */
async function fillAdd(list, name, type) {
    const win = await list.openAdd();
    if (name != null) {
        await win.nameBox().fill(name);
        await win.nameBox().blur();
    }
    if (type != null) await win.chooseType(type);
    return win;
}

/** Whether an "Add a file" window is on screen. */
async function windowOpen(page) {
    return page.locator('[role="dialog"]:visible input[name^="libraryFileName"]').count().then((n) => n > 0, () => false);
}

/**
 * What the open "Add a file" window and the page say right now: the window's entries, the
 * refusals under its boxes, the text of its own message area and of every other message area in
 * the page, and whether the file refusal's words are on screen anywhere.
 */
async function messagesRead(page) {
    return page.evaluate((FILE_REQUIRED) => {
        const vis = (e) => !!e && !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const txt = (e) => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
        const form = [...document.querySelectorAll('form')].filter((f) => f.querySelector('input[name^="libraryFileName"]') && vis(f)).pop();
        const area = form && form.querySelector('.pkp_notification');
        const name = form && form.querySelector('input[name^="libraryFileName"]');
        const type = form && form.querySelector('select[name="fileType"]');
        return {
            windowOpen: !!form,
            name: name ? name.value : null,
            type: type ? type.options[type.selectedIndex]?.text.trim() : null,
            temporaryFileId: form ? form.querySelector('input[name="temporaryFileId"]')?.value : null,
            fieldRefusals: form ? [...form.querySelectorAll('label.error')].filter(vis).map(txt) : [],
            windowMessageArea: area ? {shown: vis(area), text: txt(area).slice(0, 300)} : null,
            pageNotices: [...document.querySelectorAll('.app__notifications .pkpNotification, .ui-pnotify, [role="alert"]')]
                .filter((e) => vis(e) && txt(e)).map((e) => txt(e).slice(0, 200)),
            fileRequired: (() => {
                // The refusal's sentence, where it is drawn and whether it is the topmost thing there.
                const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
                let n;
                while ((n = tw.nextNode())) {
                    if (!n.nodeValue.includes(FILE_REQUIRED.slice(0, 30))) continue;
                    const e = n.parentElement;
                    const box = e.closest('.pkpNotification, .pkp_notification, [role="alert"]') || e;
                    const r = box.getBoundingClientRect();
                    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                    return {text: txt(box).slice(0, 200), inWindow: !!(form && form.contains(e)), inPageNotices: !!e.closest('.app__notifications'),
                        at: {x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height)},
                        onTop: !!top && (box === top || box.contains(top))};
                }
                return null;
            })(),
        };
    }, FILE_REQUIRED).catch((e) => ({error: flat(e.message, 200)}));
}

/**
 * Press "OK" in the window and watch the screen for eight seconds (a notice comes and goes): the
 * save's answer, the notification fetches that followed, the read at 0.7 s (with a picture of the
 * screen when `shoot` is given), how long the refusal's sentence stayed on screen, the read once it
 * had gone, and the page notices the kit saw.
 */
async function pressOk(page, win, net, step, shoot) {
    await screen(page); // drop earlier notices
    net.step = step;
    const from = net.calls.length;
    const out = {};
    const t0 = Date.now();
    await win.okButton().click({timeout: 10_000}).catch((e) => { out.clickError = flat(e.message, 200); });
    await sleep(700);
    out.at700ms = await messagesRead(page);
    if (shoot) await shoot(`${step}-700ms`).catch(() => {});
    let seen = out.at700ms.fileRequired ? Date.now() - t0 : null;
    let gone = null;
    while (Date.now() - t0 < 8_000) {
        await sleep(250);
        const on = await page.evaluate((needle) => document.body.innerText.includes(needle), FILE_REQUIRED.slice(0, 30)).catch(() => false);
        if (on && seen == null) seen = Date.now() - t0;
        if (!on && seen != null && gone == null) { gone = Date.now() - t0; break; }
    }
    out.sentenceFirstSeenMs = seen;
    out.sentenceGoneMs = gone;
    out.afterwards = await messagesRead(page);
    const s = await screen(page).catch(() => ({notices: null}));
    out.notices = s.notices;
    out.calls = net.calls.slice(from).map((c) => ({kind: c.kind, method: c.method, status: c.status, url: c.url, post: c.post, body: c.body}));
    out.okEnabled = await win.okButton().isEnabled().catch(() => null);
    return out;
}

/** Leave the page by a typed address (the dashboard) and say whether the browser asked first. */
async function leavePage(page, app, dw, step) {
    const out = {step, via: 'typed address of the dashboard'};
    dw.step = step;
    const before = dw.dialogs.length;
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`), {timeout: 20_000}).catch((e) => { out.error = flat(e.message, 200); });
    await sleep(800);
    out.leaveQuestion = dw.dialogs.slice(before).some((d) => d.type === 'beforeunload');
    out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
    return out;
}

/**
 * Press the window's close button, the browser's box (if any) answered `answer`. Returns whether
 * a box asked (and its words) and whether the window closed.
 */
async function closeButton(page, win, dw, step, {answer = 'accept'} = {}) {
    const out = {step};
    dw.step = step;
    dw.next = answer;
    const before = dw.dialogs.length;
    await win.closeButton().click({timeout: 10_000}).catch((e) => { out.clickError = flat(e.message, 200); });
    await sleep(1_500);
    const asked = dw.dialogs.slice(before).filter((d) => d.type === 'confirm');
    out.asked = asked.length ? asked.map((d) => ({message: d.message, answer: d.answer})) : null;
    out.windowOpen = await windowOpen(page);
    dw.next = 'accept';
    if (!out.windowOpen) {
        const {markClosed} = require('../../../pages/LibraryPages.js');
        await markClosed(page).catch(() => {});
    }
    return out;
}

/** The names a list shows under one type. */
async function listed(list, type) {
    await idle(list.page);
    return list.groupNameLinks(type).allInnerTexts().then((a) => a.map((t) => flat(t)), (e) => ({error: flat(e.message, 200)}));
}

module.exports = {sleep, pause, flat, LIBRARY_TAB, FILE_REQUIRED, watchDialogs, watchSaves, openPublisherLibrary,
    openSubmissionLibrary, fillAdd, windowOpen, messagesRead, pressOk, leavePage, closeButton, listed};
