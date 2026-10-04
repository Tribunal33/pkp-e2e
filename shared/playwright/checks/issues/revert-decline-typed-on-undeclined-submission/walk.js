// Kept walk for docs/issues/U34-A6-revert-decline-typed-on-undeclined-submission.md (spec U34, register A6).
// On PKP's default test dataset (a dataset fleet), as dbarnes:
//   Submission stage: the "Revert Decline" address (decision=16) typed for a queued submission (OJS 4, OMP 3,
//   OPS 1 at Production), "Record Decision"; the workflow, its Activity Log and the author's mailbox after.
//   Review round (OJS 13, revisions requested; OMP 16, reviews ready): "Accept Submission" pressed shows the
//   round's address; decision=2 changed to decision=15, "Record Decision"; the round's status after. On OJS 13
//   the author lkumiega's "Tasks" before and after, then "Upload revisions" and the round's status again.
//   Published preprint (OPS 2): decision=16 typed; on main it is at the Done stage (refused, a control), on 3.5
//   at Production: the page opens and "Record Decision" is refused (403 "already been published"); the
//   preprint's public page read signed out after.
// The kit builds nothing; SQL reads are evidence beside the screens, never steps.
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: a declined submission's own "Revert
// Decline" button (OJS 18, OPS 4; OMP 10 declined first with "Decline Submission"; OJS 7 declined on its
// review round first) still records and returns it to the queue.
// WALK_MODE=again runs only the ordinary path: a declined submission's own "Revert Decline" (OJS 18, OMP 10
// declined first, OPS 4), "View Submission Summary", the browser's Back to the record page ("Record Decision" pressed
// again when offered), then the record page's address reloaded; the author's reversal emails counted.
// WALK_MODE=tabs runs only the two-tab path: the reversal's page opened in one tab, the reversal recorded in
// another, then "Record Decision" pressed in the first (what the API alone decides once the page is loaded).
// Run:
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/revert-decline-typed-on-undeclined-submission/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, the 3.5 fleet's feature)
const {forEachApp, launch, signIn, signOut, screen, shot, record, note} = require('../../../probe');
const K = require('./lib.js');
const R = require('../internal-round-revised-files-not-carried/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const CASES = {
    ojs: {queued: {id: 4, author: 'cmontgomerie'}, round: {id: 13, author: 'lkumiega', component: 'Article Text', upload: true},
        nb: [{id: 18, author: 'vwilliamson'}, {id: 7, author: 'dsokoloff', declineFirst: 'Decline Submission', review: true}]},
    omp: {queued: {id: 3, author: 'bbarnetson'}, round: {id: 16, author: 'mpower'},
        nb: [{id: 10, author: 'jbrower', declineFirst: 'Decline Submission'}]},
    ops: {queued: {id: 1, author: 'ccorino'}, published: {id: 2, author: 'ckwantes'},
        nb: [{id: 4, author: 'ddiouf', menuKey: 'workflow_5'}]},
};
const mailbox = (u) => `${u}@mailinator.com`;

forEachApp(async (app) => {
    const c = CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, context} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const id = `a6-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: K.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) {
            facts[key] = {threw: K.flat(e.message, 400)};
            note(`U34 A6 walk (${app.name}, ${MODE}): step ${key} threw: ${K.flat(e.message, 200)}`);
            await snap(`${key}-threw`).catch(() => {});
        }
        const shown = {...facts[key]};
        delete shown.screen;
        console.log(`[a6 ${app.name} ${facts.line} ${MODE}] ${key}`, JSON.stringify(shown).slice(0, 1500));
        return facts[key];
    };
    const wizard = async (key, id, decision, roundId = null) => {
        const landed = await step(`${key}-typed`, async () => {
            const out = await K.typed(page, app, id, decision, roundId);
            await snap(`${key}-typed`);
            delete out.screen;
            return out;
        });
        if (!/\/decision\/record\//.test((landed && landed.url) || '')) return step(`${key}-record`, async () => ({notOnWizard: true}));
        return step(`${key}-record`, async () => {
            const out = await K.recordTyped(page);
            await snap(`${key}-recorded`);
            return out;
        });
    };
    try {
        if (MODE === 'again') {
            // The ordinary path: a declined submission's own "Revert Decline", then the browser's history.
            const s = c.nb[0];
            const since = new Date();
            await signIn(page, 'dbarnes');
            const key = `a${s.id}`;
            if (s.declineFirst) {
                await step(`${key}-decline`, async () => {
                    await K.openWorkflow(page, app, s.id, {menuKey: s.menuKey || null});
                    const pressed = await K.pressDecision(page, s.declineFirst);
                    const w = pressed.onWizard ? await K.throughWizard(page) : null;
                    return {pressed: {onWizard: pressed.onWizard, absent: pressed.absent || false}, requests: w && w.requests};
                });
            }
            const first = await step(`${key}-revert`, async () => {
                await K.openWorkflow(page, app, s.id, {menuKey: s.menuKey || null});
                const pressed = await K.pressDecision(page, 'Revert Decline');
                const url = page.url().replace(/^https?:\/\/[^/]+/, '');
                const w = pressed.onWizard ? await K.throughWizard(page) : null;
                await snap(`${key}-reverted`);
                return {url, pressed: {onWizard: pressed.onWizard, absent: pressed.absent || false}, requests: w && w.requests, done: w && K.flat(w.done, 200)};
            });
            await step(`${key}-back`, async () => {
                const view = page.getByRole('link', {name: 'View Submission Summary', exact: true});
                await view.first().click();
                await page.waitForURL(/dashboard/, {timeout: 30_000}).catch(() => {});
                await K.roundState(page).catch(() => null);
                const viewed = page.url().replace(/^https?:\/\/[^/]+/, '');
                const resp = await page.goBack();
                await page.waitForTimeout(1500);
                const landed = {viewed, status: resp ? resp.status() : 'from cache', url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: K.flat(await page.locator('h1').first().innerText().catch(() => null), 120)};
                await snap(`${key}-back`);
                const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
                landed.recordOffered = await rec.first().isVisible().catch(() => false);
                if (landed.recordOffered) {
                    const w = await K.throughWizard(page);
                    landed.requests = w.requests;
                    landed.done = K.flat(w.done, 200);
                    await snap(`${key}-back-recorded`);
                } else {
                    landed.text = K.flat((await screen(page)).text.main, 300);
                }
                return landed;
            });
            await step(`${key}-reload`, async () => {
                const resp = await page.goto(app.url(first.url));
                await page.waitForTimeout(1000);
                const out = {status: resp && resp.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: K.flat(await page.locator('h1').first().innerText().catch(() => null), 120),
                    recordOffered: await page.getByRole('button', {name: 'Record Decision', exact: true}).first().isVisible().catch(() => false)};
                out.text = K.flat((await screen(page)).text.main, 300);
                await snap(`${key}-reload`);
                return out;
            });
            await step(`${key}-after`, async () => ({
                editor: await K.editorReads(page, app, s.id, {menuKey: s.menuKey || null, label: `a6-${MODE}-${key}-activity-log`}),
                reversalMails: await app.mail.count({to: mailbox(s.author), subject: 'We have reversed the decision to decline your submission', since}).catch(() => null),
                stored: K.stored(app, s.id),
            }));
            return;
        }
        if (MODE === 'tabs') {
            // Two tabs: the reversal's page opened in tab A while the submission is declined, recorded in tab B,
            // then "Record Decision" pressed in tab A (the page is already loaded, so only the API can refuse).
            const s = c.nb[0];
            const since = new Date();
            const key = `t${s.id}`;
            await signIn(page, 'dbarnes');
            if (s.declineFirst) {
                await step(`${key}-decline`, async () => {
                    await K.openWorkflow(page, app, s.id, {menuKey: s.menuKey || null});
                    const pressed = await K.pressDecision(page, s.declineFirst);
                    const w = pressed.onWizard ? await K.throughWizard(page) : null;
                    return {pressed: {onWizard: pressed.onWizard}, requests: w && w.requests};
                });
            }
            await step(`${key}-tabA-open`, async () => {
                await K.openWorkflow(page, app, s.id, {menuKey: s.menuKey || null});
                const pressed = await K.pressDecision(page, 'Revert Decline');
                return {onWizard: pressed.onWizard, url: page.url().replace(/^https?:\/\/[^/]+/, '')};
            });
            const tabB = await context.newPage();
            await step(`${key}-tabB-record`, async () => {
                await K.openWorkflow(tabB, app, s.id, {menuKey: s.menuKey || null});
                const pressed = await K.pressDecision(tabB, 'Revert Decline');
                const w = pressed.onWizard ? await K.throughWizard(tabB) : null;
                return {onWizard: pressed.onWizard, requests: w && w.requests, done: w && K.flat(w.done, 160)};
            });
            await tabB.close();
            await step(`${key}-tabA-record`, async () => {
                await page.bringToFront();
                const w = await K.throughWizard(page);
                await snap(`${key}-tabA-recorded`);
                return {requests: w.requests, done: K.flat(w.done, 300), text: K.flat((await screen(page)).text.main, 300)};
            });
            await step(`${key}-after`, async () => ({
                reversalMails: await app.mail.count({to: mailbox(s.author), subject: 'We have reversed the decision to decline your submission', since}).catch(() => null),
                stored: K.stored(app, s.id),
            }));
            return;
        }
        if (MODE === 'neighbour') {
            await signIn(page, 'dbarnes');
            for (const s of c.nb) {
                const since = new Date();
                const key = `n${s.id}`;
                if (s.declineFirst) {
                    await step(`${key}-decline`, async () => {
                        const rounds = s.review ? R.rounds(app, s.id).filter((r) => r.stageId === 3) : [];
                        await K.openWorkflow(page, app, s.id, {menuKey: rounds.length ? R.roundKey(rounds[rounds.length - 1]) : null});
                        const pressed = await K.pressDecision(page, s.declineFirst);
                        const w = pressed.onWizard ? await K.throughWizard(page) : null;
                        return {pressed: {onWizard: pressed.onWizard, absent: pressed.absent || false, offered: pressed.offered}, requests: w && w.requests, done: w && K.flat(w.done, 200)};
                    });
                }
                await step(`${key}-revert`, async () => {
                    const rounds = s.review ? R.rounds(app, s.id).filter((r) => r.stageId === 3) : [];
                    await K.openWorkflow(page, app, s.id, {menuKey: rounds.length ? R.roundKey(rounds[rounds.length - 1]) : (s.menuKey || null)});
                    const before = await K.roundState(page);
                    const pressed = await K.pressDecision(page, 'Revert Decline');
                    const url = page.url().replace(/^https?:\/\/[^/]+/, '');
                    const w = pressed.onWizard ? await K.throughWizard(page) : null;
                    await snap(`${key}-reverted`);
                    return {before: before.buttons, url, pressed: {onWizard: pressed.onWizard, absent: pressed.absent || false, offered: pressed.offered}, requests: w && w.requests, done: w && K.flat(w.done, 200)};
                });
                await step(`${key}-after`, async () => ({editor: await K.editorReads(page, app, s.id, {log: false}), mail: await K.mailTo(app, mailbox(s.author), since), stored: K.stored(app, s.id)}));
            }
            return;
        }

        // Submission stage
        {
            const s = c.queued;
            const since = new Date();
            await signIn(page, 'dbarnes');
            await step('q-before', async () => ({editor: await K.editorReads(page, app, s.id, {log: false}), stored: K.stored(app, s.id)}));
            await snap('q-workflow-before');
            await wizard('q', s.id, 16);
            await step('q-after', async () => {
                const out = {editor: await K.editorReads(page, app, s.id, {label: `a6-${MODE}-q-activity-log`})};
                await snap('q-workflow-after');
                out.mail = await K.mailTo(app, mailbox(s.author), since);
                out.stored = K.stored(app, s.id);
                return out;
            });
        }

        // Review round
        if (c.round) {
            const s = c.round;
            const rounds = R.rounds(app, s.id).filter((r) => r.stageId === 3);
            const menuKey = R.roundKey(rounds[rounds.length - 1]); // only to land the round's page
            if (s.upload) {
                await signIn(page, s.author);
                await step('r-author-before', async () => K.authorTasks(page, app, s.id));
                await snap('r-author-tasks-before');
            }
            const since = new Date();
            await signIn(page, 'dbarnes');
            await step('r-before', async () => ({editor: await K.editorReads(page, app, s.id, {menuKey, log: false}), stored: K.stored(app, s.id)}));
            const acc = await step('r-accept-pressed', async () => {
                await K.openWorkflow(page, app, s.id, {menuKey});
                const out = await K.roundFromAccept(page);
                await snap('r-accept-address');
                return out;
            });
            await wizard('r', s.id, 15, acc && acc.roundId);
            await step('r-after', async () => {
                const out = {editor: await K.editorReads(page, app, s.id, {menuKey, label: `a6-${MODE}-r-activity-log`})};
                await snap('r-workflow-after');
                out.mail = await K.mailTo(app, mailbox(s.author), since);
                out.stored = K.stored(app, s.id);
                return out;
            });
            if (s.upload) {
                await signIn(page, s.author);
                await step('r-author-after', async () => K.authorTasks(page, app, s.id));
                await snap('r-author-tasks-after');
                await step('r-author-upload', async () => {
                    await K.openWorkflow(page, app, s.id, {author: true, menuKey});
                    const out = await K.uploadRevision(page, 'u34a-revision.pdf', s.component);
                    out.round = await K.roundState(page);
                    await snap('r-author-uploaded');
                    return out;
                });
                await signIn(page, 'dbarnes');
                await step('r-after-upload', async () => {
                    const out = {editor: await K.editorReads(page, app, s.id, {menuKey, log: false}), stored: K.stored(app, s.id)};
                    await snap('r-workflow-after-upload');
                    return out;
                });
            }
        }

        // Published preprint
        if (c.published) {
            const s = c.published;
            const since = new Date();
            await signIn(page, 'dbarnes');
            await step('p-before', async () => {
                const resp = await page.goto(app.url(`/index.php/${app.contextPath}/preprint/view/${s.id}`));
                return {publicStatus: resp && resp.status(), stored: K.stored(app, s.id)};
            });
            await wizard('p', s.id, 16);
            await step('p-after', async () => {
                const out = {editor: await K.editorReads(page, app, s.id, {label: `a6-${MODE}-p-activity-log`})};
                await snap('p-workflow-after');
                out.mail = await K.mailTo(app, mailbox(s.author), since, 8_000);
                await signOut(page);
                const resp = await page.goto(app.url(`/index.php/${app.contextPath}/preprint/view/${s.id}`));
                out.publicStatus = resp && resp.status();
                out.publicTitle = await page.title();
                await snap('p-public-page');
                const arch = await page.goto(app.url(`/index.php/${app.contextPath}/preprints`));
                out.archiveStatus = arch && arch.status();
                out.archiveListsIt = (await page.locator('main').innerText().catch(() => '')).includes('The Facets Of Job Satisfaction');
                out.stored = K.stored(app, s.id);
                return out;
            });
        }
    } finally {
        record(`a6-${MODE}-facts`, facts);
    }
});
