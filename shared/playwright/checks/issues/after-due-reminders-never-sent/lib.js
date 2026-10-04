// Helpers of the kept walk for docs/issues/U29-A1-after-due-reminders-never-sent.md (spec U29,
// register A1). Requiring this file runs nothing. The workflow, row-window, reviewer, task-runner and
// mailbox helpers are those of the U27 A15 walk (../reviewer-response-erases-reminder-history/lib.js);
// this file adds the four reminder sliders of Settings › Workflow › Review › "Setup".
const {idle} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');

const SLIDERS = {
    responseBefore: 'Review Request Response - Before Due Date',
    responseAfter: 'Review Request Response - After Due Date',
    submitBefore: 'Review Submission - Before Due Date',
    submitAfter: 'Review Submission - After Due Date',
};

/**
 * Settings › Workflow › Review › "Setup": each slider named in `days` ({responseAfter: 1, …}) set to
 * that many days, "Save". Returns every slider's read-back after the save.
 */
async function setReminderSliders(page, app, days) {
    const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
    const settings = new ReviewSettingsPage(page, app.contextPath);
    await settings.goto('Setup');
    await idle(page);
    await settings.setup.slider(SLIDERS.responseAfter).waitFor({timeout: K.T});
    for (const [key, n] of Object.entries(days)) await settings.setup.setSliderByKeyboard(SLIDERS[key], n);
    await settings.setup.save();
    await idle(page);
    const out = {};
    for (const [key, label] of Object.entries(SLIDERS)) {
        out[label] = K.flat(await settings.setup.sliderReadout(label).innerText().catch(() => null), 80);
    }
    return out;
}

/** The automatic reminders' subjects: the request reminder (a press words it "Manuscript Review Request") and the review reminder. */
const REQUEST_REMINDER = /^(Will you be able to review this for us\?|Manuscript Review Request)/;
const REVIEW_REMINDER = /^A reminder to please complete your review/;

/** The subjects of the mail `username` received since `since` (this app's links only). */
async function subjects(app, username, since) {
    return (await K.mailsTo(app, `${username}@mailinator.com`, since)).map((m) => m.subject);
}

module.exports = {SLIDERS, setReminderSliders, REQUEST_REMINDER, REVIEW_REMINDER, subjects};
