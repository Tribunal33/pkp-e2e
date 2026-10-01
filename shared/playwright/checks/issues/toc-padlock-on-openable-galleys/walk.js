// Issue report walk: docs/issues/U51-A7-toc-padlock-on-openable-galleys.md
// (spec U51 register A7). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions), on the journal
// `publicknowledge` and its own users.
//
// Setting up (steps 1-9), as `dbarnes`: the journal requires subscriptions;
// "Vol. 1 No. 2 (2014)" set to "Subscription" and given a "Full Issue"
// galley "PDF"; "Subscription Policies" saved with "Partial expiry"; a
// subscription type "Online u51w15"; `ccorino` given an individual
// subscription that ended yesterday; `jjanssen` invited as "Subscription
// Manager" and accepting from the emailed link.
// Reading (steps 10-15), for each of dbarnes, minoue, mfritz, jjanssen,
// vkarbasizaed, ccorino and ckwantes: the issue's page, each "PDF" link read
// (class, icon, screen-reader words), submission 17's "PDF" pressed, then the
// "Full Issue" "PDF" pressed; and the article page's "PDF" read. Signed out at
// the end, the visitor reads the issue's page (neighbour).
// The kit builds nothing; every screen is recorded with screen().
//
// Arguments: (none) every reader; `neighbour` only ckwantes, vkarbasizaed and
// the signed-out visitor (the fix check: they keep the padlock where Expected
// says).
//
// Reset first (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/toc-padlock-on-openable-galleys/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
// Trying the fix:
//   node bin/try-fix.js apply shared/playwright/checks/issues/toc-padlock-on-openable-galleys/fix.diff ojs
//   … reset, walk (PROBE_RUN=fix) … then node bin/try-fix.js revert ojs
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, drainJobs} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const T = 30_000;
const TAG = 'u51w15';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const ARTICLES = {1: 'Signalling Theory Dividends', 17: 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms'};
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const TYPE = `Online ${TAG}`;
const READERS = MODE === 'steps'
    ? ['dbarnes', 'minoue', 'mfritz', 'jjanssen', 'vkarbasizaed', 'ccorino', 'ckwantes']
    : ['vkarbasizaed', 'ckwantes'];
const FILES = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
// Dates are the install's: the dataset's config.inc.php sets time_zone = UTC.
const iso = (d) => new Intl.DateTimeFormat('en-CA', {timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
const today = new Date();
const yesterday = new Date(Date.now() - 24 * 3600 * 1000);

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('the walk drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {AccessSettings, PaymentsPage, GLYPH} = require('../../../pages/SubscriptionsPages.js');
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const cp = app.contextPath;
    const ctx = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? `/index.php/${cp}` : `/index.php/${cp}/en`;
    const facts = {mode: MODE, line: app.line || 'main', dataset: app.dataset, today: iso(today)};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${MODE}-${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const here = () => page.url().replace(app.baseURL, '');
    const userId = (u) => Number(sql(app, `SELECT user_id FROM users WHERE username = '${u}'`));

    /** A galley link as the user sees it: classes, the icon drawn, the screen-reader words. */
    async function readLink(link) {
        if (!(await link.count())) return null;
        const first = link.first();
        const icon = await first.evaluate((a) => {
            const pick = (p) => { const c = getComputedStyle(a, p).content; return !c || c === 'none' || c === 'normal' ? '' : c.replace(/^["']|["']$/g, ''); };
            return pick('::before') || pick('::after');
        });
        return {
            className: await first.getAttribute('class'),
            text: flat(await first.innerText()),
            screenReader: flat(await first.locator('.pkp_screen_reader').innerText({timeout: 1000}).catch(() => '')),
            icon: icon === GLYPH.lock ? 'padlock' : icon === GLYPH.pdf ? 'pdf' : icon ? `U+${icon.codePointAt(0).toString(16).toUpperCase()}` : '',
            href: (await first.getAttribute('href') || '').replace(app.baseURL, ''),
        };
    }
    const issueLinks = (id) => page.locator('.pkp_structure_main .obj_article_summary').filter({hasText: ARTICLES[id]}).locator('a.obj_galley_link');
    const fullIssueLinks = () => page.locator('.pkp_structure_main .galleys a.obj_galley_link');
    async function openIssue() {
        await page.goto(app.url(`${ctx}/issue/archive`));
        await idle(page);
        await page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first().click();
        await page.waitForLoadState('load');
        await idle(page);
    }
    /** Press a galley link: where it lands, the viewer, the server log. */
    async function press(name, locator) {
        const from = logSize();
        const nav = page.waitForNavigation({waitUntil: 'load', timeout: 15_000}).catch(() => null);
        await locator.click();
        const resp = await nav;
        await idle(page).catch(() => {});
        await pause(300);
        const out = {status: resp ? resp.status() : null, landed: here()};
        out.viewer = await page.locator('iframe[src*="pdfJsViewer"], iframe#pdfCanvasContainer, #pdfCanvasContainer iframe, .galley_view iframe, iframe').count();
        out.title = await page.title();
        out.message = flat(await page.locator('.pkp_structure_main').first().innerText({timeout: 1500}).catch(() => ''), 300) || null;
        out.log = logSince(from);
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    try {
        // ------------------------------------------------------------ steps 1-9, as dbarnes
        await signIn(page, 'dbarnes', {contextPath: cp});                                                 // 1
        const access = new AccessSettings(page, cp);                                                        // 2
        await access.goto();
        await access.modeRadio(SUB_MODE).check();
        fact('step2-access-save', (await access.save()).status());
        await snap('step2-access');

        const issues = new IssuesAdmin(page, cp);                                                          // 3
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', ISSUE);
        const form = await win.openAccess();
        await form.locator('select#accessStatus').selectOption({label: 'Subscription'});
        const ra = page.waitForResponse((x) => /update-access|updateAccess/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r3 = await ra; await idle(page); await pause(500);
        fact('step3-issue-access-save', r3 ? r3.status() : null);
        await snap('step3-issue-access');
        await win.close().catch(() => {});

        await issues.goto('Back Issues');                                                                  // 4
        const win2 = await issues.openManagement('Back Issues', ISSUE);
        await win2.openTab('Issue Galleys');
        const g = await win2.openCreateGalley();
        await g.labelBox().fill('PDF');
        const up = await g.upload(path.join(FILES, 'article.pdf'));
        fact('step4-issue-galley-upload', up ? up.status() : null);
        const saved = await g.save();
        fact('step4-issue-galley-save', saved ? saved.status() : null);
        await snap('step4-issue-galley');
        await win2.close().catch(() => {});

        const payments = new PaymentsPage(page, cp);                                                       // 5
        await payments.gotoTab('Subscription Policies');
        const pol = payments.policies();
        await pol.nameBox().fill(`Subscriptions ${TAG}`);
        await pol.emailBox().fill('subscriptions@mailinator.com');
        await pol.addressBox().fill('1 Main Street');
        await pol.expiryRadio('Partial expiry').check();
        fact('step5-policies-save', (await pol.save()).status());
        await snap('step5-policies');

        await payments.gotoTab('Subscription Types');                                                      // 6
        const type = await payments.openCreateType();
        await type.fill({name: TYPE, currency: 'USD', cost: '40', format: 'Online', duration: '12'});
        await type.kindRadio('Individual (users are validated via login)').check();
        fact('step6-type-save', (await type.saveAccepted()).status());

        // Step 7 needs yesterday (the install's day) on or after the articles' date, the day the dataset was built.
        const built = sql(app, `SELECT MAX(p.date_published) FROM submissions s JOIN publications p ON p.publication_id = s.current_publication_id WHERE s.submission_id IN (1, 17)`);
        fact('articles-dated', built);
        if (iso(yesterday) < built) throw new Error(`yesterday (${iso(yesterday)}, UTC) is before the articles' date ${built}: walk on a later day`);
        await payments.gotoTab('Individual Subscriptions');                                                // 7
        const sw = await payments.openCreateSubscription('Individual Subscriptions');
        await sw.chooseUser('ccorino', userId('ccorino'));
        await sw.chooseType(TYPE);
        await sw.chooseStatus('Active');
        await sw.typeDate('dateStart', '2025-10-01');
        await sw.typeDate('dateEnd', iso(yesterday));
        fact('step7-subscription-save', (await sw.saveAccepted()).status());
        await payments.gotoTab('Individual Subscriptions');
        fact('step7-subscription-row', (await payments.rows('Individual Subscriptions').allInnerTexts()).map((t) => flat(t, 300)));
        await snap('step7-subscription');

        if (READERS.includes('jjanssen')) {                                                                // 8
            await page.goto(app.url(`${ctx}/management/settings/access`));
            await idle(page);
            await page.getByRole('button', {name: 'Invite to a role'}).click();
            await page.getByLabel(/Search for a user by email address/).fill('jjanssen@mailinator.com');
            await page.getByRole('button', {name: 'Search User', exact: true}).click();
            const newRow = page.getByRole('row').filter({hasText: 'Select a new role'}).first();
            await newRow.waitFor({timeout: T});
            await idle(page);
            await newRow.getByRole('combobox').first().selectOption({label: 'Subscription Manager'});
            await newRow.getByRole('textbox').fill(iso(today));
            await newRow.getByRole('combobox').last().selectOption({index: 1});
            await page.getByRole('button', {name: 'Save And Continue'}).click();
            await page.locator('input[name="subject"]').waitFor({timeout: T});
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: T}).catch(() => {});
            const before = await app.mail.find({to: 'jjanssen@mailinator.com', timeoutMs: 1}).catch(() => null);
            await page.getByRole('button', {name: 'Invite user to the role'}).click();
            await page.getByRole('dialog').filter({hasText: 'Invitation Sent'}).waitFor({timeout: T});
            await snap('step8-invitation-sent');
            const fresh = async (ms) => {
                const end = Date.now() + ms;
                for (;;) {
                    const m = await app.mail.find({to: 'jjanssen@mailinator.com', timeoutMs: 1}).catch(() => null);
                    if (m && (!before || m.ID !== before.ID)) return m;
                    if (Date.now() > end) return null;
                    await pause(500);
                }
            };
            let msg = await fresh(15_000);
            if (!msg) { await drainJobs(app).catch(() => {}); msg = await fresh(15_000); fact('step8-mail-needed-drainJobs', true); }
            if (!msg) throw new Error('no new invitation email');
            const full = await app.mail.fullMessage(msg.ID);
            const accept = app.mail.extractLink(full.HTML, 'Accept Invitation');
            fact('step8-invitation-email', full.Subject);
            await signOut(page);                                                                           // 9
            await page.goto(accept.replace(/^https?:\/\/[^/]+/, app.baseURL));
            await idle(page);
            const acceptBtn = page.getByRole('button', {name: /^Accept And Continue to/});
            await acceptBtn.waitFor({timeout: T});
            await acceptBtn.click();
            await page.getByRole('dialog').filter({hasText: /assigned a new role/}).waitFor({timeout: T});
            await snap('step9-accepted');
        } else {
            await signOut(page);
        }
        fact('stored', {
            publishingMode: sql(app, `SELECT setting_value FROM journal_settings WHERE setting_name = 'publishingMode'`),
            subscriptionExpiryPartial: sql(app, `SELECT setting_value FROM journal_settings WHERE setting_name = 'subscriptionExpiryPartial'`),
            issue: sql(app, `SELECT access_status, date_published FROM issues WHERE issue_id = 1`),
            articles: sql(app, `SELECT s.submission_id, p.date_published FROM submissions s JOIN publications p ON p.publication_id = s.current_publication_id WHERE s.submission_id IN (1, 17) ORDER BY 1`).split('\n'),
            subscription: sql(app, `SELECT u.username, s.date_start, s.date_end, s.status FROM subscriptions s JOIN users u ON u.user_id = s.user_id`),
            issueGalleys: sql(app, `SELECT galley_id, label FROM issue_galleys ORDER BY 1`).split('\n'),
            jjanssenRoles: sql(app, `SELECT ug.role_id FROM user_user_groups uug JOIN user_groups ug ON ug.user_group_id = uug.user_group_id JOIN users u ON u.user_id = uug.user_id WHERE u.username = 'jjanssen'`).split('\n'),
        });

        // ------------------------------------------------------------ steps 10-15, each reader
        const readIssuePage = async (who) => {
            const links = {};
            for (const id of Object.keys(ARTICLES)) links[`submission ${id}`] = await readLink(issueLinks(id));
            links['Full Issue'] = await readLink(fullIssueLinks());
            return links;
        };
        for (const who of READERS) {
            await signIn(page, who, {contextPath: cp});                                                    // 10
            fact(`${who}-landed`, here());
            await openIssue();                                                                             // 11
            const links = await readIssuePage(who);                                                        // 12
            await snap(`${who}-issue-page`, {walk: links});
            fact(`${who}-issue-links`, links);
            if (who === 'dbarnes') {
                // Reach: the journal's home page shows the current issue's table of contents.
                await page.goto(app.url(`${ctx}`)); await idle(page);
                const home = {'submission 17': await readLink(issueLinks(17)), 'Full Issue': await readLink(fullIssueLinks())};
                await snap(`${who}-home-page`, {walk: home});
                fact(`${who}-home-links`, home);
                await openIssue();
            }
            await press(`${who}-press-17-pdf`, issueLinks(17).first());                                   // 13
            // The article's own page, for comparison: its "PDF" link.
            await openIssue();
            await page.locator('.pkp_structure_main .obj_article_summary').filter({hasText: ARTICLES[17]}).locator('.title a').first().click();
            await page.waitForLoadState('load'); await idle(page);
            const articlePdf = await readLink(page.locator('.pkp_structure_main a.obj_galley_link').filter({hasText: /^\s*(Requires Subscription\s*)?PDF\s*$/}));
            await snap(`${who}-article-page`, {walk: articlePdf});
            fact(`${who}-article-page-pdf`, articlePdf);
            await openIssue();                                                                             // 14
            await press(`${who}-press-full-issue-pdf`, fullIssueLinks().first());
            await signOut(page);                                                                           // 15
        }
        // Neighbour: the signed-out visitor.
        await openIssue();
        const visitor = await readIssuePage('visitor');
        await snap('visitor-issue-page', {walk: visitor});
        fact('visitor-issue-links', visitor);
    } finally {
        record(`${MODE}-facts`, facts);
        await close();
    }
});
