const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// Kept check for pkp/pkp-lib#13317 (issue #13274), from the 2026-09-12 regression read rr5: the
// submission wizard's "Change" of the submission language after the draft started leaves the
// submitter's copied affiliation (and given name) in the original language only, so the
// Contributors edit panel asks for "Type the institution name in French (Canada)" and the Review
// step refuses with "The affiliation name is missing in French (Canada) …". Before the PR an
// author whose profile text matched a registry record got a locale-free ROR link instead and
// never met this; a typed text not in the registry met it before the PR too (PLANT_ROR=0 shows
// that at any ref). Run (OJS):
//   PROBE_FEATURE=sync PROBE_AGENT=pr13274 ONLY=ojs node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13317/wizard-locale-change.js
//   PLANT_ROR=0 …  plants no registry record (the typed-text population)
// Records `s1-s2-result-ojs.json`: S1 per author A (given name en only) and B (en + fr_CA):
// affiliation rows at start and after the change, the change request, the edit panel's
// Affiliations table text, the Review step's problem lines; S2: a profile affiliation in fr_CA
// only on an en-only-metadata journal (expected: one row, ror null, name.en = the fr_CA text).
// Fixed when after the language change the row carries name.fr_CA and Review lists no
// affiliation problem for author B.
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, note} =
    require('../../../probe');
const PLANT_ROR = process.env.PLANT_ROR !== '0';

function psql(app, sql) {
    return execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', `${dbName(app.name)}`, '-Atqc', sql], {
        env: {...process.env, PGPASSWORD: 'e2e'}, encoding: 'utf8',
    }).trim();
}
const affRows = (app, submissionId) => JSON.parse(psql(app,
    `select coalesce(json_agg(json_build_object('authorId', a.author_id, 'affiliationId', aa.author_affiliation_id, 'ror', aa.ror,
      'names', (select json_object_agg(s.locale, s.setting_value) from author_affiliation_settings s where s.author_affiliation_id=aa.author_affiliation_id and s.setting_name='name'),
      'givenNames', (select json_object_agg(g.locale, g.setting_value) from author_settings g where g.author_id=a.author_id and g.setting_name='givenName'))), '[]'::json)
     from authors a join publications p on p.publication_id=a.publication_id left join author_affiliations aa on aa.author_id=a.author_id where p.submission_id=${submissionId}`) || '[]');
const subId = (sub) => sub.submissionId || sub.id || (sub.submission && sub.submission.id);

forEachApp(async (app) => {
    const {SubmissionWizardPage} = require(path.resolve(__dirname, '../../../../../apps/ojs/playwright/pages/SubmissionWizardPage.js'));
    const out = {s1: {}, s2: {}};

    // ---- S1: en+fr_CA journal, two authors, profile affiliation en only + a planted registry record
    const s1 = tag('rr5s1');
    const userA = `${s1}a`;   // given name en only -> changeLocale also edits the author
    const userB = `${s1}b`;   // given name en + fr_CA -> changeLocale touches only the affiliation
    const text = `Registry University ${s1}`;
    const ror = `https://ror.org/0${s1.replace(/[^a-z0-9]/g, '').slice(-6)}12`;
    await app.api.createContext({
        tag: s1,
        context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        users: [
            {username: userA, roles: ['author']},
            {username: userB, roles: ['author'], givenName: {en: 'Bea', fr_CA: 'Bea'}, familyName: {en: 'Deux', fr_CA: 'Deux'}},
        ],
    });
    const ids = {};
    for (const u of [userA, userB]) {
        ids[u] = psql(app, `select user_id from users where username='${u}'`);
        psql(app, `insert into user_settings (user_id, locale, setting_name, setting_value) values (${ids[u]}, 'en', 'affiliation', '${text}')`);
    }
    if (PLANT_ROR) {
        const rorId = psql(app, `insert into rors (ror, display_locale, is_active, search_phrase) values ('${ror}', 'en', 1, '${text}') returning ror_id`);
        psql(app, `insert into ror_settings (ror_id, locale, setting_name, setting_value) values (${rorId}, 'en', 'name', '${text}')`);
    }
    out.s1.planted = {text, ror: PLANT_ROR ? ror : null, users: ids};

    const {page, close} = await launch(app);
    try {
        for (const [who, user] of [['A', userA], ['B', userB]]) {
            const sub = await app.api.createSubmission({tag: `${s1}${who}`, context: s1, submitter: user, locale: 'en', submitted: false});
            const submissionId = subId(sub);
            const r = {submissionId, atStart: affRows(app, submissionId)};
            await signIn(page, user, {contextPath: s1});
            const wizard = new SubmissionWizardPage(page, s1);
            await wizard.goto(submissionId);
            // Details step: Change -> French (Canada) -> Save
            await wizard.changeButton().click();
            const modal = wizard.reconfigureModal();
            await modal.getByText('Change Submission Settings').waitFor({timeout: 30_000});
            await modal.getByRole('radio', {name: /Français|French/}).check();
            const changed = page.waitForResponse((res) => res.request().method() !== 'GET' && /\/api\/v1\/submissions\/\d+(\?|$)/.test(res.url()), {timeout: 30_000});
            await modal.getByRole('button', {name: 'Save', exact: true}).click();
            const changeRes = await changed;
            r.changeLocale = {url: changeRes.url(), method: changeRes.request().method(), override: changeRes.request().headers()['x-http-method-override'] || null, status: changeRes.status()};
            await idle(page);
            r.afterChange = affRows(app, submissionId);
            record(`s1-${who}-after-change`, await screen(page));
            // Contributors step: edit own row, show all languages, read the affiliation boxes
            await wizard.continueTo('Details');
            await wizard.continueTo('Contributors');
            await idle(page);
            await wizard.contributorItem(text.slice(0, 8)).first().waitFor({timeout: 5_000}).catch(() => {});
            const item = page.locator('.listPanel__item').first();
            await item.getByRole('button', {name: /Edit/}).first().click({force: true});
            const dialog = page.getByRole('dialog', {name: 'Edit', exact: true});
            await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: 15_000});
            const langLink = dialog.getByText(/languages? completed/);
            if (await langLink.count()) {
                await langLink.first().click({force: true});
            }
            const boxes = {};
            for (const lbl of [/institution name in English/i, /institution name in French \(Canada\)/i]) {
                const field = dialog.locator('.pkpFormField--text').filter({hasText: lbl}).first();
                boxes[String(lbl)] = (await field.count()) ? await field.locator('input[name="name"]').inputValue().catch(() => null) : 'field absent';
            }
            r.editDialogAffiliationBoxes = boxes;
            r.affiliationsTable = await dialog.locator('#contributor-affiliations').innerText().catch(() => null);
            const sc = await screen(page);
            record(`s1-${who}-edit-dialog`, sc);
            await shot(page, `s1-${who}-edit-dialog`);
            out.s1[who] = r;
            record('s1-s2-result', out);
            const closeBtn = dialog.getByRole('button', {name: /^(Close|Cancel)/}).first();
            if (await closeBtn.count()) { await closeBtn.click({force: true}); } else { await page.keyboard.press('Escape'); }
            await dialog.waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
            await idle(page);
            // Review step: the submit check
            await wizard.continueToReview(submissionId);
            await idle(page);
            const rev = await screen(page);
            r.reviewBannerVisible = await wizard.errorBanner().isVisible().catch(() => false);
            r.reviewProblems = (rev.text.main.match(/^.*(missing|required|problems).*$/gim) || []).slice(0, 10);
            record(`s1-${who}-review`, rev);
            await shot(page, `s1-${who}-review`);
            await signOut(page);
            out.s1[who] = r;
            record('s1-s2-result', out);
        }
    } finally {
        await close();
    }

    // ---- S2: en-only submission metadata, profile affiliation fr_CA only
    const s2 = tag('rr5s2');
    const userC = `${s2}c`;
    await app.api.createContext({tag: s2, context: {supportedLocales: ['en', 'fr_CA']}, users: [{username: userC, roles: ['author']}]});
    const cId = psql(app, `select user_id from users where username='${userC}'`);
    const frText = `Université Seulement ${s2}`;
    psql(app, `insert into user_settings (user_id, locale, setting_name, setting_value) values (${cId}, 'fr_CA', 'affiliation', '${frText}')`);
    const ctxLocales = psql(app, `select json_object_agg(setting_name, setting_value) from journal_settings where journal_id=(select journal_id from journals where path='${s2}') and setting_name in ('supportedSubmissionLocales','supportedSubmissionMetadataLocales','supportedLocales')`);
    out.s2.context = {path: s2, locales: JSON.parse(ctxLocales || '{}')};
    let sub;
    try {
        sub = await app.api.createSubmission({tag: `${s2}d`, context: s2, submitter: userC, locale: 'en', submitted: false});
        const submissionId = subId(sub);
        out.s2.submissionId = submissionId;
        out.s2.rows = affRows(app, submissionId);
    } catch (e) {
        out.s2.error = String(e && e.message || e).slice(0, 500);
    }
    record('s1-s2-result', out);
    note(`rr5 S1/S2 driven on ${app.name}: see s1-s2-result-${app.name}.json`);
});
