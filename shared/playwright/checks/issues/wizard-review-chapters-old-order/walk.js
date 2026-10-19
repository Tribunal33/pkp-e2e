// Issue report docs/issues/U72-A13-wizard-review-chapters-old-order.md (U72 A13): in the submission
// wizard of a press, a new order saved with "Order" and "Done" on the Details step, of the chapters
// or of a chapter's authors, does not reach the Review step's "Chapters" panel until the page is
// reloaded. Runs on PKP's default test dataset (OMP), press `publicknowledge`, freshly loaded.
// No argument (the report's Steps), as `aclark`:
//   1-2  "New Submission", "Submission Language" English, title "Tides and Harbours h19s", "Begin Submission"
//   3    "Continue" to "Contributors", "Add Contributor" Ben Barrow and Cy Marsh, "Continue" to "Review"
//        (3.5's wizard opens on "Details", then "Upload Files": "Continue" twice either way)
//   4    "Details": "Add Chapter" "Tides" (Ben Barrow, Cy Marsh ticked), "Harbours", "Estuaries"
//   5    "Review": the "Chapters" panel
//   6    "Details": "Order", Cy Marsh dragged above Ben Barrow under "Tides", "Done"
//   7    "Order", "Estuaries" dragged above "Tides", "Done"
//   8    "Review": the panel
//   9    "Details": "Add Chapter" "Deltas"
//   10   "Review": the panel
//   11   reload, "Continue" to "Review": the panel
// Each read records the Details list, the panel and what the database stores (stored()).
// Neighbour (`neighbour`; the fix in and out): the workflow's "Chapters" page, where "Done" also
// saves an order but no Review panel listens: as `dbarnes`, submission 12 "Connecting ICTs to
// Development", "Order", the last chapter dragged above the first, "Done", the list read at once
// and after a reload (the new order kept, no request failing, no page error).
// `galleys` (OPS; the same shape on a preprint server's galleys, the Cause's reach): as `ccorino`, "New
// Submission", English, title "Galleys h19s"; on "Upload Files" "Add File" "PDF" (a PDF uploaded as
// "Preprint Text"), then "Add File" "Poster" the same way; "Review": the "Files" panel; "Upload Files":
// "Order", "Poster" dragged above "PDF", "Done"; "Review": the panel; reload, "Review": the panel.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --apps omp --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/wizard-review-chapters-old-order/walk.js [neighbour]
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix / nb-in / nb-out for a fix trial)
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('./lib');

const MODE = ['neighbour', 'galleys'].find((m) => process.argv.includes(m)) || 'steps';
const TITLE = 'Tides and Harbours h19s';

forEachApp(async (app) => {
    if (app.name !== (MODE === 'galleys' ? 'ops' : 'omp')) return; // chapters are a press's, galleys a preprint server's
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const pageErrors = [];
    const {page, close} = await launch(app);
    page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 300)));
    const {ChapterList} = L.omp('ChapterPages.js');
    const list = new ChapterList(page);
    const step = async (n, what, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`step${n}.FAILED`, `${what}: ${String(e.stack || e).slice(0, 900)}`);
            await L.snap(page, `zz-failed-step${n}`);
            throw e;
        }
    };
    try {
        if (MODE === 'galleys') {
            const W = require(require('path').join(L.ROOT, 'apps/ops/playwright/pages/SubmissionWizardPages.js'));
            const grid = page.locator('[id^="component-grid-preprintgalleys-preprintgalleygrid"]').first();
            const rows = async () => grid.locator('tbody:not(.empty) tr.gridRow').evaluateAll((trs) => trs.filter((tr) => tr.getClientRects().length).map((tr) => ((tr.querySelector('td') || {}).innerText || '').replace(/\s+/g, ' ').trim()));
            const filesPanel = async () => {
                const p = page.locator('.submissionWizard__reviewPanel').filter({has: page.locator('h3').filter({hasText: /^\s*Files\s*$/})}).first();
                return (await p.count()) ? p.locator('li').evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim())) : null;
            };
            await signIn(page, 'ccorino', {contextPath: app.contextPath});
            await idle(page).catch(() => {});
            await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
            await idle(page);
            await W.beginSubmission(page, {title: 'Galleys h19s', language: 'English'});
            fact('submissionId', Number(new URL(page.url()).searchParams.get('id')));
            await W.addGalleyFile(page, {label: 'PDF'});
            await L.sleep(800);
            await W.addGalleyFile(page, {label: 'Poster'});
            await idle(page);
            fact('g.uploadFiles', await rows());
            await L.continueUntil(page, 'Review');
            fact('g.reviewBefore', await filesPanel());
            await L.toStep(page, 'Upload Files');
            await grid.evaluate((e) => e.scrollIntoView({block: 'center'}));
            const order = grid.locator('a.pkp_linkaction_orderItems:visible');
            fact('g.orderOffered', await order.count());
            if (await order.count()) {
                await order.click();
                const doneLink = grid.locator('.order_finish_controls a.saveButton:visible');
                await doneLink.waitFor({timeout: 20_000});
                await L.sleep(500);
                const from = grid.locator('tr.gridRow').filter({hasText: 'Poster'}).locator('td').first();
                const to = grid.locator('tr.gridRow').filter({hasText: 'PDF'}).first();
                const a = await from.boundingBox();
                const b = await to.boundingBox();
                await page.mouse.move(a.x + Math.min(a.width / 2, 150), a.y + a.height / 2);
                await page.mouse.down();
                await page.mouse.move(a.x + Math.min(a.width / 2, 150), a.y + a.height / 2 - 5, {steps: 5});
                await page.mouse.move(a.x + Math.min(a.width / 2, 150), b.y + 2, {steps: 25});
                await L.sleep(300);
                await page.mouse.up();
                await idle(page);
                const saved = page.waitForResponse((r) => /save-sequence/i.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
                await doneLink.click();
                const r = await saved;
                await idle(page);
                await L.sleep(800);
                fact('g.done', {status: r ? r.status() : null, body: r ? ((await r.text().catch(() => '')) || '').slice(0, 400) : null});
                fact('g.uploadFilesAfterDone', await rows());
                await L.snap(page, 'g-upload-files-after-done');
                await L.toStep(page, 'Review');
                fact('g.reviewAfterDone', await filesPanel());
                await L.snap(page, 'g-review-after-done');
                await page.reload();
                await idle(page);
                await L.sleep(1000);
                await L.continueUntil(page, 'Review');
                fact('g.reviewAfterReload', await filesPanel());
                await L.snap(page, 'g-review-after-reload');
            }
        } else if (MODE === 'neighbour') {
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            await idle(page).catch(() => {});
            const nl = await L.openChapters(page, app, 12);
            const before = await L.detailsList(nl);
            fact('nb.before', before);
            fact('nb.storedBefore', L.stored(app, 12));
            const order = (await L.blocks(nl)).map((b) => b.chapter);
            const last = order[order.length - 1];
            await L.startOrder(nl);
            fact('nb.drag', await L.dragChapterAbove(nl, last, order[0]));
            fact('nb.done', await L.done(nl));
            fact('nb.atOnce', await L.detailsList(nl));
            await L.snap(page, 'nb-chapters-after-done');
            await page.reload();
            await idle(page);
            const nl2 = await L.openChapters(page, app, 12);
            fact('nb.afterReload', await L.detailsList(nl2));
            fact('nb.storedAfter', L.stored(app, 12));
            await L.snap(page, 'nb-chapters-after-reload');
            fact('nb.expectedFirst', last);
            fact('nb.kept', (await L.blocks(nl2))[0].chapter === last);
        } else {
            const W = L.omp('SubmissionWizardPages.js');
            await step(1, 'sign in as aclark', async () => {
                await signIn(page, 'aclark', {contextPath: app.contextPath});
                await idle(page).catch(() => {});
            });
            await step(2, 'New Submission', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/submission`));
                await idle(page);
                await L.snap(page, 'w02-start-form');
                // The dataset's press takes submissions in English and French: "Submission Language" asks.
                const english = page.getByRole('radio', {name: 'English', exact: true});
                if (await english.count()) await english.check();
                // beginSubmission() of the page object, without its closing check that the wizard opens on
                // "Upload Files": 3.5's opens on "Details" (its steps: Details, Upload Files, Contributors, …).
                await W.fillStartTitle(page, TITLE);
                for (const re of [/meets all of these requirements/, /agree to have my data collected/]) {
                    const box = page.getByRole('checkbox', {name: re});
                    if (await box.count()) await box.check();
                }
                await page.getByRole('button', {name: 'Begin Submission'}).click();
                await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 30_000});
                await W.expectWizardOpen(page);
                await idle(page);
                fact('submissionId', Number(new URL(page.url()).searchParams.get('id')));
                fact('step2.firstStep', await L.currentStep(page));
            });
            await step(3, 'contributors, then on to Review', async () => {
                await L.continueUntil(page, 'Contributors');
                await L.addContributor(page, {givenName: 'Ben', familyName: 'Barrow', email: 'ben.barrow.h19s@mailinator.com'});
                await L.addContributor(page, {givenName: 'Cy', familyName: 'Marsh', email: 'cy.marsh.h19s@mailinator.com'});
                await L.snap(page, 'w03-contributors');
                await L.continueUntil(page, 'Review');
            });
            await step(4, 'add chapters', async () => {
                await L.toStep(page, 'Details');
                await list.expectLoaded();
                await list.addChapter({title: 'Tides', authors: ['Ben Barrow', 'Cy Marsh']});
                await L.sleep(600);
                await list.addChapter({title: 'Harbours'});
                await L.sleep(600);
                await list.addChapter({title: 'Estuaries'});
                await idle(page);
                fact('step4.details', await L.detailsList(list));
                await L.snap(page, 'w04-details-three-chapters');
            });
            const sid = facts.submissionId;
            await step(5, 'Review before ordering', async () => {
                await L.toStep(page, 'Review');
                fact('step5.review', await L.reviewChapters(page));
                await L.snap(page, 'w05-review-before-order');
            });
            await step(6, 'author order', async () => {
                await L.toStep(page, 'Details');
                await L.startOrder(list);
                await L.dragAuthor(list, 'Tides', 'Cy Marsh', 'Ben Barrow');
                fact('step6.done', await L.done(list));
                fact('step6.details', await L.detailsList(list));
                fact('step6.stored', L.stored(app, sid));
            });
            await step(7, 'chapter order', async () => {
                await L.startOrder(list);
                fact('step7.drag', await L.dragChapterAbove(list, 'Estuaries', 'Tides'));
                fact('step7.done', await L.done(list));
                fact('step7.details', await L.detailsList(list));
                fact('step7.stored', L.stored(app, sid));
                await L.snap(page, 'w07-details-after-done');
            });
            await step(8, 'Review after Done', async () => {
                await L.toStep(page, 'Review');
                fact('step8.review', await L.reviewChapters(page));
                await L.snap(page, 'w08-review-after-done');
            });
            await step(9, 'Add Chapter Deltas', async () => {
                await L.toStep(page, 'Details');
                await list.addChapter({title: 'Deltas'});
                await idle(page);
                fact('step9.details', await L.detailsList(list));
            });
            await step(10, 'Review after an added chapter', async () => {
                await L.toStep(page, 'Review');
                fact('step10.review', await L.reviewChapters(page));
                await L.snap(page, 'w10-review-after-add');
            });
            await step(11, 'reload, Review', async () => {
                await page.reload();
                await idle(page);
                await L.sleep(1000);
                // The reloaded wizard opens on its first step, its rail offering only that one: "Continue" to Review.
                fact('step11.openedOn', await L.currentStep(page));
                await L.continueUntil(page, 'Review');
                await L.sleep(600);
                fact('step11.review', await L.reviewChapters(page));
                await L.snap(page, 'w11-review-after-reload');
                await L.toStep(page, 'Details');
                await list.expectLoaded();
                fact('step11.details', await L.detailsList(list));
            });
            fact('verdict', {
                step8PanelMatchesDetails: JSON.stringify(facts['step8.review']) === JSON.stringify(facts['step7.details']),
                step10PanelMatchesDetails: JSON.stringify(facts['step10.review']) === JSON.stringify(facts['step9.details']),
                step11PanelMatchesDetails: JSON.stringify(facts['step11.review']) === JSON.stringify(facts['step11.details']),
            });
        }
    } finally {
        fact('pageErrors', pageErrors);
        record(`walk-${MODE}`, facts);
        await close();
    }
});
