// U56 claim check, chunk C56 (housekeeping 2026-10-13): incidentals row 18.
// pkp-lib's fr_CA and nb_NO email texts that still name {$journalName}, on a press and a
// preprint server (only OJS's installer renames it to {$contextName}). OJS is the control.
// docs/specs/U56-emails-management.md (Cross-feature interactions, register A1's wording
// family); the walked emails:
//   fr_CA  "Editorial Reminder" body (OJS, OMP; a preprint server has no such email)
//   nb_NO  "Revisions Requested" and "Notify Reviewers of Decision" (the Request Revisions
//          composer, switched to Norwegian), "Notify Other Authors" (a decision recorded with
//          the interface in Norwegian), "Review Acknowledgement" ("Thank Reviewer" in Norwegian),
//          "Editorial Reminder" subject (Manage Emails)
//
// PHASE=fr  (no site change; run under `bin/app-lock.sh shared <app>`)
//   A scratch context F, primary language French (Canada), English second, manager mg,
//   author au, one submission at the Submission stage with mg assigned. Manage Emails ›
//   "Editorial Reminder" › its template in French; then the routine task's job for F alone
//   (cli-editorial-reminder.php, then the app's own job runner) and the French mail in Mailpit.
// PHASE=nb  (installs Norwegian on the site and removes it again in a finally; run as ONE
//   command under `bin/app-lock.sh exclusive <app>`). On main since 2026-09-30 "Install Locale"
//   offers no nb_NO (the build's Weblate list names Norwegian Bokmål "nb"): the phase then reads
//   the window, records what it offers and stops, changing nothing (a shared lock is enough).
//   Administration › Site Settings › Languages › "Install Locale" nb_NO; a scratch context N
//   (English primary, Norwegian under UI and Forms), mg, au, rv (not OPS), contributors without
//   accounts; Manage Emails reads; s1 Request Revisions in English with "Switch to" Norwegian
//   (OJS, OMP); s2 a decline recorded with the interface in Norwegian (all apps); s3 "Thank
//   Reviewer" in Norwegian (OJS, OMP); the mails in Mailpit; then nb_NO removed.
//
//   PHASE=fr PROBE_RUN=r1 PROBE_FEATURE=U56 PROBE_AGENT=ccC56 bin/app-lock.sh shared omp -- \
//       node bin/probe.js omp shared/playwright/checks/U56/C56/c56.js
//   PHASE=nb PROBE_RUN=r1 PROBE_FEATURE=U56 PROBE_AGENT=ccC56 bin/app-lock.sh exclusive omp -- \
//       node bin/probe.js omp shared/playwright/checks/U56/C56/c56.js
//
// No assertions: every screen is recorded with screen()/shot(); facts-<run>-<app>.json collects
// the structured reads; the console carries [app label] lines.
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, drainJobs, serverLog} =
    require('../../../probe');

const PHASE = process.env.PHASE || 'fr';
const RUN = process.env.PROBE_RUN || 'r0';
const CLI = path.join(__dirname, 'cli-editorial-reminder.php');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
// Every place a text names a placeholder or the context's name.
const placeholders = (s) => [...new Set((String(s || '').match(/\{\$[A-Za-z]+\}/g) || []))];
const around = (s, needle, n = 90) => {
    const t = String(s || ''); const i = t.indexOf(needle);
    return i < 0 ? null : t.slice(Math.max(0, i - n), i + needle.length + n).replace(/\s+/g, ' ');
};

forEachApp(async (app) => {
    const ops = app.name === 'ops';
    const log = (k, v) => console.log(`[${app.name} ${RUN} ${k}]`, typeof v === 'string' ? v : JSON.stringify(v).slice(0, 2500));
    const F = (k, v) => { record('facts', {[k]: v}, {merge: true}); log(k, v); };
    const person = (t, k, g, f, roles) => ({username: `${t}${k}`, givenName: g, familyName: f, email: `${t}${k}@mail.test`, roles});
    const ctxUrl = (t, p, seg = '/en') => app.url(`/index.php/${t}${seg}${p}`);
    const srvLog = serverLog(app);

    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { log('browser-dialog', `${d.type()} ${d.message()}`); await d.accept().catch(() => {}); });
    let n = 0;
    const snap = async (label, extra) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) s.extra = extra;
        const name = `${PHASE}-${String(++n).padStart(2, '0')}-${label}`;
        record(name, s);
        await shot(page, name).catch(() => {});
        return {name, s};
    };

    // ---------------------------------------------------------------- Manage Emails (K4's idioms)
    const tplDlg = () => page.getByRole('dialog', {name: 'Edit Template'}).last();
    async function openManage(t) {
        await page.goto(ctxUrl(t, '/management/settings/manageEmails'));
        await idle(page);
        await page.locator('main').getByRole('button', {name: /^Edit /}).first().waitFor({timeout: 30000});
    }
    const rowNames = () => page.evaluate(() => [...document.querySelectorAll('.manageEmails__listPanel .listPanel__item .listPanel__itemTitle')].map((e) => e.innerText.trim()));
    async function closeTop() {
        const d = page.locator('[role="dialog"]:visible').last();
        const c = d.getByRole('button', {name: 'Close', exact: true}).first();
        if (await c.count()) await c.click().catch(() => {}); else await page.keyboard.press('Escape').catch(() => {});
        await sleep(800);
    }
    // Open an email's window and its (first) template; read every language's fields.
    async function readTemplate(t, name, label) {
        await openManage(t);
        const out = {email: name};
        const btn = page.locator('main').getByRole('button', {name: `Edit ${name}`, exact: true});
        out.listed = await btn.count();
        if (!out.listed) { out.rows = await rowNames(); await snap(`${label}-absent`, out); return out; }
        await loc(page, `Manage Emails: "Edit ${name}"`, btn);
        const respP = page.waitForResponse((r) => /api\/v1\/(mailables|emailTemplates)\//.test(r.url()) && r.request().method() === 'GET', {timeout: 20000}).catch(() => null);
        await btn.click();
        const r = await respP;
        out.kind = r && /mailables/.test(r.url()) ? 'multi' : 'single';
        await idle(page);
        if (out.kind === 'multi') {
            const win = page.getByRole('dialog', {name, exact: true}).last();
            await win.waitFor({timeout: 20000}).catch(() => {});
            out.windowRows = await win.locator('.listPanel__item').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
            await snap(`${label}-window`, out);
            await win.locator('.listPanel__item').first().getByRole('button', {name: 'Edit', exact: true}).click();
        }
        const d = tplDlg();
        await d.waitFor({timeout: 20000});
        await idle(page);
        // press every language toggle so each language's boxes are drawn
        const toggles = d.locator('button[aria-pressed]:not(.tox-tbtn):not([class*="tox-"])');
        out.toggles = await toggles.evaluateAll((els) => els.map((b) => `${b.innerText.trim()}:${b.getAttribute('aria-pressed')}`));
        for (let i = 0; i < await toggles.count(); i++) {
            if ((await toggles.nth(i).getAttribute('aria-pressed')) !== 'true') { await toggles.nth(i).click(); await sleep(600); }
        }
        await page.waitForFunction(() => window.tinymce && window.tinymce.get().filter((e) => /editEmailTemplate-body/.test(e.id)).every((e) => e.initialized), null, {timeout: 15000}).catch(() => {});
        await sleep(500);
        Object.assign(out, await d.evaluate((el) => ({
            inputs: [...el.querySelectorAll('input')].filter((e) => /^(name|subject)-/.test(e.name)).map((e) => ({name: e.name, value: e.value})),
            bodies: (window.tinymce ? window.tinymce.get() : []).filter((e) => /editEmailTemplate-body/.test(e.id)).map((e) => ({id: e.id, html: e.getContent()})),
            labels: [...el.querySelectorAll('label, .pkpFormFieldLabel')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean),
        })));
        out.found = {};
        for (const b of out.bodies) out.found[b.id] = {placeholders: placeholders(b.html), journalName: around(b.html, '{$journalName}'), contextName: around(b.html, '{$contextName}')};
        for (const i of out.inputs) if (/^subject-/.test(i.name)) out.found[i.name] = {value: i.value, placeholders: placeholders(i.value)};
        out.bodies = out.bodies.map((b) => ({id: b.id, html: b.html.slice(0, 2500)}));
        await snap(`${label}-template`, {found: out.found});
        await closeTop();
        if (out.kind === 'multi') await closeTop();
        F(label, {email: name, kind: out.kind, toggles: out.toggles, found: out.found});
        return out;
    }

    // ---------------------------------------------------------------- Mailpit
    async function mailTo(email, label, since, opts = {}) {
        try {
            const m = await app.mail.find({to: email, since, timeoutMs: 30000, ...opts});
            const full = await app.mail.fullMessage(m.ID).catch(() => null);
            const text = full ? (full.Text || '') : '';
            const html = full ? (full.HTML || '') : '';
            const out = {to: email, subject: m.Subject, from: m.From, date: m.Created,
                subjectPlaceholders: placeholders(m.Subject), textPlaceholders: placeholders(text), htmlPlaceholders: placeholders(html),
                journalNameText: around(text, '{$journalName}'), journalNameHtml: around(html, '{$journalName}', 140), text: flat(text, 2500)};
            record(`${PHASE}-mail-${label}`, out);
            log(`mail ${label}`, {subject: out.subject, placeholders: out.textPlaceholders, journalName: out.journalNameText});
            return out;
        } catch (e) {
            const out = {to: email, none: true, error: flat(e.message, 300)};
            record(`${PHASE}-mail-${label}`, out);
            log(`mail ${label}`, out);
            return out;
        }
    }

    // ---------------------------------------------------------------- the decision page (U34 K2's idioms)
    const wiz = () => page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const main = document.querySelector('main') || document.body;
        const eds = window.tinymce ? (window.tinymce.get() || []) : [];
        const ed = eds.find((x) => { try { const c = x.getContainer(); return c && c.getClientRects().length; } catch (_) { return false; } }) || eds[0];
        const subj = [...main.querySelectorAll('input')].filter(vis).find((i) => /subject/i.test(i.name || i.id || ''));
        const locs = main.querySelector('.composer__locales');
        return {url: location.href, h1: (main.querySelector('h1') || {}).innerText || null,
            rail: [...main.querySelectorAll('ol li, ul li')].filter((li) => li.closest('[aria-label]') && /step/i.test(li.closest('[aria-label]').getAttribute('aria-label'))).map((li) => li.innerText.trim().replace(/\s+/g, ' ')).slice(0, 8),
            headings: [...main.querySelectorAll('h2')].filter(vis).map((h) => h.innerText.trim()).slice(0, 6),
            subject: subj ? subj.value : null, body: ed ? ed.getContent() : null,
            switchTo: locs ? {text: locs.innerText.trim().replace(/\s+/g, ' '), buttons: [...locs.querySelectorAll('button')].map((b) => b.innerText.trim())} : null,
            buttons: [...main.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60)};
    });
    async function readWiz(label) {
        await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30000}).catch(() => {});
        await idle(page);
        await page.waitForFunction(() => { const m = document.querySelector('main') || document.body; if (!m.querySelector('.composer')) return true; const i = [...m.querySelectorAll('input')].find((x) => /subject/i.test(x.name || x.id || '')); return i && i.value.length > 0; }, null, {timeout: 15000}).catch(() => {});
        await sleep(400);
        const w = await wiz();
        w.found = {subject: placeholders(w.subject), body: placeholders(w.body), journalName: around(w.body, '{$journalName}')};
        await snap(label, {found: w.found, subject: w.subject, switchTo: w.switchTo, rail: w.rail});
        log(label, {h1: w.h1, h2: w.headings, subject: w.subject, found: w.found, switchTo: w.switchTo});
        return w;
    }
    // "Switch to" › the Norwegian link › the confirmation's "Switch to …" (English interface)
    async function switchToNorwegian(label) {
        const btn = page.locator('.composer__locales button').filter({hasNotText: /^\s*English\s*$/}).first();
        if (!(await btn.count())) return {noLink: true};
        await loc(page, 'decision page: the composer\'s "Switch to" Norwegian link', btn);
        const linkText = (await btn.innerText()).trim();
        await btn.click(); await sleep(600);
        const dlg = page.locator('[role="dialog"]:visible').last();
        const dialogText = flat(await dlg.innerText().catch(() => ''), 400);
        await snap(`${label}-switch-dialog`, {linkText, dialogText});
        await dlg.getByRole('button', {name: /^Switch to/}).first().click();
        await sleep(600);
        const w = await readWiz(`${label}-switched`);
        return {linkText, dialogText, subject: w.subject, found: w.found};
    }
    async function pressByText(re) {
        const b = page.locator('main button:visible').filter({hasText: re}).first();
        if (!(await b.count())) return false;
        await b.click(); await idle(page); await sleep(500);
        return true;
    }

    try {
        // ================================================================ PHASE fr
        if (PHASE === 'fr') {
            const t = tag('u56c56f');
            await app.api.createContext({tag: t, context: {name: `C56 French ${t}`, acronym: 'C56F', primaryLocale: 'fr_CA', supportedLocales: ['fr_CA', 'en'], supportedFormLocales: ['fr_CA', 'en'], contactName: 'C56 Contact', contactEmail: `${t}ct@mail.test`},
                users: [person(t, 'mg', 'Marie', 'Gestion', ['manager']), person(t, 'au', 'Amélie', 'Auteur', ['author'])]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `C56 rappel ${t}`, participants: [{username: `${t}mg`, role: 'manager'}]});
            F('seed', {tag: t, submissionId: sub.submissionId});
            await signIn(page, `${t}mg`, {contextPath: t});
            await idle(page);
            await openManage(t);
            const rows = await rowNames();
            await snap('manage-emails', {rows});
            F('manageRows', {count: rows.length, reminder: rows.filter((r) => /Reminder|Rappel/i.test(r))});
            const tpl = await readTemplate(t, 'Editorial Reminder', 'reminder');
            if (tpl.listed && !ops) {
                const since = new Date(Date.now() - 1000);
                const mark = srvLog.mark();
                let cli;
                try {
                    cli = execFileSync('php', [CLI, app.root, t], {cwd: app.root, env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout: 120000}).trim();
                } catch (e) { cli = {error: `${e.stdout || ''}${e.stderr || ''}${e.message}`.slice(0, 800)}; }
                const drained = await drainJobs(app).catch((e) => ({error: flat(e.message, 300)}));
                F('reminderRun', {cli, drained: {passes: drained.passes, counts: drained.counts, error: drained.error, tail: flat(String(drained.output || '').slice(-600), 600)}, serverLog: srvLog.since(mark)});
                const m = await mailTo(`${t}mg@mail.test`, 'reminder-mg', since);
                F('reminderMail', {subject: m.subject, textPlaceholders: m.textPlaceholders, htmlPlaceholders: m.htmlPlaceholders, journalName: m.journalNameText || m.journalNameHtml, contextNameShown: m.text ? m.text.includes(`C56 French ${t}`) : null, none: m.none});
            }
            await signOut(page).catch(() => {});
        }

        // ================================================================ PHASE nb
        if (PHASE === 'nb') {
            const {SiteLanguagesList} = require(path.resolve(__dirname, '../../../pages/LanguagesPages.js'));
            const site = new SiteLanguagesList(page);
            let installed = false;
            try {
                await signIn(page, 'admin');
                await idle(page);
                await site.goto();
                const before = await site.codes();
                await snap('site-languages-before', {codes: before});
                if (!before.includes('nb_NO')) {
                    // On main since 2026-09-30 the build's Weblate language list names Norwegian
                    // Bokmål "nb", so "Install Locale" offers no nb_NO box: record that and stop.
                    const win = await site.openInstall();
                    const offered = await page.locator('form#installLanguageForm input[type=checkbox]').evaluateAll((els) => els.map((e) => e.value));
                    await snap('install-window', {offered, nb: offered.filter((v) => /^nb|^no/.test(v))});
                    await win.cancel();
                    if (!offered.includes('nb_NO')) {
                        F('install', {offered: offered.length, nbOffered: false, nbLike: offered.filter((v) => /^nb|^no/.test(v))});
                        await signOut(page).catch(() => {});
                        return;
                    }
                    const t0 = Date.now();
                    const resp = await site.install(['nb_NO']);
                    installed = true;
                    await site.reload();
                    const after = await site.codes();
                    await snap('site-languages-installed', {codes: after});
                    F('install', {status: resp && resp.status(), ms: Date.now() - t0, codes: after});
                } else {
                    F('install', {alreadyInstalled: true, codes: before});
                }
                await signOut(page).catch(() => {});

                const t = tag('u56c56n');
                const users = [person(t, 'mg', 'Mona', 'Manager', ['manager']), person(t, 'au', 'Ada', 'Author', ['author'])];
                if (!ops) users.push(person(t, 'rv', 'Rolf', 'Reviewer', ['externalReviewer']));
                await app.api.createContext({tag: t, context: {name: `C56 Norsk ${t}`, acronym: 'C56N', supportedLocales: ['en', 'nb_NO'], supportedFormLocales: ['en', 'nb_NO'], contactName: 'C56 Contact', contactEmail: `${t}ct@mail.test`}, users});
                const mg = `${t}mg`;
                const co = (k, g) => ({givenName: g, familyName: 'Nordmann', email: `${t}${k}@mail.test`});
                const seeds = {s2: {title: `C56 S2 avvis ${t}`, participants: [{username: mg, role: 'manager'}], contributors: [co('co2', 'Kari')]}};
                if (!ops) {
                    const done = {username: `${t}rv`, status: 'completed', comments: `C56 review comments ${t}.`};
                    seeds.s1 = {title: `C56 S1 revisions ${t}`, participants: [{username: mg, role: 'manager'}], contributors: [co('co1', 'Ola')], decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [done]}]};
                    seeds.s3 = {title: `C56 S3 takk ${t}`, participants: [{username: mg, role: 'manager'}], decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [done]}]};
                }
                const S = {};
                for (const [k, spec] of Object.entries(seeds)) {
                    const r = await app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: `${t}au`, ...spec});
                    S[k] = {id: r.submissionId, round: r.reviewRounds && r.reviewRounds[0] ? `workflow_${r.reviewRounds[0].stageId}_${r.reviewRounds[0].id}` : null};
                }
                F('seed', {tag: t, S});
                const wf = (k, seg) => ctxUrl(t, `/dashboard/editorial?workflowSubmissionId=${S[k].id}${S[k].round ? `&workflowMenuKey=${S[k].round}` : (ops ? '&workflowMenuKey=workflow_5' : '')}`, seg);

                await signIn(page, mg, {contextPath: t});
                await idle(page);
                // Manage Emails: the stored Norwegian texts
                await readTemplate(t, 'Notify Other Authors', 'tpl-other-authors');
                await readTemplate(t, 'Editorial Reminder', 'tpl-reminder');
                if (!ops) {
                    await readTemplate(t, 'Revisions Requested', 'tpl-revisions');
                    await readTemplate(t, 'Review Acknowledgement', 'tpl-review-ack');
                }

                // s1: Request Revisions, English interface, each composer switched to Norwegian
                if (!ops) {
                    await page.goto(wf('s1')); await idle(page);
                    const wdlg = page.locator('[role="dialog"]:visible').first();
                    await wdlg.waitFor({timeout: 30000});
                    await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
                    await idle(page);
                    await snap('s1-workflow');
                    await wdlg.getByRole('button', {name: 'Request Revisions', exact: true}).first().click();
                    await idle(page);
                    for (let i = 0; i < 3 && !/decision\/record/.test(page.url()); i++) {
                        await sleep(1000);
                        const nx = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Next|Continue)$/}).first();
                        if (await nx.count()) { await snap(`s1-choice-${i + 1}`); await nx.click(); await idle(page); }
                    }
                    await page.waitForURL(/decision\/record/, {timeout: 20000}).catch(() => {});
                    const since = new Date(Date.now() - 1000);
                    const pages = [];
                    for (let p = 1; p < 6; p++) {
                        const w = await readWiz(`s1-p${p}`);
                        const entry = {h2: w.headings, subjectBefore: w.subject, foundBefore: w.found, switchTo: w.switchTo};
                        if (w.switchTo) entry.switched = await switchToNorwegian(`s1-p${p}`);
                        pages.push(entry);
                        if (await page.getByRole('button', {name: 'Record Decision', exact: true}).isVisible().catch(() => false)) break;
                        const cont = page.getByRole('button', {name: 'Continue', exact: true}).first();
                        if (!(await cont.isVisible().catch(() => false))) break;
                        await cont.click(); await idle(page); await sleep(400);
                    }
                    F('s1-pages', pages);
                    await page.getByRole('button', {name: 'Record Decision', exact: true}).first().click();
                    await idle(page); await sleep(2500);
                    await snap('s1-recorded');
                    await drainJobs(app).catch(() => {});
                    F('s1-mails', {
                        author: await mailTo(`${t}au@mail.test`, 's1-author', since),
                        reviewer: await mailTo(`${t}rv@mail.test`, 's1-reviewer', since),
                        contributor: await mailTo(`${t}co1@mail.test`, 's1-contributor', since),
                    });
                }

                // s2: a decline recorded with the interface in Norwegian
                {
                    await page.goto(wf('s2', '/nb_NO')); await idle(page);
                    const wdlg = page.locator('[role="dialog"]:visible').first();
                    await wdlg.waitFor({timeout: 30000});
                    await page.waitForFunction(() => !/Loading|Laster/.test(document.body.innerText), null, {timeout: 15000}).catch(() => {});
                    await idle(page); await sleep(500);
                    const actions = await wdlg.locator('[data-cy="workflow-action-items"] button').allInnerTexts().catch(() => []);
                    await snap('s2-workflow-nb', {actions});
                    const decline = wdlg.locator('[data-cy="workflow-action-items"] button').filter({hasText: /Avvis/}).first();
                    const out = {actions: actions.map((a) => a.trim())};
                    if (await decline.count()) {
                        out.pressed = (await decline.innerText()).trim();
                        await decline.click(); await idle(page);
                        await page.waitForURL(/decision\/record/, {timeout: 20000}).catch(() => {});
                        const since = new Date(Date.now() - 1000);
                        out.pages = [];
                        for (let p = 1; p < 6; p++) {
                            const w = await readWiz(`s2-p${p}-nb`);
                            out.pages.push({h2: w.headings, subject: w.subject, found: w.found, switchTo: w.switchTo, buttons: w.buttons.slice(-6)});
                            if (await page.locator('main button:visible').filter({hasText: /^\s*Registrer beslutning\s*$/}).count()) break;
                            if (!(await pressByText(/^\s*Fortsett\s*$/))) break;
                        }
                        out.recorded = await pressByText(/^\s*Registrer beslutning\s*$/);
                        await sleep(2500);
                        await snap('s2-recorded-nb');
                        await drainJobs(app).catch(() => {});
                        out.mails = {
                            author: await mailTo(`${t}au@mail.test`, 's2-author', since),
                            contributor: await mailTo(`${t}co2@mail.test`, 's2-contributor', since),
                        };
                    }
                    F('s2', out);
                }

                // s3: "Thank Reviewer" with the interface in Norwegian
                if (!ops) {
                    await page.goto(wf('s3', '/nb_NO')); await idle(page);
                    await page.locator('[role="dialog"]:visible').first().waitFor({timeout: 30000});
                    await page.waitForFunction(() => !/Loading|Laster/.test(document.body.innerText), null, {timeout: 15000}).catch(() => {});
                    await idle(page); await sleep(800);
                    const row = page.locator('table tr').filter({hasText: 'Rolf Reviewer'}).first();
                    const out = {rowButtons: await row.locator('button').allInnerTexts().catch(() => [])};
                    await snap('s3-round-nb', out);
                    const thank = row.locator('button').filter({hasText: /Takk/}).first();
                    if (await thank.count()) {
                        await loc(page, 'review round (nb_NO): the reviewer row\'s "Takk fagfelle"', thank);
                        await thank.click();
                        const form = page.locator('form#sendThankYouForm');
                        await form.waitFor({timeout: 30000});
                        await page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && e.getContent().length > 0), null, {timeout: 15000}).catch(() => {});
                        await idle(page); await sleep(500);
                        out.message = await page.evaluate(() => { const e = (window.tinymce.get() || []).find((x) => x.getElement() && x.getElement().closest('#sendThankYouForm')); return e ? e.getContent() : null; });
                        out.found = {placeholders: placeholders(out.message), journalName: around(out.message, '{$journalName}')};
                        out.formButtons = await form.locator('button, input[type=submit], a.cancelButton').allInnerTexts().catch(() => []);
                        await snap('s3-thank-window-nb', {found: out.found, formButtons: out.formButtons});
                        const since = new Date(Date.now() - 1000);
                        await form.locator('button[type="submit"], button.submitFormButton').first().click();
                        await form.waitFor({state: 'hidden', timeout: 20000}).catch(() => {});
                        await idle(page); await sleep(1500);
                        await snap('s3-thanked-nb');
                        await drainJobs(app).catch(() => {});
                        out.mail = await mailTo(`${t}rv@mail.test`, 's3-reviewer', since);
                    }
                    out.message = out.message ? out.message.slice(0, 2000) : out.message;
                    F('s3', out);
                }
                await signOut(page).catch(() => {});
            } finally {
                // put the site back: nb_NO removed, confirmed on the list after a reload
                if (installed) {
                    try {
                        await signIn(page, 'admin');
                        await idle(page);
                        const removed = await site.removeIfInstalled('nb_NO');
                        await site.goto();
                        const codes = await site.codes();
                        await snap('site-languages-restored', {codes});
                        F('restore', {removed, codes});
                    } catch (e) {
                        F('restore', {error: flat(e.stack || e.message, 800)});
                        note(`C56 (${app.name}): removing nb_NO after the nb phase failed: ${flat(e.message, 200)}; the site still carries Norwegian until a manager removes it on Administration › Site Settings › Languages.`);
                    }
                }
            }
        }
    } catch (e) {
        log('ERROR', flat(e.stack || e.message, 1200));
        await snap('zz-error', {error: flat(e.stack || e.message, 1200)}).catch(() => {});
    } finally {
        await close();
    }
});
