// U04 drift sweep 2026-10-16, chunk SW3 (claim check): the workflow's Contributors list and the
// contributor form ("Request verification", "Delete"; Rule 8, 8a; scenarios 4, 5), the Reviewers
// table's "Send Review To ORCID" {OJS} (Rule 12, scenario 9, A1), the request emails and the queue
// (Side effects), the publish window's ORCID warnings and the deposits it queues (Side effects,
// Cross-feature "Publishing"), the Author's reach (scenario 10), and the Cross-feature hosts
// (invitations, Manage Emails, Site Settings' ORCID tab, the Identity tab).
// Every phase seeds its own scratch contexts; publicknowledge and the roster stay untouched.
// The `contrib` and `publish` phases drain the fleet's job queue (kit drainJobs) to read mail and
// the deposits' outcome (a deposit that tried ORCID lands in failed_jobs behind the dead proxy).
// Run (one app or all; phases default to all; PROBE_RUN names the run):
//   PROBE_RUN=r1 PHASES=contrib,review PROBE_FEATURE=U04 PROBE_AGENT=ccSW3 \
//     bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U04/SW3/sw3.js
// Facts: .reports/U04/ccSW3/sw3-facts-<run>-<app>.json; snapshots <name>-<run>-<app>.json/.png.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, sql, drainJobs} =
    require('../../../probe');

const RUN = process.env.PROBE_RUN || 'r1';
const PHASES = (process.env.PHASES || 'contrib,review,publish,author,cross').split(',');
const on = (p) => PHASES.includes(p);
const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 1500) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const log = (...a) => console.log(`[u04 sw3 ${RUN}]`, ...a);
const VERIFIED = 'https://sandbox.orcid.org/0000-0002-1825-0097';
const VERIFIED2 = 'https://sandbox.orcid.org/0000-0001-5109-3700';

forEachApp(async (app) => {
    const fact = (k, v) => { record('sw3-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 4000)); };
    const q = (s) => sql(app, s);
    const ctxT = app.contextTables;
    const appLog = () => {
        const cfg = fs.readFileSync(app.configFile, 'utf8');
        const dir = (cfg.match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
        const file = () => path.join(dir, 'logs', `app-${new Date().toISOString().slice(0, 10)}.log`);
        const mark = () => { const f = file(); return {f, at: fs.existsSync(f) ? fs.statSync(f).size : 0}; };
        const since = (m) => (fs.existsSync(m.f) ? fs.readFileSync(m.f).subarray(m.at).toString('utf8').split('\n').filter((l) => /^\[\d{4}-/.test(l)).map((l) => flat(l, 300)) : []);
        return {mark, since};
    };
    const L = appLog();
    const {page, close} = await launch(app);
    const CR = [];
    const DIALOGS = [];
    const watch = (p, label = '') => {
        p.on('response', (r) => { if (r.status() >= 500) CR.push(`server${label} ${r.status()} ${r.request().method()} ${rel(r.url()).slice(0, 200)}`); });
        p.on('pageerror', (e) => CR.push(`script${label} ${flat(e.message || e, 200)}`));
        p.on('dialog', (d) => { DIALOGS.push({label, type: d.type(), message: d.message()}); d.type() === 'beforeunload' ? d.accept().catch(() => {}) : d.dismiss().catch(() => {}); });
    };
    watch(page);
    const second = async (label) => {
        const b = await launch(app, {record: false});
        watch(b.page, `(${label})`);
        return b;
    };
    const snap = async (name, p = page) => {
        let s;
        try { s = await screen(p); } catch (e) { s = {url: p.url(), error: flat(e.message, 300)}; }
        record(name, s);
        await shot(p, name).catch(() => {});
        return s;
    };
    const userRow = (user, extra = {}) => ({username: user, givenName: extra.givenName || 'Sam', familyName: extra.familyName || `Sw3${user.slice(-4)}`, ...extra});
    const editorialUrl = (ctx, sub, key) => app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=${sub.submissionId}${key ? `&workflowMenuKey=${key}` : ''}`);
    const ctxId = (t) => q(`select ${ctxT.id} from ${ctxT.table} where path='${t}'`);
    const maxJob = () => Number(q('select coalesce(max(id),0) from jobs') || 0);
    const maxFailed = () => Number(q('select coalesce(max(id),0) from failed_jobs') || 0);
    const jobsSince = (id) => q(`select id || ' ' || substring(payload from 'orcid[\\\\]+([A-Za-z]+)') from jobs where id > ${id} and payload like '%orcid%' order by id`).split('\n').filter(Boolean);
    const failedSince = (id) => q(`select id || ' ' || substring(payload from 'orcid[\\\\]+([A-Za-z]+)') || ' :: ' || coalesce(substring(exception from 'for (https?:[^ ]+)'), substring(exception from 1 for 160)) from failed_jobs where id > ${id} and payload like '%orcid%' order by id`).split('\n').filter(Boolean).map((x) => flat(x, 300));
    const authorRows = (pub) => q(`select a.author_id || ' ' || coalesce(a.email,'') || ' ' || coalesce(string_agg(s.setting_name || '=' || case when s.setting_name like '%Token' then '(set)' else left(coalesce(s.setting_value,''),60) end, ',' order by s.setting_name),'') from authors a left join author_settings s on s.author_id=a.author_id and s.setting_name like 'orcid%' where a.publication_id=${pub} group by a.author_id, a.email order by a.author_id`).split('\n').filter(Boolean);
    const mailsTo = async (to, since) => {
        const r = await app.mail._search({to, since}).catch(() => null);
        return ((r && (r.messages || r.Messages)) || []).map((m) => ({id: m.ID, subject: m.Subject, from: m.From && `${m.From.Name} <${m.From.Address}>`}));
    };
    const mailBody = async (id) => {
        const full = await app.mail.fullMessage(id);
        const hrefs = [...String(full.HTML || '').matchAll(/href=(["'])([^"']*)\1[^>]*>([\s\S]*?)<\/a>/g)].map((x) => ({href: x[2].replace(/&amp;/g, '&'), text: x[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}));
        return {subject: full.Subject, from: full.From && `${full.From.Name} <${full.From.Address}>`, text: flat(full.Text, 1400), links: hrefs.map((h) => ({text: h.text, href: h.href.slice(0, 220)}))};
    };

    // ---------------------------------------------------------------- contributor form helpers
    async function contributorForm(p, ctx, sub, who, name, {add = false, base} = {}) {
        await p.goto('about:blank');
        await p.goto(base || editorialUrl(ctx, sub, `publication_${sub.publicationId}_contributors`));
        await idle(p);
        const list = p.locator('.listPanel--contributor').first();
        await list.locator('li.listPanel__item').first().waitFor({timeout: 30_000});
        await snap(`${name}-list`, p);
        const listFacts = {
            add: await p.getByRole('button', {name: 'Add Contributor'}).count(),
            edit: await list.getByRole('button', {name: 'Edit', exact: true}).count(),
            buttons: (await list.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean),
            items: (await list.locator('li.listPanel__item').allInnerTexts()).map((x) => flat(x, 160)),
        };
        if (add) {
            if (!listFacts.add) return {list: listFacts, opened: false};
            await p.getByRole('button', {name: 'Add Contributor'}).first().click();
        } else {
            const edit = list.locator('li.listPanel__item').filter({hasText: who}).first().getByRole('button', {name: 'Edit', exact: true});
            if (!(await edit.count())) return {list: listFacts, opened: false};
            await edit.click();
        }
        const dlg = p.locator('[role="dialog"]:visible').filter({has: p.locator('[id^="contributor-givenName"]')}).last();
        await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: 30_000});
        await idle(p); await sleep(500);
        await snap(`${name}-form`, p);
        return {list: listFacts, opened: true, dlg, field: await fieldFacts(p, dlg)};
    }
    const fieldOf = (p, dlg) => dlg.locator('.pkpFormField').filter({has: p.locator('.pkpFormFieldLabel', {hasText: /ORCID/})}).first();
    async function fieldFacts(p, dlg) {
        const f = fieldOf(p, dlg);
        if (!(await f.count())) return null;
        return f.evaluate((el) => ({
            label: el.querySelector('.pkpFormFieldLabel')?.innerText.trim(),
            links: [...el.querySelectorAll('a')].map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})),
            icons: [...el.querySelectorAll('img, svg')].map((e) => (e.getAttribute('src') || e.getAttribute('class') || e.tagName)).slice(0, 6),
            buttons: [...el.querySelectorAll('button')].map((b) => ({t: b.innerText.replace(/\s+/g, ' ').trim(), disabled: b.disabled})),
            text: el.innerText.replace(/\s+/g, ' ').trim().replace(/ORCID is an independent.*?orcid\.org\. /, '[blurb] '),
        })).catch((e) => ({error: flat(e.message, 200)}));
    }
    // Press a field button (or link), read the question window, answer it; the requests and the field after.
    async function press(p, dlg, control, answer, name) {
        const f = fieldOf(p, dlg);
        const reqs = [];
        const onResp = (r) => { if (/\/orcid\/|contributors|authors/.test(r.url()) && r.request().method() !== 'GET') reqs.push(r); };
        p.on('response', onResp);
        const d0 = DIALOGS.length;
        const target = f.getByRole('button', {name: control}).or(f.getByRole('link', {name: control})).or(f.getByText(control, {exact: true}));
        await target.first().click();
        await sleep(700);
        const s = await snap(`${name}-question`, p);
        const qd = p.locator('[role="dialog"]:visible').filter({hasNot: p.locator('[id^="contributor-givenName"]')}).last();
        const hasQ = await qd.count();
        const question = hasQ ? {text: flat(await qd.innerText().catch(() => s.text && s.text.dialog), 600), buttons: (await qd.getByRole('button').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean)} : null;
        if (hasQ && answer) await qd.getByRole('button', {name: answer, exact: true}).click();
        await sleep(1800); await idle(p).catch(() => {});
        p.off('response', onResp);
        const after = await snap(`${name}-after`, p);
        const answers = [];
        for (const r of reqs) answers.push({req: `${r.request().method()} ${rel(r.url())}`, status: r.status(), body: flat(await r.text().catch(() => ''), 300)});
        return {question, answers, notices: [...(s.notices || []), ...(after.notices || [])], browserDialogs: DIALOGS.slice(d0), field: await fieldFacts(p, dlg), openDialogs: await p.locator('[role="dialog"]:visible').count()};
    }
    async function saveForm(p, dlg, name, {country = true} = {}) {
        if (country) {
            const c = dlg.locator('select[id^="contributor-country"], select[name="country"]').first();
            if (await c.count() && !(await c.inputValue().catch(() => ''))) await c.selectOption({label: 'Canada'});
        }
        const reqs = [];
        const onResp = (r) => { if (/contributors|authors|\/orcid\//.test(r.url()) && r.request().method() !== 'GET') reqs.push(r); };
        p.on('response', onResp);
        await dlg.getByRole('button', {name: 'Save', exact: true}).last().click();
        await sleep(2500); await idle(p).catch(() => {});
        p.off('response', onResp);
        const s = await snap(`${name}-saved`, p);
        const out = {requests: [], notices: s.notices, formOpen: await p.locator('[role="dialog"]:visible').filter({has: p.locator('[id^="contributor-givenName"]')}).count()};
        for (const r of reqs) out.requests.push(`${r.request().method()} ${rel(r.url())} ${r.status()}`);
        return out;
    }
    async function closeForm(p, dlg) {
        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(1200);
    }
    const step = (bag) => async (k, fn) => { try { bag[k] = await fn(); } catch (e) { bag[k] = {error: flat(e.stack || e.message, 600)}; } log(`[${app.name} ${k}]`, JSON.stringify(bag[k]).slice(0, 2500)); };

    // The journal's ORCID tab: "ORCID request log" set and saved (Settings › Users & Roles › ORCID).
    async function setLogLevel(p, ctx, label, name) {
        await p.goto(app.url(`/index.php/${ctx}/en/management/settings/access`));
        await idle(p);
        await p.locator('#orcidSettings-button').first().click();
        const panel = p.locator('#orcidSettings');
        await panel.locator('select[name="orcidLogLevel"]').waitFor({timeout: T});
        await panel.locator('select[name="orcidLogLevel"]').selectOption({label});
        const ans = p.waitForResponse((r) => r.url().includes('/api/v1/contexts/') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await ans;
        await idle(p); await sleep(500);
        await snap(name, p);
        return {status: r && r.status(), stored: q(`select coalesce(setting_value,'') from ${ctxT.settings} where setting_name='orcidLogLevel' and ${ctxT.id}=${ctxId(ctx)}`)};
    }

    try {
        // ============================================================== contrib
        // Rule 8, 8a, scenarios 4 and 5, Side effects (the request email, the revoke on removal,
        // the request log), Coverage (Site Administrator / assigned Section Editor; a verified iD's
        // "Delete").
        if (on('contrib')) {
            const t = tag('u04sw3c');
            const tm = tag('u04sw3m');
            const C = {ctx: t, ctxMember: tm};
            const S = step(C);
            const u = (k) => `${t}${k}`;
            await app.api.createContext({tag: t, context: {contactName: `ORCID Contact ${t}`, contactEmail: `contact-${t}@mail.test`}, orcid: {}, users: [
                userRow(u('mg'), {roles: ['manager']}), userRow(u('se'), {roles: ['sectionEditor']}),
                userRow(u('au'), {roles: ['author'], givenName: 'Cleo', familyName: `Writer${t.slice(-4)}`}),
                userRow(u('rd'), {roles: ['reader'], orcid: VERIFIED, orcidIsVerified: true}),
            ]});
            await app.api.createContext({tag: tm, context: {contactName: `ORCID Contact ${tm}`, contactEmail: `contact-${tm}@mail.test`}, orcid: {apiType: 'memberSandbox'}, users: [
                userRow(`${tm}mg`, {roles: ['manager']}), userRow(`${tm}au`, {roles: ['author'], givenName: 'Mira', familyName: `Member${tm.slice(-4)}`}),
            ]});
            const parts = [{username: u('se'), role: 'sectionEditor'}];
            const mk = (k, extra = {}) => app.api.createSubmission({tag: `${t}${k}`, context: t, submitter: u('au'), title: `SW3 ${k} ${t}`, participants: parts, ...extra});
            const s0 = await mk('n');
            const s1 = await mk('u', {author: {orcid: VERIFIED, orcidIsVerified: false}});
            const s2 = await mk('v', {author: {orcid: VERIFIED, orcidIsVerified: true}});
            const s3 = await mk('w', {author: {orcid: VERIFIED, orcidIsVerified: true}});
            const s4 = await mk('l');
            const s5 = await mk('a');
            const s6 = await mk('e');
            const sm = await app.api.createSubmission({tag: `${tm}n`, context: tm, submitter: `${tm}au`, title: `SW3 member ${tm}`});
            const authorTo = `${u('au')}@mail.test`, memberTo = `${tm}au@mail.test`, novaTo = `nova-${t}@mail.test`;
            const since = new Date(Date.now() - 5000);
            const j0 = maxJob(), f0 = maxFailed();
            await signIn(page, u('mg'), {contextPath: t});

            // S4: the no-iD field, "Request verification" › "Yes"; Save; reopen; a reload, reopen
            await S('request', async () => {
                const f = await contributorForm(page, t, s0, 'Cleo', 'c-noid');
                await loc(page, 'contributor ORCID iD field', fieldOf(page, f.dlg));
                const yes = await press(page, f.dlg, 'Request verification', 'Yes', 'c-noid-yes');
                const saved = await saveForm(page, f.dlg, 'c-noid');
                const reopened = await contributorForm(page, t, s0, 'Cleo', 'c-noid-reopen');
                await closeForm(page, reopened.dlg);
                await page.reload(); await idle(page);
                const afterReload = await contributorForm(page, t, s0, 'Cleo', 'c-noid-reload');
                await closeForm(page, afterReload.dlg);
                return {list: f.list, before: f.field, yes, saved, reopened: reopened.field, afterReload: afterReload.field,
                    stored: q(`select setting_name from author_settings where setting_name in ('orcidEmailToken','orcidVerificationRequested') and author_id in (select author_id from authors where publication_id=${s0.publicationId}) order by 1`)};
            });
            // the member-API journal: its manager in a browser of their own
            const mb = await second('member');
            await S('member', async () => {
                await signIn(mb.page, `${tm}mg`, {contextPath: tm});
                const f = await contributorForm(mb.page, tm, sm, 'Mira', 'c-member');
                const yes = await press(mb.page, f.dlg, 'Request verification', 'Yes', 'c-member-yes');
                return {before: f.field, yes};
            });
            // a contributor being added: "Request verification" on the new form, unsaved
            let novaDlg = null;
            await S('add', async () => {
                const f = await contributorForm(page, t, s0, null, 'c-add', {add: true});
                novaDlg = f.dlg;
                await f.dlg.locator('[id^="contributor-givenName"]').first().fill('Nova');
                await f.dlg.locator('[id^="contributor-email"]').first().fill(novaTo);
                const country = f.dlg.locator('select[id^="contributor-country"], select[name="country"]').first();
                if (await country.count()) await country.selectOption({label: 'Canada'});
                const author = f.dlg.getByRole('checkbox', {name: 'Author', exact: true});
                if (await author.count()) await author.first().check().catch(() => {});
                const yes = await press(page, f.dlg, 'Request verification', 'Yes', 'c-add-yes');
                return {before: f.field, yes};
            });
            // one drain: the two saved contributors' requests; nothing for the address still being added
            await S('mail1', async () => {
                const d = await drainJobs(app);
                const a = await mailsTo(authorTo, since), m = await mailsTo(memberTo, since), n = await mailsTo(novaTo, since);
                return {drain: d.counts, author: a, member: m, nova: n, authorBody: a[0] ? await mailBody(a[0].id) : null, memberBody: m[0] ? await mailBody(m[0].id) : null};
            });
            // the control: save the new contributor, drain
            await S('addSaved', async () => {
                const saved = await saveForm(page, novaDlg, 'c-add');
                const d = await drainJobs(app);
                const n = await mailsTo(novaTo, since);
                return {saved, drain: d.counts, nova: n, novaBody: n[0] ? await mailBody(n[0].id) : null};
            });
            // the What-is-ORCID link of each email, opened signed out
            await S('about', async () => {
                const v = await second('visitor');
                const out = {};
                for (const k of ['authorBody', 'memberBody']) {
                    const b = C.mail1 && C.mail1[k];
                    const link = b && b.links.find((l) => /\/orcid\/about/.test(l.href));
                    if (!link) { out[k] = {link: null}; continue; }
                    const r = await v.page.goto(link.href.replace(/^https?:\/\/[^/]+/, app.baseURL));
                    await idle(v.page); await sleep(500);
                    const s = await snap(`c-about-${k}`, v.page);
                    const body = flat(s.text && (s.text.main || s.text.body) || await v.page.locator('body').innerText(), 4000);
                    out[k] = {link: link.text, href: rel(link.href), status: r && r.status(), title: await v.page.title(), h: (await v.page.locator('h1, h2, h3').allInnerTexts()).map((x) => flat(x, 80)), howAndWhy: flat((body.split(/How and why/)[1] || '').slice(0, 900), 900)};
                }
                await v.close();
                out.differ = out.authorBody && out.memberBody && out.authorBody.howAndWhy !== out.memberBody.howAndWhy;
                return out;
            });
            // sweep: "Resend Verification Email" on the requested field
            await S('resend', async () => {
                const f = await contributorForm(page, t, s0, 'Cleo', 'c-resend');
                const r = await press(page, f.dlg, 'Resend Verification Email', 'Yes', 'c-resend-press');
                await closeForm(page, f.dlg);
                const d = await drainJobs(app);
                return {before: f.field, press: r, drain: d.counts, author: await mailsTo(authorTo, since)};
            });
            // S5: the unauthenticated iD, "Delete" › "Yes"; the field at once and reopened after a reload
            await S('deleteUnauth', async () => {
                const jb = maxJob();
                const f = await contributorForm(page, t, s1, 'Cleo', 'c-unauth');
                const del = await press(page, f.dlg, 'Delete', 'Yes', 'c-unauth-delete');
                await closeForm(page, f.dlg);
                await page.reload(); await idle(page);
                const again = await contributorForm(page, t, s1, 'Cleo', 'c-unauth-reload');
                await closeForm(page, again.dlg);
                return {before: f.field, del, afterReload: again.field, jobs: jobsSince(jb), rows: authorRows(s1.publicationId)};
            });
            // Coverage: the verified iD's "Delete" (Rule 8a), the revoke job (Side effects), under "Errors"
            await S('deleteVerified', async () => {
                const jb = maxJob(), fb = maxFailed(), m = L.mark();
                const f = await contributorForm(page, t, s2, 'Cleo', 'c-verified');
                const del = await press(page, f.dlg, 'Delete', 'Yes', 'c-verified-delete');
                await closeForm(page, f.dlg);
                const queued = jobsSince(jb);
                const d = await drainJobs(app);
                const again = await contributorForm(page, t, s2, 'Cleo', 'c-verified-reload');
                await closeForm(page, again.dlg);
                return {before: f.field, del, queued, drain: d.counts, failed: failedSince(fb), appLog: L.since(m).filter((l) => /orcid/i.test(l)).slice(0, 8), afterReload: again.field, rows: authorRows(s2.publicationId)};
            });
            // the request log, the other end: "All" saved; a verified iD deleted and a request sent; drained
            await S('logAll', async () => {
                const set = await setLogLevel(page, t, 'All', 'c-log-all');
                const jb = maxJob(), fb = maxFailed(), m = L.mark();
                const f = await contributorForm(page, t, s3, 'Cleo', 'c-log-verified');
                const del = await press(page, f.dlg, 'Delete', 'Yes', 'c-log-verified-delete');
                await closeForm(page, f.dlg);
                const g = await contributorForm(page, t, s4, 'Cleo', 'c-log-noid');
                const req = await press(page, g.dlg, 'Request verification', 'Yes', 'c-log-noid-yes');
                await closeForm(page, g.dlg);
                const v = await second('visitor-log');
                await v.page.goto(app.url(`/index.php/${t}/orcid/verify?token=sw3nosuchtoken&state=1&author_id=1`)).catch(() => {});
                await sleep(800); await v.close();
                const queued = jobsSince(jb);
                const d = await drainJobs(app);
                const out = {set, del: del.answers, req: req.answers, queued, drain: d.counts, failed: failedSince(fb), appLog: L.since(m).filter((l) => /orcid|Orcid/.test(l)).slice(0, 12)};
                out.reset = await setLogLevel(page, t, 'Errors', 'c-log-reset');
                // the "Errors" end of the same typed address
                const m2 = L.mark();
                const v2 = await second('visitor-log2');
                await v2.page.goto(app.url(`/index.php/${t}/orcid/verify?token=sw3nosuchtoken&state=1&author_id=1`)).catch(() => {});
                await sleep(800); await v2.close();
                out.errorsVerifyLog = L.since(m2).filter((l) => /orcid|Orcid/.test(l)).slice(0, 6);
                return out;
            });
            // Coverage: the Site Administrator and the assigned Section Editor request verification
            for (const [who, k, opts, sub] of [['admin', 'admin', {}, s5], [u('se'), 'se', {contextPath: t}, s6]]) {
                await S(`role-${k}`, async () => {
                    await signIn(page, who, opts);
                    const f = await contributorForm(page, t, sub, 'Cleo', `c-role-${k}`);
                    if (!f.opened) return {list: f.list, opened: false};
                    const yes = await press(page, f.dlg, 'Request verification', 'Yes', `c-role-${k}-yes`);
                    await closeForm(page, f.dlg);
                    return {list: f.list, before: f.field, yes};
                });
            }
            // sweep: the form left with a change unsaved (Close), then reopened
            await S('leaveUnsaved', async () => {
                await signIn(page, u('mg'), {contextPath: t});
                const f = await contributorForm(page, t, s5, 'Cleo', 'c-leave');
                const fam = f.dlg.locator('[id^="contributor-familyName"]').first();
                const before = await fam.inputValue().catch(() => null);
                await fam.fill(`${before || ''}Changed`);
                await fam.blur().catch(() => {});
                const d0 = DIALOGS.length;
                await f.dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
                await sleep(1500);
                const s = await snap('c-leave-closed');
                const stillOpen = await page.locator('[role="dialog"]:visible').filter({has: page.locator('[id^="contributor-givenName"]')}).count();
                const g = await contributorForm(page, t, s5, 'Cleo', 'c-leave-reopen');
                const after = await g.dlg.locator('[id^="contributor-familyName"]').first().inputValue().catch(() => null);
                await closeForm(page, g.dlg);
                return {before, typed: `${before || ''}Changed`, browserDialogs: DIALOGS.slice(d0), dialogText: flat(s.text && s.text.dialog, 300), stillOpen, afterReopen: after};
            });
            // Side effects: removing one's own iD (Identity tab "Delete" › OK) queues the revoke
            await S('ownDelete', async () => {
                await signIn(page, u('rd'), {contextPath: t});
                await page.goto(app.url(`/index.php/${t}/en/user/profile`));
                await page.locator('form#identityForm').waitFor({timeout: 30_000});
                await idle(page);
                await snap('c-own-before');
                const jb = maxJob(), fb = maxFailed();
                await page.locator('#deleteOrcidButton').click();
                await sleep(800);
                const s = await snap('c-own-question');
                await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: 'OK', exact: true}).click();
                await sleep(2000); await idle(page);
                const a = await snap('c-own-after');
                const queued = jobsSince(jb);
                const d = await drainJobs(app);
                return {question: flat(s.text && s.text.dialog, 300), notices: a.notices, orcidText: flat(await page.locator('.orcid_container').innerText().catch(() => null), 300), queued, drain: d.counts, failed: failedSince(fb)};
            });
            await mb.close();
            C.jobsAll = jobsSince(j0); C.failedAll = failedSince(f0);
            fact('contrib', C);
        }

        // =============================================================== review
        // Rule 12, scenario 9, A1 {OJS}: a Member Sandbox journal with City and country; the
        // verified reviewer's row before and after completion, an incomplete review sent, the
        // iD-less reviewer's row; the publish's review deposits; a public-API journal; a journal
        // without a country. Controls: a press (A1's Press Manager), a preprint server (no panel).
        if (on('review')) {
            const R = {};
            const S = step(R);
            const t = tag('u04sw3r');
            const u = (k) => `${t}${k}`;
            const reviewerMenu = async (p, ctx, sub, names, name) => {
                await p.goto('about:blank');
                await p.goto(editorialUrl(ctx, sub));
                const modal = p.locator('[data-cy="active-modal"]').first();
                const mgr = modal.locator('[data-cy="reviewer-manager"]');
                if (!(await mgr.waitFor({timeout: 30_000}).then(() => true).catch(() => false))) {
                    const s = await snap(`${name}-workflow`, p);
                    return {panel: false, text: flat(s.text && (s.text.dialog || s.text.main), 600), send: await p.getByText('Send Review To ORCID').count()};
                }
                await idle(p); await sleep(800);
                await snap(`${name}-reviewers`, p);
                const out = {panel: true};
                const {closeMenu} = require('../../../support/menus.js');
                for (const n of names) {
                    const row = mgr.getByRole('row').filter({hasText: n}).first();
                    const text = flat(await row.innerText().catch(() => null), 200);
                    let entries = null;
                    try {
                        await row.getByRole('button', {name: 'More Actions'}).click();
                        const menu = p.getByRole('menu').last();
                        await menu.getByRole('menuitem').first().waitFor({timeout: T});
                        entries = (await menu.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60));
                        await closeMenu(p).catch(() => {});
                        await sleep(400);
                    } catch (e) { entries = {error: flat(e.message, 200)}; }
                    out[n] = {text, entries};
                }
                return out;
            };
            const sendReview = async (p, ctx, sub, n, name) => {
                await p.goto('about:blank');
                await p.goto(editorialUrl(ctx, sub));
                const modal = p.locator('[data-cy="active-modal"]').first();
                const mgr = modal.locator('[data-cy="reviewer-manager"]');
                await mgr.waitFor({timeout: 30_000});
                await idle(p); await sleep(800);
                const row = mgr.getByRole('row').filter({hasText: n}).first();
                await row.getByRole('button', {name: 'More Actions'}).click();
                await p.getByRole('menu').last().getByRole('menuitem', {name: 'Send Review To ORCID'}).click();
                await sleep(600);
                const qd = p.locator('[role="dialog"]:visible').last();
                await qd.waitFor({timeout: T});
                const qs = await snap(`${name}-question`, p);
                const question = {text: flat(await qd.innerText(), 400), buttons: (await qd.getByRole('button').allInnerTexts()).map((x) => flat(x, 40)).filter(Boolean)};
                const jb = maxJob();
                const d0 = DIALOGS.length;
                const ans = p.waitForResponse((r) => /sendToOrcid/i.test(r.url()), {timeout: T}).catch(() => null);
                await qd.getByRole('button', {name: 'OK', exact: true}).click();
                const r = await ans;
                await sleep(1500); await idle(p);
                const after = await snap(`${name}-after`, p);
                await sleep(4000);
                const later = await snap(`${name}-later`, p);
                return {question, status: r && r.status(), body: r ? flat(await r.text().catch(() => ''), 200) : null, notices: [...(qs.notices || []), ...(after.notices || []), ...(later.notices || [])], browserDialogs: DIALOGS.slice(d0), dialogsOpen: await p.locator('[role="dialog"]:visible').count(), alerts: await p.getByRole('alert').count(), status_: (await p.locator('[role="status"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 80)).filter(Boolean), queued: jobsSince(jb)};
            };
            const drained = async (fb) => { const d = await drainJobs(app); return {drain: d.counts, failed: failedSince(fb)}; };
            if (app.name === 'ops') {
                await app.api.createContext({tag: t, orcid: {apiType: 'memberSandbox'}, users: [userRow(u('mg'), {roles: ['manager']}), userRow(u('au'), {roles: ['author']})]});
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: u('au')});
                await signIn(page, u('mg'), {contextPath: t});
                await S('opsControl', () => reviewerMenu(page, t, s, [], 'rv-ops'));
            } else if (app.name === 'omp') {
                await app.api.createContext({tag: t, orcid: {apiType: 'memberSandbox', city: 'Burnaby'}, users: [userRow(u('mg'), {roles: ['manager']}), userRow(u('au'), {roles: ['author']}),
                    userRow(u('r1'), {roles: ['externalReviewer'], givenName: 'Vera', familyName: `Verified${t.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: true}),
                    userRow(u('r2'), {roles: ['externalReviewer'], givenName: 'Nell', familyName: `Noid${t.slice(-4)}`})]});
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: u('au'), decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: u('r1'), status: 'completed'}, {username: u('r2'), status: 'completed'}]}]});
                await signIn(page, u('mg'), {contextPath: t});
                await S('ompMenus', () => reviewerMenu(page, t, s, ['Vera', 'Nell'], 'rv-omp'));
                await S('ompSend', async () => { const fb = maxFailed(); const x = await sendReview(page, t, s, 'Vera', 'rv-omp-send'); return {...x, ...(await drained(fb))}; });
            } else {
                await app.api.createContext({tag: t, context: {country: 'CA'}, orcid: {apiType: 'memberSandbox', city: 'Burnaby'}, issues: [{volume: 3, number: 1, year: 2026, published: true}], users: [
                    userRow(u('mg'), {roles: ['manager']}), userRow(u('au'), {roles: ['author']}),
                    userRow(u('r1'), {roles: ['externalReviewer'], givenName: 'Vera', familyName: `Verified${t.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: true}),
                    userRow(u('r2'), {roles: ['externalReviewer'], givenName: 'Nell', familyName: `Noid${t.slice(-4)}`}),
                    userRow(u('r3'), {roles: ['externalReviewer'], givenName: 'Ivo', familyName: `Incomplete${t.slice(-4)}`, orcid: VERIFIED2, orcidIsVerified: true}),
                ]});
                const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: u('au'), decisions: ['sendExternalReview'], author: {orcid: VERIFIED2, orcidIsVerified: true},
                    reviewRounds: [{reviewers: [{username: u('r1'), status: 'accepted'}, {username: u('r2'), status: 'accepted'}, {username: u('r3'), status: 'accepted'}]}]});
                R.ctx = t;
                R.reviewerScope = q(`select u.username || ' ' || s.setting_value from user_settings s join users u on u.user_id=s.user_id where s.setting_name='orcidAccessScope' and u.username like '${t}%' order by 1`);
                await signIn(page, u('mg'), {contextPath: t});
                await S('before', () => reviewerMenu(page, t, s, ['Vera', 'Nell', 'Ivo'], 'rv-before'));
                // the incomplete review sent (A1's "nothing is deposited")
                await S('sendIncomplete', async () => { const fb = maxFailed(); const x = await sendReview(page, t, s, 'Ivo', 'rv-incomplete'); return {...x, ...(await drained(fb))}; });
                // the verified reviewer completes the review on screen
                await S('complete', async () => {
                    const rv = await second('reviewer');
                    await signIn(rv.page, u('r1'), {contextPath: t});
                    const {performReview} = require(path.join(app.suiteDir, 'pages', 'ReviewStagePages.js'));
                    await performReview(rv.page, t, s.submissionId, {recommendation: 'Accept Submission', comments: 'SW3 review.'});
                    const sc = await snap('rv-reviewer-done', rv.page);
                    await rv.close();
                    return {heading: flat(sc.text && sc.text.main, 200), status: q(`select coalesce(date_completed::text,'<none>') || ' step ' || step from review_assignments where submission_id=${s.submissionId} and reviewer_id=(select user_id from users where username='${u('r1')}')`)};
                });
                await S('after', () => reviewerMenu(page, t, s, ['Vera', 'Nell', 'Ivo'], 'rv-after'));
                await S('sendComplete', async () => { const fb = maxFailed(); const x = await sendReview(page, t, s, 'Vera', 'rv-complete'); return {...x, ...(await drained(fb))}; });
                // publishing the article: the review deposits it queues
                await S('publish', async () => {
                    const jb = maxJob(), fb = maxFailed();
                    const ans = [];
                    const onR = (r) => { if (/\/publish/.test(r.url()) && r.request().method() !== 'GET') ans.push(r.status()); };
                    page.on('response', onR);
                    await page.goto('about:blank');
                    await page.goto(editorialUrl(t, s)); await idle(page);
                    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
                    const ps = new PublicationScreen(page, t);
                    await ps.openEntry('Title & Abstract'); await idle(page);
                    let err = null;
                    try { await ps.publish({backIssueLabel: /Vol\. 3 No\. 1 \(2026\)/}); } catch (e) { err = flat(e.message, 300); }
                    page.off('response', onR);
                    const sc = await snap('rv-published');
                    const queued = jobsSince(jb);
                    return {err, answers: ans, notices: sc.notices, queued, ...(await drained(fb)), status: q(`select status from publications where publication_id=${s.publicationId}`)};
                });
                // a public-API journal: the action offered, its confirm deposits nothing
                for (const [k, ctxExtra, orcid] of [['public', {country: 'CA'}, {apiType: 'publicSandbox', city: 'Burnaby'}], ['nocountry', {}, {apiType: 'memberSandbox', city: 'Burnaby'}]]) {
                    const tp = tag(`u04sw3${k[0]}`);
                    await app.api.createContext({tag: tp, context: ctxExtra, orcid, users: [userRow(`${tp}mg`, {roles: ['manager']}), userRow(`${tp}au`, {roles: ['author']}),
                        userRow(`${tp}r1`, {roles: ['externalReviewer'], givenName: 'Rhea', familyName: `Reviewer${tp.slice(-4)}`, orcid: VERIFIED, orcidIsVerified: true})]});
                    const sp = await app.api.createSubmission({tag: `${tp}s`, context: tp, submitter: `${tp}au`, decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: `${tp}r1`, status: 'completed'}]}]});
                    await signIn(page, `${tp}mg`, {contextPath: tp});
                    await S(`${k}Menu`, () => reviewerMenu(page, tp, sp, ['Rhea'], `rv-${k}`));
                    await S(`${k}Send`, async () => {
                        const fb = maxFailed();
                        const x = await sendReview(page, tp, sp, 'Rhea', `rv-${k}-send`);
                        return {...x, ...(await drained(fb)), country: q(`select coalesce(setting_value,'<none>') from journal_settings where setting_name='country' and journal_id=${ctxId(tp)}`) || '<none>', scope: q(`select setting_value from user_settings where setting_name='orcidAccessScope' and user_id=(select user_id from users where username='${tp}r1')`)};
                    });
                }
                await signIn(page, u('mg'), {contextPath: t});
                await S('control', () => reviewerMenu(page, t, s, ['Nell'], 'rv-control'));
            }
            fact('review', R);
        }

        // ============================================================== publish
        // Side effects "On publication", Cross-feature "Publishing": a Member Sandbox context; a
        // contributor with a live verified iD, one with an unauthenticated iD, two sharing a
        // verified iD, two sharing an unauthenticated one; the final window's warnings, the
        // publish, the queue. OJS also: a journal with no issues (DOIs on and off) and "Don't
        // Assign To An Issue" on a journal with issues, for a verified contributor.
        if (on('publish')) {
            const P = {};
            const S = step(P);
            const t = tag('u04sw3p');
            const issue = app.name === 'ojs' ? {issues: [{volume: 5, number: 2, year: 2026, published: true}]} : {};
            await app.api.createContext({tag: t, orcid: {apiType: 'memberSandbox', city: 'Burnaby'}, ...issue, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}au`, {roles: ['author'], givenName: 'Ada', familyName: `Pub${t.slice(-3)}`})]});
            const mkp = async (ctx, k, author, dup) => {
                const s = await app.api.createSubmission({tag: `${ctx}${k}`, context: ctx, submitter: `${ctx}au`, title: `SW3 publish ${k} ${ctx}`, ...(author ? {author} : {}),
                    ...(app.name === 'ojs' ? {} : {}), ...(dup ? {contributors: [{givenName: 'Dee', familyName: `Dup${k}`, email: `dup${k}-${ctx}@mail.test`}]} : {})});
                if (dup) {
                    const first = q(`select author_id from authors where publication_id=${s.publicationId} and email='${ctx}au@mail.test'`);
                    const other = q(`select author_id from authors where publication_id=${s.publicationId} and email='dup${k}-${ctx}@mail.test'`);
                    q(`insert into author_settings (author_id, locale, setting_name, setting_value) select ${other}, locale, setting_name, setting_value from author_settings where author_id=${first} and setting_name in ('orcid','orcidIsVerified','orcidAccessToken','orcidAccessScope','orcidRefreshToken','orcidAccessExpiresOn')`);
                }
                return s;
            };
            const subs = {
                live: await mkp(t, 'v', {orcid: VERIFIED, orcidIsVerified: true}),
                unauth: await mkp(t, 'u', {orcid: VERIFIED, orcidIsVerified: false}),
                dupVerified: await mkp(t, 'd', {orcid: VERIFIED, orcidIsVerified: true}, true),
                dupUnauth: await mkp(t, 'x', {orcid: VERIFIED, orcidIsVerified: false}, true),
            };
            if (app.name === 'ojs') subs.dontAssign = await mkp(t, 'n', {orcid: VERIFIED, orcidIsVerified: true});
            P.ctx = t;
            P.authors = {};
            for (const [k, s] of Object.entries(subs)) P.authors[k] = authorRows(s.publicationId);
            // publish one publication on screen; the final window as data before its button is pressed
            const publishOnScreen = async (ctx, sub, name, {assign} = {}) => {
                const out = {};
                const answers = [];
                const onR = (r) => { if (/\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET') answers.push(r); };
                page.on('response', onR);
                const jb = maxJob();
                try {
                    await page.goto('about:blank');
                    let finalDialog, button;
                    if (app.name === 'ojs') {
                        await page.goto(editorialUrl(ctx, sub)); await idle(page);
                        const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
                        const ps = new PublicationScreen(page, ctx);
                        await ps.openEntry('Title & Abstract'); await idle(page);
                        const panel = await ps.openPublishPanel();
                        await ps.fillVersionDetails(panel);
                        if (assign === 'back') {
                            await ps.awaitAssignmentPreselected(panel);
                            await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
                            await ps.selectIssueOption(panel, /Vol\. 5 No\. 2 \(2026\)/);
                        } else if ((await ps.issueAssignmentGroup(panel).count()) > 0) {
                            await ps.awaitAssignmentPreselected(panel);
                            await panel.getByRole('radio', {name: "Don't Assign To An Issue"}).check();
                        }
                        out.panelGroup = await ps.issueAssignmentGroup(panel).count();
                        await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                        finalDialog = page.getByRole('dialog').filter({hasText: /Are you sure you want to publish this\?|will be published/}).last();
                        button = 'Publish';
                    } else if (app.name === 'omp') {
                        await page.goto(editorialUrl(ctx, sub, `publication_${sub.publicationId}_titleAbstract`)); await idle(page);
                        await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Publish', exact: true}).click();
                        finalDialog = page.getByRole('dialog', {name: /Schedule For Publication/}).last();
                        button = 'Publish';
                    } else {
                        await page.goto(editorialUrl(ctx, sub)); await idle(page);
                        const stage = page.getByRole('button', {name: 'Post the preprint', exact: true});
                        const post = page.getByRole('button', {name: 'Post', exact: true});
                        await stage.or(post).first().waitFor({timeout: 30_000});
                        if (await stage.isVisible()) await stage.click();
                        await post.first().waitFor({timeout: 30_000});
                        await post.first().click();
                        finalDialog = page.getByRole('dialog').filter({hasText: 'Are you sure you want to post this?'}).last();
                        button = 'Post';
                    }
                    await finalDialog.waitFor({timeout: 30_000});
                    await idle(page); await sleep(800);
                    const s = await snap(`${name}-final`);
                    out.final = {text: flat(await finalDialog.innerText(), 1200), buttons: (await finalDialog.getByRole('button').allInnerTexts()).map((x) => flat(x, 40)).filter(Boolean)};
                    await finalDialog.getByRole('button', {name: button, exact: true}).last().click();
                    await sleep(2500); await idle(page).catch(() => {});
                    const a = await snap(`${name}-after`);
                    out.notices = [...(s.notices || []), ...(a.notices || [])];
                    out.dialogAfter = flat(a.text && a.text.dialog, 400);
                    out.alertTexts = (await page.locator('[role="dialog"]:visible, [role="alert"]').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter((x) => /error|unexpected/i.test(x));
                } catch (e) { out.error = flat(e.message, 400); await snap(`${name}-error`).catch(() => {}); }
                page.off('response', onR);
                out.answers = [];
                for (const r of answers) out.answers.push({status: r.status(), body: flat(await r.text().catch(() => ''), 200)});
                out.statusNow = q(`select status from publications where publication_id=${sub.publicationId}`);
                await page.reload().catch(() => {}); await idle(page).catch(() => {}); await sleep(1000);
                const rl = await snap(`${name}-reload`);
                out.reloadText = flat(rl.text && (rl.text.dialog || rl.text.main), 300);
                out.queued = jobsSince(jb);
                return out;
            };
            await signIn(page, `${t}mg`, {contextPath: t});
            // the request log's "All" end: what the publishes and their deposits write to the app log
            await S('logAll', () => setLogLevel(page, t, 'All', 'pub-log-all'));
            const lm = L.mark();
            for (const [k, s] of Object.entries(subs)) {
                await S(k, () => publishOnScreen(t, s, `pub-${k}`, {assign: k === 'dontAssign' ? 'none' : 'back'}));
            }
            P.appLogPublish = L.since(lm).filter((l) => /orcid|Orcid|ORICD|Request body|Submitting reviews/.test(l)).slice(0, 12);
            const lm2 = L.mark();
            await S('drain', async () => { const fb = maxFailed(); const d = await drainJobs(app); return {drain: d.counts, failed: failedSince(fb)}; });
            P.appLogDrain = L.since(lm2).map((l) => l.slice(0, 220)).slice(0, 12);
            if (app.name === 'ojs') {
                // a journal with no issues: DOIs on (a new context's default) and off
                for (const [k, extra] of [['noIssueDoi', {}], ['noIssueNoDoi', {enableDois: false}]]) {
                    const tn = tag(`u04sw3${k === 'noIssueDoi' ? 'i' : 'o'}`);
                    await app.api.createContext({tag: tn, ...extra, orcid: {apiType: 'memberSandbox', city: 'Burnaby'}, users: [userRow(`${tn}mg`, {roles: ['manager']}), userRow(`${tn}au`, {roles: ['author']})]});
                    const s = await mkp(tn, 'v', {orcid: VERIFIED, orcidIsVerified: true});
                    await signIn(page, `${tn}mg`, {contextPath: tn});
                    await S(k, async () => {
                        const fb = maxFailed();
                        const x = await publishOnScreen(tn, s, `pub-${k}`);
                        const d = await drainJobs(app);
                        return {...x, drain: d.counts, failed: failedSince(fb), dois: q(`select coalesce(setting_value,'') from journal_settings where setting_name='enableDois' and journal_id=${ctxId(tn)}`)};
                    });
                }
            }
            fact('publish', P);
        }

        // =============================================================== author
        // Scenario 10: the Author's dashboard list (submitted) and the wizard's Contributors step
        // (unsubmitted); the Journal Manager's control on the submitted one.
        if (on('author')) {
            const A = {};
            const S = step(A);
            const t = tag('u04sw3a');
            await app.api.createContext({tag: t, orcid: {}, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}au`, {roles: ['author'], givenName: 'Cleo', familyName: `Author${t.slice(-4)}`})]});
            const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `SW3 submitted ${t}`, submitted: true});
            const draft = await app.api.createSubmission({tag: `${t}d`, context: t, submitter: `${t}au`, title: `SW3 draft ${t}`, submitted: false});
            A.ctx = t;
            await signIn(page, `${t}au`, {contextPath: t});
            await S('dashboard', async () => {
                const base = app.url(`/index.php/${t}/en/dashboard/mySubmissions?workflowSubmissionId=${sub.submissionId}&workflowMenuKey=publication_${sub.publicationId}_contributors`);
                const f = await contributorForm(page, t, sub, 'Cleo', 'au-dashboard', {base}).catch((e) => ({error: flat(e.message, 200)}));
                const out = {list: f.list, opened: f.opened, field: f.field, error: f.error,
                    preview: await page.getByRole('button', {name: 'Preview', exact: true}).count(), order: await page.getByRole('button', {name: 'Order', exact: true}).count(),
                    rowDelete: await page.locator('.listPanel--contributor li.listPanel__item').filter({hasText: 'Cleo'}).getByRole('button', {name: 'Delete', exact: true}).count(),
                    orcidText: await page.getByText('ORCID iD', {exact: true}).count(), requestButtons: await page.getByRole('button', {name: 'Request verification'}).count()};
                if (f.opened) { await closeForm(page, f.dlg); out.afterClose = await page.locator('[role="dialog"]:visible').filter({has: page.locator('[id^="contributor-givenName"]')}).count(); }
                return out;
            });
            await S('wizard', async () => {
                await page.goto(app.url(`/index.php/${t}/en/submission?id=${draft.submissionId}`));
                await idle(page); await sleep(800);
                const steps = [];
                for (let i = 0; i < 4; i++) {
                    if (await page.locator('.listPanel--contributor').first().isVisible().catch(() => false)) break;
                    steps.push(flat(await page.locator('h1, h2').first().innerText().catch(() => null), 60));
                    await page.getByRole('button', {name: 'Continue', exact: true}).first().click(); await sleep(1200); await idle(page);
                }
                await snap('au-wizard-contributors');
                const wl = page.locator('.listPanel--contributor').first();
                await wl.locator('li.listPanel__item').filter({hasText: 'Cleo'}).first().getByRole('button', {name: 'Edit', exact: true}).click();
                const dlg = page.locator('[role="dialog"]:visible').filter({has: page.locator('[id^="contributor-givenName"]')}).last();
                await dlg.locator('[id^="contributor-givenName"]').first().waitFor({timeout: T});
                await idle(page); await sleep(500);
                await snap('au-wizard-form');
                const before = await fieldFacts(page, dlg);
                const yes = await press(page, dlg, 'Request verification', 'Yes', 'au-wizard-yes');
                await closeForm(page, dlg);
                return {steps, before, yes, stored: q(`select setting_name from author_settings where setting_name in ('orcidEmailToken','orcidVerificationRequested') and author_id in (select author_id from authors where publication_id=${draft.publicationId}) order by 1`)};
            });
            await S('managerControl', async () => {
                const mb = await second('manager');
                await signIn(mb.page, `${t}mg`, {contextPath: t});
                const f = await contributorForm(mb.page, t, sub, 'Cleo', 'au-mg-control');
                await mb.close();
                return {list: f.list, field: f.field};
            });
            fact('author', A);
        }

        // ================================================================ cross
        // Cross-feature hosts: the Identity tab (verified / no iD), invitations with ORCID on and
        // off, Manage Emails' ORCID rows (OPS2, A7), Site Settings' ORCID tab (A9; a change left).
        if (on('cross')) {
            const X = {};
            const S = step(X);
            const t = tag('u04sw3x');
            const tf = `${t}f`;
            await app.api.createContext({tag: t, orcid: {}, users: [userRow(`${t}mg`, {roles: ['manager']}), userRow(`${t}rv`, {roles: ['reader'], orcid: VERIFIED, orcidIsVerified: true}), userRow(`${t}rn`, {roles: ['reader']})]});
            await app.api.createContext({tag: tf, users: [userRow(`${tf}mg`, {roles: ['manager']})]});
            for (const k of ['rv', 'rn']) {
                await S(`identity-${k}`, async () => {
                    await signIn(page, `${t}${k}`, {contextPath: t});
                    await page.goto(app.url(`/index.php/${t}/en/user/profile`));
                    await page.locator('form#identityForm').waitFor({timeout: 30_000});
                    await idle(page);
                    await snap(`x-identity-${k}`);
                    const form = page.locator('form#identityForm');
                    return {container: await form.locator('.orcid_container').count(), text: flat(await form.locator('.orcid_container').innerText().catch(() => null), 400), buttons: (await form.locator('.orcid_container button, .orcid_container a').allInnerTexts().catch(() => [])).map((x) => flat(x, 60)).filter(Boolean)};
                });
            }
            for (const [k, c] of [['n', t], ['f', tf]]) {
                await S(`invite-${k}`, async () => {
                    await signIn(page, `${c}mg`, {contextPath: c});
                    const email = `inv-${c}@mail.test`;
                    await page.goto(app.url(`/index.php/${c}/en/management/settings/access`)); await idle(page);
                    await page.getByRole('button', {name: 'Invite to a role'}).click();
                    await page.getByLabel(/Search for a user by email address/).fill(email);
                    await page.getByRole('button', {name: 'Search User', exact: true}).click();
                    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
                    await idle(page); await sleep(800);
                    const s = await snap(`x-invite-${k}-details`);
                    const out = {orcidLines: String((s.text && s.text.main) || '').split(/\n/).filter((l) => /ORCID/i.test(l)).map((l) => flat(l, 200))};
                    await page.getByLabel(/^Given Name/).first().fill('Ivy');
                    const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
                    await row.getByLabel(/^Select a new role/).selectOption({label: 'Author'});
                    const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
                    await row.getByRole('textbox').fill(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
                    await row.getByRole('combobox').last().selectOption({index: 1}).catch(() => {});
                    X[`invite-${k}-details`] = out;
                    await page.getByRole('button', {name: 'Save And Continue'}).click();
                    await page.getByLabel(/^Subject/).waitFor({timeout: T});
                    const since = new Date();
                    await page.getByRole('button', {name: 'Invite user to the role'}).click();
                    await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
                    let m = null;
                    for (let i = 0; i < 2 && !m; i++) { m = await app.mail.find({to: email, since, timeoutMs: 15_000}).catch(() => null); if (!m) await drainJobs(app); }
                    const full = m ? await app.mail.fullMessage(m.ID) : null;
                    const accept = full && (String(full.HTML).match(/href=['"]([^'"]*\/invitation\/accept\?[^'"]+)['"]/i) || [])[1];
                    if (accept) {
                        const v = await second('invitee');
                        await v.page.goto(accept.replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, app.baseURL));
                        await idle(v.page); await sleep(1500);
                        const sv = await snap(`x-invite-${k}-accept`, v.page);
                        out.acceptText = flat(sv.text && (sv.text.main || sv.text.body), 500);
                        out.acceptOrcidButtons = (await v.page.getByRole('button', {name: /ORCID/}).allInnerTexts().catch(() => [])).map((x) => flat(x, 60));
                        await v.close();
                    } else out.acceptError = m ? 'no accept link' : 'no mail';
                    return out;
                });
            }
            await S('emails', async () => {
                await signIn(page, `${t}mg`, {contextPath: t});
                const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
                const m = new ManageEmailsPage(page, t);
                await m.goto(); await m.waitForList();
                const total = await m.rows().count();
                await m.search('ORCID'); await idle(page); await sleep(1000);
                await snap('x-emails-orcid');
                const out = {total, rows: (await m.rows().allInnerTexts()).map((x) => flat(x, 200)), noItems: await m.noItems().isVisible().catch(() => null), opened: {}};
                for (const name of ['orcidRequestUpdateScope', 'orcidCollectAuthorId']) {
                    if (!(await m.editButton(name).count())) { out.opened[name] = null; continue; }
                    try {
                        const {kind, window} = await m.openEmail(name, {search: false});
                        await idle(page); await sleep(600);
                        const s = await snap(`x-email-${name}`);
                        out.opened[name] = {kind, text: flat(await window.innerText().catch(() => s.text && s.text.dialog), 500)};
                        await page.keyboard.press('Escape'); await sleep(800);
                        await m.goto(); await m.waitForList(); await m.search('ORCID'); await idle(page);
                    } catch (e) { out.opened[name] = {error: flat(e.message, 200)}; }
                }
                return out;
            });
            await S('site', async () => {
                await signIn(page, 'admin');
                await page.goto(app.url('/index.php/index/en/admin/settings'));
                await idle(page);
                await page.locator('#setup-button').first().click().catch(() => {});
                await sleep(800);
                const sideTabs = (await page.locator('#setup [role="tab"], #setup .pkpTabs__buttons button').allInnerTexts().catch(() => [])).map((x) => flat(x, 40)).filter(Boolean);
                await page.locator('#orcidSiteSettings-button').click();
                const panel = page.locator('#orcidSiteSettings');
                await panel.locator('input[name="orcidEnabled"]').waitFor({timeout: T});
                await idle(page);
                await snap('x-site-orcid');
                const out = {contexts: q(`select count(*) from ${ctxT.table}`), sideTabs, boxChecked: await panel.locator('input[name="orcidEnabled"]').isChecked()};
                // a change left unsaved: the box ticked, another side tab and back, then another page
                const box = panel.locator('input[name="orcidEnabled"]');
                if (!out.boxChecked) {
                    await box.check(); await sleep(400);
                    const other = page.locator('#setup [role="tab"], #setup .pkpTabs__buttons button').filter({hasText: 'Languages'}).first();
                    await other.click().catch(() => {}); await sleep(800);
                    await page.locator('#orcidSiteSettings-button').click(); await sleep(800);
                    out.backFromTab = await box.isChecked();
                    const d0 = DIALOGS.length;
                    await page.goto(app.url('/index.php/index/en/admin')).catch((e) => { out.leaveErr = flat(e.message, 200); });
                    await idle(page).catch(() => {});
                    out.leaveDialogs = DIALOGS.slice(d0);
                    await page.goto(app.url('/index.php/index/en/admin/settings')); await idle(page);
                    await page.locator('#setup-button').first().click().catch(() => {});
                    await page.locator('#orcidSiteSettings-button').click();
                    await panel.locator('input[name="orcidEnabled"]').waitFor({timeout: T});
                    out.afterLeave = await panel.locator('input[name="orcidEnabled"]').isChecked();
                    out.siteRow = q("select coalesce(setting_value,'') from site_settings where setting_name='orcidEnabled'");
                }
                return out;
            });
            fact('cross', X);
        }
    } catch (e) {
        fact('fatal', flat(e.stack || e.message, 800));
    } finally {
        fact('crashes', CR);
        fact('dialogs', DIALOGS);
        await close();
    }
});
