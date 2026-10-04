// Helpers of walk.js here (issue report docs/issues/U05-A1-discussion-activity-choice-governs-nothing.md).
// Requiring this file runs nothing. Reuses the U37 A3 walk's mailbox, Tasks and 3.5 grid helpers;
// adds the profile's Notifications tab (one row's two boxes) and a 3.5 "Add discussion" that
// ticks several participants.
const {screen, record, idle} = require('../../../probe');
const U37 = require('../writer-told-of-own-message/lib.js');

/** Per app, on PKP's default test dataset (docs/process/dataset.md). */
const WORDS = {
    // emailOff: ticks "Do not send me an email…" on "Discussion activity."; allowOff: unticks "Enable…".
    ojs: {id: 3, menuKey: 'workflow_4', stage: 'Copyediting', writer: 'dbarnes', emailOff: 'mfritz', emailOffName: 'Maria Fritz', allowOff: 'sberardo', allowOffName: 'Stephanie Berardo'},
    omp: {id: 7, menuKey: 'workflow_4', stage: 'Copyediting', writer: 'dbarnes', emailOff: 'mfritz', emailOffName: 'Maria Fritz', allowOff: 'dkennepohl', allowOffName: 'Dietmar Kennepohl'},
    ops: {id: 1, menuKey: 'workflow_5', stage: 'Production', writer: 'dbarnes', emailOff: 'dbuskins', emailOffName: 'David Buskins', allowOff: 'sberardo', allowOffName: 'Stephanie Berardo'},
};

/** The row's setting name on the Notifications tab ("Discussion activity."). */
const ACTIVITY = 'notificationQueryActivity';
const ADDED = 'notificationNewQuery';

/**
 * Open the signed-in user's Notifications tab, set one row's boxes ({allow, email}: true = ticked,
 * undefined = leave), press "Save". Returns the row's boxes before and after the save, read again
 * from a fresh load of the tab.
 */
async function setRow(page, app, settingName, {allow, email} = {}, shotName = null) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, app.contextPath);
    await profile.goto('notifications');
    const read = async () => {
        const pair = profile.notificationPair(settingName);
        return {allow: await pair.allow.isChecked(), email: await pair.email.isChecked(), emailDisabled: await pair.email.isDisabled()};
    };
    const before = await read();
    const pair = profile.notificationPair(settingName);
    if (email !== undefined) await pair.email.setChecked(email);
    if (allow !== undefined) await pair.allow.setChecked(allow);
    if (shotName) record(shotName, await screen(page));
    await profile.save();
    await idle(page);
    await profile.goto('notifications');
    const after = await read();
    const added = await (async () => {
        const p = profile.notificationPair(ADDED);
        return {allow: await p.allow.isChecked(), email: await p.email.isChecked()};
    })();
    return {before, after, discussionAdded: added};
}

/** 3.5: "Add discussion" in the stage's grid with several participants ticked, "OK". */
async function addQuery35(page, {participantNames, subject, message}) {
    const grid = U37.grid(page);
    await grid.getByText(/Add discussion/i).first().click();
    const form = page.locator('form#queryForm').last();
    await form.waitFor({timeout: 30000});
    await idle(page);
    for (const name of participantNames) {
        await form.locator('label', {hasText: name}).locator('input[type="checkbox"]').first().check();
    }
    await form.locator('input[name="subject"]').fill(subject);
    const id = await form.locator('textarea[name="comment"]').getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.type(message);
    record('r35-add-filled', await screen(page));
    const resp = page.waitForResponse((r) => /update-?query/i.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
    const r = await resp;
    await U37.sleep(1500);
    await idle(page);
    return {status: r ? r.status() : null};
}

module.exports = {...U37, WORDS37: U37.WORDS, WORDS, ACTIVITY, ADDED, setRow, addQuery35};
