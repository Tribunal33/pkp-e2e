// Issue report walk: docs/issues/U63-A10-export-list-published-no-stage.md (spec U63
// register A10). Takes the report's Steps through the screens on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"): its
// context `publicknowledge` and its manager `rvaca`. The kit builds nothing
// and the walk changes nothing.
//
//   steps: Tools › "Native XML Plugin" › "Export Articles" ("Export",
//      "Export Preprints"); "Filters"; "Production"; the other stages
//      added; all cleared
//   control: the dashboard's "Published" view, whose count the export
//      list's stage filters should be able to reach
//   neighbour (walked with fix.diff in and out): each stage filter alone,
//      then "Published" alone and with a section, when the list offers it;
//      each existing stage must list the same lines either way
//
// Trying the fix (REPORT.md "Proposed fix", harness.md "Trying a fix"):
//   node bin/try-fix.js apply shared/playwright/checks/issues/export-list-published-no-stage/fix.diff ojs omp ops
//   reset, run as below with PROBE_RUN=fix, then: node bin/try-fix.js revert ojs omp ops
//   The neighbour phase alone: NEIGHBOUR_ONLY=1 in front of the run.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a10 node bin/probe.js all shared/playwright/checks/issues/export-list-published-no-stage/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63a10 node bin/probe.js all shared/playwright/checks/issues/export-list-published-no-stage/walk.js
// Facts: .reports/<feature>/u63a10/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR_ONLY = process.env.NEIGHBOUR_ONLY === '1';

// The dataset's published submissions (docs/process/dataset.md), by ID.
const PUBLISHED = {
    ojs: [1, 17],
    omp: [5, 14],
    ops: [2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
};
const STAGES = {
    ojs: ['Submission', 'Review', 'Copyediting', 'Production'],
    omp: ['Submission', 'Internal Review', 'External Review', 'Copyediting', 'Production'],
    ops: ['Production'],
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset, neighbourOnly: NEIGHBOUR_ONLY};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); record('facts', facts); };
    const ctx = app.contextPath;
    const cu = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const exportTabName = isOJS ? 'Export Articles' : isOMP ? 'Export' : 'Export Preprints';
    const published = PUBLISHED[app.name];
    const stages = STAGES[app.name];

    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };

    const list = () => page.locator('#exportXmlForm');
    const sidebar = () => list().locator('.listPanel__sidebar');
    const listSettle = async () => {
        await idle(page);
        let last = '';
        for (let i = 0; i < 40; i++) {
            const sig = await list().evaluate((el) => [...el.querySelectorAll('.listPanel__item input[type=checkbox]')].map((b) => b.value).join(',')
                + '|' + (el.querySelector('.listPanel__empty') ? 'empty' : '')).catch(() => '');
            if (sig === last && sig !== '|') break;
            last = sig; await pause(400);
        }
        await idle(page);
    };
    const readList = async () => {
        const r = await list().evaluate((el) => {
            const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const items = [...el.querySelectorAll('.listPanel__item')].map((li) => {
                const box = li.querySelector('input[type=checkbox]');
                return {id: box ? Number(box.value) : null, title: txt(li.querySelector('.listPanel__itemSubTitle'))};
            });
            const side = el.querySelector('.listPanel__sidebar');
            return {
                ids: items.map((i) => i.id),
                titles: items.map((i) => `${i.id} ${i.title}`.slice(0, 90)),
                empty: txt(el.querySelector('.listPanel__empty')),
                pressed: side ? [...side.querySelectorAll('.pkpFilter--isActive, .pkpFilter.-isActive, button[aria-pressed="true"]')].map(txt) : [],
            };
        });
        r.lines = r.ids.length;
        r.publishedListed = r.ids.filter((id) => published.includes(id));
        return r;
    };
    const press = async (name) => {
        await sidebar().getByRole('button', {name, exact: true}).first().click();
        await pause(1200); await listSettle();
    };

    try {
        // 1. Sign in as the manager.
        await signIn(page, 'rvaca');
        // 2. Side menu "Tools", then "Native XML Plugin".
        await page.goto(cu('/submissions'));
        await idle(page);
        const toolsLink = page.getByRole('link', {name: 'Tools', exact: true});
        if (await toolsLink.count()) {
            await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), toolsLink.first().click()]);
        } else {
            await page.goto(cu('/management/tools'));
            fact('toolsTyped', true);
        }
        await idle(page);
        const link = page.getByRole('link', {name: 'Native XML Plugin', exact: true}).first();
        await link.waitFor({timeout: T});
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page); await pause(500);
        // 3. The export tab.
        await page.getByRole('tab', {name: exportTabName, exact: true}).first().click();
        await idle(page);
        await list().locator('.listPanel__item, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
        await listSettle();
        const full = await readList();
        fact('step3-full-list', {lines: full.lines, publishedListed: full.publishedListed, titles: full.titles});
        await snap('export-list');
        // 4. "Filters".
        await list().getByRole('button', {name: 'Filters'}).first().click();
        await pause(800); await idle(page);
        const panel = flat(await sidebar().innerText().catch(() => null), 800);
        const stageGroup = await sidebar().evaluate((el) => {
            // The buttons under the "Stages" heading.
            const heads = [...el.querySelectorAll('.pkpHeader, h2, h3, h4, .listPanel__filterHeading, .pkpFilter__heading')];
            return heads.map((h) => h.innerText.trim());
        }).catch(() => null);
        const hasPublished = await sidebar().getByRole('button', {name: 'Published', exact: true}).count();
        fact('filters-panel', {text: panel, headings: stageGroup, publishedButton: hasPublished});
        await snap('filters-open');

        if (!NEIGHBOUR_ONLY) {
            // 4. "Production".
            await press('Production');
            const prod = await readList();
            fact('step4-production', prod);
            await snap('production');
            await shot(page, 'production');
            // 5. The other stages too.
            for (const s of stages.filter((x) => x !== 'Production')) await press(s);
            const all = await readList();
            all.missing = full.ids.filter((id) => !all.ids.includes(id));
            fact('step5-every-stage', all);
            await snap('every-stage');
            await shot(page, 'every-stage');
            // 6. Clear them.
            for (const s of stages) await press(s);
            const cleared = await readList();
            fact('step6-cleared', {lines: cleared.lines, publishedListed: cleared.publishedListed});
            await snap('cleared');
        }

        // Neighbour: each stage alone; "Published" alone and with a section when offered.
        const alone = {};
        for (const s of [...stages, ...(hasPublished ? ['Published'] : [])]) {
            await press(s);
            const r = await readList();
            alone[s] = {lines: r.lines, ids: r.ids, publishedListed: r.publishedListed};
            await press(s);
        }
        fact('neighbour-each-alone', alone);
        if (hasPublished) {
            await press('Published');
            await snap('published-filter');
            await shot(page, 'published-filter');
            if (!isOMP) {
                const sec = isOJS ? 'Reviews' : 'Preprints';
                await press(sec);
                const r = await readList();
                fact('neighbour-published-and-section', {section: sec, lines: r.lines, ids: r.ids});
                await press(sec);
            }
            await press('Published');
            // Every stage plus Published: the full list.
            for (const s of [...stages, 'Published']) await press(s);
            const r = await readList();
            fact('neighbour-every-stage-and-published', {lines: r.lines, missing: full.ids.filter((id) => !r.ids.includes(id))});
            for (const s of [...stages, 'Published']) await press(s);
        }

        // Control: the dashboard's "Published" view.
        await page.goto(cu('/dashboard/editorial?currentViewId=published'));
        await idle(page); await pause(1500); await idle(page);
        const dash = await snap('dashboard-published');
        fact('control-dashboard-published', {text: flat(dash.text && (dash.text.main || dash.text), 900)});
    } finally {
        await close();
    }
});
