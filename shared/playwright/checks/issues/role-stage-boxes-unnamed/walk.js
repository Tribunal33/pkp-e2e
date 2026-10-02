// Issue report docs/issues/U54-A8-role-stage-boxes-unnamed.md (U54 A8): the stage boxes of
// Settings > Users & Roles > "Roles" have no accessible name, so a screen reader cannot tell which
// role and stage a box sets. Takes the report's Steps through the screens on a dataset fleet freshly
// reset to PKP's default test dataset, as the dataset's manager `rvaca` on `publicknowledge`.
// The kit builds nothing. The neighbour press unassigns one of the Author role's stages (reset
// the fleet before the next walk).
//
// Steps (OJS, OMP, OPS):
//   1. sign in as rvaca
//   2. Settings > Users & Roles, "Roles" tab
//   3. read the name of each stage box of the "Author" row
//   4. the same for the "Reviewer" row (one box greyed out) and every other row's boxes
// Steps 5, 6 (the same cell templates, read only): Settings > Website > "Plugins" ("Installed
// Plugins"); Settings > Website > "Setup" > "Languages" (both language lists, their boxes and the
// "Primary locale" / "Default" radio buttons).
// Neighbours (what a fix must leave alone): a press on the "Author" row's Review (OMP Internal
// Review, OPS Production) box still sends its request and is answered 200 (the list does not redraw
// the box afterwards: register A5, its own report), the greyed boxes stay greyed, the column headings, the role names and the
// "Settings" arrows' names are unchanged, and a list with no box column (Navigation Menus) is
// drawn as before.
//
// A name is read twice: as Chromium's accessibility tree computes it (what DevTools >
// Accessibility and a screen reader get) and by Playwright's role query.
//
// Reset first:  npm run fleet-prep -- --feature issues-u54j --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u54j PROBE_AGENT=u54j node bin/probe.js all shared/playwright/checks/issues/role-stage-boxes-unnamed/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u54j-3_5, and
//               PROBE_RUN=r35 in front of the run.
// PROBE_RUN=fix names the run with fix.diff applied.
// Facts: .reports/<feature>/u54j/names-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {CASES, flat, axOf, gridBoxes} = require('./lib.js');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {RolesTab} = require('../../../pages/RolesConfigurationPages.js');
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const c = CASES[app.name];
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 2400)}`);
    };

    const {page, close} = await launch(app);
    try {
        const tab = new RolesTab(page, app.contextPath, {stages: c.stages});

        /** One row's boxes: per stage, its accessibility node, state and markup. */
        const rowBoxes = async (name) => {
            if (!(await tab.row(name).count())) return 'no such row';
            const out = {};
            for (const stage of c.stages) {
                const box = tab.stageBox(name, stage);
                out[stage] = {
                    ax: await axOf(page, box),
                    checked: await box.isChecked(),
                    disabled: await box.isDisabled(),
                };
            }
            out.html = flat(await tab.stageBoxes(name).first().evaluate((el) => el.outerHTML));
            return out;
        };

        // Steps 1, 2
        await signIn(page, 'rvaca');
        await tab.goto();
        record(`names-roles${run}`, await screen(page));
        fact('2 columns', await tab.columns());

        // Step 3, 4
        fact('3 Author row', await rowBoxes('Author'));
        fact('4 Reviewer row', await rowBoxes('Reviewer'));
        fact('4 whole list', await gridBoxes(page, tab.grid));
        fact('4 Author row as the browser exposes it', flat(await tab.row('Author').ariaSnapshot(), 1200));
        fact('neighbour: role names', await tab.rowNames());
        fact(
            'neighbour: Settings arrows',
            await tab.grid.locator('a.show_extras').evaluateAll((as) => [...new Set(as.map((a) => a.textContent.replace(/\s+/g, ' ').trim()))])
        );

        // Neighbour: the box is still wired to its action
        const answer = await tab.pressStageBox('Author', c.pressStage);
        await idle(page);
        fact('neighbour: press', {url: answer.url().replace(/^.*\/\$\$\$call\$\$\$\//, ''), status: answer.status()});
        record(`names-roles-after${run}`, await screen(page));

        // Steps 5, 6: the plugins list and the two language lists
        const plugins = new WebsitePluginsPage(page, app.contextPath);
        await plugins.goto();
        record(`names-plugins${run}`, await screen(page));
        fact('5 Installed Plugins', await gridBoxes(page, plugins.list.grid));

        const langs = new JournalLanguagesTab(page, app.contextPath);
        await langs.goto();
        record(`names-languages${run}`, await screen(page));
        fact('6 Website Languages', await gridBoxes(page, langs.website.container));
        fact('6 Submission Languages', await gridBoxes(page, langs.submission.container));

        // Neighbour: a list with no box column (Setup > Navigation's "Navigation Menus", loaded
        // with the Setup tab) is drawn as before: no row name is looked up for it.
        const nav = page.locator('#navigationMenuGridContainer');
        await nav.locator('tbody tr.gridRow').first().waitFor({state: 'attached', timeout: 30_000});
        fact('neighbour: Navigation Menus list', {
            rows: (await nav.locator('tbody tr.gridRow').allTextContents()).map((t) => flat(t, 80)),
            ariaLabels: await nav.locator('tbody [aria-label]').count(),
        });
    } finally {
        record(`names-facts${run}`, facts);
        await close();
    }
});
