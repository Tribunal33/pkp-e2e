// Kept walk for docs/issues/U27-A46-resend-inverted-dates-try-again-alert.md (spec U27, register A46).
// On PKP's default test dataset (a dataset fleet), journal and press: Paul Hudson declines his request
// on submission 12 (OMP 17); dbarnes reads the "Important Dates" section of Julie Janssen's "Edit"
// window and of Paul Hudson's "Resend Review Request" window, then in the Resend window sets the review
// due date a week before the response due date and presses "Resend Review Request": the notice, the
// browser dialogs, the save's answer and whether the window stays open are recorded. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h13l node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/resend-inverted-dates-try-again-alert/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check of a fix trial: after the same decline, the Resend
// window sent with a pair the rule allows (review due date after the response due date) still resends
// the request (the row reads "Request Resent"), with no dialog.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const NAME = 'a46';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U27 A46 walk (${app.name}, ${MODE}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    const dialogs = [];
    L.watchDialogs(page, dialogs);

    // 1: the reviewer declines
    await signIn(page, c.declines.user);
    await step('s1-decline', () => L.reviewerDecline(page, app, c.id));
    await signOut(page);
    await signIn(page, 'dbarnes');

    if (MODE === 'neighbour') {
        await step('n1-resend-valid', async () => {
            const modal = await L.openWorkflow(page, app, c.id);
            const form = await L.openResend(page, modal, c.declines.name);
            const picked = await L.pickDates(page, form, {response: L.day(14), review: L.day(28)});
            const press = await L.pressAndRead(page, form, 'Resend Review Request', /update-resend-request-reviewer(\?|$)/, dialogs, `${NAME}-nb-resend-valid`);
            return {...picked, ...press};
        });
        await step('n2-row', async () => L.rowText(await L.openWorkflow(page, app, c.id), c.declines.name));
        facts.dialogs = dialogs;
        record(`${NAME}-neighbour`, facts);
        return;
    }

    const inverted = {response: L.day(21), review: L.day(14)};
    facts.picked = {response: L.isoDate(inverted.response), review: L.isoDate(inverted.review)};
    // 2-3: Julie Janssen's "Edit": its "Important Dates" section, then "Cancel"
    await step('s3-edit-section', async () => {
        const modal = await L.openWorkflow(page, app, c.id);
        const form = await L.openEdit(page, modal, c.stays.name);
        return L.datesSection(form);
    });
    // 4: Paul Hudson's "Resend Review Request": its "Important Dates" section
    let form;
    await step('s4-resend-section', async () => {
        const modal = await L.openWorkflow(page, app, c.id);
        form = await L.openResend(page, modal, c.declines.name);
        return L.datesSection(form);
    });
    // 5: inverted dates, "Resend Review Request"
    await step('s5-resend-inverted', async () => {
        const picked = await L.pickDates(page, form, inverted);
        const press = await L.pressAndRead(page, form, 'Resend Review Request', /update-resend-request-reviewer(\?|$)/, dialogs, `${NAME}-s5-resend-refused`);
        return {...picked, ...press};
    });
    await step('s5-row-after', async () => L.rowText(await L.openWorkflow(page, app, c.id), c.declines.name));
    facts.dialogs = dialogs;
    record(`${NAME}-summary`, facts);
});
