// Issue report walk: docs/issues/U13-OJS9-lens-reader-formulas-not-shown.md
// (spec U13 register OJS9). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no eLife Lens reader): the editor `dbarnes`
// unpublishes submission 17, adds a galley "XML" with a JATS file holding
// formulas, publishes it again; then a signed-out visitor opens the article
// from "Vol. 1 No. 2 (2014)" and presses "XML". The Lens page is read: its
// script errors, the formulas' elements (MathJax output, untypeset TeX
// scripts, bare MathML) and the text of each formula's block.
//
// Arguments (after the script):
//   (none)      the Steps, with ./article-formulas.xml (inline TeX, a MathML
//               and a TeX display formula).
//   neighbour   the fix check: the same with ./article-prices.xml (no
//               formula; a sentence with "$5" and "$10"), which must show
//               verbatim, with no math and no script error.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/lens-reader-formulas-not-shown/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const FILE = MODE === 'steps' ? 'article-formulas.xml' : 'article-prices.xml';
const T = 30_000;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const SUBMISSION = 17;
const ARTICLE = 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no eLife Lens reader on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const cp = app.contextPath;
    const ctx = `/index.php/${cp}/en`;
    const label = `ojs9-${MODE}`;
    const facts = {mode: MODE, file: FILE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };

    const {page, close} = await launch(app);
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(flat(e.message, 300)));
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const publicationId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${SUBMISSION}`));

    try {
        // 1. dbarnes
        await signIn(page, 'dbarnes', {contextPath: cp});
        fact('signed-in', here());
        // 2. submission 17, Publication > Galleys
        const frame = new WorkflowPage(page, cp);
        const galleys = new GalleyManager(page, frame);
        await galleys.open(SUBMISSION, publicationId).catch(async (e) => {
            fact('galleys-by-menu', String(e.message).split('\n')[0].slice(0, 160));
            await frame.dialog().getByRole('navigation').getByText('Galleys', {exact: true}).first().click();
            await idle(page); await pause(800);
            await galleys.table().waitFor({timeout: T});
        });
        await idle(page); await pause(500);
        await snap('galleys');
        // 3. "Unpublish"
        await frame.controlsRight().getByRole('button', {name: 'Unpublish', exact: true}).click();
        const q = page.getByRole('dialog').filter({hasText: "Are you sure you don't want this to be published?"});
        const un = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
        await q.getByRole('button', {name: 'Unpublish', exact: true}).click();
        const u = await un; await idle(page); await pause(800);
        fact('unpublish', u ? u.status() : null);
        // 4. "Add galley" "XML", the JATS file as "Article Text"
        await galleys.addGalley({label: 'XML', component: 'Article Text', file: path.join(__dirname, FILE), name: FILE});
        await idle(page); await pause(500);
        fact('galleys-after-add', await galleys.labels().catch((e) => String(e).slice(0, 200)));
        await snap('galley-added');
        // 5. "Schedule For Publication" (main: "Review Publishing Details", "Confirm"; 3.5: the question at once), "Publish"
        const statusAnswer = page.waitForResponse((x) => x.url().includes('/issueAssignmentStatus'), {timeout: 20_000}).catch(() => null);
        await frame.controlsRight().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first().click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirmQ = page.getByRole('dialog').filter({hasText: /Are you sure you want to publish this\?|All publication requirements have been met/}).last();
        const confirmBtn = panel.getByRole('button', {name: 'Confirm', exact: true});
        await confirmBtn.or(confirmQ).first().waitFor({timeout: T});
        await idle(page); await pause(500);
        if (await confirmBtn.isVisible()) {
            await statusAnswer;
            await pause(800);
            for (const [sel, val] of [['versionStage', 'VoR'], ['versionIsMinor', 'false']]) {
                const box = panel.locator(`select[name="${sel}"]`);
                if (await box.count()) await box.selectOption(val);
            }
            fact('panel-issue-as-opened', await panel.locator('select[name="issueId"]').evaluate((e) => (e.selectedOptions[0] ? e.selectedOptions[0].textContent.trim() : null), null, {timeout: 2000}).catch(() => null));
            await snap('publish-panel');
            await confirmBtn.click();
            await confirmQ.waitFor({timeout: T});
        }
        const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
        await confirmQ.getByRole('button', {name: 'Publish', exact: true}).click();
        const r = await done;
        await frame.controlsRight().getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        fact('publish', r ? r.status() : null);
        fact('stored-galleys', sql(app, `SELECT g.galley_id || ' ' || g.label || ' status=' || p.status FROM publication_galleys g JOIN publications p ON p.publication_id = g.publication_id WHERE p.submission_id = ${SUBMISSION} ORDER BY 1`).split('\n'));
        await signOut(page);

        // 6. signed out: Archives, the issue, the article
        await page.goto(app.url(`${ctx}/issue/archive`));
        await idle(page);
        await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
        await page.waitForLoadState('load'); await idle(page);
        await page.locator('.obj_article_summary .title a').filter({hasText: ARTICLE}).first().click();
        await page.waitForLoadState('load'); await idle(page);
        const links = await page.locator('.pkp_structure_main a.obj_galley_link').allInnerTexts();
        fact('article-galley-links', links.map((l) => flat(l)));
        await snap('article-page');

        // 7. "XML"
        pageErrors.length = 0;
        await page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: /^\s*XML\s*$/}).first().click();
        await page.waitForLoadState('load');
        fact('lens-page', here());
        await page.getByText('The end of the section.').first().waitFor({timeout: T}).catch(() => fact('lens-text-wait', 'timed out'));
        await pause(5000); // MathJax's own typesetting, when it runs
        await idle(page).catch(() => {});
        const lens = await page.evaluate(() => {
            const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
            const mj = window.MathJax;
            return {
                mathJax: mj ? {version: mj.version || null, hasHub: !!mj.Hub, hasTypesetPromise: typeof mj.typesetPromise === 'function', keys: Object.keys(mj).slice(0, 12)} : null,
                mathJaxOutput: document.querySelectorAll('mjx-container, .MathJax, .MathJax_Display').length,
                untypesetTexScripts: Array.from(document.querySelectorAll('script[type^="math/tex"]')).map((s) => s.type + ': ' + s.textContent),
                bareMathML: Array.from(document.querySelectorAll('math')).filter((m) => !m.closest('mjx-container, mjx-assistive-mml')).map((m) => ({visible: vis(m), text: m.textContent})),
                formulaBlocks: Array.from(document.querySelectorAll('.content-node.formula, .formula')).filter((e) => !e.parentElement.closest('.formula')).map((e) => ({
                    className: e.className, inline: e.classList.contains('inline'), text: (e.innerText || '').replace(/\s+/g, ' ').trim(), height: Math.round(e.getBoundingClientRect().height),
                    typeset: e.querySelectorAll('mjx-container, .MathJax').length,
                })),
                paragraphs: Array.from(document.querySelectorAll('.content-node.paragraph, .content-node.text')).map((p) => (p.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12),
                tabs: Array.from(document.querySelectorAll('.context-toggle, .toggle-context, .menu-bar a, .menu-bar .context-toggle')).map((a) => (a.innerText || '').trim()).filter(Boolean),
            };
        });
        fact('lens', lens);
        fact('page-errors', [...pageErrors]);
        await snap('lens-reader', {walk: {lens, pageErrors: [...pageErrors]}});
        await shot(page, `${label}-lens-reader`);
        const first = page.locator('.content-node.formula, .formula').first();
        if (await first.count()) {
            await first.scrollIntoViewIfNeeded().catch(() => {});
            await shot(page, `${label}-lens-formula`);
        }
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
});
