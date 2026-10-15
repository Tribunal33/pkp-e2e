// U38 A12 issue walk: an editor who is also the submission's author is offered no "View changes" on
// the Activity Log's review-change line, but the link's own address, typed into the address bar,
// shows them the edited review's old and new text.
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), `publicknowledge`.
// The kit builds nothing: the edited review, the invitation, its acceptance and the participant
// assignment are made on screen. A preprint server has no reviews: not walked. Helpers: lib.js here,
// ../activity-log-view-changes-reads-any-review/lib.js (the edit and the "View changes" read).
//
// MODE=walk (default), OJS submission 10 (Aisla McCrae's review, author jnovak) / OMP 16 (Adela
// Gallego's, author mpower):
//   A  `dbarnes` modifies the review's comments, reads the line's "View changes" (its address and window)
//   ctl the author, Author only, types that address  -> refused (the role check)
//   B  `dbarnes` invites the author to the Section editor (Series editor) role; the author accepts
//      from the email; `dbarnes` assigns them in "Participants" as Section editor (Series editor)
//   C  the author-editor opens the submission's "Activity Log": the line has no arrow
//      (expected and observed); then types the address -> expected refused; observed: the change
//   On a line without "Modify Review" (3.5) the walk records that and stops after A.
// MODE=reach: after A, on OJS the "Reviewer Recommendation" line's address too; the author is
//   invited to the manager-level Journal editor (Press editor) role, accepts, and is NOT assigned
//   to the submission; signed in, they open its "Activity Log" and type both addresses.
// MODE=nb, the neighbour alone (with a fix in and out): readers the fix must leave alone read the
//   change through the link: `dbarnes`, and on OJS `dbuskins` (assigned Section editor, not an author).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=k26 node bin/probe.js ojs,omp shared/playwright/checks/issues/author-editor-reads-review-change-by-address/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/k26/a12-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog} = require('../../../probe');
const L = require('./lib.js');
const V = require('../activity-log-view-changes-reads-any-review/lib.js');

const MODE = process.env.MODE || 'walk';
const TAG = 'hkk26';

forEachApp(async (app) => {
    if (app.name === 'ops') { console.log('[a12 ops] no reviews: not walked'); return; }
    const c = L.CASES[app.name];
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.sub.id, author: c.author.username};
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    const step = async (key, fn) => {
        try { o[key] = await fn(); }
        catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await shot(page, `a12-${MODE}-${key}-threw`).catch(() => {}); }
        console.log(`[a12 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key], (k, v) => (typeof v === 'function' ? undefined : v)).slice(0, 1500));
        return o[key];
    };
    try {
        // A: the editor modifies the review and reads the line's "View changes"
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await step('edit', () => V.editReviewComment(page, app, {id: c.sub.id, reviewer: c.sub.reviewer}));
        record(`a12-${MODE}-A1-after-save`, await screen(page).catch(() => ({url: page.url()})));
        if (!o.edit || !o.edit.modifyOffered) {
            o.stopped = 'no "Modify Review" on this line: no review-change line to read';
            // what "Read Review" opened instead: its title and buttons (3.5: "Review: {title}", "Cancel", "Confirm")
            await step('readReviewWindow', async () => {
                const d = page.getByRole('dialog').last();
                if (!(await d.isVisible().catch(() => false))) return {open: false};
                const text = L.flat(await d.innerText(), 3000);
                return {open: true, head: text.slice(0, 200), buttons: (await d.getByRole('button').allInnerTexts()).map((t) => L.flat(t, 40)).filter(Boolean), modifyReview: /Modify Review/.test(text)};
            });
            await step('logLines', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.sub.id}`));
                await idle(page); await L.sleep(1500);
                const r = await L.readReviewChangeLines(page);
                record(`a12-${MODE}-A3-activity-log`, await screen(page).catch(() => ({url: page.url()})));
                return r;
            });
            return;
        }
        await step('entry', () => V.readViewChanges(page));
        record(`a12-${MODE}-A2-view-changes`, o.entry);
        if (!o.entry || !o.entry.logEntryId) throw new Error('no "View changes" entry read');
        const address = new URL(o.entry.href, app.baseURL).toString();
        o.address = address.replace(app.baseURL, '');
        await signOut(page).catch(() => {});

        if (MODE === 'reach') {
            // the reach: the recommendation entry (OJS), and an author holding a manager-level
            // role (Journal editor / Press editor) who is NOT assigned to the submission as editor
            if (app.name === 'ojs') {
                await signIn(page, 'dbarnes', {contextPath: app.contextPath});
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.sub.id}`));
                await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: L.T});
                await idle(page);
                await step('entryRec', () => V.readViewChanges(page, 'Reviewer Recommendation'));
                await signOut(page).catch(() => {});
            }
            const subject = `Invitation ${TAG} ${app.name} reach`;
            const since = new Date();
            await signIn(page, 'dbarnes', {contextPath: app.contextPath});
            await step('invite', () => L.inviteToRole(page, app, {email: L.mailOf(c.author.username), role: c.managerRole, subject}));
            await signOut(page).catch(() => {});
            await step('accept', () => L.acceptInvitation(app, {email: L.mailOf(c.author.username), subject: TAG, since, accept: c.accept}));
            await L.sleep(1500);
            await signIn(page, c.author.username, {contextPath: app.contextPath});
            await step('workflow', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.sub.id}`));
                await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: L.T}).catch(() => {});
                await idle(page); await L.sleep(800);
                const s = await screen(page);
                record(`a12-${MODE}-R1-workflow`, s);
                return {url: page.url(), dialog: L.flat(s.text && s.text.dialog, 400)};
            });
            await step('managerAuthorLog', async () => {
                const r = await L.readReviewChangeLines(page);
                record(`a12-${MODE}-R2-activity-log`, await screen(page).catch(() => ({url: page.url()})));
                if (r.closeLog) await r.closeLog();
                return r;
            });
            await step('managerAuthorAddress', () => L.typeAddress(page, address, V.COMMENT));
            if (o.entryRec && o.entryRec.href) {
                await step('managerAuthorAddressRec', () => L.typeAddress(page, new URL(o.entryRec.href, app.baseURL).toString(), null));
            }
            record(`a12-${MODE}-R3-by-address`, await screen(page).catch(() => ({url: page.url()})));
            await signOut(page).catch(() => {});
            return;
        }

        if (MODE === 'nb') {
            if (c.otherEditor) {
                await signIn(page, c.otherEditor, {contextPath: app.contextPath});
                await step('otherEditorLink', async () => {
                    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.sub.id}`));
                    await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: L.T});
                    await idle(page);
                    return V.readViewChanges(page);
                });
                await signOut(page).catch(() => {});
            }
            return;
        }

        // control: the author, Author only, types the address
        await signIn(page, c.author.username, {contextPath: app.contextPath});
        await step('ctlAuthorOnly', () => L.typeAddress(page, address, V.COMMENT));
        record(`a12-${MODE}-ctl-author-only`, await screen(page).catch(() => ({url: page.url()})));
        await signOut(page).catch(() => {});

        // B: the author becomes the submission's Section editor (Series editor), on screen
        const subject = `Invitation ${TAG} ${app.name}`;
        const since = new Date();
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await step('invite', () => L.inviteToRole(page, app, {email: L.mailOf(c.author.username), role: c.editorRole, subject}));
        record(`a12-${MODE}-B1-invited`, await screen(page).catch(() => ({url: page.url()})));
        await signOut(page).catch(() => {});
        await step('accept', () => L.acceptInvitation(app, {email: L.mailOf(c.author.username), subject: TAG, since, accept: c.accept}));
        await L.sleep(1500); // the role's start is compared in whole seconds (users.md)
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await step('assign', () => L.assignParticipant(page, app, {id: c.sub.id, role: c.editorRole, name: c.author.name}));
        record(`a12-${MODE}-B2-assigned`, await screen(page).catch(() => ({url: page.url()})));
        await signOut(page).catch(() => {});

        // C: the author-editor
        await signIn(page, c.author.username, {contextPath: app.contextPath});
        await step('dashboard', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page); await L.sleep(800);
            const s = await screen(page);
            record(`a12-${MODE}-C1-dashboard`, s);
            return {url: page.url(), text: L.flat(s.text && s.text.main, 600)};
        });
        await step('workflow', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${c.sub.id}`));
            await page.getByRole('heading', {name: /^Workflow:/}).first().waitFor({timeout: L.T});
            await idle(page); await L.sleep(800);
            const s = await screen(page);
            record(`a12-${MODE}-C2-workflow`, s);
            return {url: page.url(), dialog: L.flat(s.text && s.text.dialog, 600)};
        });
        await step('authorEditorLog', async () => {
            const r = await L.readReviewChangeLines(page);
            record(`a12-${MODE}-C3-activity-log`, await screen(page).catch(() => ({url: page.url()})));
            await shot(page, `a12-${MODE}-C3-activity-log`).catch(() => {});
            if (r.closeLog) await r.closeLog();
            return r;
        });
        await step('authorEditorAddress', () => L.typeAddress(page, address, V.COMMENT));
        record(`a12-${MODE}-C4-by-address`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a12-${MODE}-C4-by-address`).catch(() => {});
        await signOut(page).catch(() => {});
    } catch (e) {
        o.fatal = L.flat(e.message, 400);
        record(`a12-${MODE}-fatal`, await screen(page).catch(() => ({url: page.url()})));
    } finally {
        o.serverLog = log.since(from).slice(0, 10).map((l) => L.flat(l, 400));
        record(`a12-facts-${MODE}`, o);
        console.log(`[a12 ${app.name} ${MODE}] facts`, JSON.stringify({stopped: o.stopped, fatal: o.fatal, ctl: o.ctlAuthorOnly, log: o.authorEditorLog, addr: o.authorEditorAddress}).slice(0, 2000));
        await close();
    }
});
