// rr13370 (sync, main): pkp-lib#13370 regression read, suspicions S1-S3 of
// .reports/sync/rr13370/suspicions.md, on a scratch journal of its own.
//   S3  enrollment masthead ON (new-context default), reviewers box unset:
//       invite an existing reader to "Reviewer" (masthead cell, email), and
//       the public masthead with a reviewer who completed a review last year.
//   S1  enrollment masthead unticked through Appearance > Editorial Masthead:
//       invite an existing author to "Section editor" with "Appear on the
//       masthead" (email), public masthead.
//   S2  same OFF state: Edit a section editor, held role's masthead select to
//       "Does not appear", then back to "Appear" (the two emails), public masthead.
// RUN=r1 PROBE_FEATURE=sync PROBE_AGENT=rr13370 node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13370/masthead-promises.js
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const REVIEWER = {ojs: 'Reviewer', omp: 'External Reviewer'};
const SE = {ojs: 'Section editor', omp: 'Series editor', ops: 'Moderator'};

function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

forEachApp(async (app) => {
    const {expect} = require('@playwright/test');
    const {WebsiteSettings} = require(path.join(process.cwd(), 'shared/playwright/pages/AppearancePages.js'));
    const T = tag('rr13370');
    const facts = {app: app.name, run: RUN, tag: T, errors: {}};
    const save = () => record(`facts-${RUN}`, facts);
    const snap = async (page, name) => {
        const s = await screen(page);
        record(`${RUN}-${name}`, s);
        await shot(page, `${RUN}-${name}`);
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
    const lastYear = new Date().getUTCFullYear() - 1;

    await step('seed', async () => {
        const seeded = await app.api.createContext({tag: T, users: [
            {username: `mgr${T}`, roles: ['manager']},
            {username: `se${T}`, givenName: 'Sela', familyName: 'Editorwoman', roles: ['sectionEditor']},
            {username: `au${T}`, givenName: 'Aldo', familyName: 'Invitee', roles: ['author']},
            {username: `rd${T}`, givenName: 'Rhea', familyName: 'Readerinvite', roles: ['reader']},
            {username: `rv${T}`, givenName: 'Ravi', familyName: 'Lastyear', roles: ['externalReviewer']},
            {username: `su${T}`, givenName: 'Sumi', familyName: 'Submitter', roles: ['author']},
        ]});
        facts.seededUsers = (seeded.users || []).map((u) => ({username: u.username, id: u.id}));
        await app.api.createSubmission({
            tag: `${T}s`, context: T, submitter: `su${T}`,
            decisions: ['sendExternalReview'],
            reviewRounds: [{reviewers: [{username: `rv${T}`, status: 'completed', dateCompleted: `${lastYear}-06-15`}]}],
        });
        facts.seeded = true;
    });

    const readMail = async (to, opts) => {
        const summary = await app.mail.find({to, timeoutMs: 30_000, ...opts});
        const full = await app.mail.fullMessage(summary.ID);
        return {subject: full.Subject, text: (full.Text || '').replace(/\r/g, '').slice(0, 3000)};
    };
    const readAll = async (to) => {
        const res = await app.mail._search({to});
        const out = [];
        for (const m of (res.messages || [])) {
            const full = await app.mail.fullMessage(m.ID);
            out.push({subject: full.Subject, created: m.Created, text: flat((full.Text || '').replace(/\r/g, ''), 1200)});
        }
        return out;
    };

    const gotoAccess = async (page) => {
        await page.goto(`/index.php/${T}/management/settings/access`);
        await expect(page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').first()).toBeVisible({timeout: 30_000});
        await idle(page);
    };
    const userRow = (page, text) => page.getByRole('table', {name: /^Current Users \(/}).locator('tbody tr').filter({hasText: text});
    const openFor = async (page, to, key) => {
        await gotoAccess(page);
        await page.getByRole('button', {name: 'Invite to a role'}).click();
        await expect(page.getByRole('heading', {name: /Search User/})).toBeVisible({timeout: 30_000});
        await idle(page);
        await page.getByLabel(/Search for a user by email address/).fill(to);
        await page.getByRole('button', {name: 'Search User', exact: true}).click();
        await expect(page.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
        await idle(page);
        await snap(page, `${key}-01-enter-details`);
    };
    const newRow = (page) => page.getByRole('row').filter({has: page.getByLabel(/^Select a new role/)}).last();
    const fillNewRow = async (page, role) => {
        if (!(await newRow(page).count())) await page.getByRole('button', {name: 'Add Another Role'}).click();
        const r = newRow(page);
        await r.getByLabel(/^Select a new role/).selectOption({label: role});
        await r.getByRole('textbox').fill(today());
        const combos = r.getByRole('combobox');
        if ((await combos.count()) > 1) await combos.last().selectOption({label: 'Appear on the masthead'});
        await sleep(300);
        return {rowText: flat(await r.innerText(), 400), combos: await combos.count()};
    };
    const composeAndSend = async (page, marker, key) => {
        const out = {};
        await page.getByRole('button', {name: 'Save And Continue'}).click();
        const subject = page.getByLabel(/^Subject/);
        out.composeReached = await subject.waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
        if (!out.composeReached) {
            out.stuck = flat((await snap(page, `${key}-03-no-compose`)).text.main, 800);
            return out;
        }
        await expect(subject).not.toHaveValue('', {timeout: 30_000});
        await expect(page.frameLocator('iframe').locator('body')).not.toHaveText('', {timeout: 30_000});
        await idle(page);
        const s = await snap(page, `${key}-03-compose`);
        out.composeText = flat(s.text.main, 600);
        out.composeBody = flat(await page.frameLocator('iframe').locator('body').innerText().catch(() => ''), 1500);
        await subject.fill(marker);
        await page.getByRole('button', {name: 'Invite user to the role'}).click();
        const sent = page.getByRole('dialog').filter({hasText: 'Invitation Sent'});
        out.sentShown = await sent.waitFor({state: 'visible', timeout: 30_000}).then(() => true).catch(() => false);
        await snap(page, `${key}-04-sent`);
        if (out.sentShown) await sent.getByRole('button', {name: 'View All Users'}).click().catch(() => {});
        return out;
    };
    const masthead = async (page, key) => {
        const resp = await page.goto(`/index.php/${T}/about/editorialMasthead`);
        await idle(page);
        const s = await snap(page, key);
        const h2 = await page.locator('.page_masthead h2').allInnerTexts().catch(() => []);
        return {status: resp && resp.status(), url: page.url(), h2, text: flat(s.text.main || s.text.body, 1200)};
    };

    const {page: mp} = await launch(app);
    const {page: vp} = await launch(app);
    try {
        await signIn(mp, `mgr${T}`);

        // ── S3: ON by default, reviewer role invitation ──────────────────
        facts.s3 = {};
        if (!process.env.SKIP_S3) await step('s3', async () => {
            const out = facts.s3;
            out.mastheadOn = await masthead(vp, 's3-01-masthead-on');
            const ws = new WebsiteSettings(mp, T);
            await ws.goto();
            await ws.openSideTab('appearance-masthead');
            out.tab = {
                labels: await ws.masthead.fieldLabels(),
                enrollmentChecked: await ws.masthead.enrollmentBox.isChecked(),
                reviewersChecked: await ws.masthead.reviewersBox.isChecked().catch(() => null),
                reviewersText: flat(await ws.masthead.reviewersField.innerText().catch(() => ''), 400),
            };
            await snap(mp, 's3-02-tab-on');
            await openFor(mp, mail('rd'), 's3');
            out.row = await fillNewRow(mp, REVIEWER[app.name]);
            await snap(mp, 's3-02-row-filled');
            out.send = await composeAndSend(mp, `Invitation${T}rd`, 's3');
            out.mail = await readMail(mail('rd'), {contains: `Invitation${T}rd`}).catch((e) => ({error: e.message}));
        });

        // ── untick the enrollment masthead through the screen ───────────
        facts.off = {};
        await step('off', async () => {
            const ws = new WebsiteSettings(mp, T);
            await ws.goto();
            await ws.openSideTab('appearance-masthead');
            // The page object's form is anchored on the roles list, which
            // leaves the DOM once the box is unticked: use the side tab's form.
            const form = mp.locator('[id="appearance-masthead"] form');
            const box = form.locator('[id^="appearanceMasthead-enableEnrollmentMasthead-"] input[type="checkbox"], input[type="checkbox"][name="enableEnrollmentMasthead"]').first();
            facts.off.boxBefore = await box.isChecked();
            const put = mp.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30_000}).catch(() => null); // the save is a POST with a method override
            await form.getByText('Present a masthead based on user enrollments').click();
            facts.off.boxAfterClick = await box.isChecked();
            facts.off.labelsAfterClick = await form.locator('legend').allInnerTexts();
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await put;
            facts.off.put = r && {status: r.status(), body: flat(r.request().postData() || '', 400)};
            await expect(form.locator('.pkpFormPage__status', {hasText: 'Saved'})).toBeVisible({timeout: 30_000});
            await ws.goto();
            await ws.openSideTab('appearance-masthead');
            facts.off.afterReload = {legends: await form.locator('legend').allInnerTexts(), enrollmentChecked: await box.isChecked()};
            await snap(mp, 'off-01-tab');
            facts.off.masthead = await masthead(vp, 'off-02-masthead');
        });

        // ── S1: invitation to Section editor with "Appear on the masthead" ─
        facts.s1 = {};
        await step('s1', async () => {
            const out = facts.s1;
            await openFor(mp, mail('au'), 's1');
            out.row = await fillNewRow(mp, SE[app.name]);
            await snap(mp, 's1-02-row-filled');
            out.send = await composeAndSend(mp, `Invitation${T}au`, 's1');
            out.mail = await readMail(mail('au'), {contains: `Invitation${T}au`}).catch((e) => ({error: e.message}));
            out.masthead = await masthead(vp, 's1-05-masthead');
        });

        // ── S2: Edit user, held role masthead select, two changes ─────────
        facts.s2 = {changes: []};
        await step('s2', async () => {
            const out = facts.s2;
            await gotoAccess(mp);
            await userRow(mp, mail('se')).getByRole('button').last().click();
            await mp.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await expect(mp.getByRole('heading', {name: /Enter details/})).toBeVisible({timeout: 30_000});
            await idle(mp);
            await snap(mp, 's2-01-edit');
            const held = () => mp.getByRole('row').filter({hasText: SE[app.name]}).filter({hasNot: mp.getByLabel(/^Select a new role/)}).getByRole('combobox');
            out.heldBefore = await held().first().evaluate((s) => s.options[s.selectedIndex].text).catch((e) => `err ${e.message}`);
            for (const label of ['Does not appear on the masthead', 'Appear on the masthead']) {
                await held().first().selectOption({label});
                const cdlg = mp.getByRole('dialog', {name: 'Confirm masthead visibility change'});
                const shown = await cdlg.waitFor({state: 'visible', timeout: 10_000}).then(() => true).catch(() => false);
                const c = {label, confirmShown: shown, confirmText: shown ? flat(await cdlg.innerText(), 400) : null};
                if (shown) {
                    const put = mp.waitForResponse((r) => r.url().includes('/masthead/'), {timeout: 30_000}).catch(() => null);
                    await cdlg.getByRole('button', {name: 'Confirm'}).click();
                    const r = await put;
                    c.putStatus = r ? r.status() : null;
                    await idle(mp);
                    await sleep(1500);
                }
                out.changes.push(c);
            }
            await snap(mp, 's2-02-after');
            await sleep(2000);
            out.mails = await readAll(mail('se'));
            out.masthead = await masthead(vp, 's2-03-masthead');
        });
    } finally {
        save();
    }
});
