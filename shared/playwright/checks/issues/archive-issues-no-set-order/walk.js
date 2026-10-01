// Issue report walk: docs/issues/U50-A13-archive-issues-no-set-order.md
// (spec U50 register A13). Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), through the screens, OJS only
// (OMP and OPS have no issues). The kit builds nothing.
//   The dataset holds "Vol. 1 No. 2 (2014)" (published, current) and
//   "Vol. 2 No. 1 (2015)" (unpublished), and no saved "Back Issues" order.
//   1    sign in as dbarnes.
//   2    Future Issues › "Vol. 2 No. 1 (2015)" › "Publish Issue", the mail box unticked, "OK".
//   3    "Create Issue": Volume 2, Number 2, Year 2016, "Title" unticked, "Save".
//   4    its row › "Publish Issue", the mail box unticked, "OK".
//   5    Back Issues: the order.          6  "Archives": the order.
//   7    "Vol. 1 No. 2 (2014)" › "Issue Data": a "Description", "Save".
//   8    Back Issues and "Archives" again.
// Pass `ordered` as the script's argument for the neighbour check instead of
// steps 7-8: "Back Issues" › "Order", "Vol. 1 No. 2 (2014)" dragged to the top,
// "Done"; both lists must then follow the saved order, fix in or out.
// Database reads (the rows' physical position, custom_issue_orders) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-w25 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-w25 PROBE_AGENT=w25 node bin/probe.js ojs shared/playwright/checks/issues/archive-issues-no-set-order/walk.js
// Neighbour:    PROBE_RUN=nb PROBE_FEATURE=issues-w25 PROBE_AGENT=w25 node bin/probe.js ojs <this file> ordered
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w25-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w25-3_5 PROBE_AGENT=w25 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w25/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const OLD = 'Vol. 1 No. 2 (2014)';
const MID = 'Vol. 2 No. 1 (2015)';
const NEW = 'Vol. 2 No. 2 (2016)';
const MODE = process.argv.slice(2).includes('ordered') ? 'ordered' : 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const rows = () => q(`select i.ctid||' id'||i.issue_id||' '||i.year||' published '||i.published||' seq '||coalesce(o.seq::text,'-') from issues i left join custom_issue_orders o on o.issue_id=i.issue_id order by i.ctid`).split('\n');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode: MODE, rows: rows(),
        currentIssueId: q(`select coalesce(current_issue_id::text,'null') from journals where path='${app.contextPath}'`)});

    const {page, close} = await launch(app);
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { await page.goto(u).catch(() => {}); await idle(page).catch(() => {}); };
    const snap = async (label) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        const name = `${MODE === 'ordered' ? 'nb-' : ''}${label}`;
        record(name, s); await shot(page, name).catch(() => {});
        return s;
    };

    async function tab(name) {
        await go(cu('/manageIssues'));
        await page.getByRole('tab', {name, exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        return panel;
    }
    const issueRow = (panel, issue) => panel.locator('tr.gridRow').filter({has: page.getByRole('link', {name: issue, exact: true})}).first();
    async function rowAction(panel, issue, action) {
        const row = issueRow(panel, issue);
        await row.locator('a.show_extras').click();
        const ctl = row.locator('xpath=following-sibling::tr[contains(@class,"row_controls")][1]');
        await ctl.waitFor({timeout: T});
        await ctl.getByRole('link', {name: action, exact: true}).click();
    }
    async function publish(tabName, issue, label) {
        const panel = await tab(tabName);
        await rowAction(panel, issue, 'Publish Issue');
        const pd = page.getByRole('dialog', {name: 'Publish Issue', exact: true});
        await pd.locator('input[name="sendIssueNotification"]').waitFor({timeout: T});
        await idle(page); await pause(500);
        await pd.locator('input[name="sendIssueNotification"]').uncheck();
        await snap(`${label}-publish`);
        const w = page.waitForResponse((r) => /publish-issue|publishIssue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await pd.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await pd.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        return {status: r ? r.status() : null};
    }
    async function readBack(label) {
        const panel = await tab('Back Issues');
        await snap(label);
        return (await panel.locator('tr.gridRow').allInnerTexts()).map((x) => flat(x, 120));
    }
    async function readArchive(label) {
        await go(cu(''));
        await page.locator('nav').getByRole('link', {name: 'Archives', exact: true}).first().click();
        await idle(page);
        await snap(label);
        return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), heading: flat(await page.locator('h1').first().innerText().catch(() => null)),
            issues: (await page.locator('.obj_issue_summary .title').allInnerTexts()).map((x) => flat(x, 120))};
    }

    try {
        // 1. dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Publish "Vol. 2 No. 1 (2015)".
        fact('2-publish', {issue: MID, ...(await publish('Future Issues', MID, '02')), rows: rows()});

        // 3. "Create Issue" Vol. 2 No. 2 (2016), "Title" unticked.
        await tab('Future Issues');
        await page.getByRole('link', {name: 'Create Issue', exact: true}).first().click();
        const form = page.locator('form#issueForm');
        await form.locator('input[name="volume"]').waitFor({timeout: T});
        await idle(page); await pause(300);
        await form.locator('input[name="volume"]').fill('2');
        await form.locator('input[name="number"]').fill('2');
        await form.locator('input[name="year"]').fill('2016');
        const tbox = form.locator('input[type="checkbox"][name="showTitle"]');
        if (await tbox.isChecked()) await tbox.click();
        await snap('03-create-issue');
        const cw = page.waitForResponse((r) => /update-issue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const cr = await cw;
        await idle(page); await pause(1200);
        fact('3-create', {status: cr ? cr.status() : null, rows: rows()});

        // 4. Publish it.
        fact('4-publish', {issue: NEW, ...(await publish('Future Issues', NEW, '04')), rows: rows()});

        // 5, 6. "Back Issues" and "Archives".
        fact('5-back-issues', await readBack('05-back-issues'));
        fact('6-archive', await readArchive('06-archive'));

        if (MODE === 'steps') {
            // 7. "Vol. 1 No. 2 (2014)" › "Issue Data": a description, "Save".
            const panel = await tab('Back Issues');
            await issueRow(panel, OLD).getByRole('link', {name: OLD, exact: true}).click();
            await page.getByRole('link', {name: 'Issue Data', exact: true}).click().catch(async () => {
                await page.getByRole('tab', {name: 'Issue Data', exact: true}).click();
            });
            const iform = page.locator('form#issueForm');
            await iform.locator('input[name="volume"]').waitFor({timeout: T});
            await idle(page); await pause(800);
            const ed = iform.locator('iframe').first().contentFrame().locator('body');
            await ed.click();
            await page.keyboard.type('u50w25 anniversary issue');
            await snap('07-issue-data');
            const uw = page.waitForResponse((r) => /update-issue/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await iform.getByRole('button', {name: 'Save', exact: true}).click();
            const ur = await uw;
            await idle(page); await pause(1200);
            await snap('07-saved');
            fact('7-issue-data', {status: ur ? ur.status() : null, description: q(`select setting_value from issue_settings where issue_id=1 and setting_name='description' and locale='en'`), rows: rows()});

            // 8. Both lists again.
            fact('8-back-issues', await readBack('08-back-issues'));
            fact('8-archive', await readArchive('08-archive'));
        } else {
            // Neighbour: "Order", drag "Vol. 1 No. 2 (2014)" to the top, "Done".
            const panel = await tab('Back Issues');
            await panel.getByRole('link', {name: 'Order', exact: true}).first().click();
            await idle(page); await pause(600);
            const from = issueRow(panel, OLD);
            const to = panel.locator('tr.gridRow').first();
            const fb = await from.boundingBox(); const tb = await to.boundingBox();
            await page.mouse.move(fb.x + 40, fb.y + fb.height / 2);
            await page.mouse.down();
            for (let i = 1; i <= 15; i++) { await page.mouse.move(fb.x + 40, fb.y + fb.height / 2 + ((tb.y - 8) - (fb.y + fb.height / 2)) * i / 15); await pause(40); }
            await page.mouse.up();
            await pause(500);
            await snap('nb-ordering');
            const dw = page.waitForResponse((r) => /sequence/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await panel.getByRole('button', {name: 'Done', exact: true}).first().click().catch(async () => {
                await panel.getByRole('link', {name: 'Done', exact: true}).first().click();
            });
            const dr = await dw;
            await idle(page); await pause(1000);
            fact('nb-order-saved', {status: dr ? dr.status() : null, rows: rows()});
            fact('nb-back-issues', await readBack('nb-back-issues'));
            fact('nb-archive', await readArchive('nb-archive'));
        }
        fact('end', {rows: rows()});
    } finally {
        record('facts', facts);
        await close();
    }
});
