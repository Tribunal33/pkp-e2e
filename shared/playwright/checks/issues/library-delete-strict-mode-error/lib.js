// Helpers of the U39 A5 walk (a Submission Library file's "Delete" › "OK" with the configuration
// file's `strict = On`): library-delete-strict-mode-error/walk.js. Requiring this file runs
// nothing. The library openers are the A11 walk's (../library-add-file-refused-closes-unasked/lib.js);
// these add the delete with its answer, the dashboard search and the reviewer's step 3 reads, each
// recording what it saw rather than throwing, so a fix trial reads the state the fix brings.
const fs = require('fs');
const {expect} = require('@playwright/test');
const {idle, outFile, serverLog} = require('../../../probe');
const A11 = require('../library-add-file-refused-closes-unasked/lib.js');

const {sleep, flat} = A11;

/**
 * One response listener for the page: keeps every answer whose address matches `re`, with its
 * status, the step it came in and the first part of its body.
 */
function watchCalls(page, re) {
    const state = {calls: [], step: null};
    page.on('response', async (r) => {
        const url = r.url();
        if (!re.test(url)) return;
        const call = {step: state.step, method: r.request().method(), status: r.status(),
            url: decodeURIComponent(url.replace(/^https?:\/\/[^/]+/, '')).replace(/([?&]_=)\d+/, '$1…').slice(0, 220)};
        state.calls.push(call);
        call.body = flat(await r.text().catch((e) => `unread: ${e.message}`), 300);
    });
    state.since = (step) => state.calls.filter((c) => c.step === step);
    return state;
}

/** "Add a file" in a list: "Name", "Type", a small text file uploaded, "OK"; the window closes. */
async function addFile(list, name, type) {
    const file = outFile(`${name.replace(/\W+/g, '-')}.txt`);
    fs.writeFileSync(file, `${name}\n`);
    const win = await list.openAdd();
    await win.add({name, type, file});
}

/**
 * The row's arrow, "Delete", the dialog's text, "OK"; then what follows over ten seconds: whether
 * the dialog closed, whether the row is still listed, the group's text, every browser dialog, and
 * the server log's error lines written meanwhile.
 */
async function deleteRead(page, app, list, name, group, dialogs) {
    const log = serverLog(app);
    const from = log.mark();
    const out = {};
    const dlg = await list.openDelete(name);
    out.dialogText = flat(await dlg.dialog().innerText().catch(() => null), 300);
    const nDialogs = dialogs.dialogs.length;
    await dlg.okButton().click({timeout: 10_000}).catch((e) => { out.clickError = flat(e.message, 200); });
    out.dialogClosed = await expect(dlg.dialog()).toHaveCount(0, {timeout: 10_000}).then(() => true, () => false);
    await sleep(1_500);
    await idle(page).catch(() => {});
    out.dialogTextAfter = out.dialogClosed ? null : flat(await dlg.dialog().innerText().catch(() => null), 300);
    out.rowStillListed = (await list.nameLink(name).count().catch(() => -1)) > 0;
    out.groupText = flat(await list.group(group).innerText().catch(() => null), 200);
    out.browserDialogs = dialogs.dialogs.slice(nDialogs);
    out.serverLog = log.since(from).map((l) => flat(l, 400));
    return out;
}

/**
 * The editorial dashboard's sidebar "Search submissions" box: the phrase typed
 * and Enter pressed; what the view then shows (heading, rows' first cells, an error notice).
 */
async function dashboardSearch(page, app, phrase) {
    const out = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
    await idle(page);
    const box = page.locator('nav, aside').getByRole('searchbox', {name: /^Search submissions/}).first();
    await box.click({timeout: 30_000});
    await box.fill('');
    await box.pressSequentially(phrase, {delay: 25});
    await box.press('Enter');
    await sleep(1_500);
    await idle(page);
    out.heading = flat(await page.locator('#app-main h1, main h1').first().innerText().catch(() => null), 120);
    out.rows = (await page.locator('#app-main table tbody tr, main table tbody tr').allInnerTexts().catch(() => []))
        .slice(0, 6).map((t) => flat(t, 120));
    out.mainText = flat(await page.locator('#app-main, main').first().innerText().catch(() => null), 500);
    return out;
}

/**
 * The reviewer's review page, step 1 "Accept Review, Continue to Step #2", step 2 "Continue to
 * Step #3"; then the "Reviewer Files" list as drawn.
 */
async function reviewerStep3Read(page, app, id) {
    const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
    const w = new ReviewWizardPage(page, app.contextPath);
    const out = {};
    await page.goto(app.url(`/index.php/${app.contextPath}/en/reviewer/submission/${id}`));
    await w.expectOpen();
    await w.accept();
    await w.continueToStep3();
    await sleep(2_000);
    await idle(page);
    out.reviewerFiles = flat(await w.reviewerFilesGrid.innerText({timeout: 15_000}).catch((e) => `unread: ${flat(e.message, 120)}`), 400);
    out.uploadLinkShown = await w.reviewerFilesGrid.getByRole('link', {name: /Upload File/i}).first().isVisible().catch(() => false);
    return out;
}

module.exports = {...A11, sleep, flat, watchCalls, addFile, deleteRead, dashboardSearch, reviewerStep3Read};
