const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check K5, second run of two one-run facts (OJS):
//  1. A11: with "DRIVER" on, a fresh article published in no issue on D is unpublished on screen: the answer, the
//     screen after it and after a reload, the publication's status, its tombstone and driver mark;
//  2. Rule 22: "Ignore uploaded JATS XML documents" ticked on J's window, PX (XML galley) read in `jats`, unticked again.
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK5 node bin/probe.js ojs shared/playwright/checks/U19/K5/repeat.js
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, idle, outDir} = require('../../../probe');

const T = 30_000;
const REPO = 'oai:ojs-test.localhost:article/';
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (sql) => execFileSync('psql', [dbName('ojs'), '-At', '-c', sql], {encoding: 'utf8'}).trim();

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), 'k5-state-ojs.json'), 'utf8'));
    const o = {};
    const {page, close} = await launch(app);
    const vis = await launch(app);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    try {
        const D = S.D;
        o.driverOn = q(`select setting_value from plugin_settings where plugin_name='driverplugin' and context_id=${D.id} and setting_name='enabled'`);
        const r = await app.api.createSubmission({context: D.path, submitter: D.u.au, tag: `${D.k}dn2`, title: `K5 D DN2 ${S.t}`, published: true, galleys: [{label: 'PDF', file: 'article.pdf'}]});
        o.item = {id: r.submissionId, pub: r.publicationId};
        o.before = q(`select status||':'||coalesce(issue_id::text,'-') from publications where publication_id=${r.publicationId}`);
        await signIn(page, D.u.mg, {contextPath: D.path}); await idle(page);
        await page.goto(app.url(`/index.php/${D.path}/dashboard/editorial?workflowSubmissionId=${r.submissionId}&workflowMenuKey=publication_${r.publicationId}_titleAbstract`)); await idle(page); await sleep(800);
        const b = page.getByRole('button', {name: 'Unpublish', exact: true}).first();
        await b.waitFor({state: 'visible', timeout: T});
        record('rp-01-DN2-before', await screen(page));
        await b.click();
        const d = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpublish', exact: true})}).last();
        await d.waitFor({state: 'visible', timeout: T});
        const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
        const resp = await w;
        await idle(page); await sleep(1200);
        const s1 = await screen(page); record('rp-02-DN2-after', s1); await shot(page, 'rp-02-DN2-after');
        o.unpublish = {status: resp && resp.status(), after: flat(s1.text.dialog, 300).replace(/.*PUBLICATION: TITLE & ABSTRACT/, '')};
        await page.reload(); await idle(page); await sleep(1000);
        const s2 = await screen(page); record('rp-03-DN2-reloaded', s2);
        o.reloaded = flat(s2.text.dialog, 400).replace(/.*PUBLICATION: TITLE & ABSTRACT/, '');
        o.after = q(`select status||':'||coalesce(issue_id::text,'-') from publications where publication_id=${r.publicationId}`);
        o.tomb = q(`select t.tombstone_id||':'||coalesce(s.setting_name||'='||s.setting_value,'no driver mark') from data_object_tombstones t left join data_object_tombstone_settings s using (tombstone_id) where t.data_object_id=${r.submissionId}`);
        const log = fs.readFileSync(path.join(process.cwd(), 'apps/ojs/playwright/.server-logs/server-8050-probe.log'), 'utf8').split('\n').slice(-400);
        o.log = log.filter((l) => /failed to handle the hook|TypeError/.test(l)).slice(-2).map((l) => flat(l, 240));
        // Rule 22 again
        const Jj = S.J;
        const setForce = async (want) => {
            await page.goto(app.url(`/index.php/${Jj.path}/management/settings/website`)); await idle(page);
            await page.locator('#plugins-button').first().click(); await idle(page);
            await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T}); await sleep(500);
            const row = page.locator('#pluginGridContainer tr.gridRow').filter({hasText: 'JATS Metadata Format'}).first();
            const box = row.getByRole('checkbox').first();
            if (!(await box.isChecked())) { const e = page.waitForResponse((x) => /plugin-grid\/enable/.test(x.url()), {timeout: T}).catch(() => null); await box.click(); await e; await sleep(800); }
            await row.locator('a.show_extras').first().click(); await sleep(500);
            await page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link', {name: 'Settings', exact: true}).first().click();
            const win = page.locator('[role="dialog"]:visible').last();
            await win.locator('input[name="forceJatsTemplate"]').waitFor({timeout: T}); await sleep(300);
            if (want) await win.locator('input[name="forceJatsTemplate"]').check(); else await win.locator('input[name="forceJatsTemplate"]').uncheck();
            const s = page.waitForResponse((x) => x.request().method() === 'POST' && /manage/.test(x.url()), {timeout: T}).catch(() => null);
            await win.getByRole('button', {name: 'OK', exact: true}).click(); await s; await sleep(500);
        };
        await signIn(page, Jj.u.mg, {contextPath: Jj.path}); await idle(page);
        const readPX = async () => {
            const g = await vis.page.request.get(app.url(`/index.php/${Jj.path}/oai?verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + Jj.items.PX.id)}`));
            const x = await g.text();
            return {status: g.status(), body: flat((x.match(/<body[^>]*>([\s\S]*?)<\/body>/) || [])[1], 200), back: /<back[\s>]/.test(x)};
        };
        await setForce(true); o.forced = await readPX();
        await setForce(false); o.unforced = await readPX();
        o.stored = q(`select setting_name||'='||setting_value from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and context_id=${Jj.id} order by 1`);
    } finally {
        record('rp-facts', o);
        console.log(JSON.stringify(o));
        await close(); await vis.close();
    }
});
