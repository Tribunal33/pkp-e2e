// Issue report docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md
// (U13 OJS8): the report's Steps to reproduce, walked through the screens
// on PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), `publicknowledge`, as the dataset's own users.
//
// The kit builds nothing. Everything goes through the screens:
//   A (OJS, the Publication Facts Label settings, as rvaca):
//     1–3.  sign in, Settings › Website › "Plugins": tick the plugin, "Settings"
//     4–6.  "Start Date" "2026-99-99", "OK", "Settings" again
//     7–8.  "Start Date" "2020-02-30", "OK", "Settings" again
//     9–10. "Start Date" "2026-99-99" over the stored date, "OK", "Settings" again
//   B (OJS submission 12, OMP submission 17, as dbarnes):
//     1–4.  Julie Janssen's row, "Edit", "Review Due Date" "2030-02-30", "OK", "Edit" again
// `neighbour` as the script's argument adds the fix's neighbour check to A:
//     a valid "2021-03-04" saves and comes back; an emptied box saves empty;
//     after "2026-99-99", a day picked in the calendar saves that day.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir17 --dataset 7 --reset
// Run (main):   ONLY=ojs,omp PROBE_FEATURE=issues-ir17 PROBE_AGENT=ir17 node bin/probe.js all shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir17-3_5 --dataset 7 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir17-3_5 PROBE_AGENT=ir17 node bin/probe.js all shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk.js
// Facts: .reports/<feature>/ir17/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, sql} = require('../../../probe');
const {enablePlugin} = require('../recommend-by-author-list-never-shown/lib');
const {openPflSettings} = require('../publication-facts-settings-funding-warning/lib');
const {sleep, flat, readDate, typeDate, pressOk, openEditReview} = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const REVIEW = {ojs: 12, omp: 17};
const REVIEWER = 'Julie Janssen';

forEachApp(async (app) => {
    if (!REVIEW[app.name]) return; // OPS has no form with a date box
    const {page, close} = await launch(app);
    const facts = {line: app.line, dataset: app.dataset, steps: []};
    const push = (step, o) => facts.steps.push({step, ...o});
    try {
        if (app.name === 'ojs') {
            const form = page.locator('#pflPluginSettingsForm');
            const stored = () => sql(app, "select setting_value from plugin_settings where plugin_name = 'pflplugin' and setting_name = 'dateStart'");
            const round = async (label, text) => {
                push(`${label} typed "${text}"`, {date: await typeDate(page, form, 'dateStart', text)});
                push(`${label} OK`, await pressOk(page, form, ['dateStart'], `pfl-${label}-ok`));
                await openPflSettings(page, app, `pfl-${label}-reopened`);
                push(`${label} reopened`, {date: await readDate(form, 'dateStart'), stored: stored()});
            };
            await signIn(page, 'rvaca');
            push('A2', await enablePlugin(page, app, 'pflplugin'));
            await openPflSettings(page, app, 'pfl-opened');
            push('A3 opened', {date: await readDate(form, 'dateStart')});
            await round('A4-6', '2026-99-99');
            await round('A7-8', '2020-02-30');
            await round('A9-10', '2026-99-99');
            if (NEIGHBOUR) {
                await round('N1 valid', '2021-03-04');
                await round('N2 emptied', '');
                // N3: an impossible date, then a day picked in the calendar: what the box and any message show, then "OK".
                push('N3 typed "2026-99-99"', {date: await typeDate(page, form, 'dateStart', '2026-99-99')});
                await form.locator('[name="dateStart-removed"]').click();
                await page.locator('#ui-datepicker-div td a').filter({hasText: /^15$/}).first().click();
                await sleep(500);
                push('N3 picked the 15th', {date: await readDate(form, 'dateStart')});
                push('N3 OK', await pressOk(page, form, ['dateStart'], 'pfl-N3-ok'));
                await openPflSettings(page, app, 'pfl-N3-reopened');
                push('N3 reopened', {date: await readDate(form, 'dateStart'), stored: stored()});
            }
            await signOut(page);
        }
        const sid = REVIEW[app.name];
        const dates = ['responseDueDate', 'reviewDueDate'];
        const storedDue = () => sql(app, `select ra.date_response_due, ra.date_due from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = ${sid} and u.username = 'jjanssen'`);
        await signIn(page, 'dbarnes');
        let form = await openEditReview(page, app, sid, REVIEWER);
        push('B2 opened', {responseDueDate: await readDate(form, 'responseDueDate'), reviewDueDate: await readDate(form, 'reviewDueDate'), stored: storedDue()});
        push('B3 typed "2030-02-30"', {date: await typeDate(page, form, 'reviewDueDate', '2030-02-30')});
        push('B3 OK', await pressOk(page, form, dates, 'review-b3-ok'));
        form = await openEditReview(page, app, sid, REVIEWER);
        push('B4 reopened', {responseDueDate: await readDate(form, 'responseDueDate'), reviewDueDate: await readDate(form, 'reviewDueDate'), stored: storedDue()});
        await signOut(page);
    } finally {
        record('facts', facts);
        for (const s of facts.steps) console.log(`step ${s.step}`, flat(JSON.stringify(s), 1200));
        await close();
    }
});
