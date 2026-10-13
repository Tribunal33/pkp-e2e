// Kept walk for docs/issues/U27-A45-inverted-review-dates-notice-says-adding.md (spec U27, register A45).
// On PKP's default test dataset (a dataset fleet), journal and press: Paul Hudson declines his request
// on submission 12 (OMP 17); dbarnes then sets a review due date a week before the response due date
// in "Add Reviewer" (Aisla McCrae), in Julie Janssen's "Edit" and in Paul Hudson's "Resend Review
// Request", presses each window's button, and reads the notice each refusal shows. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=h13l node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/inverted-review-dates-notice-says-adding/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check of a fix trial: Julie Janssen's "Edit" with the two
// dates equal (a pair the rule allows) still saves, closes the window and shows no refusal.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const NAME = 'a45';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U27 A45 walk (${app.name}, ${MODE}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);
    const dialogs = [];
    L.watchDialogs(page, dialogs);
    const inverted = {response: L.day(21), review: L.day(14)};

    if (MODE === 'neighbour') {
        await signIn(page, 'dbarnes');
        await step('n1-edit-equal', async () => {
            const modal = await L.openWorkflow(page, app, c.id);
            const form = await L.openEdit(page, modal, c.stays.name);
            const picked = await L.pickDates(page, form, {response: L.day(14), review: L.day(14)});
            const press = await L.pressAndRead(page, form, 'OK', /update-review(\?|$)/, dialogs, `${NAME}-nb-edit-equal`);
            return {...picked, ...press};
        });
        await step('n2-row', async () => L.rowText(await L.openWorkflow(page, app, c.id), c.stays.name));
        record(`${NAME}-neighbour`, facts);
        return;
    }

    facts.picked = {response: L.isoDate(inverted.response), review: L.isoDate(inverted.review)};
    // 1: the reviewer declines (the Resend window needs a declined row)
    await signIn(page, c.declines.user);
    await step('s1-decline', () => L.reviewerDecline(page, app, c.id));
    await signOut(page);
    // 2: the editor's workflow
    await signIn(page, 'dbarnes');
    await step('s2-rows', async () => {
        const modal = await L.openWorkflow(page, app, c.id);
        return {[c.stays.name]: await L.rowText(modal, c.stays.name), [c.declines.name]: await L.rowText(modal, c.declines.name)};
    });
    // 3-4: "Add Reviewer", inverted dates
    await step('s3-add', async () => {
        await L.openWorkflow(page, app, c.id);
        const form = await L.openAddReviewer(page, c.add);
        const section = await L.datesSection(form);
        const picked = await L.pickDates(page, form, inverted);
        const press = await L.pressAndRead(page, form, 'Add Reviewer', /update-reviewer(\?|$)/, dialogs, `${NAME}-s3-add-refused`);
        return {section, ...picked, ...press};
    });
    await step('s3-rows-after', async () => L.rowText(await L.openWorkflow(page, app, c.id), c.add.name));
    // 5: Julie Janssen's "Edit", inverted dates
    await step('s5-edit', async () => {
        const modal = await L.openWorkflow(page, app, c.id);
        const form = await L.openEdit(page, modal, c.stays.name);
        const section = await L.datesSection(form);
        const picked = await L.pickDates(page, form, inverted);
        const press = await L.pressAndRead(page, form, 'OK', /update-review(\?|$)/, dialogs, `${NAME}-s5-edit-refused`);
        return {section, ...picked, ...press};
    });
    // 6: Paul Hudson's "Resend Review Request", inverted dates
    await step('s6-resend', async () => {
        const modal = await L.openWorkflow(page, app, c.id);
        const form = await L.openResend(page, modal, c.declines.name);
        const section = await L.datesSection(form);
        const picked = await L.pickDates(page, form, inverted);
        const press = await L.pressAndRead(page, form, 'Resend Review Request', /update-resend-request-reviewer(\?|$)/, dialogs, `${NAME}-s6-resend-refused`);
        return {section, ...picked, ...press};
    });
    await step('s6-row-after', async () => L.rowText(await L.openWorkflow(page, app, c.id), c.declines.name));
    facts.dialogs = dialogs;
    record(`${NAME}-summary`, facts);
});
