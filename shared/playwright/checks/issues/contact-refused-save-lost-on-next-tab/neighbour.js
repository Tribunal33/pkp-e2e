// Neighbour check for docs/issues/U03-A17-contact-refused-save-lost-on-next-tab.md
// (U03 A17): what the fix must leave alone. On PKP's default test dataset,
// `dbarnes` on the Profile page's "Contact" tab:
//   n1  "Contact" opened, nothing changed, "Identity" pressed: no question
//   n2  "Phone" := 555 0100, "Save" (accepted), "Identity" pressed: no question
//   n3  "Contact" reopened: "Phone" reads 555 0100
// Walked with the fix in and out (PROBE_RUN=nb-in / nb-out).
// Reset first:  npm run fleet-prep -- --feature issues-u03a --dataset 1 --reset
// Run:          PROBE_RUN=nb-out PROBE_FEATURE=issues-u03a PROBE_AGENT=u03a node bin/probe.js all shared/playwright/checks/issues/contact-refused-save-lost-on-next-tab/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const fact = (k, v) => { record('neighbour-facts', {[k]: v}, {merge: true}); console.log('[nb]', app.name, k, JSON.stringify(v).slice(0, 700)); };
    const {page} = await launch(app);
    const dialogs = L.dialogRecorder(page);
    await signIn(page, 'dbarnes');
    const {profile, via} = await L.openProfileFromMenu(app, page);
    fact('profile', {via});

    fact('n1-contact', await L.pressTab(page, profile, dialogs, 'contact'));
    fact('n1-identity-unchanged', await L.pressTab(page, profile, dialogs, 'identity'));

    await L.pressTab(page, profile, dialogs, 'contact');
    await profile.phone().fill('555 0100');
    await profile.phone().blur();
    await profile.save();
    const s = await screen(page);
    fact('n2-saved', {notices: s.notices, values: await L.contactValues(profile)});
    fact('n2-identity-after-save', await L.pressTab(page, profile, dialogs, 'identity'));

    fact('n3-contact', await L.pressTab(page, profile, dialogs, 'contact'));
    fact('n3-values', await L.contactValues(profile));
    fact('dialogs', dialogs.seen);
});
