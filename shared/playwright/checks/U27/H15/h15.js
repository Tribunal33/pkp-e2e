// U27 claim check, housekeeping chunk H15 (cc27a, 2026-10-15): three incidentals rows
// (.reports/U27/chunk-H15.md), driven on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"; journal and press `publicknowledge`, users from docs/process/dataset.md).
// The kit builds nothing on the fleet; every phase starts from a freshly reset fleet.
//
//   dl      U27 Rule 15, Review Details › "Download Review Form", as `dbarnes` on a completed review
//           (OJS submission 10, Aisla McCrae; OMP submission 16, Adela Gallego). The fleet's files
//           folder is read for `temp` before and after every press. ORDER=xml-first (default):
//           All Sections XML, again, Author-Only XML, All Sections PDF, All Sections XML.
//           ORDER=pdf-first: All Sections PDF, All Sections XML, Author-Only XML.
//   rawkey  U27 "Add Reviewer": every raw locale key (`##key##`) on the dashboard, the workflow and
//           with the "Add Reviewer" window open, as `dbarnes` (English, then French) and as the
//           section editor `dbuskins` (OJS 12; OMP 16 and 9); OPS (no review stage): the dashboard
//           and a workflow as a control. The window is left once with a reviewer picked, unsaved.
//   mail    U28 Side effects "Submitting": who receives "Review complete" (OJS 12, OMP 17). `dbarnes`
//           reads the stage's "Assign" window's role list and assigns through it (OJS: Minoti Inoue
//           as Section editor; OMP: Minoti Inoue as Series editor, Daniel Barnes as Press editor;
//           a manager group is assigned when the list offers it). Then `jjanssen` submits in the
//           English interface and `phudson` in the French one; every editor's mail since each
//           submit is read (fleetMail), with its subject, sender and the language of its links.
//
// Reset first (each phase needs a fresh fleet: dl reads a files folder with no `temp`, mail the
// unanswered requests): npm run fleet-prep -- --feature issues-cc27a --dataset 4 --reset
// Run, one app per call on `main` (OPS only takes rawkey):
//   PHASES=dl ORDER=xml-first PROBE_RUN=r1 PROBE_FEATURE=issues-cc27a PKP_E2E_DATASET=4 PROBE_AGENT=cc27a \
//     bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U27/H15/h15.js
// Facts: .reports/issues-cc27a/cc27a/h15-<phase>[-<order>]-<run>-<app>.json, snapshots beside them.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, switchLanguage, screen, shot, record, loc, idle, rawKeys, sql, serverLog, outFile} =
    require('../../../probe');

const PHASES = (process.env.PHASES || 'dl,rawkey,mail').split(',');
const ORDER = process.env.ORDER || 'xml-first';
const T = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

const CASES = {
    ojs: {
        dl: {id: 10, reviewer: 'Aisla McCrae'},
        rawkey: [{user: 'dbarnes', id: 12, french: true}, {user: 'dbuskins', id: 12}],
        mail: {id: 12, rec: 'Accept Submission', r1: ['jjanssen', 'Julie Janssen'], r2: ['phudson', 'Paul Hudson'],
            assign: [['Section editor', 'Minoti Inoue'], ['Journal manager', 'Ramiro Vaca']],
            editors: ['dbarnes', 'dbuskins', 'sberardo', 'minoue', 'rvaca']},
    },
    omp: {
        dl: {id: 16, reviewer: 'Adela Gallego'},
        rawkey: [{user: 'dbarnes', id: 16, french: true}, {user: 'dbuskins', id: 9}],
        mail: {id: 17, rec: null, r1: ['jjanssen', 'Julie Janssen'], r2: ['phudson', 'Paul Hudson'],
            assign: [['Series editor', 'Minoti Inoue'], ['Press editor', 'Daniel Barnes'], ['Press manager', 'Ramiro Vaca']],
            editors: ['dbarnes', 'dbuskins', 'sberardo', 'minoue', 'rvaca']},
    },
    ops: {rawkey: [{user: 'dbarnes', id: 1, french: true}, {user: 'dbuskins', id: 1}]},
};

forEachApp(async (app) => {
    const C = CASES[app.name];
    const {page, close} = await launch(app);
    const ctx = app.contextPath;
    const u = (p) => app.url(`/index.php/${ctx}${p}`);
    const net = [];
    page.on('response', (r) => {
        const url = r.url();
        if (/export|temporaryFile|\$\$\$call\$\$\$|\/api\//.test(url)) {
            net.push({t: Date.now(), m: r.request().method(), s: r.status(), u: url.replace(/^https?:\/\/[^/]+/, ''), cd: r.headers()['content-disposition'] || null});
        }
    });
    const since = (t0) => net.filter((e) => e.t >= t0).map(({m, s, u: url, cd}) => `${m} ${s} ${url}${cd ? ` [${cd}]` : ''}`);
    const log = serverLog(app);
    const snaps = [];
    const snap = async (label) => {
        const s = await screen(page).catch((e) => ({error: flat(e.message)}));
        record(`h15-${label}`, s);
        await shot(page, `h15-${label}`).catch(() => {});
        snaps.push(label);
        return s;
    };
    const filesDir = (() => {
        const m = fs.readFileSync(app.configFile, 'utf8').match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m);
        return m ? m[1] : null;
    })();
    const tempState = () => {
        const dir = filesDir && path.join(filesDir, 'temp');
        if (!dir || !fs.existsSync(dir)) return {exists: false};
        return {exists: true, files: fs.readdirSync(dir).slice(0, 20)};
    };

    // ------------------------------------------------------------------ the workflow and its windows
    const wf = () => page.locator('[role="dialog"]:visible').first();
    async function openWf(id) {
        await page.goto(u(`/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page);
        await wf().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    }
    const reviewerRow = (name) => page.getByRole('table', {name: 'Reviewers', exact: true}).getByRole('row').filter({hasText: name}).first();
    const rd = () => page.getByRole('dialog', {name: /^Review Details:/}).last();
    async function openReviewDetails(name) {
        const row = reviewerRow(name);
        await row.waitFor({timeout: T}).catch(() => {});
        const rowText = flat(await row.innerText().catch(() => '(no row)'), 300);
        const read = row.getByRole('button', {name: 'Read Review', exact: true});
        let via = 'Read Review';
        if (await read.count()) await read.click();
        else {
            via = 'More Actions › Review Details';
            await row.getByRole('button', {name: /More Actions/}).first().click();
            await page.getByRole('menuitem', {name: 'Review Details', exact: true}).click();
        }
        await rd().waitFor({timeout: T}).catch(() => {});
        await page.waitForFunction(() => {
            const d = [...document.querySelectorAll('[role=dialog]')].filter((x) => /^Review Details:/.test(x.getAttribute('aria-label') || '')).pop();
            const b = d && [...d.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Modify Review');
            return b && !b.disabled;
        }, null, {timeout: T}).catch(() => {});
        await idle(page);
        return {rowText, via};
    }

    // ------------------------------------------------------------------ dl
    const KINDS = {
        allXml: /All Review Sections.*XML/i,
        allPdf: /All Review Sections.*PDF/i,
        authorXml: /Author-Only.*XML/i,
    };
    async function press(kind, label) {
        const out = {kind, tempBefore: tempState()};
        const t0 = Date.now();
        const from = log.mark();
        const btn = rd().getByRole('button', {name: /Download Review Form/});
        out.button = await btn.count();
        await btn.first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        out.items = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => flat(x, 80));
        const item = page.getByRole('menuitem').filter({hasText: KINDS[kind]}).first();
        out.pressed = flat(await item.innerText({timeout: 5000}).catch(() => '(none)'), 80);
        const arrived = page.waitForEvent('download', {timeout: 15000}).catch((e) => ({err: flat(e.message, 100)}));
        await item.click({timeout: 5000}).catch((e) => { out.itemClick = flat(e.message, 160); });
        const d = await arrived;
        await sleep(1500);
        if (d && !d.err) {
            const file = await d.path().catch(() => null);
            out.file = d.suggestedFilename();
            out.bytes = file ? fs.statSync(file).size : null;
            if (file) fs.copyFileSync(file, outFile(`h15-${label}${path.extname(out.file) || ''}`));
            if (file && /\.xml$/i.test(out.file)) {
                const xml = fs.readFileSync(file, 'utf8');
                out.xmlHead = flat(xml, 200);
                out.anonymous = /<anonymous\s*\/>/.test(xml);
            }
            out.urlAfter = page.url().replace(/^https?:\/\/[^/]+/, '');
        } else {
            out.noFile = d && d.err;
            out.urlAfter = page.url().replace(/^https?:\/\/[^/]+/, '');
            out.pageText = flat(await page.locator('body').innerText().catch(() => ''), 300);
            await snap(`${label}-no-file`);
        }
        out.requests = since(t0).filter((x) => /export/.test(x));
        out.serverLog = log.since(from).map((l) => flat(l, 300));
        out.tempAfter = tempState();
        return out;
    }
    async function phaseDl() {
        const c = C.dl;
        const o = {order: ORDER, filesDir, submission: c.id, reviewer: c.reviewer, presses: []};
        o.tempAtStart = tempState();
        await signIn(page, 'dbarnes');
        await openWf(c.id);
        await snap(`dl-${ORDER}-workflow`);
        o.open = await openReviewDetails(c.reviewer);
        const s = await snap(`dl-${ORDER}-review-details`);
        o.windowText = flat(s.text && s.text.dialog, 1500);
        await loc(page, 'Review Details: "Download Review Form" menu button', rd().getByRole('button', {name: /Download Review Form/}));
        o.tempBeforeFirstPress = tempState();
        const seq = ORDER === 'pdf-first' ? ['allPdf', 'allXml', 'authorXml'] : ['allXml', 'allXml', 'authorXml', 'allPdf', 'allXml'];
        let i = 0;
        for (const kind of seq) {
            i++;
            const r = await press(kind, `dl-${ORDER}-${i}-${kind}`).catch((e) => ({kind, threw: flat(e.message)}));
            o.presses.push(r);
            console.log(`[h15 dl ${app.name}] ${i} ${kind}`, JSON.stringify({file: r.file, noFile: r.noFile, urlAfter: r.urlAfter, requests: r.requests, tempBefore: r.tempBefore, tempAfter: r.tempAfter, page: r.pageText}).slice(0, 1200));
            if (r.noFile || r.threw || !(await rd().isVisible().catch(() => false))) {
                await openWf(c.id);
                await openReviewDetails(c.reviewer);
            } else {
                // close the menu if it stayed open
                if (await page.getByRole('menuitem').first().isVisible().catch(() => false)) await rd().getByRole('button', {name: /Download Review Form/}).first().click().catch(() => {});
                await idle(page);
            }
        }
        o.tempAtEnd = tempState();
        record(`h15-dl-${ORDER}`, o);
    }

    // ------------------------------------------------------------------ rawkey
    async function keysOn(label) {
        const s = await snap(label);
        return {snap: label, whole: await rawKeys(page), header: await rawKeys(page, {scope: 'header'}), notices: s.notices};
    }
    async function helpLink() {
        return page.evaluate(() => [...document.querySelectorAll('a[target="_blank"]')].filter((a) => a.querySelector('.-screenReader')).map((a) => {
            const r = a.getBoundingClientRect();
            const sr = a.querySelector('.-screenReader');
            const sb = sr.getBoundingClientRect();
            return {href: a.getAttribute('href'), srText: sr.textContent, srBox: [Math.round(sb.width), Math.round(sb.height)], box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], inHeader: !!a.closest('header'), ariaLabel: a.getAttribute('aria-label'), title: a.getAttribute('title')};
        }));
    }
    const addButton = () => wf().locator('button').filter({hasText: /^\s*(Add Reviewer|Ajouter un-e évaluateur-trice)\s*$/i}).first();
    const addDialog = () => page.getByRole('dialog').filter({has: page.locator('.listPanel, [role="searchbox"]')}).last();
    async function openAdd() {
        await addButton().click();
        await addDialog().getByRole('searchbox').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await page.evaluate(() => {
            const ds = [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.querySelector('[role="searchbox"], input[type="search"]'));
            const d = ds.pop();
            if (d) d.setAttribute('data-h15', 'add');
        });
    }
    async function phaseRawkey() {
        const o = {};
        for (const who of C.rawkey) {
            const r = {user: who.user, submission: who.id};
            o[who.user] = r;
            await signIn(page, who.user);
            await page.goto(u('/dashboard/editorial')); await idle(page);
            r.dashboard = await keysOn(`rk-${who.user}-dashboard`);
            r.helpLink = await helpLink();
            await openWf(who.id);
            r.workflow = await keysOn(`rk-${who.user}-workflow`);
            r.workflowDialog = await rawKeys(page, {scope: '[role="dialog"]'});
            if (app.name !== 'ops') {
                r.addButton = flat(await addButton().innerText().catch(() => '(none)'), 60);
                await openAdd().catch((e) => { r.openAddThrew = flat(e.message); });
                const k = await keysOn(`rk-${who.user}-add-reviewer`);
                r.addReviewer = {...k, window: await rawKeys(page, {scope: '[data-h15="add"]'}), windowHeading: flat(await page.locator('[data-h15="add"] h1, [data-h15="add"] h2').allInnerTexts().catch(() => []), 200)};
                if (who.user === 'dbarnes') {
                    // the sweep: search, pick a reviewer (the request form opens), leave unsaved
                    const d = addDialog();
                    const box = d.getByRole('searchbox').first();
                    const dialogs0 = [];
                    const onDialog = async (dg) => { dialogs0.push({type: dg.type(), message: dg.message()}); await dg.accept().catch(() => {}); };
                    page.on('dialog', onDialog);
                    try {
                        await box.fill(app.name === 'ojs' ? 'Gallego' : 'Gallego');
                        await box.press('Enter');
                        await idle(page);
                        const entry = d.locator('.listPanel__item').filter({hasText: 'Adela Gallego'}).first();
                        r.sweepEntry = flat(await entry.innerText().catch(() => '(none)'), 300);
                        const select = entry.getByRole('button').filter({hasText: /^\s*(Select|Reassign)/}).first();
                        await select.click({timeout: 10000}).catch((e) => { r.sweepSelect = flat(e.message, 160); });
                        await idle(page); await sleep(1500);
                        const sf = await keysOn(`rk-${who.user}-add-reviewer-form`);
                        r.sweepForm = {snap: sf.snap, window: await rawKeys(page, {scope: '[data-h15="add"]'}), keys: sf.whole};
                        const cancel = d.getByRole('button', {name: /^(Cancel|Close)$/}).last();
                        r.sweepLeaveBy = flat(await cancel.innerText().catch(() => '(none)'), 40);
                        await cancel.click({timeout: 5000}).catch((e) => { r.sweepLeave = flat(e.message, 160); });
                        await sleep(2500); await idle(page);
                        const after = await snap(`rk-${who.user}-add-reviewer-left`);
                        r.sweepAfter = {dialogs: dialogs0, notices: after.notices, windowStillOpen: await page.locator('[data-h15="add"]').isVisible().catch(() => false), dialogText: flat(after.text && after.text.dialog, 300)};
                    } finally {
                        page.off('dialog', onDialog);
                    }
                }
            }
            if (who.french) {
                await page.goto(u('/dashboard/editorial')); await idle(page);
                await switchLanguage(page, 'fr_CA').catch((e) => { r.switchThrew = flat(e.message); });
                r.fr = {dashboard: await keysOn(`rk-${who.user}-fr-dashboard`), helpLink: await helpLink()};
                await page.goto(page.url().replace(/workflowSubmissionId=\d+.*/, '') + '').catch(() => {});
                await page.goto(app.url(`/index.php/${ctx}/fr_CA/dashboard/editorial?workflowSubmissionId=${who.id}`)); await idle(page);
                await wf().waitFor({timeout: T}).catch(() => {});
                r.fr.workflow = await keysOn(`rk-${who.user}-fr-workflow`);
                if (app.name !== 'ops') {
                    r.fr.addButton = flat(await addButton().innerText().catch(() => '(none)'), 60);
                    await openAdd().catch((e) => { r.fr.openAddThrew = flat(e.message); });
                    const k = await keysOn(`rk-${who.user}-fr-add-reviewer`);
                    r.fr.addReviewer = {...k, window: await rawKeys(page, {scope: '[data-h15="add"]'})};
                }
                await page.goto(app.url(`/index.php/${ctx}/fr_CA/dashboard/editorial`)); await idle(page);
                await switchLanguage(page, 'en').catch((e) => { r.switchBackThrew = flat(e.message); });
            }
            console.log(`[h15 rawkey ${app.name}] ${who.user}`, JSON.stringify({dash: r.dashboard.whole, add: r.addReviewer && r.addReviewer.window, help: r.helpLink}).slice(0, 1500));
        }
        record('h15-rawkey', o);
    }

    // ------------------------------------------------------------------ mail
    async function mailsSince(t0, editors) {
        const out = {};
        for (const who of editors) {
            const to = `${who}@mailinator.com`;
            const res = await app.fleetMail._search({to, since: t0}).catch((e) => ({messages: [], err: flat(e.message)}));
            out[who] = [];
            for (const m of res.messages || []) {
                const full = await app.fleetMail.fullMessage(m.ID).catch(() => ({}));
                const html = full.HTML || '';
                const links = [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]).filter((h) => h.includes(new URL(app.baseURL).host)).slice(0, 4);
                out[who].push({subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`, created: m.Created, text: flat(full.Text, 500), links});
            }
        }
        return out;
    }
    const locales = (names) => sql(app, `SELECT username, locales FROM users WHERE username IN (${names.map((n) => `'${n}'`).join(',')}) ORDER BY username`).split('\n');
    async function phaseMail() {
        const c = C.mail;
        const o = {submission: c.id};
        const {ParticipantsPanel, AssignParticipantWindow} = require('../../../pages/StageParticipantsPages.js');
        const {ReviewWizardPage} = require('../../../pages/ReviewerPages.js');
        o.localesAtStart = locales([...c.editors, c.r1[0], c.r2[0]]);
        o.stageAssignmentsAtStart = sql(app, `SELECT u.username, ug.role_id, s.setting_value FROM stage_assignments sa JOIN users u USING (user_id) JOIN user_groups ug USING (user_group_id) LEFT JOIN user_group_settings s ON s.user_group_id = ug.user_group_id AND s.setting_name = 'name' AND s.locale = 'en' WHERE sa.submission_id = ${c.id} ORDER BY 1`).split('\n');
        // the manager-level groups and the stages each is offered on (evidence only)
        o.groupStages = sql(app, `SELECT ug.user_group_id, ug.role_id, s.setting_value, string_agg(ugs.stage_id::text, ',' ORDER BY ugs.stage_id) FROM user_groups ug LEFT JOIN user_group_stage ugs USING (user_group_id) LEFT JOIN user_group_settings s ON s.user_group_id = ug.user_group_id AND s.setting_name = 'name' AND s.locale = 'en' WHERE ug.role_id IN (16, 17) GROUP BY 1, 2, 3 ORDER BY 1`).split('\n');
        await signIn(page, 'dbarnes');
        const panel = new ParticipantsPanel(page, ctx);
        await panel.goto(c.id).catch((e) => { o.panelThrew = flat(e.message); });
        await snap('mail-participants-before');
        o.rowsBefore = await panel.rowLines().catch((e) => `threw ${flat(e.message)}`);
        // the role list, and the window left once with a role and a person chosen, unsaved
        const dialogsSeen = [];
        const onDialog = async (dg) => { dialogsSeen.push({type: dg.type(), message: dg.message()}); await dg.accept().catch(() => {}); };
        page.on('dialog', onDialog);
        try {
            const win = await panel.openAssign();
            await snap('mail-assign-window');
            o.roleOptions = await win.roleOptions();
            const first = c.assign[0];
            await win.chooseRole(first[0]).catch((e) => { o.sweepRole = flat(e.message); });
            await win.search(first[1].split(' ').pop()).catch(() => {});
            await win.choosePerson(first[1]).catch((e) => { o.sweepPerson = flat(e.message); });
            await win.closeControl().click({timeout: 5000}).catch((e) => { o.sweepClose = flat(e.message); });
            await sleep(2500); await idle(page);
            const s = await snap('mail-assign-left-unsaved');
            o.sweepLeave = {dialogs: [...dialogsSeen], windowStillOpen: await win.root.isVisible().catch(() => false), notices: s.notices};
            if (o.sweepLeave.windowStillOpen) await win.cancel().catch(() => {});
        } catch (e) {
            o.assignThrew = flat(e.message);
        } finally {
            page.off('dialog', onDialog);
        }
        o.assigned = [];
        for (const [role, name] of c.assign) {
            const a = {role, name};
            o.assigned.push(a);
            if (!(o.roleOptions || []).includes(role)) { a.offered = false; continue; }
            a.offered = true;
            try {
                await panel.reland();
                const win = await panel.openAssign();
                await win.chooseRole(role);
                await win.search(name.split(' ').pop());
                a.people = await win.peopleNames();
                if (!a.people.some((p) => p.includes(name))) { a.listed = false; await win.cancel().catch(() => {}); continue; }
                a.listed = true;
                await win.choosePerson(name);
                await win.ok();
                const s = await snap(`mail-assigned-${role.replace(/\W+/g, '-').toLowerCase()}`);
                a.notices = s.notices;
            } catch (e) {
                a.threw = flat(e.message);
            }
        }
        await panel.reland().catch(() => {});
        await snap('mail-participants-after');
        o.rowsAfter = await panel.rowLines().catch((e) => `threw ${flat(e.message)}`);
        o.stageAssignmentsAfter = sql(app, `SELECT u.username, ug.role_id, s.setting_value FROM stage_assignments sa JOIN users u USING (user_id) JOIN user_groups ug USING (user_group_id) LEFT JOIN user_group_settings s ON s.user_group_id = ug.user_group_id AND s.setting_name = 'name' AND s.locale = 'en' WHERE sa.submission_id = ${c.id} ORDER BY 1`).split('\n');

        // reviewer 1, English interface
        const w = new ReviewWizardPage(page, ctx);
        const r1 = {reviewer: c.r1[0]};
        o.r1 = r1;
        try {
            await signIn(page, c.r1[0]);
            await page.goto(u(`/reviewer/submission/${c.id}`)); await idle(page);
            await snap('mail-r1-step1');
            await w.accept();
            await w.continueToStep3();
            await snap('mail-r1-step3');
            await w.typeComments('u27h15 review text for the author and editor');
            if (c.rec) await w.chooseRecommendation(c.rec);
            r1.t0 = new Date();
            await w.submitReview();
            await w.expectCompleted().catch((e) => { r1.completed = flat(e.message); });
            await snap('mail-r1-submitted');
        } catch (e) {
            r1.threw = flat(e.message);
            await snap('mail-r1-threw');
        }
        // reviewer 2: steps 1-2 in English, step 3 and the submit in the French interface
        const r2 = {reviewer: c.r2[0]};
        o.r2 = r2;
        try {
            await signIn(page, c.r2[0]);
            await page.goto(u(`/reviewer/submission/${c.id}`)); await idle(page);
            await w.accept();
            await w.continueToStep3();
            await switchLanguage(page, 'fr_CA');
            r2.urlAfterSwitch = page.url().replace(/^https?:\/\/[^/]+/, '');
            const form = page.locator('#reviewStep3Form');
            if (!(await form.isVisible().catch(() => false))) {
                await page.goto(app.url(`/index.php/${ctx}/fr_CA/reviewer/submission/${c.id}?step=3`)); await idle(page);
            }
            await form.waitFor({timeout: T});
            await page.waitForFunction(() => { const mce = window.tinymce || window.tinyMCE; const eds = mce ? mce.get() : []; return eds.length > 0 && eds.every((e) => e.initialized); }, null, {timeout: T}).catch(() => {});
            await page.waitForFunction(() => !document.querySelector('main [aria-busy="true"], main .ui-tabs-loading'), null, {timeout: 15000}).catch(() => {});
            await snap('mail-r2-fr-step3');
            await page.evaluate(() => {
                const mce = window.tinymce || window.tinyMCE;
                const ed = mce.get().find((e) => /^comments/.test(e.id) && !/^commentsPrivate/.test(e.id));
                ed.setContent('<p>u27h15 texte de l\'évaluation</p>'); ed.fire('change'); ed.save();
            });
            const sel = form.locator('select[name="reviewerRecommendationId"]');
            if (c.rec && await sel.count()) {
                await sel.selectOption({index: 1});
                r2.chose = flat(await sel.locator('option:checked').innerText(), 80);
            }
            const submit = form.locator('.formButtons button.submitFormButton').last();
            r2.submitLabel = flat(await submit.innerText().catch(() => ''), 60);
            await submit.click();
            const confirm = page.locator('[role="dialog"]:visible').last();
            await confirm.waitFor({timeout: T});
            r2.confirmText = flat(await confirm.innerText(), 300);
            const buttons = confirm.locator('button:visible');
            r2.confirmButtons = (await buttons.allInnerTexts()).map((x) => flat(x, 40));
            const ok = buttons.filter({hasText: /^\s*(OK|Ok|Oui|Confirmer|Soumettre.*)\s*$/}).first();
            r2.t0 = new Date();
            await ok.click();
            await page.waitForFunction(() => !document.querySelector('#reviewStep3Form'), null, {timeout: T}).catch(() => {});
            await idle(page);
            const s = await snap('mail-r2-fr-submitted');
            r2.after = flat(s.text && s.text.main, 300);
            r2.localesAfter = locales([c.r2[0]]);
            await switchLanguage(page, 'en').catch(() => {});
        } catch (e) {
            r2.threw = flat(e.message);
            await snap('mail-r2-threw');
        }
        // the mail: bounded by the first message to arrive, then every editor read
        for (const r of [r1, r2]) {
            if (!r.t0) continue;
            for (const who of c.editors) {
                const hit = await app.fleetMail.find({to: `${who}@mailinator.com`, since: r.t0, timeoutMs: 20000}).catch(() => null);
                if (hit) break;
            }
            await sleep(5000);
            r.mails = await mailsSince(r.t0, c.editors);
            r.reviewerMail = await mailsSince(r.t0, [r.reviewer]);
        }
        o.localesAtEnd = locales([...c.editors, c.r1[0], c.r2[0]]);
        o.reviews = sql(app, `SELECT u.username, ra.review_id, ra.date_completed, ra.reviewer_recommendation_id FROM review_assignments ra JOIN users u ON u.user_id = ra.reviewer_id WHERE ra.submission_id = ${c.id} ORDER BY 1`).split('\n');
        record('h15-mail', o);
        console.log(`[h15 mail ${app.name}]`, JSON.stringify({roleOptions: o.roleOptions, assigned: o.assigned, r1: {threw: r1.threw, mails: r1.mails && Object.fromEntries(Object.entries(r1.mails).map(([k, v]) => [k, v.map((m) => m.subject)]))}, r2: {threw: r2.threw, mails: r2.mails && Object.fromEntries(Object.entries(r2.mails).map(([k, v]) => [k, v.map((m) => m.subject)]))}}).slice(0, 3000));
    }

    try {
        if (PHASES.includes('dl') && C.dl) await phaseDl();
        if (PHASES.includes('rawkey') && C.rawkey) await phaseRawkey();
        if (PHASES.includes('mail') && C.mail) await phaseMail();
    } finally {
        record(`h15-snaps-${PHASES.join('+')}${PHASES.includes('dl') ? `-${ORDER}` : ''}`, {phases: PHASES, order: ORDER, snaps});
        await close();
    }
});
