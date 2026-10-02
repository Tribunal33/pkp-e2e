// Helpers of walk.js here (issue report docs/issues/U44-A14-cleared-urn-stays-on-tab.md).
// Requiring this file runs nothing. Each helper presses what a person presses or reads what the
// screen shows; page objects are required inside the functions (probe kit rule).
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');
const {flat} = require('../urn-check-digit-from-suffix-only/lib');

/** What the tab's "URN" area shows: the stored state ("assigned" + "Clear") or the preview with its box. */
async function readTab(win) {
    const {IDENTIFIERS_TEXT: TEXT} = require('../../../pages/IdentifiersPages.js');
    const text = flat(await win.urnArea().innerText().catch(() => ''), 600);
    const m = text.match(/urn:[^\s"]+/i);
    const boxShown = (await win.assignBox().count()) > 0;
    return {
        urn: m ? m[0] : null,
        assignedText: /The URN is assigned to this/.test(text),
        clearShown: (await win.clearLink().count()) > 0 && (await win.clearLink().isVisible()),
        previewText: text.includes(TEXT.preview),
        boxShown,
        boxChecked: boxShown ? await win.assignBox().isChecked() : null,
        text,
    };
}

/**
 * Press the tab's "Save" and wait for its answer; the window closes on success (closed here with
 * "Close" when it stays open). Returns the answer's status and whether the window closed by itself.
 */
async function saveTab(page, win) {
    const {pastCloseWindow} = require('../../../pages/IdentifiersPages.js');
    const answered = page.waitForResponse((r) => /update-identifiers/.test(r.url()) && r.request().method() === 'POST', {
        timeout: 30_000,
    });
    await win.saveButton().click();
    const res = await answered;
    await idle(page);
    const closedByItself = await expect(win.dialog)
        .toHaveCount(0, {timeout: 10_000})
        .then(() => true)
        .catch(() => false);
    if (!closedByItself) await win.close();
    await pastCloseWindow(page);
    return {status: res.status(), closedByItself};
}

/**
 * "Clear" › the "Delete" window › `answer`. Returns the window's title and question, the clear
 * request's status, and the tab loads (GETs of a tab's content) the page sent after the answer.
 */
async function pressClear(page, win, answer = 'OK') {
    const {IDENTIFIERS_TEXT: TEXT, answerQuestion, CLEAR_REQUEST} = require('../../../pages/IdentifiersPages.js');
    const question = await win.pressClear(win.clearLink(), TEXT.clearQuestion);
    const title = flat(await question.getAttribute('aria-label').catch(() => ''), 80) ||
        flat(await question.locator('h1, h2, .pkp_modal_panel > .header').first().innerText().catch(() => ''), 80);
    const loads = [];
    const onRequest = (r) => {
        if (r.method() === 'GET' && /\$\$\$call\$\$\$/.test(r.url())) loads.push(r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''));
    };
    page.on('request', onRequest);
    let res;
    try {
        res = await answerQuestion(page, question, answer, CLEAR_REQUEST);
        await idle(page);
    } finally {
        page.off('request', onRequest);
    }
    return {title, answer, clearStatus: res ? res.status() : null, clearBody: res ? flat(await res.text().catch(() => ''), 200) : null, tabLoadsAfter: loads};
}

/** Settings › Distribution › "Access": `mode` ticked ("The journal will require subscriptions…"), "Save". */
async function setPublishingMode(page, app, mode) {
    const {AccessSettings} = require('../../../pages/SubscriptionsPages.js');
    const access = new AccessSettings(page, app.contextPath);
    await access.goto();
    await access.modeRadio(mode).check();
    const res = await access.save();
    return {mode, status: res && res.status ? res.status() : null};
}

/** Issues › "Back Issues" › the issue's "Edit" window, on its "Identifiers" tab; returns the window and its tab names. */
async function openIssueTab(page, app, identification) {
    const {IssuesPage} = require('../../../pages/IdentifiersPages.js');
    const issues = new IssuesPage(page, app.contextPath);
    await issues.open({back: true});
    const win = await issues.openEdit(identification);
    const tabs = await win.tabNames();
    await win.openIdentifiersTab();
    return {win, tabs};
}

module.exports = {readTab, saveTab, pressClear, setPublishingMode, openIssueTab};
