// Issue report walk: docs/issues/U13-OJS4-recommend-by-author-list-never-shown.md
// (spec U13 register OJS4). Takes the report's Steps on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), through the screens:
//   1–2. `dbarnes` ticks "Recommend Articles by Author" (Settings › Website › Plugins);
//   3.   unpublishes submission 17 ("Antimicrobial, heavy metal resistance …");
//   4.   adds the contributor "Alan Mwandenga" (submission 1's contributor) to it;
//   5.   publishes it again;
//   6–7. signed out, opens the article pages of submission 1 ("Signalling
//        Theory Dividends") and of submission 17, reading the
//        "Most read articles by the same author(s)" section and the server log.
// The kit builds nothing. OJS only (the plugin is OJS's).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u13ojs4 node bin/probe.js ojs shared/playwright/checks/issues/recommend-by-author-list-never-shown/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u13ojs4 node bin/probe.js ojs <this file>
// Fix trial:    trial.sh beside this file.
// Facts: .reports/<feature>/u13ojs4/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');
const HEADING = 'Most read articles by the same author(s)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 800)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const pubId = q('select current_publication_id from submissions where submission_id=17');
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, publication17: pubId});

    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|Plugin |SQLSTATE/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const menuKey = (key) => (app.line === 'stable-3_5_0' ? `publication_${key}` : `publication_${pubId}_${key}`);
    const wfUrl = (key) => app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=17${key ? `&workflowMenuKey=${menuKey(key)}` : ''}`);
    const snap = async (name) => { record(name, await screen(page)); await shot(page, name); };

    try {
        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');

        // 2. Settings › Website › Plugins: tick "Recommend Articles by Author".
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`)); await idle(page);
        const pluginsTab = page.getByRole('tab', {name: 'Plugins', exact: true}).first();
        await pluginsTab.click(); await idle(page);
        const row = page.locator('tr.gridRow[id$="-row-recommendbyauthorplugin"]').first();
        await row.waitFor({state: 'visible', timeout: T});
        const box = row.locator('input[type=checkbox]');
        const wasTicked = await box.isChecked();
        let enableStatus = null;
        if (!wasTicked) {
            const en = page.waitForResponse((r) => /enable/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await box.click();
            const r = await en; enableStatus = r ? r.status() : null;
            await idle(page); await pause(500);
        }
        const s2 = await screen(page); record('02-plugin-enabled', s2); await shot(page, '02-plugin-enabled');
        fact('2-enable', {rowName: (await row.locator('td').first().innerText()).trim().split('\n')[0], wasTicked, status: enableStatus,
            ticked: await box.isChecked(), notices: s2.notices || null});

        // 3. Submission 17: "Unpublish".
        await page.goto(wfUrl('titleAbstract')); await idle(page);
        const ub = page.getByRole('button', {name: 'Unpublish', exact: true}).first();
        await ub.waitFor({state: 'visible', timeout: T});
        await snap('03-published');
        await ub.click();
        const dlg = page.getByRole('dialog').filter({hasText: "Are you sure you don't want this to be published?"}).last();
        await dlg.waitFor({state: 'visible', timeout: T});
        const ur = page.waitForResponse((r) => r.url().includes('/unpublish') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
        const u = await ur;
        await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page);
        await snap('03-unpublished');
        fact('3-unpublish', {status: u ? u.status() : null});

        // 4. "Contributors" › "Add Contributor": Alan Mwandenga.
        await page.goto(wfUrl('titleAbstract')); await idle(page); await pause(800);
        const link = page.getByRole('link', {name: 'Contributors', exact: true}).last();
        await link.waitFor({state: 'visible', timeout: T});
        await link.click(); await idle(page); await pause(800);
        const add = wf().getByRole('button', {name: 'Add Contributor', exact: true}).first();
        await add.waitFor({state: 'visible', timeout: T});
        await add.click();
        const d = page.getByRole('dialog').filter({has: page.locator('input[name="givenName-en"]')}).last();
        await d.waitFor({state: 'visible', timeout: T});
        await idle(page); await pause(600);
        // main asks a Contributor Type first ("Person"); 3.5 has none.
        const person = d.getByRole('radio', {name: 'Person', exact: true});
        if ((await person.count()) && !(await person.isChecked())) { await person.check(); await pause(400); }
        await d.locator('input[name="givenName-en"]').fill('Alan');
        await d.locator('input[name="familyName-en"]').fill('Mwandenga');
        await d.locator('input[name="email"]').fill('u13ojs4@mailinator.com');
        await d.locator('select[name="country"]').selectOption({label: 'Canada'});
        // Contributor Roles: "Author" (main: a checkbox; 3.5: a radio).
        const author = d.getByRole('checkbox', {name: 'Author', exact: true});
        const authorRadio = d.getByRole('radio', {name: 'Author', exact: true});
        if (await author.count()) { if (!(await author.isChecked())) await author.check(); } else if (await authorRadio.count()) await authorRadio.check();
        await snap('04-contributor-form');
        const saved = page.waitForResponse((r) => r.url().includes('/contributors') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const cr = await saved;
        await d.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page); await pause(500);
        await snap('04-contributor-saved');
        fact('4-contributor', {status: cr ? cr.status() : null,
            db: q(`select string_agg(s1.setting_value||' '||s2.setting_value, ', ' order by a.seq) from authors a join author_settings s1 on s1.author_id=a.author_id and s1.setting_name='givenName' and s1.locale='en' join author_settings s2 on s2.author_id=a.author_id and s2.setting_name='familyName' and s2.locale='en' where a.publication_id=${pubId}`)});

        // 5. Publish again.
        await page.goto(wfUrl('titleAbstract')); await idle(page);
        await wf().locator('input[name^="prefix"]').first().waitFor({state: 'visible', timeout: T});
        const pbName = /^(Schedule For Publication|Publish)$/;
        const right = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: pbName}).filter({visible: true});
        const pb = (await right.count()) ? right.first() : wf().getByRole('button', {name: pbName}).filter({visible: true}).last();
        await pb.waitFor({state: 'visible', timeout: T});
        await pause(800);
        const pbText = (await pb.innerText()).trim();
        await pb.click(); await idle(page);
        const panel = page.getByRole('dialog').filter({hasText: /Review Publishing Details|requirements have been met|Are you sure you want to publish this\?/}).last();
        const go = panel.getByRole('button', {name: /^(Confirm|Publish)$/}).last();
        await go.waitFor({state: 'visible', timeout: T})
            .catch(async (e) => { await snap('05-publish-dialog-missing'); throw e; });
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = panel.locator(sel);
            if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
        }
        const panelText = (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 600);
        await snap('05-publish-dialog');
        let answered = false;
        const pr = page.waitForResponse((r) => /\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T})
            .then((r) => { answered = true; return r; }).catch(() => null);
        const confirms = page.getByRole('dialog').filter({hasText: /Are you sure you want to publish this\?/});
        const before = await confirms.count();
        await go.click();
        for (let t = Date.now(); !answered && Date.now() - t < T && (await confirms.count()) <= before;) await pause(200);
        let confirm2 = null;
        if (!answered && (await confirms.count()) > before) {
            const conf = confirms.last();
            confirm2 = (await conf.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 200);
            await conf.getByRole('button', {name: 'Publish', exact: true}).last().click();
        }
        const p = await pr;
        await idle(page);
        await snap('05-published');
        fact('5-publish', {button: pbText, panel: panelText, confirm: confirm2, status: p ? p.status() : null,
            db: q(`select status||' issue '||coalesce(issue_id::text,'-') from publications where publication_id=${pubId}`)});

        // 6–7. Signed out: the two article pages.
        await signOut(page);
        for (const [n, label, sid] of [['06', 'article-1', 1], ['07', 'article-17', 17]]) {
            const from = logSize();
            const r = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${sid}`));
            await idle(page);
            await pause(300);
            const s = await screen(page); record(`${n}-${label}`, s); await shot(page, `${n}-${label}`);
            const section = page.locator('#articlesBySameAuthorList');
            fact(`${n.slice(1)}-${label}`, {
                url: page.url(), status: r ? r.status() : null, title: await page.title(),
                headingShown: (s.text.main || '').includes(HEADING),
                section: (await section.count()) ? (await section.innerText()).replace(/\s+/g, ' ').trim().slice(0, 400) : null,
                serverLog: logSince(from),
            });
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
