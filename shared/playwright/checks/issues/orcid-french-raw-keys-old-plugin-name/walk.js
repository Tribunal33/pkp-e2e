// Issue reports docs/issues/U04-A11-orcid-tabs-named-after-old-plugin.md (U04 A11, MODE=tabs) and
// docs/issues/U04-A11-A12-french-orcid-switch-and-field-raw-keys.md (U04 A11, A12):
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The second journal, the ORCID settings and the
// imported copy are made on screen; the kit builds nothing.
//
//   1-3   admin: Administration › Hosted Journals › Create Journal (path u04r5); "Change
//         Language" › French; Site Settings › the setup tab › the ORCID side tab (read, tick
//         the box, read, no save)
//   4-7   rvaca: Settings › Users & Roles › ORCID (on, Public Sandbox, made-up credentials,
//         Save); Tools › Native XML Plugin: export S, add an <orcid> to its first author,
//         import (the copy C)
//   8-9   "Change Language" › French; Settings › Users & Roles: the tabs, the ORCID tab
//   10-12 S › Contributors › "Modifier" on the first contributor: the ORCID field; its
//         button, the window, "Oui"; the field; closed and reopened
//   13    "Ajouter un-e contributeur-trice": the field's button, the window, "Non"
//   14    C › Contributors › "Modifier" on the first contributor: the unverified iD's field;
//         "Supprimer", the window, "Oui"; the field
//
// MODE=tabs (the tab-name report's Steps alone): steps 1 to 3, then rvaca reads Settings ›
// Users & Roles in English, changes the language and reads it in French; nothing else.
// MODE=nb (the neighbour check, alone): steps 1, 4, then the reads of 3, 9, 10 and 11 in
// English, answering "No" at 11. Nothing else.
//
// Reset first:  npm run fleet-prep -- --feature issues-u04r5 --dataset 5 --reset
// The tab-name report: MODE=tabs in front, fix-tab-name.diff its fix; the raw-key report: no
// MODE, fix.diff its suggested wording.
// Run (main):   PROBE_FEATURE=issues-u04r5 PROBE_AGENT=u04r5 node bin/probe.js all shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u04r5-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u04r5-3_5 PROBE_AGENT=u04r5 node bin/probe.js all shared/playwright/checks/issues/orcid-french-raw-keys-old-plugin-name/walk.js
// Facts: .reports/<feature>/u04r5/u04r5-walk[-nb][-<run>]-<app>.json
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, record, shot, outFile, idle} = require('../../../probe');
const {createContext} = require('../all-dates-error-nothing-published/lib');
const {setOrcidMember} = require('../publish-without-issue-orcid-contributor-error/lib');
const native = require('../unknown-section-import-broken-submission/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'fr';
const ORCID = 'https://orcid.org/0000-0002-1825-0097';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const loc = MODE === 'nb' ? 'en' : 'fr_CA';
    const W = L.UI[loc];
    const S = L.SUBS[app.name];
    const f = {app: app.name, line: app.line || 'main', mode: MODE, submission: S.id, steps: {}};
    const rec = (k, v) => { f.steps[k] = v; };
    const snapAs = async (page, name) => {
        const s = await L.screen(page);
        rec(`${name}-screen`, {url: s.url, title: s.title, text: s.text, notices: s.notices});
        await shot(page, `u04r5-${MODE}-${name}`).catch(() => {});
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const errs = native.scriptErrors(page);
    const w = native.watch(page);
    try {
        // 1-3: the site's ORCID tab.
        await signIn(page, 'admin');
        rec('01-create', await createContext(page, app, {name: 'u04r5 Second', initials: 'U04R5', path: 'u04r5', email: 'u04r5@mailinator.com'}));
        if (loc !== 'en') {
            await page.goto(app.url('/index.php/index/en/admin'));
            await idle(page);
            rec('02-language', await L.changeLanguage(page, W.language, loc));
        }
        rec('03-site-tabs', await L.openSiteOrcidTab(page, app, loc));
        rec('03-site-form', await L.formRead(page, '[id="orcidSiteSettings"] form'));
        rec('03-site-codes', await L.codes(page));
        await snapAs(page, '03-site');
        const box = page.locator('[id="orcidSiteSettings"] form input[type="checkbox"]').first();
        if (await box.count()) {
            await box.check();
            await L.sleep(800);
            rec('03-site-form-ticked', await L.formRead(page, '[id="orcidSiteSettings"] form'));
            rec('03-site-codes-ticked', await L.codes(page));
            await snapAs(page, '03-site-ticked');
        }
        await page.evaluate(() => { window.onbeforeunload = null; }).catch(() => {});
        await signOut(page);

        // 4-7: ORCID on, the copy with an unverified iD.
        await signIn(page, 'rvaca');
        if (MODE === 'tabs') {
            rec('04-context-tabs-en', await L.openContextOrcidTab(page, app, 'en'));
        } else {
            const orc = await setOrcidMember(page, app, {apiType: 'publicSandbox'}, {prefix: `u04r5-${MODE}-`});
            rec('04-orcid-on', {apiChoice: orc.apiChoice, save: orc.save, saved: orc.savedStatus, stored: orc.stored});
        }
        if (MODE === 'tabs') {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page);
            rec('08-language', await L.changeLanguage(page, W.language, loc));
        } else if (MODE !== 'nb') {
            await native.openNative(app, page);
            const out = await native.exportOne(app, page, S.title);
            const xml = L.addOrcidToFirstAuthor(out.xml, ORCID);
            const file = outFile(`u04r5-sub${S.id}-orcid.xml`);
            fs.writeFileSync(file, xml);
            rec('05-export', {file: out.file, orcidLines: (xml.match(/<orcid>[^<]*<\/orcid>/g) || [])});
            await native.openNative(app, page);
            const res = await native.importFile(page, file);
            const m = /"(\d+)" - "/.exec(res.panel || '');
            f.copy = m ? Number(m[1]) : null;
            rec('07-import', {tabs: res.tabs, panel: L.flat(res.panel, 600), copy: f.copy, stored: f.copy ? L.storedOrcid(app, f.copy) : null});
            // 8: French.
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page);
            rec('08-language', await L.changeLanguage(page, W.language, loc));
        }

        // 9: the journal's tabs.
        rec('09-context-tabs', await L.openContextOrcidTab(page, app, loc));
        rec('09-context-form', await L.formRead(page, '[id="orcidSettings"] form'));
        rec('09-context-codes', await L.codes(page));
        await snapAs(page, '09-context');

        if (MODE === 'tabs') {
            console.log(`[u04r5] ${app.name} ${f.line} tabs: ${JSON.stringify([f.steps['03-site-tabs'].orcidTab, f.steps['09-context-tabs'].orcidTab])}`);
            return;
        }

        // 10-12: S's first contributor.
        rec('10-contributors', await L.openContributors(page, app, S.id, loc));
        let win = await L.editContributor(page, S.first, loc);
        rec('10-field', await L.readOrcidField(page, win, loc));
        rec('10-codes', await L.codes(page));
        await snapAs(page, '10-field');
        const reqBtn = win.locator('.pkpFormField--html').filter({hasText: W.orcidLabel}).first().getByRole('button').first();
        await reqBtn.click();
        let q = await L.readQuestion(page);
        rec('11-window', q.read);
        rec('11-codes', await L.codes(page));
        await snapAs(page, '11-window');
        if (MODE === 'nb') {
            await q.dlg.getByRole('button', {name: W.no, exact: true}).click();
            await L.sleep(800);
        } else {
            const since = new Date();
            const sent = page.waitForResponse((r) => /orcid\/requestAuthorVerification/.test(r.url()), {timeout: L.T}).catch(() => null);
            await q.dlg.getByRole('button', {name: W.yes, exact: true}).click();
            const r = await sent;
            rec('11-request', r ? {status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')} : null);
            await L.sleep(1500);
            rec('12-field', await L.readOrcidField(page, win, loc));
            rec('12-codes', await L.codes(page));
            await snapAs(page, '12-field');
            await L.closeWindow(page, win, loc);
            win = await L.editContributor(page, S.first, loc);
            rec('12-field-reopened', await L.readOrcidField(page, win, loc));
            await snapAs(page, '12-reopened');
            rec('12-mail', await app.mail.find({to: `${S.user}@mailinator.com`, since}).then((m) => (m ? {subject: m.Subject || m.subject} : null)).catch((e) => ({error: L.flat(e.message, 200)})));
            await L.closeWindow(page, win, loc);

            // 13: a contributor being added.
            await page.locator('.listPanel--contributor').getByRole('button', {name: W.add, exact: true}).click();
            const add = L.sideWindow(page, W.add);
            await add.waitFor({timeout: L.T});
            await idle(page);
            await L.sleep(800);
            rec('13-field', await L.readOrcidField(page, add, loc));
            await add.locator('.pkpFormField--html').filter({hasText: W.orcidLabel}).first().getByRole('button').first().click();
            q = await L.readQuestion(page);
            rec('13-window', q.read);
            rec('13-codes', await L.codes(page));
            await snapAs(page, '13-window');
            await q.dlg.getByRole('button', {name: W.no, exact: true}).click();
            await L.sleep(800);
            await L.closeWindow(page, add, loc);

            // 14: C's first contributor, the unverified iD.
            if (f.copy) {
                rec('14-contributors', await L.openContributors(page, app, f.copy, loc));
                win = await L.editContributor(page, S.first, loc);
                rec('14-field', await L.readOrcidField(page, win, loc));
                rec('14-codes', await L.codes(page));
                await snapAs(page, '14-field');
                await win.locator('.pkpFormField--html').filter({hasText: W.orcidLabel}).first().getByRole('button', {name: W.del, exact: true}).click();
                q = await L.readQuestion(page);
                rec('14-window', q.read);
                rec('14-window-codes', await L.codes(page));
                await snapAs(page, '14-window');
                const del = page.waitForResponse((r) => /orcid\/deleteForAuthor/.test(r.url()), {timeout: L.T}).catch(() => null);
                await q.dlg.getByRole('button', {name: W.yes, exact: true}).click();
                const d = await del;
                rec('14-delete', d ? {status: d.status(), url: d.url().replace(/^https?:\/\/[^/]+/, '')} : null);
                await L.sleep(1500);
                rec('14-field-after', await L.readOrcidField(page, win, loc));
                rec('14-stored-after', L.storedOrcid(app, f.copy));
                await snapAs(page, '14-after');
            }
        }
        console.log(`[u04r5] ${app.name} ${f.line} ${MODE}: tabs ${JSON.stringify([f.steps['03-site-tabs'] && f.steps['03-site-tabs'].orcidTab, f.steps['09-context-tabs'] && f.steps['09-context-tabs'].orcidTab])}; copy ${f.copy}`);
    } catch (e) {
        f.error = L.flat(e.stack || e.message, 800);
        console.log(`[u04r5] ${app.name} ERROR ${L.flat(e.message, 300)}`);
        await shot(page, `u04r5-${MODE}-error`).catch(() => {});
    } finally {
        f.responses = w.seen.filter((r) => r.status >= 400 || r.method !== 'GET');
        f.scriptErrors = errs;
        record(MODE === 'fr' ? 'u04r5-walk' : `u04r5-walk-${MODE}`, f);
        await close();
    }
});
