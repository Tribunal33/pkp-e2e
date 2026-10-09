// PR review check — pkp/pkp-lib#13283 on `main`: pkp-lib#13493 with ojs#5920, omp#2503, ops#1444.
// Acceptance criteria 1 (#13155) and 4 as the person who presses "Request verification" and the
// contributor who gets the mail see them: the ORCID request emails, whose default bodies the
// change rewrites ({$principalContactSignature} → {$contextSignature}, {$authorName} →
// {$recipientName}, the submission's title in "Submission ORCID") while the code stops supplying
// {$principalContactSignature}. Drives a dataset fleet as `admin`:
//
//   npm run fleet-prep -- --feature pr13493b --dataset 2 --reset
//   PROBE_FEATURE=pr13493b PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/sync/pkp-lib-13493/orcid-emails.js
//
// The `main` dataset's database was installed before the change and is already at 3.6.0.0, so
// the upgrade migration never runs on it: the script records the mails twice (`passes`):
//   - `as loaded`: the default bodies the dataset holds, sent by the checkout's code;
//   - `install step replayed`: after `php lib/pkp/tools/installEmailTemplate.php <key>` for the
//     three keys under the fleet's config (the install step the migration itself calls for
//     ORCID_COLLECT_AUTHOR_ID), so the default bodies are the checkout's own.
// Per pass: the stored default bodies (`email_templates_default_data`, en and fr_CA) and which
// of the five variables each holds; ORCID on for `publicknowledge` on its own tab as "Public
// Sandbox", "Request verification" on a contributor without an iD (CONTRIBUTORS below; "Resend
// Verification Email" where one was requested before) and the mail it sends ("Submission
// ORCID"): subject, From, To, the whole body, every {$…} left in it, whether the greeting names
// the contributor, whether the submission's title is there, the lines that close it; the same
// with "Member Sandbox" ("Requesting ORCID record access"); and Settings › Emails, the row of
// the public-API email: the subject and body the manager sees and what "Insert Content" offers.
// Facts go to result-orcid-emails-<pkp-lib sha>-<app>.json, each mail's HTML to
// mail-<sha>-<pass>-<api>-<app>.html, the tool's output to install-email-templates-<sha>-<app>.log;
// no assertions. The script changes the fleet's default templates and leaves ORCID on: reset
// the fleet first.
const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, shot, record, sql, outFile} = require('../../../probe');
const {pkpLibSha, attempt, journalOrcidOn, requestVerification, requestMail} = require('./lib');

const KEYS = ['ORCID_COLLECT_AUTHOR_ID', 'ORCID_REQUEST_AUTHOR_AUTHORIZATION', 'ORCID_REQUEST_UPDATE_SCOPE'];
const VARIABLES = ['authorName', 'recipientName', 'principalContactSignature', 'contextSignature', 'submissionTitle'];
// contributors without an iD on submissions of the dataset that are not published; the preprint
// server has one such contributor, so both of its mails go to him
const CONTRIBUTORS = {
    ojs: {
        public: {submissionId: 4, name: 'Mark Irvine', to: 'mirvine@mailinator.com'},
        member: {submissionId: 2, name: 'Carlo Corino', to: 'ccorino@mailinator.com'},
    },
    omp: {
        public: {submissionId: 2, name: 'Sarah Carter', to: 'scarter@mailinator.com'},
        member: {submissionId: 2, name: 'Peter Fortna', to: 'pfortna@mailinator.com'},
    },
    ops: {
        public: {submissionId: 1, name: 'Carlo Corino', to: 'ccorino@mailinator.com'},
        member: {submissionId: 1, name: 'Carlo Corino', to: 'ccorino@mailinator.com'},
    },
};
const API = {public: 'Public Sandbox', member: 'Member Sandbox'};
const LEFT = /\{\$[A-Za-z0-9_]+\}/g;

const htmlToText = (html) =>
    String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#0?39;/g, "'");
const lines = (text) =>
    String(text || '')
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

forEachApp(async (app) => {
    const {OrcidSettingsTab, openContributors} = require(`${app.suiteDir}/pages/OrcidPages.js`);
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const pages = {WorkflowPage, openContributors};
    const sha = pkpLibSha(app);
    const R = {app: app.name, pkpLib: sha, passes: []};

    const stored = () => {
        const rows = JSON.parse(
            sql(
                app,
                `SELECT coalesce(json_agg(json_build_object('key', email_key, 'locale', locale, 'subject', subject, 'body', body) ORDER BY email_key, locale), '[]') FROM email_templates_default_data WHERE email_key IN (${KEYS.map((k) => `'${k}'`).join(', ')}) AND locale IN ('en', 'fr_CA')`,
            ),
        );
        const out = [];
        for (const key of KEYS) {
            for (const locale of ['en', 'fr_CA']) {
                const row = rows.find((r) => r.key === key && r.locale === locale);
                out.push(
                    row && row.body
                        ? {key, locale, subject: row.subject, holds: Object.fromEntries(VARIABLES.map((v) => [v, row.body.includes(`{$${v}}`)])), body: row.body}
                        : {key, locale, row: row ? 'empty body' : 'no row'},
                );
            }
        }
        return {
            customised: Number(sql(app, `SELECT count(*) FROM email_templates WHERE email_key IN (${KEYS.map((k) => `'${k}'`).join(', ')})`)),
            defaults: out,
        };
    };
    const title = (submissionId) => sql(app, `SELECT ps.setting_value FROM publication_settings ps JOIN submissions s ON s.current_publication_id = ps.publication_id WHERE s.submission_id = ${Number(submissionId)} AND ps.setting_name = 'title' AND ps.locale = 'en'`);
    const {table, id, settings} = app.contextTables;
    const context = sql(app, `SELECT setting_name || '=' || setting_value FROM ${settings} WHERE ${id} = (SELECT ${id} FROM ${table} WHERE path = '${app.contextPath}') AND setting_name IN ('contactName', 'contactEmail', 'emailSignature') ORDER BY 1`).split('\n');
    R.context = context.map((l) => l.slice(0, 400));

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin', {contextPath: app.contextPath});

        const send = async (pass, api) => {
            const who = CONTRIBUTORS[app.name][api];
            const facts = {api: API[api], contributor: who.name, submissionId: who.submissionId, submissionTitle: title(who.submissionId)};
            facts.orcidOn = await attempt(() => journalOrcidOn(page, app, OrcidSettingsTab, API[api]));
            const press = await requestVerification(page, app, pages, who);
            Object.assign(facts, {pressed: press.pressed, status: press.status, question: press.question, fieldAfter: press.fieldAfter});
            if (!press.pressed || press.status >= 400) {
                return facts;
            }
            const mail = await requestMail(page, app, {to: who.to, since: press.since});
            fs.writeFileSync(outFile(`mail-${sha}-${pass.replace(/\s+/g, '-')}-${api}.html`), mail.html || '');
            const text = mail.text && mail.text.trim() ? mail.text : htmlToText(mail.html);
            const all = lines(text);
            const closingFrom = all.findIndex((l) => /If you have any questions/.test(l));
            Object.assign(facts, {
                drained: mail.drained,
                subject: mail.subject,
                from: mail.from,
                to: mail.to,
                bodyText: text,
                bodyFromHtml: lines(htmlToText(mail.html)),
                unreplaced: [...new Set(`${mail.subject}\n${mail.html}\n${mail.text}`.match(LEFT) || [])],
                greeting: all[0] || null,
                greetingNamesContributor: (all[0] || '').includes(who.name),
                titleAppears: `${mail.html}\n${mail.text}`.includes(facts.submissionTitle),
                closing: closingFrom >= 0 ? all.slice(closingFrom) : all.slice(-4),
                links: mail.links,
                redirectUri: mail.authLink ? mail.authLink.redirectUri : null,
            });
            return facts;
        };

        // Settings › Emails: the public-API email's row, the body the manager sees, "Insert Content"
        const emailsScreen = async (pass) => {
            const emails = new ManageEmailsPage(page, app.contextPath);
            await emails.goto();
            await emails.search('orcid');
            await page.waitForTimeout(1500);
            const out = {rowsForOrcid: await emails.rowNames()};
            const name = out.rowsForOrcid.find((n) => /CollectAuthorId|Submission ORCID/i.test(n));
            if (!name) {
                return out;
            }
            out.row = name;
            const opened = await emails.openEmail(name, {search: false});
            out.kind = opened.kind;
            if (opened.kind === 'several') {
                out.paragraphs = await emails.windowParagraphs(opened.window);
                out.templates = await emails.templateRowsRead(opened.window);
                await emails.openTemplate(opened.window, out.templates[0].name);
            }
            out.subject = await emails.subjectBox('en').inputValue();
            out.body = await emails.bodyHtml('en');
            out.bodyHolds = Object.fromEntries(VARIABLES.map((v) => [v, out.body.includes(`{$${v}}`)]));
            await shot(page, `emails-screen-${sha}-${pass.replace(/\s+/g, '-')}`);
            const win = await emails.openInsertContent('en');
            out.insertContent = (await emails.insertContentRows(win)).map((r) => `${r.value} — ${r.description}`);
            return out;
        };

        const runPass = async (pass) => {
            const facts = {pass, stored: stored()};
            for (const api of ['public', 'member']) {
                facts[api] = await attempt(() => send(pass, api));
                const m = facts[api];
                console.log(`[${app.name}] ${sha} ${pass} · ${API[api]}: ${m.error || `"${m.subject}" from ${m.from ? `${m.from.Name} <${m.from.Address}>` : '?'} · greeting "${m.greeting}" · unreplaced ${JSON.stringify(m.unreplaced)} · title in body ${m.titleAppears} · closing ${JSON.stringify(m.closing)}`}`);
            }
            facts.emailsScreen = await attempt(() => emailsScreen(pass));
            const e = facts.emailsScreen;
            console.log(`[${app.name}] ${sha} ${pass} · Settings › Emails: ${e.error || `rows ${JSON.stringify(e.rowsForOrcid)} · body holds ${JSON.stringify(e.bodyHolds)} · Insert Content ${JSON.stringify((e.insertContent || []).map((r) => r.split(' — ')[0]))}`}`);
            const holds = facts.stored.defaults.filter((d) => d.holds).map((d) => `${d.key}/${d.locale}: ${VARIABLES.filter((v) => d.holds[v]).join(', ') || 'none'}`);
            console.log(`[${app.name}] ${sha} ${pass} · stored defaults (customised rows: ${facts.stored.customised}): ${holds.join(' · ')}`);
            R.passes.push(facts);
        };

        await runPass('as loaded');

        // the install step, replayed for the three keys under the fleet's config
        let log = '';
        R.replay = [];
        for (const key of KEYS) {
            const run = spawnSync('php', ['lib/pkp/tools/installEmailTemplate.php', key], {
                cwd: path.resolve(app.root),
                env: {...process.env, PKP_CONFIG_FILE: path.resolve(app.configFile)},
                encoding: 'utf8',
            });
            log += `$ php lib/pkp/tools/installEmailTemplate.php ${key}\n${run.stdout || ''}${run.stderr || ''}(exit ${run.status})\n`;
            R.replay.push({key, exit: run.status, said: `${run.stdout || ''}${run.stderr || ''}`.trim().split('\n').pop().slice(0, 300)});
        }
        fs.writeFileSync(outFile(`install-email-templates-${sha}.log`), log);
        console.log(`[${app.name}] ${sha} install step replayed: ${R.replay.map((r) => `${r.key} exit ${r.exit}${r.said ? ` (${r.said})` : ''}`).join(' · ')}`);

        await runPass('install step replayed');
    } finally {
        record(`result-orcid-emails-${sha}`, R);
        await close();
    }
});
