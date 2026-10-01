// Issue walk for spec U50 register A10 (an article dropped under another section in
// "Order" snapping back). NOT REPRODUCED on main 2026-10-01 (w40): the row floats over
// "Reviews" while dragged, but its placeholder never leaves "Articles" and the row lands
// back there on release; "Done" posts it under section 1 (lib/pkp OrderCategoryGridItemsFeature.js
// makes one jQuery UI sortable per section block, without connectWith). No report written.
// Takes the steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"), through the screens, OJS only
// (OMP and OPS have no issues). The kit builds nothing.
//   The dataset's current issue "Vol. 1 No. 2 (2014)" lists submissions 1 and 17
//   under "Articles"; submission 9 "Hansen & Pinto: Reason Reclaimed" is in
//   Production, section "Reviews", in no issue.
//   1    sign in as dbarnes.
//   2-3  submission 9 › "Publication Settings": "Vol. 1 No. 2 (2014)", "Save";
//        "Publish" (› "Confirm") › "Publish".
//   4    Issues › Back Issues › "Vol. 1 No. 2 (2014)" › "Table of Contents".
//   5    "Order"; submission 17's row dragged below "Hansen & Pinto: Reason
//        Reclaimed", under "Reviews".
//   6    "Done" (the request the page sends is recorded).
//   7    the window closed, the tab opened again.
//   8    signed out: the issue's page.
//   9    dbarnes: submission 17's "Publication Settings", its "Section".
// Pass `within` as the script's argument for the neighbour check instead of
// steps 5-9: "Order", submission 17 dragged above submission 1 within "Articles",
// "Done", the tab reopened and the issue's page: the order must hold, fix in or out.
// Database reads (publications' section_id and seq) are evidence only.
//
// Reset first:  npm run fleet-prep -- --feature issues-w40 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-w40 PROBE_AGENT=w40 node bin/probe.js ojs shared/playwright/checks/issues/toc-article-other-section-snaps-back/walk.js
// Neighbour:    PROBE_RUN=nb PROBE_FEATURE=issues-w40 PROBE_AGENT=w40 node bin/probe.js ojs <this file> within
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w40-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w40-3_5 PROBE_AGENT=w40 node bin/probe.js ojs <this file>
// Facts: .reports/<feature>/w40/facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const ISSUE = 'Vol. 1 No. 2 (2014)';
const S1 = 'Signalling Theory Dividends';
const S9 = 'Hansen & Pinto: Reason Reclaimed';
const S17 = 'Antimicrobial, heavy metal resistance';
const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('within') ? 'within' : 'steps';
// `redrive`: the cross-section drag taken by the row's move handle in 15 pointer moves to 6 px
// below the target row, as the spec's first probe took it (footnote f-a10), with a shot mid-drag.
const REDRIVE = ARGS.includes('redrive');

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no issues in this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const q = (s) => (sql(app, s) || '').trim();
    const pubs = () => q(`select 'sub '||s.submission_id||' pub '||p.publication_id||' status '||p.status||' issue '||coalesce(p.issue_id::text,'-')||' section '||p.section_id||' seq '||p.seq from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id in (1,9,17) order by 1`).split('\n');
    const issueId = q(`select issue_id from issues where volume=1 and number='2' and year=2014`);
    const pubOf = (sub) => q(`select current_publication_id from submissions where submission_id=${sub}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null, mode: MODE, issueId, pubs: pubs()});

    const {page, close} = await launch(app);
    const cu = (p = '') => app.url(`/index.php/${app.contextPath}${p}`);
    const go = async (u) => { const r = await page.goto(u).catch((e) => ({err: flat(e.message, 200)})); await idle(page).catch(() => {}); return r && typeof r.status === 'function' ? r.status() : r; };
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    // main names the version in the menu key (publication_<id>_issue); 3.5 does not.
    const menuKey = (sub, key) => (app.line === 'stable-3_5_0' ? `publication_${key}` : `publication_${pubOf(sub)}_${key}`);
    const wfUrl = (sub, key) => cu(`/dashboard/editorial?workflowSubmissionId=${sub}${key ? `&workflowMenuKey=${menuKey(sub, key)}` : ''}`);
    let n = 0;
    const snap = async (label, extra) => {
        let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: flat(e.message, 200)}; }
        if (extra) s.facts = extra;
        const name = `${MODE === 'within' ? 'nb-' : ''}${REDRIVE ? 'rd-' : ''}${String(++n).padStart(2, '0')}-${label}`;
        record(name, s); await shot(page, name).catch(() => {});
        return s;
    };

    // The TOC grid as the screen shows it: section headings and article rows, in order.
    const readToc = (tp) => tp.locator('table tbody tr').evaluateAll((trs) => trs
        .filter((tr) => tr.getClientRects().length && !tr.classList.contains('row_controls') && !tr.closest('tbody.empty'))
        .map((tr) => `${tr.classList.contains('category') ? '## ' : '   '}${tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 70)}`)
        .filter((x) => x.trim()));
    async function openToc(label) {
        await go(cu('/manageIssues'));
        await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
        const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
        await panel.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(500);
        await panel.getByRole('link', {name: ISSUE, exact: true}).first().click();
        const dlg = page.getByRole('dialog', {name: /^Issue Management/});
        await dlg.waitFor({timeout: T}); await idle(page); await pause(500);
        await dlg.getByRole('tab', {name: 'Table of Contents', exact: true}).click(); await idle(page);
        const tp = dlg.getByRole('tabpanel', {name: 'Table of Contents'});
        await tp.locator('table').first().waitFor({timeout: T});
        await idle(page); await pause(800);
        const toc = await readToc(tp);
        await snap(label, {toc});
        return {dlg, tp, toc};
    }
    const rowOf = (tp, title) => tp.locator('tr.gridRow').filter({hasText: title}).first();
    const headingOf = (tp, name) => tp.locator('tr.category').filter({hasText: name}).first();
    // A mouse drag: press on the moving row, then down (or up) past the target row's middle.
    async function drag(tp, movingTitle, target, where) {
        const mb = await rowOf(tp, movingTitle).boundingBox();
        const tb = await target.boundingBox();
        const x = mb.x + 60;
        const ty = where === 'below' ? tb.y + tb.height - 3 : tb.y + 3;
        await page.mouse.move(x, mb.y + mb.height / 2);
        await page.mouse.down();
        await page.mouse.move(x, mb.y + mb.height / 2 + (where === 'below' ? 6 : -6), {steps: 4});
        await page.mouse.move(x, ty, {steps: 25});
        await page.mouse.move(x, ty + (where === 'below' ? 6 : -6), {steps: 6});
        await pause(300);
        await page.mouse.up();
        await pause(600);
    }
    async function issuePage(label) {
        const status = await go(cu(`/issue/view/${issueId}`));
        await snap(label);
        const toc = await page.evaluate(() => {
            const f = (x) => (x || '').replace(/\s+/g, ' ').trim();
            return [...document.querySelectorAll('.obj_issue_toc .sections .section')].map((sec) => ({
                heading: f(sec.querySelector('h2')?.innerText) || null,
                articles: [...sec.querySelectorAll('.obj_article_summary .title')].map((a) => f(a.innerText).slice(0, 60)),
            }));
        }).catch((e) => ({error: flat(e.message, 200)}));
        return {status, toc};
    }

    try {
        // 1. dbarnes.
        await signIn(page, 'dbarnes');

        if (MODE === 'steps' || MODE === 'within') {
            // 2. Submission 9 › Publication Settings: Assign To Current/Back Issue, "Vol. 1 No. 2 (2014)", Save.
            await go(wfUrl(9, 'issue'));
            await wf().waitFor({timeout: T});
            const assign = wf().locator('input[name="assignment"]');
            await assign.first().or(wf().getByRole('button', {name: 'Change Issue', exact: true})).first().waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(800);
            const radios = await assign.evaluateAll((els) => els.map((r) => ({value: r.value, checked: r.checked, label: (r.closest('label')?.innerText || '').replace(/\s+/g, ' ').trim()})));
            const sectionBefore = await wf().locator('select[name="sectionId"]').evaluate((s) => s.options[s.selectedIndex]?.text).catch(() => null);
            await snap('publication-settings', {radios, sectionBefore});
            let saveIn = wf();
            if (radios.length) {
                const back = radios.find((r) => /Back Issue/i.test(r.label)) || radios.find((r) => /Current/i.test(r.label));
                await wf().getByRole('radio', {name: back.label}).check();
                await idle(page); await pause(600);
                const sel = wf().locator('select[name="issueId"]');
                await sel.waitFor({state: 'visible', timeout: T});
                await pause(500);
                await sel.selectOption({label: ISSUE});
            } else {
                // 3.5: the "Issue" line's "Change Issue" opens a window with the "Issue" select.
                await wf().getByRole('button', {name: 'Change Issue', exact: true}).click();
                saveIn = page.locator('[role="dialog"]:visible').filter({has: page.locator('select[name="issueId"]')}).last();
                await saveIn.locator('select[name="issueId"]').waitFor({state: 'visible', timeout: T});
                await idle(page); await pause(500);
                await saveIn.locator('select[name="issueId"]').selectOption({label: ISSUE});
            }
            await snap('assigned');
            const sv = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await saveIn.getByRole('button', {name: 'Save', exact: true}).last().click();
            const svr = await sv;
            await idle(page); await pause(800);
            await snap('saved');
            fact('2-save', {radios, sectionBefore, status: svr ? svr.status() : null, pubs: pubs()});

            // 3. Publish (› Review Publishing Details › Confirm) › Publish.
            const pbName = /^(Schedule For Publication|Publish)$/;
            const right = controls().getByRole('button', {name: pbName}).filter({visible: true});
            const pb = (await right.count()) ? right.first() : wf().getByRole('button', {name: pbName}).filter({visible: true}).last();
            await pb.waitFor({state: 'visible', timeout: T});
            const pbLabel = flat(await pb.innerText(), 60);
            await pause(800);
            await pb.click();
            // "Review Publishing Details" (a side window; its version stage arrives empty on an
            // unassigned version) › "Confirm", then the publish window.
            const rpd = page.getByRole('dialog', {name: 'Review Publishing Details'});
            const win = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|schedule)|requirements have been met/}).last();
            await rpd.or(win).first().waitFor({state: 'visible', timeout: T});
            await idle(page); await pause(1000);
            let versionStage = null;
            if (await rpd.isVisible().catch(() => false)) {
                await pause(1500);
                for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'true']]) {
                    const el = rpd.locator(sel);
                    if ((await el.count()) && !(await el.inputValue().catch(() => ''))) { await el.selectOption(val).catch(() => {}); if (sel.includes('Stage')) versionStage = val; }
                }
                await snap('review-publishing-details');
                await rpd.getByRole('button', {name: 'Confirm', exact: true}).click();
                await win.waitFor({timeout: T});
                await idle(page); await pause(800);
            }
            const winText = flat(await win.innerText().catch(() => null), 600);
            await snap('publish-window');
            const pr = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await win.getByRole('button', {name: /^(Publish|Schedule For Publication|Schedule)$/}).last().click();
            const p = await pr;
            await page.getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
            await idle(page); await pause(800);
            await snap('published');
            fact('3-publish', {button: pbLabel, versionStage, window: winText, status: p ? p.status() : null, pubs: pubs()});
        }

        // 4. The issue's Table of Contents.
        let {dlg, tp, toc} = await openToc('toc');
        fact('4-toc', toc);

        // 5. "Order", then the drag.
        await tp.locator('.pkp_linkaction_orderItems').first().click(); await pause(800);
        await snap('ordering');
        if (MODE === 'within') {
            await drag(tp, S17, rowOf(tp, S1), 'above');
        } else if (REDRIVE) {
            const src = rowOf(tp, S17);
            const handle = src.locator('.pkp_helpers_move_handle, .ordering_handle, [class*="move"], [class*="handle"]').first();
            const hs = (await handle.count()) ? handle : src;
            const a = await hs.boundingBox();
            const b = await rowOf(tp, S9).boundingBox();
            await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
            await page.mouse.down();
            const ty = b.y + b.height + 6;
            for (let i = 1; i <= 15; i++) { await page.mouse.move(a.x + a.width / 2, a.y + (ty - a.y) * (i / 15)); await pause(40); }
            await pause(200);
            await snap('mid-drag', {toc: await readToc(tp)});
            await page.mouse.up();
            await pause(500);
        } else {
            await drag(tp, S17, rowOf(tp, S9), 'below');
        }
        // Which section's block (tbody) holds each article row now, as the page's own DOM says.
        fact('5-row-blocks', await tp.locator('table tbody').evaluateAll((tbs) => tbs.filter((tb) => tb.getClientRects().length).map((tb) => ({id: tb.id, rows: [...tb.querySelectorAll('tr.gridRow')].filter((tr) => tr.getClientRects().length).map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 30))}))));
        const afterDrop = await readToc(tp);
        await snap('dropped', {toc: afterDrop});
        fact('5-after-drop', afterDrop);

        // 6. "Done": the request the page sends, and its answer.
        let posted = null;
        const onReq = (r) => { if (/save-sequence|saveSequence/.test(r.url())) posted = r.postData(); };
        page.on('request', onReq);
        const dw = page.waitForResponse((r) => /save-sequence|saveSequence/.test(r.url()), {timeout: T}).catch(() => null);
        await tp.locator('.order_finish_controls .saveButton').first().click();
        const dr = await dw;
        await idle(page); await pause(1000);
        page.off('request', onReq);
        const afterDone = await readToc(tp);
        await snap('done', {toc: afterDone});
        let data = null; try { data = JSON.parse(decodeURIComponent((/(?:^|&)data=([^&]*)/.exec(posted || '') || [])[1] || '').replace(/\+/g, ' ')); } catch { data = posted; }
        fact('6-done', {status: dr ? dr.status() : null, body: dr ? flat(await dr.text().catch(() => null), 200) : null, data, toc: afterDone, pubs: pubs()});

        // 7. The window closed, the tab opened again.
        await dlg.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
        await pause(600);
        ({tp, toc} = await openToc('toc-reopened'));
        fact('7-toc-reopened', toc);

        // 8. Signed out: the issue's page.
        await signOut(page);
        fact('8-issue-page', await issuePage('issue-page'));

        // 9. dbarnes: submission 17's "Publication Settings", its "Section".
        await signIn(page, 'dbarnes');
        await go(wfUrl(17, 'issue'));
        await wf().waitFor({timeout: T});
        const sec = wf().locator('select[name="sectionId"]');
        await sec.waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page); await pause(800);
        const section17 = await sec.evaluate((s) => s.options[s.selectedIndex]?.text).catch(() => null);
        await snap('section-17', {section17});
        fact('9-section-17', {section17, pubs: pubs()});
    } finally {
        record(`facts${MODE === 'within' ? '-nb' : ''}${REDRIVE ? '-rd' : ''}`, facts);
        await close();
    }
});
