// The Steps of two issue report walks, both on a dataset fleet (PKP's
// default test dataset, harness.md "Dataset fleets"), OJS only (OMP and OPS
// have no subscriptions):
//   docs/issues/U51-A14-restrict-only-pdf-html-galley-refused.md
//     (spec U51 register A14): ./walk.js
//   docs/issues/U51-A18-additional-file-no-padlock.md
//     (spec U51 register A18): ../additional-file-no-padlock/walk.js
//
// Parts (the walk scripts pick them; step numbers are each report's):
//   subscription  the editor `dbarnes` makes `publicknowledge` require
//                 subscriptions (A14 step 2, A18 step 2).
//   payments      A14 steps 3-4: payments on with "Manual Fee Payment", and
//                 "Only Restrict Access to PDF version of issues and
//                 articles" ticked on "Payment Types", no fee.
//   issue         the issue "Vol. 1 No. 2 (2014)" set to "Subscription"
//                 (A14 step 5, A18 step 3).
//   issue-html    A14 step 6: an issue galley "HTML".
//   article-html  A14 steps 7-9: submission 17 unpublished, a galley "HTML"
//                 added, published again.
//   article-data  A18 steps 4-6: the same with a galley "Data" (a text
//                 file as "Data Set", so it lists under "Additional Files").
//   visitor       signed out: the article page's links read, each galley
//                 pressed ("HTML" or "Data", then "PDF"), then the issue
//                 page's "Full Issue" links read and pressed.
//   reader        the same reads and presses, signed in as `ccorino` (Author
//                 and Reader of the journal, no subscription).
//   no-galley     neighbour, A14 fix: a signed-out visitor opens the issue's
//                 download address without a galley id (issue/download/1).
//   untick        neighbour, A14: the box unticked again before the visitor.
//   open-issue    neighbour, A18: the issue set back to "Open access" before
//                 the visitor.
// The kit builds nothing. Every screen is recorded with screen(); each
// press's status, landing and heading, and the new lines of the fleet's
// server log after it, go into the facts.
const fs = require('fs');
const path = require('path');
const {launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const SUBMISSION = 17;
const ARTICLE = 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms';
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const ONLY_PDF = 'Only Restrict Access to PDF version of issues and articles';
const FILES = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

async function walk(app, parts, label) {
    if (app.name !== 'ojs') {
        console.log(`[${app.name}] no subscriptions on this app; nothing to walk`);
        return;
    }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, GLYPH} = require('../../../pages/SubscriptionsPages.js');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const cp = app.contextPath;
    const ctx = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? `/index.php/${cp}` : `/index.php/${cp}/en`;
    const facts = {label, parts, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${label}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const h1 = () => page.locator('.pkp_structure_main h1, main h1').first().innerText({timeout: 3000}).then(flat).catch(() => null);
    const publicationId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${SUBMISSION}`));

    /** Press a link that loads a page: status, landing, heading, the login message, the server log. */
    async function press(name, locator) {
        const from = logSize();
        // A non-PDF issue galley is served as a file (a download), not a page.
        const href = await locator.getAttribute('href');
        const answer = page.waitForResponse((r) => r.url() === href || r.url().startsWith(href), {timeout: 10_000}).catch(() => null);
        const download = page.waitForEvent('download', {timeout: 10_000}).catch(() => null);
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: 10_000}).catch(() => null);
        await locator.click();
        const [resp, dl, first] = await Promise.all([nav, download, answer]);
        await idle(page).catch(() => {});
        const out = {status: resp ? resp.status() : null, landed: here(), h1: await h1()};
        if (first) out.firstAnswer = {status: first.status(), location: first.headers()['location'] || null, disposition: first.headers()['content-disposition'] || null};
        if (dl) out.download = dl.suggestedFilename();
        out.message = flat(await page.locator('.pkp_structure_main .cmp_notification, .pkp_structure_main p.page_message, .page_login .cmp_notification').first().innerText({timeout: 1500}).catch(() => null), 400) || null;
        out.galleyViewer = await page.locator('iframe#htmlGalleyFrame, iframe[name="htmlFrame"], .galley_view iframe, #pdfCanvasContainer').count();
        await pause(300);
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }
    /** A galley link as the visitor sees it: classes, its glyph, the screen-reader words. */
    async function readLink(link) {
        if (!(await link.count())) return null;
        const first = link.first();
        const icon = await first.evaluate((a) => {
            const pick = (p) => { const c = getComputedStyle(a, p).content; return !c || c === 'none' || c === 'normal' ? '' : c.replace(/^["']|["']$/g, ''); };
            return {before: pick('::before'), after: pick('::after')};
        });
        const glyph = (g) => (g === GLYPH.lock ? 'lock' : g === GLYPH.pdf ? 'file-pdf' : g ? `U+${g.codePointAt(0).toString(16).toUpperCase()}` : '');
        return {
            className: await first.getAttribute('class'),
            text: flat(await first.innerText()),
            screenReader: flat(await first.locator('.pkp_screen_reader').innerText({timeout: 1000}).catch(() => '')),
            iconBefore: glyph(icon.before),
            iconAfter: glyph(icon.after),
            shownIcon: glyph(icon.before) || glyph(icon.after),
            href: (await first.getAttribute('href') || '').replace(app.baseURL, ''),
        };
    }

    try {
        // ------------------------------------------------------------ the editor
        const editor = parts.some((p) => ['subscription', 'payments', 'issue', 'issue-html', 'article-html', 'article-data', 'untick', 'open-issue'].includes(p));
        if (editor) {
            await signIn(page, 'dbarnes', {contextPath: cp});
            fact('signed-in', here());
        }
        const access = new AccessSettings(page, cp);
        if (parts.includes('subscription')) {
            await access.goto();
            await access.modeRadio(SUB_MODE).check();
            fact('access-save', (await access.save()).status());
            await snap('access-saved');
        }
        if (parts.includes('payments')) {
            await access.goto();
            await page.getByRole('tab', {name: 'Payments', exact: true}).click();
            await idle(page); await pause(500);
            const pay = page.getByRole('tabpanel', {name: 'Payments', exact: true});
            await pay.locator('input[name="paymentsEnabled"]').first().check();
            await pause(300);
            await pay.locator('select[name="currency"]').first().selectOption({label: 'US Dollar'});
            await pay.locator('select[name="paymentPluginName"]').first().selectOption({label: 'Manual Fee Payment'});
            await pause(400);
            await pay.locator('textarea[name^="manualInstructions"], input[name^="manualInstructions"]').first().fill('Pay by bank transfer.');
            const rs = page.waitForResponse((x) => /\/_payments/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await pay.getByRole('button', {name: 'Save', exact: true}).first().click();
            const r = await rs; await idle(page); await pause(500);
            fact('payments-save', r ? r.status() : null);
            await snap('payments-saved');
        }
        const paymentTypes = async (tick, name) => {
            const payments = new PaymentsPage(page, cp);
            await payments.gotoTab('Payment Types');
            const panel = payments.panel('Payment Types');
            const box = panel.getByRole('checkbox', {name: ONLY_PDF, exact: true});
            if (tick) await box.check(); else await box.uncheck();
            const fees = {};
            for (const f of ['purchaseIssueFee', 'purchaseArticleFee', 'membershipFee']) fees[f] = await panel.locator(`input[name="${f}"]`).inputValue().catch(() => null);
            const rs = page.waitForResponse((x) => /savePaymentTypes/.test(x.url()), {timeout: T}).catch(() => null);
            await panel.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await rs; await idle(page); await pause(500);
            fact(`${name}-save`, {status: r ? r.status() : null, fees, checked: await box.isChecked()});
            await snap(name);
        };
        if (parts.includes('payments')) await paymentTypes(true, 'payment-types-only-pdf');

        const issueAccess = async (status, name) => {
            const issues = new IssuesAdmin(page, cp);
            await issues.goto('Back Issues');
            const win = await issues.openManagement('Back Issues', ISSUE);
            const form = await win.openAccess();
            await form.locator('select#accessStatus').selectOption({label: status});
            const rs = page.waitForResponse((x) => /update-access|updateAccess/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await rs; await idle(page); await pause(500);
            fact(`${name}-save`, r ? r.status() : null);
            await snap(name);
            return win;
        };
        if (parts.includes('issue')) {
            const win = await issueAccess('Subscription', 'issue-access-subscription');
            await win.close().catch(() => {});
            if (parts.includes('issue-html')) {
                const issues = new IssuesAdmin(page, cp);
                await issues.goto('Back Issues');
                const win2 = await issues.openManagement('Back Issues', ISSUE);
                await win2.openTab('Issue Galleys');
                const g = await win2.openCreateGalley();
                await g.labelBox().fill('HTML');
                const up = await g.upload(path.join(FILES, 'article.html'));
                fact('issue-galley-upload', up ? up.status() : null);
                const saved = await g.save();
                fact('issue-galley-save', saved ? saved.status() : null);
                await snap('issue-galley-html');
                await win2.close().catch(() => {});
            }
        }

        const addArticleGalley = async (galleyLabel, component, file) => {
            const frame = new WorkflowPage(page, cp);
            const galleys = new GalleyManager(page, frame);
            await galleys.open(SUBMISSION, publicationId).catch(async (e) => {
                // 3.5 names the page's menu key otherwise: the side menu's "Galleys"
                fact('galleys-by-menu', String(e.message).split('\n')[0].slice(0, 160));
                await snap('workflow-35');
                await frame.dialog().getByRole('navigation').getByText('Galleys', {exact: true}).first().click();
                await idle(page); await pause(800);
                await galleys.table().waitFor({timeout: T});
            });
            await idle(page); await pause(500);
            // "Unpublish" and its question
            await frame.controlsRight().getByRole('button', {name: 'Unpublish', exact: true}).click();
            const q = page.getByRole('dialog').filter({hasText: "Are you sure you don't want this to be published?"});
            const un = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
            await q.getByRole('button', {name: 'Unpublish', exact: true}).click();
            const u = await un; await idle(page); await pause(800);
            fact('unpublish', u ? u.status() : null);
            await snap('unpublished');
            // "Add galley"
            await galleys.addGalley({label: galleyLabel, component, file: path.join(FILES, file), name: file});
            await idle(page); await pause(500);
            fact('galleys-after-add', await galleys.labels().catch((e) => String(e).slice(0, 200)));
            await snap(`galley-${galleyLabel}`);
            // "Schedule For Publication": main opens "Review Publishing Details" (issue
            // assignment, "Confirm", then "Publish" in the question); 3.5 opens the
            // publish window at once.
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
                    fact(`panel-${sel}-as-opened`, await box.inputValue().catch(() => null));
                    await box.selectOption(val);
                }
                fact('panel-assignment-as-opened', await panel.locator('input[name="assignment"]:checked').getAttribute('value', {timeout: 2000}).catch(() => null));
                fact('panel-issue-as-opened', await panel.locator('select[name="issueId"]').evaluate((e) => (e.selectedOptions[0] ? e.selectedOptions[0].textContent.trim() : null), null, {timeout: 2000}).catch(() => null));
                const back = panel.getByRole('radio', {name: 'Assign To Current/Back Issue'});
                if (await back.count()) {
                    await back.check();
                    const issueSelect = panel.locator('select[name="issueId"]');
                    const option = issueSelect.locator('option').filter({hasText: ISSUE});
                    await option.first().waitFor({state: 'attached', timeout: T});
                    await issueSelect.selectOption(await option.first().getAttribute('value'));
                }
                await snap('publish-panel');
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                await confirmQ.waitFor({timeout: T});
            }
            await snap('publish-question');
            const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
            await confirmQ.getByRole('button', {name: 'Publish', exact: true}).click();
            const r = await done;
            await frame.controlsRight().getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
            await idle(page);
            fact('publish', r ? r.status() : null);
            await snap('published');
        };
        if (parts.includes('article-html')) await addArticleGalley('HTML', 'Article Text', 'article.html');
        if (parts.includes('article-data')) await addArticleGalley('Data', 'Data Set', 'not-an-image.txt');
        if (parts.includes('untick')) await paymentTypes(false, 'payment-types-unticked');
        if (parts.includes('open-issue')) { const w = await issueAccess('Open access', 'issue-access-open'); await w.close().catch(() => {}); }
        fact('stored', {
            publishingMode: sql(app, `SELECT setting_value FROM journal_settings WHERE setting_name = 'publishingMode'`),
            restrictOnlyPdf: sql(app, `SELECT setting_value FROM journal_settings WHERE setting_name = 'restrictOnlyPdf'`),
            fees: sql(app, `SELECT setting_name || '=' || setting_value FROM journal_settings WHERE setting_name IN ('purchaseArticleFee', 'purchaseIssueFee', 'membershipFee', 'paymentsEnabled', 'paymentPluginName')`).split('\n'),
            issue: sql(app, `SELECT access_status, open_access_date FROM issues WHERE issue_id = 1`),
            galleys: sql(app, `SELECT g.galley_id, g.label, p.status FROM publication_galleys g JOIN publications p ON p.publication_id = g.publication_id WHERE p.submission_id = ${SUBMISSION} ORDER BY 1`).split('\n'),
            issueGalleys: sql(app, `SELECT galley_id, label FROM issue_galleys ORDER BY 1`).split('\n'),
        });
        if (editor) await signOut(page);

        // ------------------------------------------------------------ the visitor, the reader
        // `who`: 'visitor' (signed out) or 'reader' (ccorino: Author and Reader, no subscription)
        const readSide = async (who) => {
            const openIssue = async () => {
                await page.goto(app.url(`${ctx}/issue/archive`));
                await idle(page);
                await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
                await page.waitForLoadState('load');
                await idle(page);
            };
            const openArticle = async () => {
                await openIssue();
                await page.locator('.obj_article_summary .title a').filter({hasText: ARTICLE}).first().click();
                await page.waitForLoadState('load');
                await idle(page);
            };
            await openArticle();
            const main = page.locator('.pkp_structure_main');
            const links = {};
            for (const l of ['PDF', 'HTML', 'Data']) {
                links[l] = await readLink(main.locator('a.obj_galley_link, a.obj_galley_link_supplementary').filter({hasText: new RegExp(`(^|\\s)${l}(\\s|$)`)}));
            }
            links.additionalFilesHeading = await main.locator('.supplementary_galleys_links').count();
            await snap(`${who}-article-page`, {walk: links});
            fact(`${who}-article-links`, links);
            for (const l of ['HTML', 'Data', 'PDF']) {
                if (!links[l]) continue;
                await openArticle();
                await press(`${who}-press-${l}`, main.locator('a.obj_galley_link, a.obj_galley_link_supplementary').filter({hasText: new RegExp(`(^|\\s)${l}(\\s|$)`)}).first());
            }
            await openIssue();
            const full = {};
            const issueGalleys = page.locator('.pkp_structure_main .galleys a.obj_galley_link');
            for (let i = 0; i < await issueGalleys.count(); i++) {
                const r = await readLink(issueGalleys.nth(i));
                full[r.text] = r;
            }
            await snap(`${who}-issue-page`, {walk: full});
            fact(`${who}-issue-full-links`, full);
            for (const key of Object.keys(full)) {
                const l = /HTML/.test(key) ? 'HTML' : /PDF/.test(key) ? 'PDF' : null;
                if (!l) continue;
                await openIssue();
                await press(`${who}-press-full-issue-${l}`, page.locator('.pkp_structure_main .galleys a.obj_galley_link').filter({hasText: new RegExp(`(^|\\s)${l}(\\s|$)`)}).first());
            }
                };
        if (parts.includes('visitor')) await readSide('visitor');
        if (parts.includes('reader')) {
            await signIn(page, 'ccorino', {contextPath: cp});
            fact('reader-signed-in', here());
            await readSide('reader');
            await signOut(page);
        }
        // Neighbour of the A14 fix: the issue's download address without a galley id, signed out.
        if (parts.includes('no-galley')) {
            const from = logSize();
            const resp = await page.goto(app.url(`${ctx}/issue/download/1`)).catch((e) => ({err: e.message}));
            await idle(page).catch(() => {});
            await pause(300);
            const out = {asked: `${ctx}/issue/download/1`, status: resp && resp.status ? resp.status() : resp, landed: here(), h1: await h1(), log: logSince(from)};
            out.text = flat(await page.locator('body').innerText({timeout: 2000}).catch(() => ''), 300);
            await snap('no-galley', {walk: out});
            fact('no-galley', out);
        }
    } finally {
        record(`${label}-facts`, facts);
        await close();
    }
}

module.exports = {walk};
