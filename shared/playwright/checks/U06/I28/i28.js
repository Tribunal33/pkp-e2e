// U06 claim check I28 (housekeeping 2026-09-28): the incidental rows L26, L68
// and L69 of docs/tracking/incidentals.md, driven per app on a scratch context
// of this run's own (.reports/hk28/chunks/U06.md holds the drive plan):
//   L26 a  the accept wizard's stepper text before and after the first press
//          (an existing author: one step; a newcomer: three steps), at the
//          kit's 1280 px and at a narrow 380 px window (the collapsed stepper);
//   L26 b  "Accept And Continue to <APP>": the closing dialog, pressed hand-paced
//          by an existing author signed out and by one signed in as themselves;
//   L68    the users list "Edit" page: "Remove Role" on the Section editor /
//          Series editor / Moderator row, then the ended row's masthead select
//          pressed (from "Appear" and, on a second member, from "Does not
//          appear"), read on the page, after a reload, in the mailbox and on
//          "Editorial Masthead" / "Editorial History";
//   L69    an existing Reader (masthead on, and a second one seeded off)
//          invited to Author with "Appear on the masthead": the email's lines.
// Sweep: the accept wizard's "Cancel" and a typed address away with a field
// typed; the Edit page left with an unsaved role row.
// Every screen is recorded with screen(); run twice, each run under its own
// RUN name (facts-<RUN>):
//   RUN=r1 PROBE_FEATURE=U06 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U06/I28/i28.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const ACR = {ojs: 'OJS', omp: 'OMP', ops: 'OPS'};
const OFFER = {ojs: 'Copyeditor', omp: 'Copyeditor', ops: 'Moderator'}; // an existing author's new role
const NEWROLE = {ojs: 'Copyeditor', omp: 'Author', ops: 'Moderator'}; // a newcomer's role
const SE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'};
const RAW = /\{\$\w+\}|##[\w.]+##/g;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);

function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The stepper as data: its aria snapshot, text, collapsed state and every raw key on the page. */
async function stepper(page) {
    const steps = page.locator('.pkpSteps').first();
    const out = {present: await steps.count() > 0};
    if (out.present) {
        out.aria = await steps.ariaSnapshot().catch((e) => `ERR ${e.message}`);
        out.dom = await steps.evaluate((el) => ({
            collapsed: el.classList.contains('pkpSteps--collapsed'),
            innerText: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 600),
            textContent: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 600),
            controls: [...el.querySelectorAll('.pkpSteps__controls')].map((c) => ({
                ariaHidden: c.getAttribute('aria-hidden'),
                text: c.textContent.replace(/\s+/g, ' ').trim(),
                buttons: [...c.querySelectorAll('button')].map((b) => ({text: b.textContent.replace(/\s+/g, ' ').trim(), tabindex: b.getAttribute('tabindex')})),
            })),
            listLabel: (el.querySelector('ol') || {getAttribute: () => null}).getAttribute('aria-label'),
            wrapperScreenReaderOnly: !!el.querySelector('.pkpSteps__buttonWrapper.-screenReader'),
        })).catch((e) => ({error: e.message}));
    }
    out.rawKeys = await page.evaluate((src) => {
        const re = new RegExp(src, 'g');
        const found = new Set();
        const skip = (el) => !!(el && el.closest('script, style, template, noscript, textarea, iframe'));
        const where = (el) => {
            const vis = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            const hidden = !!el.closest('[aria-hidden="true"]');
            const cls = (el.className && typeof el.className === 'string') ? el.className.split(/\s+/).slice(0, 2).join('.') : '';
            return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${vis ? '' : ' (not rendered)'}${hidden ? ' (aria-hidden)' : ''}`;
        };
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walk.nextNode()) {
            const el = walk.currentNode.parentElement;
            if (skip(el)) continue;
            (walk.currentNode.textContent.match(re) || []).forEach((m) => found.add(`text ${where(el)}: ${m}`));
        }
        for (const el of document.querySelectorAll('*')) {
            if (skip(el)) continue;
            for (const a of el.attributes) (a.value.match(re) || []).forEach((m) => found.add(`attr ${a.name} on ${where(el)}: ${m}`));
        }
        return [...found];
    }, RAW.source).catch((e) => [`ERR ${e.message}`]);
    out.liveRegions = await page.evaluate(() => [...document.querySelectorAll('[aria-live]')].map((e) => ({live: e.getAttribute('aria-live'), text: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 200)}))).catch(() => []);
    return out;
}

/** Visible buttons, links and form controls in main and in the open dialog (the sweep's inventory). */
async function controls(page) {
    return page.evaluate(() => {
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const pick = (root) => [...root.querySelectorAll('button, a[href], select, input, textarea')].filter(vis).map((e) => ({
            tag: e.tagName.toLowerCase(), type: e.type || null,
            name: (e.getAttribute('aria-label') || e.innerText || e.value || e.name || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            disabled: e.disabled || e.getAttribute('aria-disabled') === 'true' || false,
        }));
        const main = document.querySelector('main') || document.body;
        const dlg = [...document.querySelectorAll('[role="dialog"]')].filter(vis).pop();
        return {main: pick(main), dialog: dlg ? pick(dlg) : null};
    }).catch((e) => ({error: e.message}));
}

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const T = tag('u06i28');
    const facts = {app: app.name, run: RUN, tag: T, today: today(), errors: {}};
    const save = () => record(`facts-${RUN}`, facts);
    const snap = async (page, name, extra = {}) => {
        const s = await screen(page);
        Object.assign(s, extra);
        record(`${RUN}-${name}`, s);
        return s;
    };
    const step = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            facts.errors[key] = String(e.stack || e).slice(0, 1200);
            console.error(`[${app.name}] ${key} FAILED: ${e.message}`);
        }
        save();
    };
    const mail = (u) => `${u}${T}@mail.test`;
    const rcpt = (k) => `rcpt${T}${k}@mail.test`;

    // Scratch context: a manager; two authors (L26 b); an author + section-level
    // editor with the masthead on and one with it off (L68); a reader with the
    // masthead on and one with it off (L69).
    const seeded = await app.api.createContext({tag: T, users: [
        {username: `mgr${T}`, roles: ['manager']},
        {username: `ea${T}`, givenName: 'Ada', familyName: 'Signedout', roles: ['author']},
        {username: `eb${T}`, givenName: 'Bo', familyName: 'Signedin', roles: ['author']},
        {username: `ex${T}`, givenName: 'Xena', familyName: 'Shown', roles: ['author', 'sectionEditor']},
        {username: `ey${T}`, givenName: 'Yuri', familyName: 'Hidden', roles: ['author', 'sectionEditor'], masthead: {sectionEditor: false}},
        {username: `rd${T}`, givenName: 'Rhea', familyName: 'Reader', roles: ['reader']},
        {username: `rf${T}`, givenName: 'Rolf', familyName: 'Readeroff', roles: ['reader'], masthead: {reader: false}},
    ]});
    facts.seededUsers = (seeded.users || []).map((u) => ({username: u.username, id: u.id}));
    save();

    const readMail = async (to, marker, {timeoutMs = 30_000} = {}) => {
        const summary = await app.mail.find({to, contains: marker, timeoutMs});
        const full = await app.mail.fullMessage(summary.ID);
        const text = (full.Text || '').replace(/\r/g, '');
        const grab = (op) => {
            const m = (full.HTML || '').match(new RegExp(`href=['"]([^'"]*/invitation/${op}\\?[^'"]+)['"]`, 'i'));
            return m ? m[1].replace(/&amp;/g, '&') : null;
        };
        return {subject: full.Subject, text: text.slice(0, 6000),
            mastheadLines: text.split('\n').filter((l) => /masthead|Reader|Author|role/i.test(l)).map((l) => l.trim()).filter(Boolean),
            accept: grab('accept'), decline: grab('decline')};
    };

    const gotoAccess = async (page) => {
        await page.goto(`/index.php/${T}/management/settings/access`);
        await expect(page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };
    const usersTable = (page) => page.getByRole('table', {name: /^Current Users \(/});
    const userRow = (page, text) => usersTable(page).locator('tbody tr').filter({hasText: text});
    const invitationsTable = (page) => page.getByRole('table', {name: /^Invitations \(/});

    // The send wizard, Users & Roles to "Invitation Sent" (after ks27's walk).
    const send = async (page, {to, given, role, marker, key, existing = false, masthead = 'Appear on the masthead', stepperRead = false}) => {
        const out = {};
        await gotoAccess(page);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
        await idle(page);
        if (stepperRead) {
            await snap(page, `${key}-01-search`);
            out.stepperBefore = await stepper(page);
        }
        await page.getByLabel(/Search for a user by email address/).fill(to);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        const d = await snap(page, `${key}-02-enter-details`);
        out.detailsText = flat(d.text.main, 1500);
        if (stepperRead) out.stepperAfter = await stepper(page);
        if (!existing && given) await page.getByLabel(/^Given Name/).first().fill(given);
        const row = page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
        await row.getByLabel(/^Select a new role/).selectOption({label: role});
        await row.getByRole('textbox').fill(today());
        const mast = row.getByRole('combobox').last();
        if (await mast.count() && await mast.isEnabled()) await mast.selectOption({label: masthead}).catch(() => {});
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        const subject = page.getByLabel(/^Subject/);
        await expect(subject).toBeVisible({timeout: 30_000});
        await expect(subject).not.toHaveValue('', {timeout: 30_000});
        const body = page.frameLocator('iframe').locator('body');
        await expect(body).not.toHaveText('', {timeout: 30_000});
        await idle(page);
        await snap(page, `${key}-03-compose`);
        out.composeBody = flat(await body.innerText(), 3000);
        await subject.fill(marker);
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        await expect(sent).toBeVisible({timeout: 30_000});
        await snap(page, `${key}-04-sent`);
        await sent.getByRole('button', {name: 'View All Users'}).click();
        await page.waitForURL(/management\/settings\/access/, {timeout: 30_000});
        return out;
    };

    const {page: mp, close: closeM} = await launch(app);
    let vb = await launch(app);
    let vp = vb.page;
    const acceptLog = [];
    const watch = (page) => page.on('response', (r) => {
        if (/\/api\/v1\/invitations\//.test(r.url())) acceptLog.push({at: Date.now(), method: r.request().method(), path: new URL(r.url()).pathname.replace(/key\/[^/]+/, 'key/…'), status: r.status()});
    });
    watch(vp);
    try {
        await signIn(mp, `mgr${T}`);

        // ── Sends ───────────────────────────────────────────────────────────
        facts.sends = {};
        await step('sends', async () => {
            facts.sends.ea = await send(mp, {to: mail('ea'), role: OFFER[app.name], marker: `Invitation${T}ea`, key: 'send-ea', existing: true, stepperRead: true});
            facts.sends.eb = await send(mp, {to: mail('eb'), role: OFFER[app.name], marker: `Invitation${T}eb`, key: 'send-eb', existing: true});
            facts.sends.rd = await send(mp, {to: mail('rd'), role: 'Author', marker: `Invitation${T}rd`, key: 'send-rd', existing: true});
            facts.sends.rf = await send(mp, {to: mail('rf'), role: 'Author', marker: `Invitation${T}rf`, key: 'send-rf', existing: true});
            facts.sends.nn = await send(mp, {to: rcpt('n'), given: 'Nova', role: NEWROLE[app.name], marker: `Invitation${T}nn`, key: 'send-nn'});
            facts.sends.nw = await send(mp, {to: rcpt('w'), given: 'Wren', role: NEWROLE[app.name], marker: `Invitation${T}nw`, key: 'send-nw'});
            facts.sends.nc = await send(mp, {to: rcpt('c'), given: 'Cato', role: NEWROLE[app.name], marker: `Invitation${T}nc`, key: 'send-nc'});
        });
        facts.mails = {};
        await step('mails', async () => {
            for (const [k, to] of [['ea', mail('ea')], ['eb', mail('eb')], ['rd', mail('rd')], ['rf', mail('rf')], ['nn', rcpt('n')], ['nw', rcpt('w')], ['nc', rcpt('c')]]) {
                facts.mails[k] = await readMail(to, `Invitation${T}${k}`);
            }
        });

        // ── L69 control: "Editorial Masthead" lists no Reader ─────────────
        const readAbout = async (which, name) => {
            await signOut(vp).catch(() => {});
            const r = await vp.goto(`/index.php/${T}/about/${which}`);
            await idle(vp);
            const s = await snap(vp, name);
            const text = await vp.locator('.page_masthead, .pkp_structure_main').first().innerText().catch(() => s.text.main);
            const headings = await vp.locator('.page_masthead h2, .pkp_structure_main h2').allInnerTexts().catch(() => []);
            return {status: r ? r.status() : null, headings, text: flat(text, 2000)};
        };
        facts.about = {};
        await step('about0', async () => {
            facts.about.masthead0 = await readAbout('editorialMasthead', 'about-masthead-0');
            facts.about.history0 = await readAbout('editorialHistory', 'about-history-0');
        });

        // ── L26 b / a: an existing author accepts, signed out, hand-paced ──
        const acceptExisting = async (k, {signedInAs = null, key}) => {
            const out = {};
            await signOut(vp).catch(() => {});
            if (signedInAs) await signIn(vp, signedInAs, {contextPath: T});
            out.signedInAs = signedInAs;
            acceptLog.length = 0;
            await vp.goto(facts.mails[k].accept);
            const btn = vp.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)});
            await btn.waitFor({timeout: 30_000}).catch(() => {});
            await idle(vp);
            const s1 = await snap(vp, `${key}-01-review`);
            out.landing = {url: s1.url, headingText: flat(s1.text.main, 800), dialog: flat(s1.text.dialog, 400)};
            out.stepperBefore = await stepper(vp);
            out.controlsBefore = await controls(vp);
            // Keyboard: Tab from the page top; does focus land on the stepper's toggle, and what is its accessible name?
            await vp.locator('body').focus().catch(() => {});
            await vp.evaluate(() => { if (document.activeElement) document.activeElement.blur(); window.scrollTo(0, 0); });
            out.tabOrder = [];
            for (let i = 0; i < 25; i++) {
                await vp.keyboard.press('Tab');
                const f = await vp.evaluate(() => {
                    const e = document.activeElement;
                    if (!e || e === document.body) return null;
                    return {tag: e.tagName.toLowerCase(), text: (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60),
                        inStepper: !!e.closest('.pkpSteps__controls'), ariaHidden: !!e.closest('[aria-hidden="true"]')};
                });
                out.tabOrder.push(f);
                if (f && f.inStepper) {
                    // The accessibility tree's view of the focused toggle.
                    out.toggleFocusedAria = await vp.locator('.pkpSteps__controls button').ariaSnapshot().catch((e) => `ERR ${e.message}`);
                    out.toggleAccessibleName = await vp.locator('.pkpSteps__controls button').evaluate((b) => b.getAttribute('aria-label')).catch(() => null);
                    break;
                }
                if (f && /Accept And Continue/.test(f.text)) break;
            }
            await vp.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
            // Sweep: the toggle pressed (and pressed again to fold it back).
            const toggle = vp.locator('.pkpSteps__controls button');
            if (await toggle.count() && await toggle.isVisible().catch(() => false)) {
                // What sits at the toggle's centre (a pointer press lands there).
                out.toggleHit = await toggle.evaluate((b) => {
                    const r = b.getBoundingClientRect();
                    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
                    return {rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
                        topIsToggle: !!(top && (top === b || b.contains(top))),
                        top: top ? `${top.tagName.toLowerCase()}.${String(top.className).split(/\s+/).slice(0, 2).join('.')} "${(top.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"` : null};
                });
                out.togglePointer = await toggle.click({timeout: 5_000}).then(() => 'pressed').catch((e) => `refused: ${e.message.split('\n').filter((l) => /intercepts/.test(l)).slice(-1)[0] || e.message.split('\n')[0]}`);
                if (out.togglePointer !== 'pressed') {
                    await toggle.focus();
                    await vp.keyboard.press('Enter');
                    out.toggleKeyboard = 'Enter on the focused toggle';
                }
                await idle(vp);
                await snap(vp, `${key}-01b-toggle-pressed`);
                out.stepperToggled = await stepper(vp);
                await toggle.focus().catch(() => {});
                await vp.keyboard.press('Enter');
                await idle(vp);
                out.stepperToggledBack = await stepper(vp);
            }
            if (!(await btn.isVisible().catch(() => false))) {
                out.noAcceptButton = true;
                return out;
            }
            await sleep(1500); // hand-paced: the page has settled a beat before the press
            const t0 = Date.now();
            await btn.click();
            const dlg = vp.getByRole('dialog');
            out.dialogShown = await dlg.first().waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
            out.dialogAfterMs = Date.now() - t0;
            await idle(vp);
            const s2 = await snap(vp, `${key}-02-after-accept`);
            out.dialogText = flat(s2.text.dialog, 600);
            out.after = {url: s2.url, main: flat(s2.text.main, 600)};
            out.stepperAfter = await stepper(vp);
            out.controlsAfter = await controls(vp);
            out.requests = acceptLog.slice();
            if (out.dialogShown) {
                const b = dlg.getByRole('button', {name: 'View All Submissions'});
                out.dialogButtons = await dlg.getByRole('button').allInnerTexts().catch(() => []);
                if (await b.count()) {
                    await b.click();
                    await vp.waitForLoadState('load');
                    await idle(vp);
                    const s3 = await snap(vp, `${key}-03-after-view-all`);
                    out.afterViewAll = {url: s3.url, header: flat(s3.text.header, 300)};
                }
            }
            // The link again.
            await vp.goto(facts.mails[k].accept);
            await idle(vp);
            const s4 = await snap(vp, `${key}-04-link-again`);
            out.linkAgain = flat(s4.text.main, 400);
            return out;
        };
        facts.accept = {};
        await step('accept-ea', async () => { facts.accept.ea = await acceptExisting('ea', {key: 'acc-ea'}); });
        await step('accept-eb', async () => { facts.accept.eb = await acceptExisting('eb', {signedInAs: `eb${T}`, key: 'acc-eb'}); });

        // The role granted: the manager's users list.
        await step('granted', async () => {
            await gotoAccess(mp);
            await snap(mp, 'granted-users');
            facts.granted = {
                ea: flat(await userRow(mp, mail('ea')).innerText().catch(() => ''), 300),
                eb: flat(await userRow(mp, mail('eb')).innerText().catch(() => ''), 300),
                invitations: (await invitationsTable(mp).locator('tbody tr').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
            };
        });

        // ── L26 a: a newcomer's three-step wizard, 1280 px, then narrow ────
        const newcomer = async (k, {width, key, user}) => {
            const out = {width};
            await signOut(vp).catch(() => {});
            if (width) await vp.setViewportSize({width, height: 900});
            acceptLog.length = 0;
            await vp.goto(facts.mails[k].accept);
            await expect(vp.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)})).toBeVisible({timeout: 30_000});
            await idle(vp);
            await snap(vp, `${key}-01-create`);
            out.stepper1 = await stepper(vp);
            await vp.getByLabel(/^Username/).fill(user);
            await vp.getByLabel(/^Password/).fill(`Password${T}`);
            await vp.getByRole('checkbox').check();
            await vp.getByRole('button', {name: 'Save and continue'}).click();
            await expect(vp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(vp);
            await snap(vp, `${key}-02-details`);
            out.stepper2 = await stepper(vp);
            const collapseBtn = vp.locator('.pkpSteps__controls button');
            if (await collapseBtn.count() && await collapseBtn.isVisible().catch(() => false)) {
                await collapseBtn.click();
                await idle(vp);
                await snap(vp, `${key}-02b-steps-toggled`);
                out.stepperToggled = await stepper(vp);
            }
            if (!(await vp.getByLabel(/^Given Name/).first().inputValue().catch(() => ''))) await vp.getByLabel(/^Given Name/).first().fill('Filled');
            await vp.getByLabel(/^Country/).selectOption('CA');
            await vp.getByRole('button', {name: 'Save and continue'}).click();
            await expect(vp.getByRole('heading', {name: /Review & create account/})).toBeVisible({timeout: 30_000});
            await idle(vp);
            await snap(vp, `${key}-03-review`);
            out.stepper3 = await stepper(vp);
            await sleep(1500);
            await vp.getByRole('button', {name: new RegExp(`^Accept And Continue to ${ACR[app.name]}`)}).click();
            out.dialogShown = await vp.getByRole('dialog').first().waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
            await idle(vp);
            const s = await snap(vp, `${key}-04-after-accept`);
            out.dialogText = flat(s.text.dialog, 600);
            out.requests = acceptLog.slice();
            await vp.setViewportSize({width: 1280, height: 900});
            return out;
        };
        facts.newcomer = {};
        await step('newcomer-wide', async () => { facts.newcomer.wide = await newcomer('nn', {key: 'nn-wide', user: `accn${T}`}); });
        await step('newcomer-narrow', async () => { facts.newcomer.narrow = await newcomer('nw', {width: 380, key: 'nw-narrow', user: `accw${T}`}); });

        // Sweep: the accept wizard left with a field typed, then its "Cancel".
        await step('accept-sweep', async () => {
            const out = {};
            await vp.setViewportSize({width: 1280, height: 900});
            await signOut(vp).catch(() => {});
            const dialogs = [];
            const h = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
            vp.on('dialog', h);
            await vp.goto(facts.mails.nc.accept);
            await expect(vp.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)})).toBeVisible({timeout: 30_000});
            await idle(vp);
            await vp.getByLabel(/^Username/).fill(`accc${T}`);
            await vp.getByLabel(/^Username/).blur();
            await vp.goto(`/index.php/${T}/about`);
            await idle(vp);
            out.leaveDialogs = dialogs.slice();
            out.leftTo = vp.url();
            await vp.goto(facts.mails.nc.accept);
            await expect(vp.getByRole('heading', {name: new RegExp(`Create ${ACR[app.name]} account`)})).toBeVisible({timeout: 30_000});
            await idle(vp);
            await snap(vp, 'nc-01-reopened');
            out.usernameAfterReopen = await vp.getByLabel(/^Username/).inputValue().catch(() => null);
            await vp.getByRole('button', {name: 'Cancel', exact: true}).click();
            const cd = vp.getByRole('dialog');
            out.cancelDialogShown = await cd.first().waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
            const s = await snap(vp, 'nc-02-cancel-dialog');
            out.cancelDialog = flat(s.text.dialog, 500);
            out.cancelDialogButtons = await cd.getByRole('button').allInnerTexts().catch(() => []);
            const goBack = cd.getByRole('button', {name: /Go Back/});
            if (await goBack.count()) {
                await goBack.click();
                await idle(vp);
                out.afterGoBack = flat((await snap(vp, 'nc-03-after-go-back')).text.main, 300);
                await vp.getByRole('button', {name: 'Cancel', exact: true}).click();
                await cd.first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            }
            acceptLog.length = 0;
            const confirmBtn = cd.getByRole('button').filter({hasNotText: /Go Back/}).first();
            out.confirmLabel = await confirmBtn.innerText().catch(() => null);
            await confirmBtn.click();
            await vp.waitForLoadState('load');
            await idle(vp);
            const s2 = await snap(vp, 'nc-04-after-cancel');
            out.afterCancel = {url: s2.url, main: flat(s2.text.main, 300)};
            out.cancelRequests = acceptLog.slice();
            await vp.goto(facts.mails.nc.accept);
            await idle(vp);
            out.linkAfterCancel = flat((await snap(vp, 'nc-05-link-after-cancel')).text.main, 300);
            vp.off('dialog', h);
            await gotoAccess(mp);
            out.invitationRowAfter = await invitationsTable(mp).locator('tbody tr').filter({hasText: rcpt('c')}).count();
            facts.acceptSweep = out;
        });

        // ── L68: the ended row's masthead select ─────────────────────────
        const endedRow = async (u, key) => {
            const out = {};
            await gotoAccess(mp);
            await userRow(mp, mail(u)).getByRole('button').last().click();
            await mp.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, `${key}-01-edit`);
            out.editUrl = mp.url();
            const cur = (role) => mp.getByRole('row').filter({hasText: role}).filter({hasNot: mp.getByLabel(/^Select a new role/)});
            const seRow = cur(SE[app.name]);
            const seSel = seRow.getByRole('combobox');
            out.before = {rowText: flat(await seRow.innerText().catch(() => ''), 300), value: await seSel.inputValue().catch(() => null),
                selected: await seSel.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text).catch(() => null)};
            await loc(mp, `Edit page: the ${SE[app.name]} row's masthead select`, seSel);
            await seRow.getByRole('button', {name: 'Remove Role'}).click();
            const rdlg = mp.getByRole('dialog', {name: 'Remove Role'});
            await expect(rdlg).toBeVisible({timeout: 30_000});
            out.removeDialog = flat((await snap(mp, `${key}-02-remove-confirm`)).text.dialog, 400);
            const ended = mp.waitForResponse((r) => r.url().includes('/endRole/'), {timeout: 30_000});
            await rdlg.getByRole('button', {name: 'Remove Role'}).click();
            out.endRoleStatus = (await ended).status();
            await expect(rdlg).toHaveCount(0, {timeout: 30_000}).catch(() => {});
            await idle(mp);
            await sleep(600);
            await snap(mp, `${key}-03-after-remove`);
            const endedRead = async () => ({
                rowText: flat(await seRow.innerText().catch(() => ''), 300),
                selectCount: await seSel.count(),
                enabled: await seSel.isEnabled().catch(() => null),
                value: await seSel.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text).catch(() => null),
                options: await seSel.locator('option').allInnerTexts().catch(() => []),
                removeButtons: await seRow.getByRole('button', {name: 'Remove Role'}).count(),
            });
            out.afterRemove = await endedRead();
            await mp.reload();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, `${key}-04-reloaded`);
            out.afterRemoveReload = await endedRead();
            out.aboutAfterRemove = {
                masthead: await readAbout('editorialMasthead', `${key}-05-masthead-after-remove`),
                history: await readAbout('editorialHistory', `${key}-06-history-after-remove`),
            };
            if (!out.afterRemoveReload.selectCount || !out.afterRemoveReload.enabled) return out;
            // Press the ended row's select and choose the other value.
            const other = /Does not/.test(out.afterRemoveReload.value || '') ? 'Appear on the masthead' : 'Does not appear on the masthead';
            out.chose = other;
            const mresp = [];
            const onResp = (r) => { if (r.url().includes('/masthead/') || r.url().includes('/endRole/')) mresp.push({method: r.request().method(), path: new URL(r.url()).pathname, status: r.status()}); };
            mp.on('response', onResp);
            await seSel.selectOption({label: other});
            const mdlg = mp.getByRole('dialog', {name: 'Confirm masthead visibility change'});
            out.confirmShown = await mdlg.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false);
            const s7 = await snap(mp, `${key}-07-select-pressed`);
            out.confirmDialog = flat(s7.text.dialog, 500);
            if (out.confirmShown) {
                const saved = mp.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: 30_000}).catch(() => null);
                await mdlg.getByRole('button', {name: 'Confirm'}).click();
                const r = await saved;
                out.mastheadStatus = r ? r.status() : null;
                await idle(mp);
                await sleep(800);
                const s8 = await snap(mp, `${key}-08-after-confirm`);
                out.afterConfirmDialog = flat(s8.text.dialog, 500);
                const errDlg = mp.getByRole('dialog').filter({hasNotText: 'Confirm masthead'});
                if (await errDlg.count()) await errDlg.getByRole('button').first().click().catch(() => {});
            }
            out.afterChoiceSamePage = await endedRead();
            await mp.reload();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, `${key}-09-reloaded-after-choice`);
            out.afterChoiceReload = await endedRead();
            out.responses = mresp.slice();
            mp.off('response', onResp);
            out.aboutAfterChoice = {
                masthead: await readAbout('editorialMasthead', `${key}-10-masthead-after-choice`),
                history: await readAbout('editorialHistory', `${key}-11-history-after-choice`),
            };
            await sleep(3000);
            const inbox = await app.mail._search({to: mail(u)});
            out.inbox = (inbox.messages || []).map((m) => m.Subject);
            const mm = await app.mail.find({to: mail(u), subject: 'Your journal masthead visibility has been updated', timeoutMs: 5_000}).catch(() => null);
            out.mastheadMail = mm ? flat((await app.mail.fullMessage(mm.ID)).Text, 1200) : null;
            return out;
        };
        facts.ended = {};
        await step('ended-ex', async () => { facts.ended.ex = await endedRow('ex', 'ex'); });
        await step('ended-ey', async () => { facts.ended.ey = await endedRow('ey', 'ey'); });

        // Sweep: the Edit page left with an unsaved role row (typed address away).
        await step('edit-leave', async () => {
            const out = {};
            const dialogs = [];
            const h = (d) => { dialogs.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); };
            mp.on('dialog', h);
            await mp.goto(facts.ended.ex.editUrl);
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await mp.getByRole('button', {name: 'Add Another Role'}).click();
            const row = mp.getByRole('row').filter({has: mp.getByLabel(/^Select a new role/)}).last();
            await row.getByLabel(/^Select a new role/).selectOption({label: OFFER[app.name]}).catch(() => {});
            await snap(mp, 'ex-12-unsaved-row');
            await mp.goto(`/index.php/${T}/management/settings/access`);
            await idle(mp);
            out.dialogs = dialogs.slice();
            out.leftTo = mp.url();
            mp.off('dialog', h);
            await gotoAccess(mp);
            out.invitationRows = (await invitationsTable(mp).locator('tbody tr').allInnerTexts().catch(() => [])).map((x) => flat(x, 200));
            facts.editLeave = out;
        });

        await step('about-final', async () => {
            facts.about.mastheadFinal = await readAbout('editorialMasthead', 'about-masthead-final');
            facts.about.historyFinal = await readAbout('editorialHistory', 'about-history-final');
        });
        if (RUN === 'r1') {
            note(`ccI28 [${app.name}]: accept wizard (existing user): the accept button is getByRole("button", {name: /^Accept And Continue to ${ACR[app.name]}/}); the closing dialog is getByRole("dialog") with "View All Submissions". The stepper is .pkpSteps (the kit's aria snapshot of main includes it); its collapse toggle sits in .pkpSteps__controls (aria-hidden) only when the rail overflows.`);
        }
    } finally {
        save();
        await closeM();
        await vb.close();
    }
});
