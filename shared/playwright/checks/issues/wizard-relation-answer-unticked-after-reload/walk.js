// U75 A10 issue walk: after the submission wizard is reloaded, "For Readers" shows none of the "Relation status"
// choices ticked and no DOI box, whatever the Author saved, while the Review step still reads the saved answer.
// Steps (docs/issues/U75-A10-wizard-relation-answer-unticked-after-reload.md), on PKP's default test dataset, OPS:
//   ccorino: Make a Submission; Continue to "For Readers"; tick "This preprint has been published elsewhere.", type the
//   DOI; Continue to "Review" (panel); reload; "For Readers" from the rail (the finding); Continue to "Review" (the
//   control: the saved answer is kept); "For Readers", tick "published elsewhere" again (the DOI box), Review again.
// MODE=neighbour (the paths a fix must leave alone, run alone): N1 a second draft never answered, reloaded: "For Readers"
//   must still show no choice ticked; N2 dbarnes, preprint 2's "Title & Abstract" › "Relations": tick "This preprint has
//   not been published elsewhere.", "Save", open it afresh: the saved choice ticked (the workflow fills its form itself).
//
//   npm run fleet-prep -- --feature issues-u75r5 --dataset 5 --apps ops --reset
//   PROBE_FEATURE=issues-u75r5 PROBE_AGENT=u75r5 node bin/probe.js ops shared/playwright/checks/issues/wizard-relation-answer-unticked-after-reload/walk.js
//   (MODE=neighbour for the neighbour; PKP_E2E_LINE=stable-3_5_0, the line's fleet and PROBE_RUN=r35 for 3.5)
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, sql} = require('../../../probe');
const W = require('../wizard-refused-save-hangs-saving/lib.js'); // beginSubmission (line-aware start page)
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const DOI = 'https://doi.org/10.1234/u75r5';

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // the relation question is the preprint server's alone
    const {page, close} = await launch(app);
    const writes = L.watchWrites(page);
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    let n = 0;
    const snap = async (name, extra) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: L.flat(e.message, 300)}; }
        if (extra) s.facts = extra;
        const id = `a10-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const pubOf = (id) => Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${Number(id)}`));
    const keep = (k, v) => { facts[k] = v; record(`a10-${MODE}-facts`, facts); };
    try {
        if (MODE === 'walk') {
            // 1-2
            await signIn(page, 'ccorino');
            const id = await W.beginSubmission(page, app, {title: 'u75r5 Relation after reload'});
            const pid = pubOf(id);
            keep('draft', {id, publicationId: pid, storedAtStart: L.storedRelation(sql, app, pid)});
            // 3
            keep('step3', await L.continueTo(page, 'For Readers'));
            keep('forReadersFresh', await L.readRelationStep(page));
            await loc(page, '"For Readers": the "Relation status" radios', page.locator('input[name="relationStatus"]'));
            await snap('for-readers-fresh');
            // 4: the answer and its DOI
            await page.getByRole('radio', {name: L.TEXT.published, exact: true}).check();
            const box = page.locator('input[name="vorDoi"]');
            await box.waitFor({state: 'visible', timeout: L.T});
            await loc(page, '"For Readers": the "DOI of the published preprint" box', box);
            await box.fill(DOI);
            await box.press('Tab');
            keep('step4', {shown: await L.readRelationStep(page)});
            await snap('for-readers-answered');
            // 5: "Continue" saves the step; the Review panel reads the answer
            const t5 = Date.now();
            const step5 = await L.continueTo(page, 'Review');
            const saved = await L.waitForWrite(writes, t5, /u75r5/, 15_000);
            keep('step5', {step: step5, save: saved, panel: await L.readReviewRelation(page), stored: L.storedRelation(sql, app, pid)});
            await snap('review-before-reload');
            // 6: the browser's reload
            const t6 = Date.now();
            keep('step6', {unsavedQuestion: await L.reloadWizard(page), landedOn: await L.currentStep(page)});
            // 7: "For Readers" from the rail
            keep('step7', {reached: await L.goToStep(page, 'For Readers'), shown: await L.readRelationStep(page), stored: L.storedRelation(sql, app, pid)});
            await snap('for-readers-after-reload');
            // 8: Review without touching the question (the control)
            keep('step8', {step: await L.continueTo(page, 'Review'), panel: await L.readReviewRelation(page), writesSinceReload: writes.since(t6)});
            await snap('review-after-reload');
            // 9: "For Readers", tick "published elsewhere" again: what the DOI box holds
            await L.goToStep(page, 'For Readers');
            await page.getByRole('radio', {name: L.TEXT.published, exact: true}).check();
            await page.locator('input[name="vorDoi"]').waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
            const shown9 = await L.readRelationStep(page);
            await snap('for-readers-reticked');
            keep('step9', {shown: shown9});
            // 10: Review once more ("Continue" saves the step as it stands)
            const t10 = Date.now();
            const step10 = await L.continueTo(page, 'Review');
            await L.waitForWrite(writes, t10, /relationStatus/, 15_000);
            keep('step10', {step: step10, writes: writes.since(t10), panel: await L.readReviewRelation(page), stored: L.storedRelation(sql, app, pid)});
            await snap('review-after-reticking');
        } else {
            // N1: a draft never answered, reloaded
            await signIn(page, 'ccorino');
            const id = await W.beginSubmission(page, app, {title: 'u75r5 Relation unanswered'});
            const pid = pubOf(id);
            await L.continueTo(page, 'For Readers');
            const before = await L.readRelationStep(page);
            const asked = await L.reloadWizard(page);
            const reached = await L.goToStep(page, 'For Readers');
            keep('n1', {id, publicationId: pid, before, unsavedQuestion: asked, reached, afterReload: await L.readRelationStep(page), stored: L.storedRelation(sql, app, pid)});
            await snap('n1-unanswered-after-reload');
            // N2: the workflow's "Relations" on preprint 2 (posted), as the manager
            await signOut(page);
            await signIn(page, 'dbarnes');
            const pid2 = pubOf(2);
            const openRelations = async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=2`));
                await idle(page);
                const wf = page.locator('[role="dialog"]:visible').first();
                const ta = wf.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
                await ta.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
                await ta.click().catch(() => {});
                await idle(page);
                const rel = page.locator('[data-cy="workflow-controls-left"]').first().getByRole('button', {name: /^\s*Relations/});
                await rel.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
                await rel.click().catch(() => {});
                await page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content').first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
                return L.readRelationsPanel(page);
            };
            const before2 = await openRelations();
            // "This preprint has not been published elsewhere.", "Save", then the page afresh and "Relations" again
            const panel = page.locator('.pkpWorkflow__publicationRelation .pkpDropdown__content').first();
            await panel.getByRole('radio', {name: L.TEXT.none, exact: true}).check().catch(() => {});
            const t2 = Date.now();
            await panel.getByRole('button', {name: 'Save', exact: true}).click().catch(() => {});
            const saved2 = await L.waitForWrite(writes, t2, /relationStatus=1/, 15_000);
            const savedShown = await panel.getByRole('status').filter({hasText: 'Saved'}).first().isVisible().catch(() => false);
            keep('n2', {publicationId: pid2, before: before2, save: saved2, savedShown, stored: L.storedRelation(sql, app, pid2), afterReload: await openRelations()});
            await snap('n2-workflow-relations');
        }
    } catch (e) {
        keep('error', L.flat(e.stack, 800));
        await snap('error').catch(() => {});
    } finally {
        await close();
    }
});
