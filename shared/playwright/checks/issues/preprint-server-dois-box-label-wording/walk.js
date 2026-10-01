// Issue report docs/issues/U45-OPS1-preprint-server-dois-box-label-wording.md (U45 OPS1):
// the report's Steps to reproduce, walked through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), as
// the dataset's `dbarnes`, on its own context `publicknowledge`. The kit
// builds nothing and the walk saves nothing.
//
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup"
//   3. read the label of the box under "DOIs"
// OJS and OMP take the same steps as the control (their label is right).
// The neighbour the fix must leave alone is read on the same screen: the
// "Items with DOIs" help, the next string of the same locale file, and the
// journal's and the press's own labels.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/preprint-server-dois-box-label-wording/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=ir19 node bin/probe.js all shared/playwright/checks/issues/preprint-server-dois-box-label-wording/walk.js
// Facts: .reports/<feature>/ir19/label-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const {DoiSettings} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'dbarnes');
        // 2
        const settings = new DoiSettings(page, app.contextPath);
        await settings.goto('Setup');
        await idle(page);
        // 3
        const box = settings.enableBox();
        await expect(box).toBeVisible({timeout: 20_000});
        fact(
            '3 DOIs box label',
            await box.evaluate((b) => ((b.closest('label') || b.parentElement).textContent || '').replace(/\s+/g, ' ').trim())
        );
        fact('3 DOIs box ticked', await box.isChecked());
        // the neighbour: the help of "Items with DOIs", when the group shows
        const group = settings.kindsGroup();
        fact(
            'neighbour "Items with DOIs" help',
            (await group.count())
                ? await group.evaluate((g) => {
                      const d = g.querySelector('[id$="-description"], .pkpFormField__description');
                      return d ? (d.textContent || '').replace(/\s+/g, ' ').trim() : null;
                  })
                : null
        );
        record('label-setup', await screen(page));
        await shot(page, 'label-setup').catch(() => {});
        record('label-facts', facts);
    } finally {
        await close();
    }
});
