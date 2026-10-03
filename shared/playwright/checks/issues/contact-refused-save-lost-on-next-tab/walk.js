// Issue report docs/issues/U03-A17-contact-refused-save-lost-on-next-tab.md (U03 A17):
// the report's Steps to reproduce, walked through the screens on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds
// nothing. Fact keys follow the report's steps:
//   1–2  `dbarnes` signs in, the Profile page by its address, "Contact"
//   3–4  "Email address" := rvaca@mailinator.com, "Phone" := 555 0199
//   5    "Identity" pressed with the change unsent: the question, "Cancel"
//   6    "Save": the server's refusal
//   7    "Identity" pressed after the refusal ("Cancel" if asked)
//   8    "Contact" pressed: what the boxes hold
// The neighbour check (the fix must not reach further) is neighbour.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-u03a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u03a PROBE_AGENT=u03a node bin/probe.js all shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u03a-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u03a-3_5 PROBE_AGENT=u03a node bin/probe.js all shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/walk.js
// Facts: .reports/<feature>/u03a/walk-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const OTHER = 'rvaca@mailinator.com';
const PHONE = '555 0199';

forEachApp(async (app) => {
    const fact = (k, v) => { record('walk-facts', {[k]: v}, {merge: true}); console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const {page} = await launch(app);
    const dialogs = L.dialogRecorder(page);

    await signIn(page, 'dbarnes');                                                          // 1
    const {profile, via} = await L.openProfileFromMenu(app, page);                          // 2
    fact('2-profile', {via, url: page.url()});
    fact('2-contact', await L.pressTab(page, profile, dialogs, 'contact'));
    fact('2-values', await L.contactValues(profile));

    await profile.email().fill(OTHER);                                                     // 3
    await profile.phone().fill(PHONE);                                                     // 4
    await profile.phone().blur();
    fact('4-values', await L.contactValues(profile));

    fact('5-identity-unsent', await L.pressTab(page, profile, dialogs, 'identity', {answer: 'dismiss'}));   // 5
    fact('5-values', await L.contactValues(profile));
    await shot(page, 'a17-5-cancelled').catch(() => {});

    await profile.save();                                                                   // 6
    const s6 = await screen(page);
    fact('6-refused', {notices: s6.notices, values: await L.contactValues(profile)});
    await shot(page, 'a17-6-refused').catch(() => {});

    const s7 = await L.pressTab(page, profile, dialogs, 'identity', {answer: 'dismiss'});   // 7
    fact('7-identity-after-refusal', s7);
    if (s7.selected.includes('contact')) {
        // The question came and "Cancel" kept the tab (the Expected).
        fact('7-values-kept', await L.contactValues(profile));
        await shot(page, 'a17-7-kept').catch(() => {});
        fact('7b-identity-ok', await L.pressTab(page, profile, dialogs, 'identity', {answer: 'accept'}));
    } else {
        await shot(page, 'a17-7-identity').catch(() => {});
    }

    fact('8-contact', await L.pressTab(page, profile, dialogs, 'contact'));                 // 8
    fact('8-values', await L.contactValues(profile));
    await shot(page, 'a17-8-contact').catch(() => {});
    fact('dialogs', dialogs.seen);
});
