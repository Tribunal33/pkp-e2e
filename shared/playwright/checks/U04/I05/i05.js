// U04 claim check, housekeeping chunk I05 (2026-10-05): incidentals rows R140 and R141
// (.reports/hk05/drive/U04/rows.md). Spec: docs/specs/U04-orcid-integration.md, Actors row
// "Read the public ORCID pages", Rules 9-11 (the verification landing, the What-is-ORCID page,
// the re-authorization landing), scenario 6; footnotes f, j, s.
//
// Seeds its own scratch context per run and app: ORCID on (Public Sandbox), a manager and an
// author; one submitted submission whose contributor (the author) holds a verified iD whose
// permission was granted under the public API (scenarios.md `author.orcidIsVerified`); OJS
// also one published issue and the submission in Production. Phases:
//   pages  signed out: the journal's `orcid/about` and `orcid/verify` typed by URL, the
//          browser title of each, with the journal's "About" page as the title control;
//          the pages' links and the breadcrumb's "Home" pressed.
//   scope  the manager: Settings > Users & Roles > ORCID to "Member Sandbox" on screen, then
//          publishes the submission on screen (OJS: "Assign To Current/Back Issue", the seeded
//          issue; OPS: "Post"); the queue drained; the contributor's "Requesting updated ORCID
//          record access" email read; signed out, its link's return address opened the two
//          ways ORCID returns a browser: "Deny" (error=access_denied) and "Authorize"
//          (code=…). Control: `orcid/updateScope` typed bare. OMP deposits nothing (Rule 11,
//          OMP1), so no email exists there: the return addresses are typed in the shape the
//          other apps' emails carry, and the publish is skipped.
//   signedin  admin, the scratch manager and the scratch author: both pages, signed in.
//   verifyctl the control: the scratch manager's "Request verification" on a second
//          submission's contributor, the email's orcid/verify link returned the same two
//          ways, signed out (that link carries `state`; the re-authorization link does not).
//   howwhy the What-is-ORCID page under "Member Sandbox" (OMP switched on screen here; OJS and
//          OPS already are after `scope`), against `pages`' Public Sandbox read.
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0; run PHASES=pages,scope) OJS publishes through
// 3.5's Publication > Issue ("Assign to Issue") and "Schedule For Publication"; the 3.5
// submission seed leaves the contributor without a user group, which 3.5's ORCID work builder
// reads on publish, so the script gives it the context's Author group first (SQL, recorded).
// Facts: .reports/U04/ccI05/i05-facts-<run>-<app>.json. Run twice, each run seeding afresh:
//   PROBE_RUN=r1 PROBE_FEATURE=U04 PROBE_AGENT=ccI05 node bin/probe.js all shared/playwright/checks/U04/I05/i05.js
//   PROBE_RUN=r2 …    (PHASES=pages,scope then PHASES=signedin,verifyctl,howwhy, or all at once)
//   PKP_E2E_LINE=stable-3_5_0 PHASES=pages,scope PROBE_RUN=r2-35 …
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, sql,
    serverLog, drainJobs, outFile, rawKeys} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'pages,scope,signedin,verifyctl,howwhy').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 1500) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const ORCID_ID = 'https://sandbox.orcid.org/0000-0002-1825-0097';
const DENIAL = 'error=access_denied&error_description=User%20denied%20access';
const CODE = 'code=u04i05';

forEachApp(async (app) => {
    const line = app.line || 'main';
    const is35 = line === 'stable-3_5_0';
    const sf = outFile('i05-state');
    const S = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : {};
    const save = () => fs.writeFileSync(sf, JSON.stringify(S, null, 1));
    const fact = (k, v) => {
        record('i05-facts', {[k]: v}, {merge: true});
        console.log(`[u04 i05 ${RUN} ${app.name} ${line}] ${k}:`, flat(JSON.stringify(v), 2000));
    };
    const log = serverLog(app);

    // ------------------------------------------------------------------ seed
    if (!S.seeded) {
        const t = tag('u04i05');
        S.t = t;
        const c = await app.api.createContext({
            tag: t,
            context: {name: `U04 I05 ${t}`, acronym: 'UIF'},
            orcid: {enabled: true, apiType: 'publicSandbox'},
            users: [
                {username: `${t}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
                {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
            ],
            ...(app.name === 'ojs' ? {issues: [{volume: 1, number: '1', year: 2026, published: true}]} : {}),
        });
        S.path = c.path || t;
        S.mg = `${t}mg`;
        S.au = `${t}au`;
        S.auEmail = `${t}au@mail.test`;
        S.issues = c.issues || null;
        const sub = await app.api.createSubmission({
            tag: `${t}s`, context: S.path, submitter: S.au, title: `U04 I05 ${t}`,
            submitted: true,
            author: {orcid: ORCID_ID, orcidIsVerified: true},
            ...(app.name === 'ojs' ? {decisions: ['skipExternalReview', 'sendToProduction']} : {}),
        });
        S.sub = {id: sub.submissionId, pub: sub.publicationId, stageId: sub.stageId};
        S.seeded = true;
        save();
        fact('seed', {path: S.path, sub: S.sub, issues: S.issues,
            authorOrcid: sql(app, `select s.setting_name, case when s.setting_name in ('orcidAccessToken','orcidRefreshToken') then '(set)' else s.setting_value end from authors a join author_settings s on s.author_id=a.author_id where a.publication_id=${S.sub.pub} and s.setting_name like 'orcid%' order by 1`).split('\n')});
    }
    const P = S.path;
    const u = (p) => app.url(`/index.php/${P}${p}`);

    // ------------------------------------------------------------------ pages (R140)
    if (on('pages')) {
        const {page, close} = await launch(app);
        try {
            const read = async (name, p) => {
                const from = log.mark();
                const resp = await page.goto(u(p));
                await idle(page);
                const s = await screen(page);
                await shot(page, `i05-pages-${name}`).catch(() => {});
                const out = {
                    address: p, status: resp ? resp.status() : null, title: await page.title(),
                    h: (await page.locator('.page h1, .page h2').allInnerTexts().catch(() => [])).map((x) => flat(x, 120)),
                    breadcrumb: flat(await page.locator('.cmp_breadcrumbs').first().innerText().catch(() => null), 200),
                    links: await page.locator('.page a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim().slice(0, 80), href: a.getAttribute('href')}))).catch(() => []),
                    rawKeys: await rawKeys(page).catch((e) => ({error: flat(e.message, 200)})),
                    serverLog: log.since(from).map((l) => flat(l, 300)),
                };
                record(`i05-pages-${name}`, s);
                fact(`pages ${name}`, out);
                return out;
            };
            await read('about', '/orcid/about');
            await loc(page, 'What is ORCID? page heading', page.locator('.page_message h2').first());
            await read('verify', '/orcid/verify');
            await loc(page, 'ORCID Authorization page heading', page.locator('.page_message h2').first());
            await read('control-journal-about', '/about');
            await read('control-login', '/login');
            // Sweep: the breadcrumb's "Home" on the What-is-ORCID page.
            await page.goto(u('/orcid/about'));
            await idle(page);
            const home = page.locator('.cmp_breadcrumbs a').first();
            const homeText = flat(await home.innerText().catch(() => null), 60);
            await home.click().catch(() => {});
            await idle(page);
            fact('pages about breadcrumb pressed', {pressed: homeText, landed: rel(page.url()), title: await page.title()});
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ scope (R141)
    if (on('scope')) {
        const scratchApp = {...app, contextPath: P};
        const {page, close} = await launch(app);
        try {
            const from = log.mark();
            const since = new Date();
            if (app.name !== 'omp' && !S.published) {
                if (is35) {
                    // The 3.5 submission seed leaves the contributor without a user group (the
                    // screens always store one), and 3.5's ORCID work builder reads it on publish:
                    // give it the context's Author group, as the wizard would.
                    fact('scope 3.5 seed repair', sql(app, `update authors set user_group_id=(select ug.user_group_id from user_groups ug join submissions s on s.context_id=ug.context_id where s.submission_id=${S.sub.id} and ug.role_id=65536 order by ug.user_group_id limit 1) where publication_id=${S.sub.pub} and user_group_id is null returning author_id, user_group_id`));
                }
                await signIn(page, S.mg, {contextPath: P});
                const {setOrcidMember} = require('../../issues/publish-without-issue-orcid-contributor-error/lib');
                try {
                    const st = await setOrcidMember(page, scratchApp, {}, {prefix: `i05-${RUN}-`});
                    fact('scope settings', {apiChoice: st.apiChoice, save: st.save, savedStatus: st.savedStatus, stored: st.stored});
                } catch (e) {
                    fact('scope settings error', flat(e.message, 400));
                }
                try {
                    fact('scope publish', await publish(page, scratchApp, S, is35));
                } catch (e) {
                    fact('scope publish error', flat(e.message, 500));
                    await shot(page, 'i05-scope-publish-error').catch(() => {});
                }
                fact('scope publication after', sql(app, `select publication_id, status, date_published from publications where submission_id=${S.sub.id}`));
                S.published = true;
                save();
                await signOut(page).catch(() => {});
                const d = await drainJobs(app);
                fact('scope drain', {passes: d.passes, counts: d.counts, out: flat(d.output, 600)});
                fact('scope failed jobs', sql(app, `select id, substring(payload from '"displayName":"([^"]+)"'), left(exception, 200) from failed_jobs where failed_at >= now() - interval '10 minutes' order by id`));
                // The email.
                const found = await app.mail.find({to: S.auEmail, subject: 'Requesting updated ORCID record access', since, timeoutMs: 20_000}).catch(() => null);
                if (found) {
                    const full = await app.mail.fullMessage(found.ID);
                    const hrefs = [];
                    const re = /<a\b[^>]*href=(["'])([^"']+)\1/gi;
                    let m;
                    while ((m = re.exec(full.HTML || '')) !== null) hrefs.push(m[2].replace(/&amp;/g, '&'));
                    const auth = hrefs.find((h) => /orcid\.org\/oauth\/authorize/.test(h)) || null;
                    S.redirect = auth ? new URL(auth).searchParams.get('redirect_uri') : null;
                    fact('scope email', {subject: found.Subject, from: full.From, to: (full.To || []).map((x) => x.Address),
                        links: hrefs.map((h) => (/orcid\.org/.test(h) ? h.replace(/client_id=[^&]+/, 'client_id=…') : rel(h))),
                        redirect: rel(S.redirect)});
                } else {
                    const anyMail = await app.mail.count({to: S.auEmail, since}).catch(() => null);
                    fact('scope email', {found: false, anyMessageToAuthor: anyMail});
                }
                save();
            }
            await signOut(page).catch(() => {});
            // The two returns from ORCID, signed out.
            const land = async (name, address) => {
                const f = log.mark();
                const resp = await page.goto(address).catch((e) => ({err: e.message}));
                await idle(page);
                const s = await screen(page);
                await shot(page, `i05-scope-${name}`).catch(() => {});
                record(`i05-scope-${name}`, s);
                const out = {
                    address: rel(address), status: resp && resp.status ? resp.status() : resp,
                    title: await page.title(),
                    heading: flat(await page.locator('.page_message h2').first().innerText().catch(() => null), 120),
                    description: flat(await page.locator('.page_message .description').first().innerText().catch(() => null), 600),
                    body: flat(s.text && (s.text.main || s.text.body), 600),
                    rawKeys: await rawKeys(page).catch((e) => ({error: flat(e.message, 200)})),
                    serverLog: log.since(f).map((l) => flat(l, 500)),
                };
                fact(`scope landing ${name}`, out);
                return out;
            };
            const base = S.redirect
                ? app.url(rel(S.redirect))
                : u(`/orcid/updateScope?token=u04i05typed&itemId=${S.sub.pub}&itemType=work&userId=1&userIdType=author`);
            fact('scope landing source', S.redirect ? 'the email\'s link (its redirect_uri)' : 'typed in the shape the other apps\' emails carry');
            await land('deny', `${base}&${DENIAL}`);
            await land('authorize', `${base}&${CODE}`);
            await land('control-bare', u('/orcid/updateScope'));
            await loc(page, 'ORCID Authorization heading on the updateScope control', page.locator('.page_message h2').first());
            fact('scope author orcid after', sql(app, `select s.setting_name, case when s.setting_name in ('orcidAccessToken','orcidRefreshToken','orcidEmailToken') then '(set)' else s.setting_value end from authors a join author_settings s on s.author_id=a.author_id where a.publication_id=${S.sub.pub} and s.setting_name like 'orcid%' order by 1`).split('\n'));
            fact('scope serverLog', log.since(from).filter((l) => /error|exception|TypeError| 5\d\d /i.test(l)).map((l) => flat(l, 500)));
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ signedin (R140, Actors row)
    if (on('signedin')) {
        const {page, close} = await launch(app);
        try {
            for (const who of ['admin', S.mg, S.au]) {
                await signIn(page, who, who === 'admin' ? {} : {contextPath: P});
                for (const [name, p] of [['about', '/orcid/about'], ['verify', '/orcid/verify']]) {
                    const resp = await page.goto(u(p));
                    await idle(page);
                    const s = await screen(page);
                    const lvl = who === 'admin' ? 'admin' : who === S.mg ? 'manager' : 'author';
                    record(`i05-signedin-${lvl}-${name}`, s);
                    fact(`signedin ${lvl} ${name}`, {status: resp ? resp.status() : null, title: await page.title(),
                        heading: flat(await page.locator('.page_message h2').first().innerText().catch(() => null), 80),
                        description: flat(await page.locator('.page_message .description').first().innerText().catch(() => null), 300)});
                }
                await signOut(page).catch(() => {});
            }
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ verifyctl (R141 control)
    // The Rule 8 request's own link (orcid/verify, which carries `state`) returned the same two
    // ways, signed out: the landing that the re-authorization link's should match.
    if (on('verifyctl')) {
        const A2 = require('../../issues/orcid-denied-page-raw-placeholder/lib');
        if (!S.sub2) {
            const sub2 = await app.api.createSubmission({tag: `${S.t}v`, context: P, submitter: S.au, title: `U04 I05 verify ${S.t}`, submitted: true});
            S.sub2 = {id: sub2.submissionId, pub: sub2.publicationId};
            save();
        }
        const scratchApp = {...app, contextPath: P};
        const {page, close} = await launch(app);
        try {
            await signIn(page, S.mg, {contextPath: P});
            const since = new Date();
            const modal = await A2.openContributorEditor(page, scratchApp, S.sub2.id, 'Ada Author');
            fact('verifyctl request', await A2.requestVerification(page, modal));
            await signOut(page).catch(() => {});
            const d = await drainJobs(app);
            fact('verifyctl drain', {passes: d.passes, out: flat(d.output, 300)});
            const link = await A2.readAuthorizationLink(page, app, S.auEmail, since);
            fact('verifyctl email', link ? {subject: link.subject, redirect: rel(link.redirectUri)} : null);
            if (link && link.redirectUri) {
                const base = app.url(rel(link.redirectUri));
                for (const [name, q] of [['deny', DENIAL], ['authorize', CODE]]) {
                    const f = log.mark();
                    const resp = await page.goto(`${base}&${q}`);
                    await idle(page);
                    const out = await A2.readVerifyPage(page, `i05-verifyctl-${name}`);
                    record(`i05-verifyctl-${name}`, out.screen);
                    delete out.screen;
                    fact(`verifyctl landing ${name}`, {status: resp ? resp.status() : null, title: await page.title(), ...out,
                        serverLog: log.since(f).filter((l) => /error|exception| 5\d\d/i.test(l)).map((l) => flat(l, 300))});
                }
            }
        } finally {
            await close();
        }
    }

    // ------------------------------------------------------------------ howwhy (Rule 10, the member end)
    // The journal under "Member Sandbox" (OJS and OPS already are after `scope`; OMP is switched
    // here on screen), then the What-is-ORCID page read signed out.
    if (on('howwhy')) {
        const {page, close} = await launch(app);
        try {
            const api = sql(app, `select setting_value from ${app.contextTables.settings} where setting_name='orcidApiType' and ${app.contextTables.id}=(select context_id from submissions where submission_id=${S.sub.id})`);
            if (api !== 'memberSandbox') {
                await signIn(page, S.mg, {contextPath: P});
                const {setOrcidMember} = require('../../issues/publish-without-issue-orcid-contributor-error/lib');
                const st = await setOrcidMember(page, {...app, contextPath: P}, {}, {prefix: `i05-howwhy-`});
                fact('howwhy settings', {apiChoice: st.apiChoice, save: st.save, savedStatus: st.savedStatus});
                await signOut(page).catch(() => {});
            }
            await page.goto(u('/orcid/about'));
            await idle(page);
            const s = await screen(page);
            record('i05-howwhy-about', s);
            await shot(page, 'i05-howwhy-about').catch(() => {});
            fact('howwhy about', {api: sql(app, `select setting_value from ${app.contextTables.settings} where setting_name='orcidApiType' and ${app.contextTables.id}=(select context_id from submissions where submission_id=${S.sub.id})`),
                title: await page.title(), text: flat(s.text.main || s.text.body, 3000)});
        } finally {
            await close();
        }
    }
});

/** Publish the seeded submission on screen, as the manager. */
async function publish(page, app, S, is35) {
    if (app.name === 'ojs' && !is35) {
        const {publishFromWorkflow} = require('../../issues/publish-without-issue-orcid-contributor-error/lib');
        const rec = (name, data) => record(`i05-scope-publish-${name}`, data);
        rec.prefix = 'i05-scope-publish-';
        const out = await publishFromWorkflow(page, app, S.sub.id, {choice: 'Assign To Current/Back Issue', issue: /Vol\. 1 No\. 1 \(2026\)/}, rec);
        delete out.opened;
        return out;
    }
    if (app.name === 'ops') {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${S.sub.id}`));
        await idle(page);
        const stageAction = page.getByRole('button', {name: 'Post the preprint', exact: true});
        const postControl = page.getByRole('button', {name: 'Post', exact: true});
        await stageAction.or(postControl).first().waitFor({timeout: T});
        if (await stageAction.isVisible()) await stageAction.click();
        await postControl.first().waitFor({timeout: T});
        await postControl.first().click();
        const dialog = page.getByRole('dialog').filter({hasText: 'Are you sure you want to post this?'});
        await dialog.waitFor({timeout: T});
        const question = flat(await dialog.innerText(), 300);
        const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dialog.getByRole('button', {name: 'Post', exact: true}).last().click();
        const r = await answered;
        await idle(page);
        await sleep(1000);
        const s = await screen(page);
        record('i05-scope-publish-after', s);
        await shot(page, 'i05-scope-publish-after').catch(() => {});
        return {question, publish: r ? r.status() : null, notices: s.notices,
            unpost: await page.getByRole('button', {name: 'Unpost', exact: true}).count()};
    }
    // stable-3_5_0 OJS: the version's "Issue" page, "Change Issue" to the seeded issue, then
    // "Publish" and the window's "Publish".
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    await frame.gotoEditorial(S.sub.id);
    await idle(page);
    const out = {};
    await frame.menuLink('Issue').last().click();
    await idle(page);
    await page.getByRole('button', {name: /^(Change Issue|Assign to Issue)$/}).first().click();
    const idlg = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
    const sel = idlg.locator('select[name="issueId"]');
    await sel.waitFor({timeout: T});
    out.issueOptions = (await sel.locator('option').allInnerTexts()).map((o) => flat(o, 60));
    const opt = sel.locator('option').filter({hasText: /Vol\. 1 No\. 1 \(2026\)/});
    await sel.selectOption((await opt.first().getAttribute('value')) || '');
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await idlg.getByRole('button', {name: /^(Save|Assign|OK)$/}).last().click();
    const rs = await saved;
    out.issueSave = rs ? rs.status() : null;
    await idle(page);
    await sleep(1200);
    const button = page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await button.waitFor({timeout: T});
    out.button = flat(await button.innerText(), 60);
    const answered = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 60_000}).catch(() => null);
    await button.click();
    const confirm = page.getByRole('dialog').getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last();
    await confirm.waitFor({state: 'visible', timeout: T});
    await sleep(800);
    out.question = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 400);
    record('i05-scope-publish-35-window', await screen(page));
    await confirm.click();
    const r = await answered;
    out.publish = r ? r.status() : null;
    await idle(page);
    await sleep(1000);
    const s = await screen(page);
    record('i05-scope-publish-after', s);
    await shot(page, 'i05-scope-publish-after').catch(() => {});
    out.notices = s.notices;
    return out;
}
