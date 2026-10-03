// U27 A40 issue walk (docs/issues/U27-A40-press-competing-interests-save-submits-review.md): on a
// press, "Save Changes" in "Modify Review" with only the reviewer's competing-interests answer
// recorded, on a request with no review, submits the review for the reviewer. On PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), `publicknowledge`; the kit builds nothing
// (the "Competing Interests" policy is typed through Settings, as a person does). OJS is the
// control (the save asks for a "Recommendation"). A preprint server has no review: not walked.
// Every step is recorded and none throws, so the same script reads the state a fix brings and the
// 3.5 window (no "Modify Review" there).
//
// MODE=walk (default): dbarnes types the policy (Settings > Workflow > Review > "Reviewer Guidance");
//   OMP submission 2, Al Zacharia's row / OJS submission 12, Julie Janssen's row: "Review Details",
//   "Modify Review" > "Modify Review", "I may have competing interests (Specify below)" with a
//   statement, "Save Changes"; the row, the window again; the reviewer's lists and review page.
// MODE=nb, the neighbours alone (with a fix in and out): dbarnes, (1) on another unanswered request
//   (OMP 2 Gonzalo Favio / OJS 12 Paul Hudson) "Modify Review" with a comment typed ({OJS} and a
//   recommendation) and "Save Changes": the review is submitted for the reviewer, as designed;
//   (2) on a submitted review (OMP 12 / OJS 7, Paul Hudson) "Modify Review", the comment emptied,
//   "Save Changes": the comment is cleared; (3) on an unanswered request (OMP 18 / OJS 20, Jhon Doe)
//   a comment typed and deleted again, "Save Changes": the body sent ({OJS} refused for the
//   recommendation). MODE=walk also takes the declaration-only save on an accepted request (OMP 17,
//   Julie Janssen / OJS 12, Paul Hudson, who accepts first).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/press-competing-interests-save-submits-review/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a40-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('../press-mark-complete-closes-unreviewed-request/lib.js');

const MODE = process.env.MODE || 'walk';
const TAG = 'u27k10';
/** An accepted request with no review yet (the accept is the walk's own step), and a request for the emptied-box check. */
const ACC = {omp: {id: 17, user: 'jjanssen', name: 'Julie Janssen'}, ojs: {id: 12, user: 'phudson', name: 'Paul Hudson'}};
const EMPTIED = {omp: {id: 18, user: 'jdoe', name: 'Jhon Doe'}, ojs: {id: 20, user: 'jdoe', name: 'Jhon Doe'}};

/** The stored "For author and editor" comment of the reviewer's latest assignment on the submission. */
function storedComment(app, id, username) {
    return sql(app, `select coalesce(string_agg(coalesce(sc.comments, '<null>'), ' || '), '<no row>') from review_assignments ra join users u on u.user_id = ra.reviewer_id left join submission_comments sc on sc.assoc_id = ra.review_id and sc.comment_type = 1 and sc.viewable = 1 where ra.submission_id = ${id} and u.username = '${username}'`);
}

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) { console.log(`[a40 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 500)}; }
        console.log(`[a40 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        record(`a40-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a40-${MODE}-${key}`).catch(() => {});
        record(`a40-facts-${MODE}`, o);
        return o[key];
    };
    /** Leave "Modify Review" (answering its warning "Yes") and the Review Details window. */
    const leave = async () => {
        const w = page.getByRole('dialog', {name: /^Modify Review/}).last();
        if (await w.isVisible().catch(() => false)) {
            await w.getByRole('button', {name: 'Cancel', exact: true}).last().click();
            const warn = page.locator('[data-cy="dialog"]').filter({hasText: 'Do you wish to continue without saving?'});
            if (await warn.waitFor({timeout: 5_000}).then(() => true).catch(() => false)) await warn.getByRole('button', {name: 'Yes', exact: true}).click();
            await w.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
            await L.sleep(800);
        }
        await L.closeDetails(page);
    };
    /** "Modify Review" > "Modify Review" from the open Review Details window; null when absent. */
    const modify = async () => {
        const m = await L.G.openModify(page, L.details(page));
        return m.dialog ? m : null;
    };
    /** Type into "For author and editor" (emptied first; '' leaves it empty), {OJS} pick the recommendation, "Save Changes". */
    const saveComment = async (dialog, text, recommendation) => {
        const body = dialog.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
        await body.click();
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.press('Delete');
        if (text) await page.keyboard.type(text);
        if (recommendation) await dialog.locator('select').first().selectOption({label: recommendation});
        await L.sleep(400);
        return L.pressSave(page);
    };
    try {
        if (MODE === 'nb') {
            await step('nbComment', async () => {
                await signIn(page, 'dbarnes');
                const who = c.ci.other;
                await L.openWorkflow(page, app, c.ci.id);
                const out = {rowBefore: await L.readRow(page, who.name)};
                out.window = await L.openDetails(page, who.name);
                const m = out.window.opened && !out.window.legacy ? await modify() : null;
                if (!m) return {...out, modify: 'absent'};
                out.save = await saveComment(m.dialog, `${TAG} the editor enters the review sent by email`, c.recommendation);
                await leave();
                await L.openWorkflow(page, app, c.ci.id);
                out.rowAfter = await L.readRow(page, who.name);
                out.stored = L.stored(app, c.ci.id, who.user);
                out.comment = storedComment(app, c.ci.id, who.user);
                return out;
            });
            // A comment typed and then deleted, nothing else: what the box sends
            await step('nbEmptied', async () => {
                const who = EMPTIED[app.name];
                await L.openWorkflow(page, app, who.id);
                const out = {window: await L.openDetails(page, who.name)};
                const m = out.window.opened && !out.window.legacy ? await modify() : null;
                if (!m) return {...out, modify: 'absent'};
                const body = m.dialog.frameLocator('iframe.tox-edit-area__iframe').first().locator('body');
                await body.click();
                await page.keyboard.type(`${TAG} typed then deleted`);
                await page.keyboard.press('ControlOrMeta+a');
                await page.keyboard.press('Delete');
                await page.keyboard.press('Backspace');
                await L.sleep(400);
                out.save = await L.pressSave(page);
                await leave();
                await L.openWorkflow(page, app, who.id);
                out.rowAfter = await L.readRow(page, who.name);
                out.stored = L.stored(app, who.id, who.user);
                out.comment = storedComment(app, who.id, who.user);
                return out;
            });
            await step('nbClear', async () => {
                const who = c.done.reviewer;
                await L.openWorkflow(page, app, c.done.id);
                const out = {commentBefore: storedComment(app, c.done.id, who.user)};
                out.opened = await L.openDetailsFromReadReview(page, who.name);
                const m = out.opened ? await modify() : null;
                if (!m) return {...out, modify: 'absent'};
                out.save = await saveComment(m.dialog, '', null);
                await leave();
                out.commentAfter = storedComment(app, c.done.id, who.user);
                await L.openWorkflow(page, app, c.done.id);
                out.rowAfter = await L.readRow(page, who.name);
                return out;
            });
        } else {
            const who = c.ci.reviewer;
            await step('policy', async () => {                                          // 1-2
                await signIn(page, 'dbarnes');
                return L.G.setCompetingInterestsPolicy(page, app, `${TAG} Declare any competing interests.`);
            });
            await step('rowBefore', async () => {                                       // 3
                await L.openWorkflow(page, app, c.ci.id);
                return {row: await L.readRow(page, who.name), stored: L.stored(app, c.ci.id, who.user)};
            });
            await step('modify', async () => {                                          // 3-6
                const out = {window: await L.openDetails(page, who.name)};
                if (!out.window.opened) return out;
                const f = await L.footer(page);
                out.footer = f.states;
                const m = out.window.legacy ? null : await modify();
                if (!m) return {...out, modify: 'absent'};
                out.confirm = m.confirm;
                out.windowText = L.flat(await m.dialog.innerText(), 2500);
                record(`a40-${MODE}-modify-window`, await screen(page));
                out.save = await L.G.saveCompetingInterests(page, m.dialog, `${TAG} The reviewer consults for the region's tourism board.`);
                if (!out.save.closed) {
                    out.refused = {
                        errors: (await m.dialog.locator('.pkpFieldError, .pkpFormErrors, [role="alert"]').allInnerTexts().catch(() => [])).map((t) => L.flat(t, 300)).filter(Boolean),
                        text: L.flat(await m.dialog.innerText().catch(() => null), 1500),
                    };
                    record(`a40-${MODE}-refused`, await screen(page));
                    await shot(page, `a40-${MODE}-refused`).catch(() => {});
                }
                out.notices = (await page.locator('.app__notifications .pkpNotification').allInnerTexts().catch(() => [])).map((t) => L.flat(t, 200));
                await leave();
                return out;
            });
            await step('rowAfter', async () => {                                        // 7
                await L.openWorkflow(page, app, c.ci.id);
                const out = {row: await L.readRow(page, who.name), stored: L.stored(app, c.ci.id, who.user), comment: storedComment(app, c.ci.id, who.user)};
                out.window = await L.openDetails(page, who.name);
                if (out.window.opened) {
                    out.windowText = (await L.footer(page)).text;
                    record(`a40-${MODE}-window-after`, await screen(page));
                    await shot(page, `a40-${MODE}-window-after`).catch(() => {});
                    await L.closeDetails(page);
                }
                return out;
            });
            // The same save on an accepted request with no review yet (OMP submission 17, Julie Janssen / OJS 12, Paul Hudson)
            await step('acceptedAccept', async () => {
                await signIn(page, ACC[app.name].user);
                return L.reviewerAccept(page, app, ACC[app.name].id);
            });
            await step('accepted', async () => {
                const a = ACC[app.name];
                await signIn(page, 'dbarnes');
                await L.openWorkflow(page, app, a.id);
                const out = {rowBefore: await L.readRow(page, a.name), window: await L.openDetails(page, a.name)};
                const m = out.window.opened && !out.window.legacy ? await modify() : null;
                if (!m) return {...out, modify: 'absent'};
                out.save = await L.G.saveCompetingInterests(page, m.dialog, `${TAG} A declaration sent by email.`);
                await leave();
                await L.openWorkflow(page, app, a.id);
                out.rowAfter = await L.readRow(page, a.name);
                out.stored = L.stored(app, a.id, a.user);
                return out;
            });
            await step('reviewer', async () => {                                        // 8
                await signIn(page, who.user);
                return L.reviewerSide(page, app, c.ci.title);
            });
        }
    } finally {
        await close();
    }
    void idle;
});
