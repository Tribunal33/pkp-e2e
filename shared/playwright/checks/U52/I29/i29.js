// U52 housekeeping claim check I29 (incidentals row 36): where a signed-out buyer lands after signing in
// from the Login page a purchase link leads to.
// Spec: docs/specs/U52-payments-and-apcs.md Rule 9 (lines 241–245, "a signed-out visitor gets the Login page
// and, once signed in, the payment page"), lines 33–40 (a press's direct sale is U69's); U69 A18, Rule 13c, td14.
//
//   RUN=r1 PROBE_FEATURE=U52 PROBE_AGENT=ccI29 node bin/probe.js <omp|ojs> shared/playwright/checks/U52/I29/i29.js
//
// Each RUN seeds its own scratch contexts (tag u52i29), so r1 and r2 are independent reads.
// OMP  Q  a press with USD + "Manual Fee Payment" (instructions): q1 published, format "PDF" (article.pdf at
//         Direct Sales 25) and format "Free" (article.pdf, Open Access). Users <p>rd Reader, <p>mg Press Manager.
//      R  a press with "Users must be registered and log in to view open access content." ticked: r1 published,
//         format "PDF" (article.pdf, Open Access) — the free-file control (U69 Rule 13c).
//   a) visitor: q1's book page → the priced PDF link → Login page → sign in there as the Reader → landing;
//      the Reader then presses the same link from the book page (signed in) → payment page.
//   b) the same as the Press Manager (the role axis: a staff role).
//   c) visitor: q1's free file → where it goes (no sign-in expected).
//   d) visitor: r1's free PDF → Login → sign in as R's Reader → landing.
// OJS  J  a subscription journal: USD + "Manual Fee Payment", "Purchase Article" 5, "Purchase Issue" 7; Vol 1 No 1
//         published with an issue galley "Full Issue"; an article with a PDF galley in it. Users <p>ra, <p>ri Readers.
//   e) visitor: the article page → its PDF galley link → Login → sign in as <p>ra → landing.
//   f) visitor: the issue page → the issue galley → Login → sign in as <p>ri → landing.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, screen, shot, record, loc, note, idle, tag, outDir, users} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const T = 30_000;
const log = (...a) => console.log('[i29]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `i29-state-${RUN}-${app.name}.json`);

forEachApp(async (app) => {
    if (!['omp', 'ojs'].includes(app.name)) { log(`${app.name}: no purchase surface (U52 lines 41–43); nothing to drive`); return; }
    const isOMP = app.name === 'omp';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i29-${RUN}-facts`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+\/index\.php\/[^/]+/, '');
    const cUrl = (ctx, p) => app.url(`/index.php/${ctx}${p}`);

    // ------------------------------------------------------------------ seed
    if (!S.seeded) {
        const t = tag('u52i29');
        S.t = t;
        const U = (p, k, role, g, f) => ({username: `${p}${k}`, roles: [role], givenName: g, familyName: f});
        if (isOMP) {
            const q = `${t}q`;
            await app.api.createContext({tag: q, context: {name: {en: `I29 Q ${t}`}, contactName: 'Pat Contact', contactEmail: `${q}ct@mail.test`},
                users: [U(q, 'mg', 'manager', 'Kim', 'Manager'), U(q, 'au', 'author', 'Ada', 'Author'), U(q, 'rd', 'reader', 'Rae', 'Reader')],
                payments: {enabled: true, currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay I29 by cheque.'}});
            const f = (name, extra = {}) => ({name, file: 'article.pdf', genre: 'Book Manuscript', ...extra});
            const s1 = await app.api.createSubmission({tag: `${q}1`, context: q, submitter: `${q}au`, title: `I29 Q book ${t}`, published: true,
                publicationFormats: [f('PDF', {price: '25'}), f('Free')]});
            S.Q = {path: q, id: s1.submissionId, formats: (s1.publicationFormats || []).map((x) => ({name: x.name, id: x.id, fid: x.submissionFileId}))};
            const r = `${t}r`;
            await app.api.createContext({tag: r, context: {name: {en: `I29 R ${t}`}, contactName: 'Pat Contact', contactEmail: `${r}ct@mail.test`},
                users: [U(r, 'au', 'author', 'Ada', 'Author'), U(r, 'rd', 'reader', 'Rae', 'Reader')], restrictMonographAccess: true});
            const s2 = await app.api.createSubmission({tag: `${r}1`, context: r, submitter: `${r}au`, title: `I29 R book ${t}`, published: true, publicationFormats: [f('PDF')]});
            S.R = {path: r, id: s2.submissionId, formats: (s2.publicationFormats || []).map((x) => ({name: x.name, id: x.id, fid: x.submissionFileId}))};
        } else {
            const j = `${t}j`;
            const res = await app.api.createContext({tag: j, context: {name: `I29 J ${t}`, acronym: 'IJ', contactName: 'Pat Contact', contactEmail: `${j}ct@mail.test`},
                publishingMode: 'subscription',
                payments: {currency: 'USD', paymentPluginName: 'ManualPayment', manualInstructions: 'Pay I29 by cheque.', purchaseArticleFee: 5, purchaseIssueFee: 7},
                subscriptionTypes: [{name: 'I29 Individual', cost: 10, currency: 'USD', duration: 12}],
                users: [U(j, 'mg', 'manager', 'Kim', 'Manager'), U(j, 'au', 'author', 'Ada', 'Author'), U(j, 'ra', 'reader', 'Ria', 'Articlebuyer'), U(j, 'ri', 'reader', 'Ivo', 'Issuebuyer')],
                sections: [{abbrev: 'ART', title: 'Articles'}],
                issues: [{volume: 1, number: 1, year: 2026, published: true, galleys: [{label: 'Full Issue', file: 'article.pdf'}]}]});
            const s = await app.api.createSubmission({tag: `${j}1`, context: j, submitter: `${j}au`, title: `I29 J article ${t}`, published: true,
                section: 'ART', issue: {volume: 1, number: 1, year: 2026}, galleys: [{label: 'PDF', locale: 'en', file: 'article.pdf'}]});
            S.J = {path: j, id: s.submissionId, issueId: ((res.issues || [])[0] || {}).id};
        }
        S.seeded = true;
        save();
        note(`ccI29 [${app.name}] ${RUN}: scratch ${JSON.stringify(S).slice(0, 600)}`);
    }

    // ------------------------------------------------------------------ one fresh browser per visitor sequence
    async function sequence(label, fn) {
        const {page, close} = await launch(app);
        page.setDefaultTimeout(T);
        const hops = [];
        page.on('response', (r) => {
            const u = r.url();
            if (r.request().resourceType() !== 'document') return;
            hops.push({status: r.status(), url: rel(u).slice(0, 300), location: flat(r.headers().location, 300)});
        });
        const dialogs = [];
        page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
        const errs = [];
        page.on('pageerror', (e) => errs.push(flat(e.message, 200)));
        const snap = async (name, extra) => {
            let s;
            try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
            if (extra) Object.assign(s, extra);
            record(`${RUN}-${name}`, s);
            await shot(page, `${RUN}-${name}`).catch(() => {});
            return s;
        };
        const settle = async () => { await idle(page).catch(() => {}); await sleep(400); };
        const loginPage = async () => page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const form = document.querySelector('form#login, form.cmp_form.login');
            return {url: location.href, h1: f(document.querySelector('h1')?.textContent), form: !!form,
                source: form?.querySelector('input[name="source"]')?.value ?? null,
                message: [...document.querySelectorAll('.cmp_notification, .pkp_form_error, p.message, .login_message')].map((n) => f(n.innerText)),
                links: form ? [...form.querySelectorAll('a')].map((a) => f(a.textContent)) : [],
                body: f(document.querySelector('.page, main, .pkp_structure_main')?.innerText || document.body.innerText).slice(0, 500)};
        }).catch((e) => ({error: flat(e.message, 200)}));
        const landing = async () => page.evaluate(() => {
            const f = (s) => (s || '').replace(/\s+/g, ' ').trim();
            const main = document.querySelector('.pkp_structure_main, main, .page') || document.body;
            return {url: location.href, title: document.title, h1: f(main.querySelector('h1, h2')?.textContent),
                paymentForm: /Manual Fee Payment/.test(document.body.innerText), sendButton: !![...document.querySelectorAll('a, button')].find((a) => /Send notification of payment/.test(a.textContent)),
                viewer: !!document.querySelector('header.header_viewable_file, iframe'), text: f(main.innerText).slice(0, 600)};
        }).catch((e) => ({error: flat(e.message, 200)}));
        const pressTo = async (locator, name) => {
            const h0 = hops.length;
            const n = await locator.count();
            const r = {present: n > 0, count: n};
            if (!n) { await snap(name, {press: r}); return r; }
            r.text = flat(await locator.first().innerText().catch(() => null), 200);
            r.href = rel(await locator.first().getAttribute('href').catch(() => null));
            await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}), locator.first().click({noWaitAfter: true})]);
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            await settle();
            r.landed = rel(page.url());
            r.hops = hops.slice(h0);
            await snap(name, {press: r});
            return r;
        };
        const signInHere = async (user, name) => {
            const h0 = hops.length;
            await page.locator('input#username, input[name="username"]').first().fill(user);
            const pw = page.locator('input#password, input[name="password"]').first();
            await pw.evaluate((el) => el.removeAttribute('maxlength'));
            await pw.fill(users.getPassword(user));
            await Promise.all([page.waitForLoadState('domcontentloaded').catch(() => {}),
                page.locator('form#login button[type="submit"], form.login button[type="submit"]').first().click()]);
            await page.waitForURL((u) => !/\/login(\/signIn)?$/.test(u.pathname), {timeout: 20000}).catch(() => {});
            await settle();
            const r = {user, landed: rel(page.url()), hops: hops.slice(h0), page: await landing()};
            await snap(name, {signIn: r});
            return r;
        };
        const land = async (url, name) => {
            const h0 = hops.length;
            const resp = await page.goto(url).catch((e) => ({err: flat(e.message, 200)}));
            await settle();
            const r = {status: resp && resp.status ? resp.status() : resp, landed: rel(page.url()), hops: hops.slice(h0)};
            await snap(name, {land: r});
            return r;
        };
        const out = {};
        try {
            await fn({page, snap, pressTo, signInHere, land, loginPage, landing, out});
        } catch (e) {
            out.error = flat(e.message, 300);
            await snap(`${label}-err`).catch(() => {});
        } finally {
            out.dialogs = dialogs;
            out.pageErrors = errs;
            fact(label, out);
            await close();
        }
    }

    if (isOMP) {
        const Q = S.Q;
        const R = S.R;
        const qLink = (page, name) => { const x = Q.formats.find((f) => f.name === name); return page.locator(`.obj_monograph_full a[href*="/${x.id}/${x.fid}"]`); };
        const rLink = (page) => { const x = R.formats.find((f) => f.name === 'PDF'); return page.locator(`.obj_monograph_full a[href*="/${x.id}/${x.fid}"]`); };
        // a) the Reader
        await sequence('a-reader', async ({page, pressTo, signInHere, land, loginPage, landing, out}) => {
            out.book = await land(cUrl(Q.path, `/catalog/book/${Q.id}`), 'a-01-q1-visitor');
            out.links = await page.locator('.entry_details .item.files').ariaSnapshot().catch(() => null);
            await loc(page, 'Book page: priced file link ("Purchase PDF")', qLink(page, 'PDF'));
            out.press = await pressTo(qLink(page, 'PDF'), 'a-02-priced-pressed-visitor');
            out.login = await loginPage();
            await loc(page, 'Login page: the "source" field', page.locator('form#login input[name="source"]'));
            out.signIn = await signInHere(`${Q.path}rd`, 'a-03-after-signin-reader');
            out.bookAgain = await land(cUrl(Q.path, `/catalog/book/${Q.id}`), 'a-04-q1-reader');
            out.pressAgain = await pressTo(qLink(page, 'PDF'), 'a-05-priced-pressed-reader');
            out.payPage = await landing();
            await loc(page, 'Payment page: "Send notification of payment"', page.getByRole('link', {name: 'Send notification of payment'}));
        });
        // b) the Press Manager (a staff role)
        await sequence('b-manager', async ({page, pressTo, signInHere, land, loginPage, out}) => {
            out.book = await land(cUrl(Q.path, `/catalog/book/${Q.id}`), 'b-01-q1-visitor');
            out.press = await pressTo(qLink(page, 'PDF'), 'b-02-priced-pressed-visitor');
            out.login = await loginPage();
            out.signIn = await signInHere(`${Q.path}mg`, 'b-03-after-signin-manager');
        });
        // c) the free file on the paying press, signed out
        await sequence('c-free', async ({page, pressTo, land, landing, out}) => {
            out.book = await land(cUrl(Q.path, `/catalog/book/${Q.id}`), 'c-01-q1-visitor');
            out.press = await pressTo(qLink(page, 'Free'), 'c-02-free-pressed-visitor');
            out.page = await landing();
        });
        // d) the restricted press's free PDF (U69 Rule 13c)
        await sequence('d-restricted', async ({page, pressTo, signInHere, land, loginPage, out}) => {
            out.book = await land(cUrl(R.path, `/catalog/book/${R.id}`), 'd-01-r1-visitor');
            out.press = await pressTo(rLink(page), 'd-02-free-pressed-visitor');
            out.login = await loginPage();
            out.signIn = await signInHere(`${R.path}rd`, 'd-03-after-signin-reader');
        });
    } else {
        const J = S.J;
        // e) "Purchase Article": the article's PDF galley
        await sequence('e-article', async ({page, pressTo, signInHere, land, loginPage, out}) => {
            out.article = await land(cUrl(J.path, `/article/view/${J.id}`), 'e-01-article-visitor');
            out.galleys = await page.locator('.obj_article_details .galleys_links, .item.galleys').first().ariaSnapshot().catch(() => null);
            await loc(page, 'Article page: the PDF galley link', page.locator('a.obj_galley_link').first());
            out.press = await pressTo(page.locator('a.obj_galley_link').first(), 'e-02-galley-pressed-visitor');
            out.login = await loginPage();
            out.signIn = await signInHere(`${J.path}ra`, 'e-03-after-signin-reader');
        });
        // f) "Purchase Issue": the issue galley
        await sequence('f-issue', async ({page, pressTo, signInHere, land, loginPage, out}) => {
            out.issue = await land(cUrl(J.path, `/issue/view/${J.issueId}`), 'f-01-issue-visitor');
            const full = page.locator('.obj_issue_toc > .galleys a.obj_galley_link, .obj_issue_toc .galleys a.obj_galley_link').first();
            await loc(page, 'Issue page: the issue galley link', full);
            out.press = await pressTo(full, 'f-02-issue-galley-pressed-visitor');
            out.login = await loginPage();
            out.signIn = await signInHere(`${J.path}ri`, 'f-03-after-signin-reader');
        });
    }
});
