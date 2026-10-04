// U29 A5 issue walk: a review form item with "Response Options" switched to a text type ("Extended
// text box") shows no warning, keeps the options listed with "Add Item", and "Save" then deletes
// the options; switching back to a choice type brings nothing back.
// Issue report: docs/issues/U29-A5-review-form-item-text-type-drops-options.md.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), journal or press
// `publicknowledge`, signed in as `dbarnes`. The kit builds nothing: the form and its items are made
// on screen, as the Steps say. A preprint server has no review forms: not walked.
//
// MODE=walk (default), the Steps:
//   1-3 `dbarnes`: Settings › Workflow › "Review" › "Review Forms", "Create Review Form" "Peer review u29w2";
//   4-6 the row's "Edit" › "Form Items" › "Create New Item": "Is the method sound? u29w2", Radio buttons,
//       "Add Item" "Yes", "Add Item" "No", "Save";
//   7   the item's "Edit"; 8 "Item type" = "Extended text box"; 9 "Save"; 10 "Edit" again;
//   11  "Item type" back to Radio buttons.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing. On a form
//   "Neighbour u29w2": (a) a radio item with Yes/No switched to "Drop-down box", saved, reopened: no
//   warning, the options kept; (b) a new "Single line text box" item: no warning on choosing the type,
//   saved; (c) the drop-down item switched to "Extended text box" (any warning accepted) and back to
//   "Checkboxes" before "Save", reopened: the options kept; (d) the checkboxes item switched to
//   "Extended text box" with any warning answered "Cancel", then "Save", reopened.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-form-item-text-type-drops-options/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a5-facts-<mode>[-<run>]-<app>.json (every browser dialog under `dialogs`).
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FORM = MODE === 'nb' ? 'Neighbour u29w2' : 'Peer review u29w2';
const QUESTION = 'Is the method sound? u29w2';

/** What the database holds as the item's options (a read for Evidence, never a step). */
function storedOptions(app, question) {
    try {
        return sql(app, `select s2.setting_value from review_form_element_settings s
            join review_form_element_settings s2 on s2.review_form_element_id = s.review_form_element_id and s2.setting_name = 'possibleResponses'
            where s.setting_name = 'question' and s.setting_value like '%${question.replace(/'/g, "''")}%'`) || '(none)';
    } catch (e) { return `sql failed: ${L.flat(e.message, 200)}`; }
}

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[a5 ops] no review forms: not walked'); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, dialogs: []};
    const {page, close} = await launch(app);
    let answer = 'accept';
    page.on('dialog', async (d) => {
        o.dialogs.push({type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer, at: o.at || null});
        try { if (d.type() === 'beforeunload' || answer === 'accept') await d.accept(); else await d.dismiss(); } catch (e) { /* handled elsewhere */ }
    });
    const step = async (key, fn) => {
        o.at = key;
        const before = o.dialogs.length;
        try { o[key] = await fn(); } catch (e) {
            o[key] = {threw: L.flat(e.message, 400)};
            record(`a5-${MODE}-${key}-threw`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a5-${MODE}-${key}-threw`).catch(() => {});
        }
        if (o[key] && typeof o[key] === 'object') o[key].dialogs = o.dialogs.slice(before).map((d) => `${d.type}: ${d.message}`);
        console.log(`[a5 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    const snap = async (label) => { record(label, await screen(page)); await shot(page, label).catch(() => {}); };
    let forms;
    try {
        await step('form', async () => { await signIn(page, 'dbarnes'); forms = await L.createFormAndOpenItems(page, app, FORM); return {title: FORM}; });  // 1-4
        if (MODE !== 'nb') {
            await step('created', async () => ({...(await L.createItem(page, forms, {question: QUESTION, type: L.RADIO, options: ['Yes', 'No']})), stored: storedOptions(app, QUESTION)})); // 4-6
            await step('opened', async () => { const s = await L.openItemEdit(page, forms, QUESTION); await snap('a5-7-opened'); return s; });                     // 7
            await step('toText', async () => { const s = await L.chooseType(page, forms, L.TEXTAREA); await snap('a5-8-text-chosen'); return s; });                // 8
            await step('saved', async () => ({...(await L.saveOpenItem(page, forms)), stored: storedOptions(app, QUESTION)}));                                    // 9
            await step('reopened', async () => { const s = await L.openItemEdit(page, forms, QUESTION); await snap('a5-10-reopened'); return s; });                 // 10
            await step('backToRadio', async () => { const s = await L.chooseType(page, forms, L.RADIO); await snap('a5-11-radio-again'); return s; });              // 11
        } else {
            const Q = 'nb choice u29w2';
            const QT = 'nb text u29w2';
            await step('aCreated', async () => ({...(await L.createItem(page, forms, {question: Q, type: L.RADIO, options: ['Yes', 'No']})), stored: storedOptions(app, Q)}));
            await step('aOpened', async () => L.openItemEdit(page, forms, Q));
            await step('aToDropdown', async () => L.chooseType(page, forms, L.DROPDOWN));
            await step('aSaved', async () => ({...(await L.saveOpenItem(page, forms)), stored: storedOptions(app, Q)}));
            await step('aReopened', async () => { const s = await L.openItemEdit(page, forms, Q); await snap('a5-nb-a-reopened'); return s; });
            await step('aClosed', async () => { await L.cancelOpenItem(page, forms); return {}; });
            await step('bNewText', async () => {
                await forms.openCreateItem();
                await forms.awaitItemWindowReady();
                const fresh = await L.itemState(forms);
                await forms.fillItem({question: QT, type: L.TEXTLINE});
                const chosen = await L.itemState(forms);
                await snap('a5-nb-b-text-chosen');
                return {fresh, chosen, ...(await L.saveOpenItem(page, forms))};
            });
            await step('cOpened', async () => L.openItemEdit(page, forms, Q));
            await step('cToText', async () => { answer = 'accept'; return L.chooseType(page, forms, L.TEXTAREA); });
            await step('cToCheckboxes', async () => L.chooseType(page, forms, L.CHECKBOXES));
            await step('cSaved', async () => ({...(await L.saveOpenItem(page, forms)), stored: storedOptions(app, Q)}));
            await step('cReopened', async () => { const s = await L.openItemEdit(page, forms, Q); await snap('a5-nb-c-reopened'); return s; });
            await step('dToTextCancelled', async () => { answer = 'dismiss'; const s = await L.chooseType(page, forms, L.TEXTAREA); answer = 'accept'; await snap('a5-nb-d-cancelled'); return s; });
            await step('dSaved', async () => ({...(await L.saveOpenItem(page, forms)), stored: storedOptions(app, Q)}));
            await step('dReopened', async () => { const s = await L.openItemEdit(page, forms, Q); await snap('a5-nb-d-reopened'); return s; });
        }
    } finally {
        delete o.at;
        record(`a5-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
