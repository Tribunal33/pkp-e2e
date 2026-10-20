// U05 drift sweep 2026-10-20, chunk SW3 (docs/process/briefs/claim-check.md): the notification
// emails and their footer, the Unsubscribe page, Side effects, Cross-feature. Drives what the kept K4
// script (../K4/k4.js, re-run beside this one) does not settle, per app, on a scratch context of its own:
//   disc       three discussions by the Manager with the Author (two on a one-author submission, one
//              on a two-author one), the Manager's tab before anything else;
//   footer     Rule 7a's {authors} at two authors, the footer's submission link pressed by the Author
//              and by the Manager, the journal-name link;
//   s6         scenario 6 as written: the Manager signed in, the stale page after a sign-out in another
//              tab, the link afresh, every box but "Discussion added.", "user profile" signed in, both tabs;
//   who        Rule 8b at more levels (a Reader, the addressee herself), the page left with a box changed;
//   stalein    Rule 8d's "signs in" alone in another tab, the page opened signed out;
//   sidetab    Side effects: saving the tab with "Enable…" unticked keeps existing tasks, sends nothing;
//   pdelete    Rule 8a: the Manager deleting their own row keeps the Author's link; the Manager's own link
//              ends; the Author's row deleted ends the Author's;
//   badge      Side effects: Mark Read / Mark New / Delete (unread, read) and the badge after "Close",
//              the reader-side count on the next reader-facing page;
//   decision   Cross-feature (OJS, OMP): "Request Revisions" raises the author's task with every
//              "Enable…" unticked, and the tab has no row for it;
//   stats      Rule 7a's statistics-report footer and its link (scenarios/task statisticsReport), then A7's
//              open half: the statistics task deleted, the link opened again;
//   templates  Cross-feature: the footer is not in the "New Announcement" / "Statistics Report
//              Notification" templates (Manage Emails);
//   register   Cross-feature: the Register page's "Yes, I would like to be notified…" box.
//
//   PROBE_RUN=r1 PROBE_FEATURE=U05 PROBE_AGENT=ccSW3 bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U05/SW3/sw3.js
//
//   PHASES=disc,stats … runs the named phases only (each run seeds its own context; a phase that reads
//   another's links needs that phase in the list).
//
// No assertions: every screen is recorded with screen()/shot(); the summary per app is
// `sw3-summary-<run>-<app>.json` in the agent's output folder.
const {forEachApp, launch, signIn, signOut, record, idle, tag, note} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    const S = {app: app.name, problems: []};
    const t = tag('u05sw3');
    const u = (k) => `${t}${k}`;
    const email = (k) => `${u(k)}@mail.test`;
    const users = [
        {username: u('m1'), givenName: 'Mira', familyName: 'ManagerOne', roles: ['manager']},
        {username: u('au'), givenName: 'Ada', familyName: 'Author', roles: ['author']},
        {username: u('a2'), givenName: 'Ben', familyName: 'AuthorTwo', roles: ['author']},
        {username: u('r1'), givenName: 'Rosa', familyName: 'ReaderOne', roles: ['reader']},
    ];
    await app.api.createContext({tag: t, users});
    const cp = t;
    const s1 = await app.api.createSubmission({tag: `${t}s1`, context: t, submitter: u('au'), title: `One author ${t}`, submitted: true, participants: []});
    const s2 = await app.api.createSubmission({tag: `${t}s2`, context: t, submitter: u('au'), title: `Two authors ${t}`, submitted: true, participants: [], contributors: [{givenName: 'Cleo', familyName: 'Coauthor', email: `${t}co@mail.test`}]});
    let s3 = null;
    if (app.name !== 'ops') {
        s3 = await app.api.createSubmission({tag: `${t}s3`, context: t, submitter: u('a2'), title: `Revise me ${t}`, submitted: true, participants: [], decisions: ['sendExternalReview']}).catch((e) => ({error: L.flat(e.message, 300)}));
    }
    S.scratch = {cp, s1: s1.submissionId, s2: s2.submissionId, s3: s3 && (s3.submissionId || s3)};
    const names = {dA: `Disc A ${t}`, dB: `Disc B ${t}`, dS2: `Disc S2 ${t}`, dC: `Disc C ${t}`};
    const links = {};

    const {page, close, context} = await launch(app);
    page.on('dialog', async (d) => {
        (S.dialogs = S.dialogs || []).push({type: d.type(), message: d.message(), url: page.url()});
        await d.accept().catch(() => {});
    });
    const only = process.env.PHASES ? process.env.PHASES.split(',') : null;
    const phase = async (label, fn) => {
        if (only && !only.includes(label)) return;
        console.log(`[sw3 ${app.name}] ${label}`);
        try {
            await fn();
        } catch (error) {
            S.problems.push({phase: label, error: L.flat(error.stack || error, 900)});
            await L.snap(page, `problem-${label}-${app.name}`).catch(() => {});
            await signOut(page).catch(() => {});
        }
        record(`sw3-summary-${app.name}`, S);
    };

    try {
        // ---- disc: three discussions (scenario 5's first bullet, Rule 7a's {authors} axis).
        await phase('disc', async () => {
            S.disc = {};
            await signIn(page, u('m1'));
            S.disc.m1TabBefore = L.tabShort(await L.openTab(page, app, cp));
            S.disc.dA = await L.openDiscussion(page, app, cp, s1.submissionId, names.dA, `Message A ${t}`, [/Ada Author/], 'disc-a');
            S.disc.dB = await L.openDiscussion(page, app, cp, s1.submissionId, names.dB, `Message B ${t}`, [/Ada Author/]);
            S.disc.dS2 = await L.openDiscussion(page, app, cp, s2.submissionId, names.dS2, `Message S2 ${t}`, [/Ada Author/], 'disc-s2');
            await signOut(page);
            for (const k of ['dA', 'dB', 'dS2']) {
                const au = await L.mailFor(app, {to: email('au'), subject: names[k]});
                const m1 = await L.mailFor(app, {to: email('m1'), subject: names[k]});
                S.disc[`${k}Author`] = au;
                S.disc[`${k}Manager`] = m1;
                links[k] = au.unsubscribeLink;
                links[`${k}m1`] = m1.unsubscribeLink;
            }
            record(`disc-mails-${app.name}`, {dA: S.disc.dAAuthor, dS2: S.disc.dS2Author});
        });

        // ---- footer: where the footer's submission link and journal-name link take the reader.
        await phase('footer', async () => {
            S.footer = {s2Footer: S.disc.dS2Author.textFooter, s1Footer: S.disc.dAAuthor.textFooter};
            const subLink = (S.disc.dS2Author.htmlFooterLinks || []).find((l) => /workflowSubmissionId=/.test(l.href));
            const homeLink = (S.disc.dS2Author.htmlFooterLinks || []).slice(-1)[0];
            S.footer.subLink = subLink;
            for (const who of ['au', 'm1']) {
                await signIn(page, u(who));
                const r = await page.goto(subLink.href);
                await idle(page).catch(() => {});
                await page.locator('[data-cy="sidemodal-header"], h1').first().waitFor({timeout: 30000}).catch(() => {});
                await idle(page).catch(() => {});
                const s = await L.snap(page, `footer-sublink-${who}-${app.name}`);
                S.footer[`subLink_${who}`] = {status: r && r.status(), url: page.url(), dialog: L.flat(s.text && s.text.dialog, 300), main: L.flat(s.text && s.text.main, 300)};
                await signOut(page);
            }
            const r = await page.goto(homeLink.href);
            const s = await L.snap(page, `footer-homelink-${app.name}`);
            S.footer.homeLink = {href: homeLink.href, text: homeLink.text, status: r && r.status(), title: s.title};
        });

        // ---- s6: scenario 6 as written.
        await phase('s6', async () => {
            S.s6 = {};
            await signIn(page, u('m1'));
            S.s6.page = await L.visitUnsubscribe(page, links.dA, `s6-page-as-m1-${app.name}`);
            const other = await context.newPage();
            other.on('dialog', (d) => d.accept().catch(() => {}));
            await other.goto(app.url(`/index.php/${cp}/dashboard/editorial`));
            await signOut(other);
            S.s6.stale = await L.pressUnsubscribe(page, `s6-stale-result-${app.name}`);
            await signIn(other, u('m1'));
            await other.close();
            S.s6.afresh = await L.visitUnsubscribe(page, links.dA, `s6-afresh-${app.name}`);
            const boxes = page.locator('.pkp_structure_main input[type=checkbox]');
            const n = await boxes.count();
            for (let i = 0; i < n; i++) {
                const id = await boxes.nth(i).getAttribute('id');
                if (id === 'emailNotificationNewQuery') await boxes.nth(i).check();
                else await boxes.nth(i).uncheck();
            }
            S.s6.beforePress = L.boxesShort(await L.readUnsubscribe(page));
            S.s6.result = await L.pressUnsubscribe(page, `s6-result-${app.name}`);
            S.s6.profile = await L.followProfile(page, null, `s6-profile-${app.name}`);
            S.s6.m1TabAfter = L.tabShort(await L.openTab(page, app, cp));
            await L.snap(page, `s6-tab-m1-after-${app.name}`);
            S.s6.m1TabUnchanged = JSON.stringify(S.s6.m1TabAfter) === JSON.stringify(S.disc.m1TabBefore);
            await signOut(page);
            await signIn(page, u('au'));
            S.s6.authorTab = L.tabShort(await L.openTab(page, app, cp));
            await L.snap(page, `s6-tab-author-${app.name}`);
            await signOut(page);
        });

        // ---- who: the sentence names the addressee whoever is signed in; the page left with a box changed.
        await phase('who', async () => {
            S.who = {};
            for (const k of ['r1', 'au']) {
                await signIn(page, u(k));
                const d = await L.visitUnsubscribe(page, links.dA, `who-page-as-${k}-${app.name}`);
                S.who[k] = {status: d.status, sentence: d.paragraphs && d.paragraphs[0], userMenu: d.userMenu, boxes: (d.boxes || []).length};
                await signOut(page);
            }
            const d = await L.visitUnsubscribe(page, links.dA, `who-page-signed-out-${app.name}`);
            S.who.signedOut = {status: d.status, sentence: d.paragraphs && d.paragraphs[0], header: d.hasHeader, title: d.title};
            const before = (S.dialogs || []).length;
            await page.locator('.pkp_structure_main input[type=checkbox]').first().uncheck();
            await page.locator('.pkp_structure_main input[type=checkbox]').first().blur();
            await page.goto(app.url(`/index.php/${cp}`));
            S.who.leaveWithChange = {landed: page.url(), dialogs: (S.dialogs || []).slice(before)};
            await L.snap(page, `who-left-changed-${app.name}`);
        });

        // ---- stalein: the page opened signed out, another tab signs in (and stays signed in), then "Unsubscribe".
        await phase('stalein', async () => {
            S.stalein = {};
            await signOut(page).catch(() => {});
            await L.visitUnsubscribe(page, links.dA, `stalein-page-${app.name}`);
            const other = await context.newPage();
            // Bounded: one OJS run hung here for 20 minutes (2026-10-20 r2) with no page error recorded.
            S.stalein.otherSignIn = await Promise.race([signIn(other, u('r1')).then(() => 'signed in'), L.sleep(60000).then(() => 'timeout 60 s')]);
            S.stalein.otherUrl = other.url();
            await other.close().catch(() => {});
            S.stalein.result = await L.pressUnsubscribe(page, `stalein-result-${app.name}`);
            S.stalein.afresh = await L.visitUnsubscribe(page, links.dA, `stalein-afresh-${app.name}`);
            await signOut(page);
        });

        // ---- sidetab: saving the tab changes only future events.
        await phase('sidetab', async () => {
            S.sidetab = {};
            const mailBefore = await L.mailCount(app, {to: email('au')});
            await signIn(page, u('au'));
            const before = await L.openTasks(page, app, cp, 'dashboard/mySubmissions', TasksPanel);
            S.sidetab.tasksBefore = {bell: before.bell, rows: before.rows};
            await before.panel.close().catch(() => page.keyboard.press('Escape'));
            const tab = await L.openTab(page, app, cp);
            const row = tab.find((r) => /^Discussion added\.?$/.test(r.sentence || ''));
            await page.locator(`#${row.enableId}`).uncheck();
            S.sidetab.saveStatus = await L.saveTab(page);
            S.sidetab.tabSamePage = L.tabShort(await L.readTab(page));
            await L.snap(page, `sidetab-tab-saved-${app.name}`);
            S.sidetab.tabReloaded = L.tabShort(await L.openTab(page, app, cp));
            await L.snap(page, `sidetab-tab-reloaded-${app.name}`);
            const after = await L.openTasks(page, app, cp, 'dashboard/mySubmissions', TasksPanel);
            S.sidetab.tasksAfter = {bell: after.bell, rows: after.rows};
            await L.snap(page, `sidetab-tasks-after-${app.name}`);
            await after.panel.close().catch(() => page.keyboard.press('Escape'));
            await signOut(page);
            await L.sleep(4000);
            S.sidetab.mail = {before: mailBefore, after: await L.mailCount(app, {to: email('au')})};
            // A future event: the Manager opens discussion C with the Author.
            await signIn(page, u('m1'));
            S.sidetab.dC = await L.openDiscussion(page, app, cp, s1.submissionId, names.dC, `Message C ${t}`, [/Ada Author/]);
            await signOut(page);
            S.sidetab.dCm1Mail = (await L.mailFor(app, {to: email('m1'), subject: names.dC})).found;
            S.sidetab.dCauMail = await L.mailCount(app, {to: email('au'), subject: names.dC});
            await signIn(page, u('au'));
            const later = await L.openTasks(page, app, cp, 'dashboard/mySubmissions', TasksPanel);
            S.sidetab.tasksLater = {bell: later.bell, rows: later.rows};
            await L.snap(page, `sidetab-tasks-later-${app.name}`);
            await signOut(page);
        });

        // ---- pdelete: another participant deleting their own row; the addressee deleting hers.
        await phase('pdelete', async () => {
            S.pdelete = {};
            await signIn(page, u('m1'));
            const w = await L.openTasks(page, app, cp, 'dashboard/editorial', TasksPanel);
            S.pdelete.m1RowsBefore = w.rows.map((r) => r.text);
            await L.tick(w.panel, names.dB);
            await w.panel.act('Delete');
            S.pdelete.m1RowsAfter = (await L.taskRows(w.panel)).map((r) => r.text);
            await L.snap(page, `pdelete-m1-after-delete-${app.name}`);
            await signOut(page);
            const a = await L.visitUnsubscribe(page, links.dB, `pdelete-author-link-after-m1-delete-${app.name}`);
            S.pdelete.authorLinkAfterM1Delete = {status: a.status, h1: a.h1, boxes: (a.boxes || []).length, sentence: a.paragraphs && a.paragraphs[0]};
            const m = await L.visitUnsubscribe(page, links.dBm1, `pdelete-m1-link-after-m1-delete-${app.name}`);
            S.pdelete.m1LinkAfterM1Delete = {status: m.status, h1: m.h1, body: m.bodyText};
            await signIn(page, u('au'));
            const wa = await L.openTasks(page, app, cp, 'dashboard/mySubmissions', TasksPanel);
            await L.tick(wa.panel, names.dB);
            await wa.panel.act('Delete');
            S.pdelete.auRowsAfter = (await L.taskRows(wa.panel)).map((r) => r.text);
            await signOut(page);
            const b = await L.visitUnsubscribe(page, links.dB, `pdelete-author-link-after-au-delete-${app.name}`);
            S.pdelete.authorLinkAfterAuDelete = {status: b.status, h1: b.h1, body: b.bodyText};
        });

        // ---- badge: marking and deleting, read after "Close"; the reader-side count afterwards.
        await phase('badge', async () => {
            S.badge = {steps: []};
            await signIn(page, u('m1'));
            const w = await L.openTasks(page, app, cp, 'dashboard/editorial', TasksPanel);
            const panel = w.panel;
            const step = async (label, fn) => {
                const dialogsBefore = (S.dialogs || []).length;
                await panel.open().catch(() => {});
                const rowsBefore = await L.taskRows(panel);
                await fn();
                const rowsAfter = await L.taskRows(panel);
                const bellOpen = await panel.count().catch(() => null);
                await panel.close();
                await idle(page);
                const bellClosed = await panel.count();
                await page.reload();
                await panel.bell().waitFor({timeout: 30000});
                await idle(page);
                const bellReloaded = await panel.count();
                S.badge.steps.push({label, unreadBefore: rowsBefore.filter((r) => r.unread).length, unreadAfter: rowsAfter.filter((r) => r.unread).length, rowsAfter: rowsAfter.length, bellWhileOpen: bellOpen, bellAfterClose: bellClosed, bellAfterReload: bellReloaded, dialogs: (S.dialogs || []).slice(dialogsBefore)});
                await L.snap(page, `badge-${label}-${app.name}`);
            };
            S.badge.start = {bell: w.bell, rows: w.rows.map((r) => `${r.unread ? 'U' : 'R'} ${r.text}`)};
            await panel.close();
            await step('mark-read', async () => { await L.tick(panel, names.dA); await panel.act('Mark Read'); });
            await step('mark-new', async () => { await L.tick(panel, names.dA); await panel.act('Mark New'); });
            await step('delete-unread', async () => { await L.tick(panel, names.dS2); await panel.act('Delete'); });
            await step('mark-read-c', async () => { await L.tick(panel, names.dC); await panel.act('Mark Read'); });
            await step('delete-read', async () => { await L.tick(panel, names.dC); await panel.act('Delete'); });
            S.badge.editorialBell = await panel.count();
            await page.goto(app.url(`/index.php/${cp}`));
            await idle(page);
            const s = await L.snap(page, `badge-reader-home-${app.name}`);
            S.badge.readerSide = await page.locator('#navigationUserWrapper > ul > li > a').first().innerText().then((x) => x.replace(/\s+/g, ' ').trim()).catch(() => null);
            S.badge.readerHeader = L.flat(s.text && s.text.header, 200);
            await signOut(page);
        });

        // ---- decision (OJS, OMP): "Request Revisions" with every "Enable…" unticked on the author's tab.
        if (app.name !== 'ops') {
            await phase('decision', async () => {
                S.decision = {s3: S.scratch.s3};
                const R = require('../../../../../apps/omp/playwright/pages/ReviewStagePages.js');
                await signIn(page, u('a2'));
                let tab = await L.openTab(page, app, cp);
                for (const r of tab) if (r.enable) await page.locator(`#${r.enableId}`).uncheck();
                S.decision.saveStatus = await L.saveTab(page);
                S.decision.tabAllOff = L.tabShort(await L.openTab(page, app, cp));
                await L.snap(page, `decision-tab-a2-${app.name}`);
                const before = await L.openTasks(page, app, cp, 'dashboard/mySubmissions', TasksPanel);
                S.decision.tasksBefore = before.rows.map((r) => r.text);
                await signOut(page);
                await signIn(page, u('m1'));
                await page.goto(app.url(`/index.php/${cp}/en/dashboard/editorial?workflowSubmissionId=${s3.submissionId}`));
                await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60000});
                await idle(page);
                await L.snap(page, `decision-workflow-${app.name}`);
                await R.requestRevisions(page, R.workflowModal(page), {newRound: false});
                await L.snap(page, `decision-recorded-${app.name}`);
                await signOut(page);
                await signIn(page, u('a2'));
                const after = await L.openTasks(page, app, cp, 'dashboard/mySubmissions', TasksPanel);
                S.decision.tasksAfter = {bell: after.bell, rows: after.rows};
                await L.snap(page, `decision-tasks-a2-${app.name}`);
                await after.panel.close().catch(() => {});
                tab = await L.openTab(page, app, cp);
                S.decision.tabSentences = tab.map((r) => r.sentence);
                await signOut(page);
            });
        }

        // ---- stats: the statistics report's email footer and its link (Rule 7a; scheduled task, no screen).
        await phase('stats', async () => {
            S.stats = {};
            const r = await app.api.runTask({task: 'statisticsReport', context: cp});
            S.stats.task = {notified: r.notified, mailed: r.mailed, jobs: r.jobs};
            const m = await L.mailFor(app, {to: email('m1'), subject: 'activity for'});
            S.stats.m1Mail = m;
            if (m.unsubscribeLink) {
                const d = await L.visitUnsubscribe(page, L.onProbeServer(app, m.unsubscribeLink), `stats-page-${app.name}`);
                S.stats.page = {status: d.status, sentence: d.paragraphs && d.paragraphs[0], boxes: L.boxesShort(d)};
            }
            await signIn(page, u('m1'));
            const w = await L.openTasks(page, app, cp, 'dashboard/editorial', TasksPanel);
            S.stats.m1Rows = w.rows.map((x) => `${x.unread ? 'U' : 'R'} ${x.text} | ${x.title}`);
            // A7's open half: the statistics task deleted from the panel, then the email's link again.
            const statsRow = w.rows.find((x) => /editorial report/i.test(x.text));
            S.stats.statsRow = statsRow ? statsRow.text : null;
            if (statsRow) {
                await L.tick(w.panel, statsRow.text);
                await w.panel.act('Delete');
                S.stats.m1RowsAfterDelete = (await L.taskRows(w.panel)).map((x) => x.text);
                await L.snap(page, `stats-tasks-after-delete-${app.name}`);
            }
            await signOut(page);
            if (m.unsubscribeLink) {
                const d = await L.visitUnsubscribe(page, L.onProbeServer(app, m.unsubscribeLink), `stats-page-after-task-delete-${app.name}`);
                S.stats.pageAfterTaskDelete = {status: d.status, h1: d.h1, sentence: d.paragraphs && d.paragraphs[0], boxes: (d.boxes || []).length};
            }
        });

        // ---- templates: the footer is not part of the templates (Emails management).
        await phase('templates', async () => {
            S.templates = {};
            const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
            await signIn(page, u('m1'));
            const me = new ManageEmailsPage(page, cp);
            for (const name of ['New Announcement', 'Statistics Report Notification']) {
                await me.goto();
                await me.waitForList();
                let opened = null;
                try {
                    opened = await me.openEmail(name);
                } catch (error) {
                    S.templates[name] = {error: L.flat(error.message, 300)};
                    await L.snap(page, `templates-${name.replace(/\W+/g, '-')}-error-${app.name}`);
                    continue;
                }
                let win = opened.window;
                if (opened.kind === 'several') {
                    const rowNames = await win.locator('.listPanel__item').allInnerTexts();
                    await me.openTemplate(win, (rowNames[0] || '').split('\n')[0]).catch(() => {});
                    win = me.templateWindow();
                }
                const body = await me.bodyHtml().catch((e) => `error: ${L.flat(e.message, 120)}`);
                const s = await L.snap(page, `templates-${name.replace(/\W+/g, '-')}-${app.name}`);
                S.templates[name] = {kind: opened.kind, bodyHasFooter: /unsubscribe|—/i.test(body || ''), body: L.flat(body, 900), insertContent: L.flat(s.text && s.text.dialog, 300)};
                await page.keyboard.press('Escape').catch(() => {});
            }
            await signOut(page);
        });

        // ---- register: the Register page's "notified" box.
        await phase('register', async () => {
            await page.goto(app.url(`/index.php/${cp}/user/register`));
            await idle(page);
            const s = await L.snap(page, `register-${app.name}`);
            S.register = {boxes: await page.locator('input[type=checkbox]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, label: ((e.closest('label') || document.querySelector(`label[for="${e.id}"]`) || e.parentElement || {}).innerText || '').replace(/\s+/g, ' ').trim()})))};
        });
    } finally {
        record(`sw3-summary-${app.name}`, S);
        if (S.problems.length) note(`ccSW3 [${app.name}] sw3.js phases with problems: ${S.problems.map((p) => p.phase).join(', ')} (see sw3-summary)`);
        await close();
    }
});
