// U03 drift sweep, chunk SW2 (docs/specs/U03-user-profile.md: Fields Roles / Public, Rules 8, 9,
// 13, 14, Settings that modify behavior, scenarios 6 and 7; register A2, A4, A5, A6, A9, A14,
// A20, OMP1, OPS1, OPS3). Kept claim-check script: run on demand, never in CI. One phase per
// process, each run under its own PROBE_RUN (r1, r2):
//   PROBE_FEATURE=U03 PROBE_AGENT=ccSW2 PROBE_RUN=r1 bin/app-lock.sh shared ojs -- \
//     node bin/probe.js ojs shared/playwright/checks/U03/SW2/sw2.js <phase>
// `exactone` changes every other scratch context's "User Registration" for a minute and puts it
// back in the same process, so it runs under `bin/app-lock.sh exclusive <app>` and after
// `closed` in the same run (it reads the run's closed journal, saved by `closed`).
// Phases:
//   levels    read-only: Roles and Public tabs on `publicknowledge` for one roster account per
//             permission level (fold closed, opened, closed again), the site-level Roles tab for
//             `admin`; the enabled contexts and their registration setting (read-only SQL)
//   roles     Rule 8 / scenario 6 on two scratch contexts: boxes, leaving with an unsaved tick,
//             taking and giving up "Author" (Users & Roles, masthead), the fold and a role in the
//             other context, interests and their suggestion, the site-level tab, an editorial
//             role untouched by Save, A6 (an author locked out, a reviewer emptied), the Add
//             Reviewer search on an interest (OJS, OMP), the privacy link on a scratch context
//   public    Rule 9 / scenario 7 / A2 / A9: every upload kind, the stored sizes, "Delete",
//             bio and homepage (maxlength, refusal), an unsaved bio left, the masthead and a
//             published item's page
//   banner    Rule 13 / A5: a future-dated role (inserted as an accepted invitation leaves it)
//             read on its journal, a journal with no role, a journal with a role, the site level
//   closed    Settings "User Registration" and "Allow user self-registration" / Rule 8a, 8c / A4:
//             a closed journal on its own tab, in another's fold, at site level, on the Register
//             pages; a Save there; a role's self-registration flag off; a journal with every
//             self-registering role off
//   exactone  A4 / Rule 8a's last sentence: the closed journal's tab with exactly one other
//             registration-open context (every other scratch context closed for the read, then
//             reopened; `publicknowledge` untouched)
//   settings  Settings: form languages, ORCID, editorial-report email, site password policy screen
// Outputs: .reports/U03/ccSW2/<phase>-<run>-<app>.json (facts) and snapshot files beside it.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, loc, note, idle, tag, serverLog, sql, outFile} = require('../../../probe');
const L = require('./lib.js');
const A4 = require('../../issues/closed-journal-listed-on-roles-tab/lib.js');

const PHASE = process.argv[2] || 'levels';
const RUN = process.env.PROBE_RUN || 'r0';
const SAVED = 'Your changes have been saved.';
const CTX = {
    ojs: {table: 'journals', id: 'journal_id', settings: 'journal_settings'},
    omp: {table: 'presses', id: 'press_id', settings: 'press_settings'},
    ops: {table: 'servers', id: 'server_id', settings: 'server_settings'},
};

function factsFor(app, phase) {
    return (k, v) => {
        record(phase, {[k]: v}, {merge: true});
        console.log(`[${phase}]`, app.name, k, JSON.stringify(v === undefined ? null : v).slice(0, 700));
    };
}

async function step(F, k, fn) {
    try {
        const v = await fn();
        F(k, v);
        return v;
    } catch (e) {
        F(k, {error: L.flat(String(e && e.stack ? e.stack : e), 900)});
        return null;
    }
}

/** Every context with its enabled flag, registration setting and English name (read-only). */
function contexts(app) {
    const c = CTX[app.name];
    const q = `select c.path, c.enabled, coalesce((select s.setting_value from ${c.settings} s where s.${c.id}=c.${c.id} and s.setting_name='disableUserReg' limit 1),'-'), coalesce((select s.setting_value from ${c.settings} s where s.${c.id}=c.${c.id} and s.setting_name='name' and s.locale='en' limit 1),''), c.${c.id} from ${c.table} c order by c.seq, c.${c.id}`;
    return sql(app, q).split('\n').filter(Boolean).map((l) => {
        const [p, enabled, dis, name, id] = l.split('|');
        return {path: p, enabled: enabled === '1' || enabled === 't', disableUserReg: dis, name, id: Number(id)};
    });
}

function userId(app, username) {
    return Number(sql(app, `select user_id from users where username='${username}'`).trim());
}

const ctxName = (t) => `U03 SW2 ${t}`;

// ---------------------------------------------------------------------------
// levels
async function levels(app, F) {
    const W = L.WORDS[app.name];
    const roster = ['reader.rosa', 'author.alex', 'reviewer.julia', 'copyeditor.carla', 'assistant.rita', 'sectioneditor.ana', 'editor.diana', 'manager.maya', 'admin']
        .filter((u) => !(app.name === 'ops' && ['reviewer.julia', 'copyeditor.carla', 'editor.diana'].includes(u)));
    F('contexts', contexts(app));
    const {page, close} = await launch(app);
    const dialogs = L.dialogRecorder(page);
    try {
        for (const user of roster) {
            const u = user.replace('.', '');
            await step(F, `lv-${u}`, async () => {
                await signIn(page, user, {contextPath: app.contextPath});
                const profile = await L.openProfile(page, app.contextPath, 'roles');
                const s1 = await L.snap(page, `lv-${u}-roles`, {png: user === 'reader.rosa' || user === 'admin'});
                const closed = await L.readRoles(page);
                if (user === 'reader.rosa') {
                    await loc(page, 'Profile › Roles: the fold link', profile.otherContextsLink());
                    await loc(page, 'Profile › Roles: the current context\'s first box', profile.roleBox(W.boxes[0]));
                }
                await profile.toggleOtherContexts();
                await L.sleep(700);
                const opened = await L.readRoles(page);
                await L.snap(page, `lv-${u}-roles-open`, {png: user === 'reader.rosa'});
                await profile.toggleOtherContexts();
                await L.sleep(700);
                const closedAgain = await L.readRoles(page);
                const tabControls = await L.controls(page, 'form#rolesForm');
                await L.pressTab(page, profile, dialogs, 'public');
                const s2 = await L.snap(page, `lv-${u}-public`, {png: user === 'reader.rosa'});
                const pub = {
                    accept: await profile.imageFileInput().getAttribute('accept').catch(() => null),
                    controls: await L.controls(page, 'form#publicProfileForm'),
                    text: L.flat(await profile.form('public').innerText().catch(() => null), 1500),
                    homepage: await L.homepageState(page),
                    image: await L.readImage(page),
                };
                return {
                    landed: s1.url,
                    current: closed.sections.filter((s) => !s.inFold).map((s) => ({label: s.label, ulLabel: s.ulLabel, boxes: s.boxes.map((b) => `${b.label}${b.checked ? ' [x]' : ''}`), height: s.height})),
                    legend: closed.legend, foldLinkClosed: closed.foldLink, foldOpenAtArrival: closed.foldOpen, containerHeightClosed: closed.foldContainerHeight,
                    foldLinkOpen: opened.foldLink, foldOpenAfterPress: opened.foldOpen, containerHeightOpen: opened.foldContainerHeight,
                    foldListed: opened.sections.filter((s) => s.inFold && s.ulLabel).map((s) => `${s.ulLabel}: ${s.boxes.map((b) => b.label + (b.checked ? ' [x]' : '')).join(', ')}`),
                    foldLinkAgain: closedAgain.foldLink, foldOpenAgain: closedAgain.foldOpen,
                    interests: closed.interests, registerIn: closed.registerIn, formTail: closed.formTail,
                    controls: tabControls, public: pub, publicUrl: s2.url,
                };
            });
        }
        // the site-level Roles tab as the Site Administrator
        await step(F, 'lv-admin-site', async () => {
            await signIn(page, 'admin');
            await L.openProfile(page, null, 'roles');
            const s = await L.snap(page, 'lv-admin-site-roles');
            const r = await L.readRoles(page);
            return {landed: s.url, legend: r.legend, foldLink: r.foldLink, sections: r.sections.map((x) => `${x.ulLabel || x.label}: ${x.boxes.map((b) => b.label + (b.checked ? ' [x]' : '')).join(', ')}`), interests: r.interests, registerIn: r.registerIn};
        });
    } finally {
        F('dialogs', dialogs.seen);
        await close();
    }
}

// ---------------------------------------------------------------------------
// roles
async function roles(app, F) {
    const W = L.WORDS[app.name];
    const t = tag('u03sw2r');
    const tb = tag('u03sw2b');
    const rv = app.name === 'ops' ? [] : [{username: `${t}rv`, roles: ['externalReviewer']}, {username: `${t}rw`, roles: ['externalReviewer']}];
    await app.api.createContext({tag: t, context: {name: ctxName(t)}, users: [
        {username: `${t}rd`, givenName: 'Rae', familyName: 'Sweep', roles: ['reader']},
        {username: `${t}mg`, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
        {username: `${t}se`, givenName: 'Sami', familyName: 'Editor', roles: ['sectionEditor', 'author']},
        {username: `${t}au`, givenName: 'Ari', familyName: 'Author', roles: ['author']},
        {username: `${t}nr`, givenName: 'Nora', familyName: 'Reader', roles: ['reader']},
        ...rv,
    ]});
    await app.api.createContext({tag: tb, context: {name: ctxName(tb)}, users: [
        {username: `${t}rd`, givenName: 'Rae', familyName: 'Sweep', roles: ['reader']},
        {username: `${t}mg`, givenName: 'Mona', familyName: 'Manager', roles: ['manager']},
    ]});
    const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`});
    const subRev = app.name === 'ops' ? null : await app.api.createSubmission({tag: `${t}v`, context: t, submitter: `${t}mg`, decisions: ['sendExternalReview']});
    F('run', {run: RUN, t, tb, submission: sub && sub.submissionId, reviewSubmission: subRev && subRev.submissionId});
    const sfx = t.slice(-5);
    const words = {alpha: `glaci${sfx}ology`, beta: `ethno${sfx}botany`, unsaved: `unsav${sfx}edword`};
    F('words', words);
    const log = serverLog(app);
    const from = log.mark();
    const A = await launch(app);
    const M = await launch(app);
    const page = A.page, mp = M.page;
    const dialogs = L.dialogRecorder(page);
    const mdialogs = L.dialogRecorder(mp);
    const {ProfilePage} = L.pages('ProfilePage.js');
    try {
        await signIn(mp, `${t}mg`, {contextPath: t});
        await signIn(page, `${t}rd`, {contextPath: t});
        let profile = await L.openProfile(page, t, 'roles');
        await step(F, 'r01-open', async () => {
            const s = await L.snap(page, 'r01-roles');
            return {url: s.url, notices: s.notices, roles: await L.readRoles(page), controls: await L.controls(page, 'form#rolesForm')};
        });
        await step(F, 'r02-privacy', async () => L.pressPrivacy(page, profile));
        // sweep: an unsaved tick, then another tab (Cancel, then OK), then the tab again
        await step(F, 'r03-unsaved-leave', async () => {
            await profile.roleBox('Author').check();
            const cancel = await L.pressTab(page, profile, dialogs, 'identity', {answer: 'dismiss', wait: false});
            const afterCancel = {rolesOpen: await profile.form('roles').isVisible().catch(() => false), author: await profile.roleBox('Author').isChecked().catch(() => null)};
            const ok = await L.pressTab(page, profile, dialogs, 'identity', {answer: 'accept'});
            await L.pressTab(page, profile, dialogs, 'roles');
            const back = {author: await profile.roleBox('Author').isChecked().catch(() => null)};
            await L.snap(page, 'r03-roles-back', {png: false});
            return {cancel, afterCancel, ok, back};
        });
        // reload with an unsaved tick
        await step(F, 'r04-unsaved-reload', async () => {
            await profile.roleBox('Author').check();
            await profile.roleBox('Author').blur();
            const before = dialogs.seen.length;
            await page.reload();
            await profile.expectOpen('roles').catch(() => {});
            await idle(page).catch(() => {});
            return {dialogs: dialogs.seen.slice(before).map((d) => d.type), author: await profile.roleBox('Author').isChecked().catch(() => null)};
        });
        // take Author
        await step(F, 'r05-take-author', async () => {
            await profile.roleBox('Author').check();
            const save = await L.pressSave(page, profile, dialogs);
            const same = {author: await profile.roleBox('Author').isChecked(), roles: (await L.readRoles(page)).sections.filter((s) => !s.inFold).map((s) => s.boxes)};
            await L.snap(page, 'r05-author-saved');
            await page.reload();
            await profile.expectOpen('roles');
            const reloaded = {author: await profile.roleBox('Author').isChecked()};
            const row = await L.usersRow(mp, t, `${t}rd`);
            await signOut(A.page).catch(() => {});
            const mast = await L.masthead(page, t);
            await signIn(page, `${t}rd`, {contextPath: t});
            return {save, same, reloaded, row, mastheadListsRae: /Rae Sweep/.test(mast.text || ''), mastheadStatus: mast.status};
        });
        // give Author up
        profile = await L.openProfile(page, t, 'roles');
        await step(F, 'r06-drop-author', async () => {
            await profile.roleBox('Author').uncheck();
            const save = await L.pressSave(page, profile, dialogs);
            await page.reload();
            await profile.expectOpen('roles');
            const reloaded = {author: await profile.roleBox('Author').isChecked(), reader: await profile.roleBox('Reader').isChecked()};
            const row = await L.usersRow(mp, t, `${t}rd`);
            const mast = await L.masthead(mp, t);
            return {save, reloaded, row, mastheadListsRae: /Rae Sweep/.test(mast.text || '')};
        });
        // the fold and a role in the other context
        await step(F, 'r07-fold-other', async () => {
            const closed = await L.readRoles(page);
            await profile.toggleOtherContexts();
            await L.sleep(700);
            const opened = await L.readRoles(page);
            await L.snap(page, 'r07-fold-open');
            const bName = ctxName(tb);
            const box = profile.contextRoleBox(bName, 'Author');
            const before = {reader: await profile.contextRoleBox(bName, 'Reader').isChecked().catch(() => null), author: await box.isChecked().catch(() => null)};
            await box.check();
            const save = await L.pressSave(page, profile, dialogs);
            const row = await L.usersRow(mp, tb, `${t}rd`);
            const rowA = await L.usersRow(mp, t, `${t}rd`);
            return {linkClosed: closed.foldLink, openAtArrival: closed.foldOpen, linkOpen: opened.foldLink, open: opened.foldOpen,
                listed: opened.sections.filter((s) => s.inFold && s.ulLabel).map((s) => s.ulLabel), before, save, rowB: row, rowA};
        });
        // reviewing interests
        if (app.name !== 'ops') {
            await step(F, 'r08-interests', async () => {
                profile = await L.openProfile(page, t, 'roles');
                const nr = await launch(app);
                try {
                    const np = nr.page;
                    await signIn(np, `${t}nr`, {contextPath: t});
                    const nprof = await L.openProfile(np, t, 'roles');
                    const nrTab = await L.readRoles(np);
                    // an unsaved chip is not suggested to another user (the "only once saved" end)
                    await profile.addInterest(words.unsaved, {terminator: 'Enter'});
                    await nprof.typeInterest(words.unsaved.slice(0, 8));
                    await L.sleep(2500);
                    const unsavedSuggested = await nprof.interestSuggestions().allInnerTexts().catch(() => []);
                    await nprof.interestsInput().fill('');
                    // remove the unsaved chip (its ×), then add the two words as scenario 6 does
                    await page.locator('#interests .tagit-choice').filter({hasText: words.unsaved}).locator('.tagit-close').click().catch(() => {});
                    await profile.addInterest(words.alpha, {terminator: 'Enter'});
                    await profile.addInterest(words.beta, {terminator: ','});
                    const chipsBefore = await profile.interestChips().allInnerTexts();
                    const save = await L.pressSave(page, profile, dialogs);
                    const sameChips = await profile.interestChips().allInnerTexts();
                    await L.pressTab(page, profile, dialogs, 'identity');
                    await L.pressTab(page, profile, dialogs, 'roles');
                    const reopened = await profile.interestChips().allInnerTexts();
                    await page.reload();
                    await profile.expectOpen('roles');
                    const reloaded = await profile.interestChips().allInnerTexts();
                    await L.snap(page, 'r08-interests-saved');
                    // the other user types the start of a saved word, then of the unsaved one
                    await nprof.interestsInput().click();
                    await nprof.interestsInput().pressSequentially(words.alpha.slice(0, 8));
                    await L.sleep(2500);
                    const savedSuggested = await nprof.interestSuggestions().allInnerTexts().catch(() => []);
                    await L.snap(np, 'r08-nr-suggested');
                    await loc(np, 'Profile › Roles: interest suggestions', nprof.interestSuggestions());
                    await nprof.interestsInput().fill('');
                    await nprof.interestsInput().pressSequentially(words.unsaved.slice(0, 8));
                    await L.sleep(2500);
                    const unsavedAfter = await nprof.interestSuggestions().filter({hasText: words.unsaved}).count();
                    // the manager too, on their own tab
                    const mprof = await L.openProfile(mp, t, 'roles');
                    await mprof.typeInterest(words.alpha.slice(0, 8));
                    await L.sleep(2500);
                    const managerSuggested = await mprof.interestSuggestions().allInnerTexts().catch(() => []);
                    // a user of another journal (typed on publicknowledge, never saved): the vocabulary is the site's
                    const ro = await launch(app);
                    let otherJournalSuggested = null;
                    try {
                        await signIn(ro.page, 'reader.rosa', {contextPath: app.contextPath});
                        const rprof = await L.openProfile(ro.page, app.contextPath, 'roles');
                        await rprof.typeInterest(words.alpha.slice(0, 8));
                        await L.sleep(2500);
                        otherJournalSuggested = await rprof.interestSuggestions().allInnerTexts().catch(() => []);
                        await L.snap(ro.page, 'r08-rosa-suggested', {png: false});
                    } finally {
                        await ro.close();
                    }
                    return {otherJournalSuggested, nrHasBox: nrTab.interests, nrBoxes: nrTab.sections.filter((s) => !s.inFold).map((s) => s.boxes), unsavedSuggested, chipsBefore, save, sameChips, reopened, reloaded, savedSuggested, unsavedSuggestedAfterOtherSave: unsavedAfter, managerSuggested};
                } finally {
                    await nr.close();
                }
            });
        } else {
            await step(F, 'r08-interests-ops', async () => {
                profile = await L.openProfile(page, t, 'roles');
                const r = await L.readRoles(page);
                return {interests: r.interests, formTail: r.formTail, inputs: await page.locator('form#rolesForm #interests, form#rolesForm input[name^="interests"]').count()};
            });
        }
        // the site-level Roles tab
        await step(F, 'r09-site-level', async () => {
            const site = new ProfilePage(page, null);
            await site.goto('roles');
            await idle(page).catch(() => {});
            const s = await L.snap(page, 'r09-site-roles');
            const r = await L.readRoles(page);
            const names = [ctxName(t), ctxName(tb)];
            return {landed: s.url, foldLink: r.foldLink, legend: r.legend,
                listed: Object.fromEntries(names.map((n) => [n, r.sections.filter((x) => x.ulLabel === n).map((x) => x.boxes.map((b) => b.label + (b.checked ? ' [x]' : '')))])),
                interests: r.interests, privacy: await L.pressPrivacy(page, site)};
        });
        await signOut(page).catch(() => {});
        // an editorial role is untouched by Save
        await step(F, 'r10-editorial-kept', async () => {
            await signIn(page, `${t}se`, {contextPath: t});
            profile = await L.openProfile(page, t, 'roles');
            const r = await L.readRoles(page);
            const save1 = await L.pressSave(page, profile, dialogs);
            const row1 = await L.usersRow(mp, t, `${t}se`);
            await profile.roleBox('Author').uncheck();
            const save2 = await L.pressSave(page, profile, dialogs);
            const row2 = await L.usersRow(mp, t, `${t}se`);
            await signOut(page).catch(() => {});
            return {boxes: r.sections.filter((s) => !s.inFold).map((s) => s.boxes), save1, row1, save2, row2};
        });
        // A6: an Author with a submission unticks "Author"
        await step(F, 'r11-a6-author', async () => {
            await signIn(page, `${t}au`, {contextPath: t});
            const {MySubmissionsPage} = L.pages('MySubmissionsPage.js');
            const ms = new MySubmissionsPage(page, t);
            await page.goto(ms.url()); await idle(page).catch(() => {});
            const before = {url: L.rel(page.url()), text: L.flat(await page.locator('main').innerText().catch(() => null), 400)};
            profile = await L.openProfile(page, t, 'roles');
            await profile.roleBox('Author').uncheck();
            const save = await L.pressSave(page, profile, dialogs);
            await page.goto(ms.url()); await idle(page).catch(() => {});
            const s = await L.snap(page, 'r11-mysubmissions-after-drop');
            const after = {url: s.url, text: L.flat(await page.locator('body').innerText().catch(() => null), 500)};
            profile = await L.openProfile(page, t, 'roles');
            await profile.roleBox('Author').check();
            const save2 = await L.pressSave(page, profile, dialogs);
            await page.goto(ms.url()); await idle(page).catch(() => {});
            const restored = {url: L.rel(page.url()), text: L.flat(await page.locator('main').innerText().catch(() => null), 400)};
            await signOut(page).catch(() => {});
            return {before, save, after, save2, restored};
        });
        if (app.name !== 'ops') {
            // A6: a manager-granted reviewer unticks the reviewer box
            await step(F, 'r12-a6-reviewer', async () => {
                await signIn(page, `${t}rv`, {contextPath: t});
                profile = await L.openProfile(page, t, 'roles');
                const r = await L.readRoles(page);
                await profile.roleBox(W.reviewer).uncheck();
                const save = await L.pressSave(page, profile, dialogs);
                const row = await L.usersRow(mp, t, `${t}rv`);
                await signOut(page).catch(() => {});
                return {boxes: r.sections.filter((s) => !s.inFold).map((s) => s.boxes), save, row};
            });
            // the Add Reviewer search on an interest: a reviewer holding it, the reader holding it
            await step(F, 'r13-add-reviewer-search', async () => {
                await signIn(page, `${t}rw`, {contextPath: t});
                profile = await L.openProfile(page, t, 'roles');
                await profile.addInterest(words.alpha, {terminator: 'Enter'});
                await L.pressSave(page, profile, dialogs);
                await signOut(page).catch(() => {});
                const search = async (label) => {
                    const {WorkflowPage} = L.pages('WorkflowPage.js');
                    const wf = new WorkflowPage(mp, t);
                    await wf.gotoEditorial(subRev.submissionId);
                    await idle(mp).catch(() => {});
                    await mp.getByRole('button', {name: 'Add Reviewer', exact: true}).first().click();
                    const modal = mp.getByRole('dialog').filter({has: mp.locator('.listPanel--selectReviewer')});
                    const box = modal.locator('.listPanel--selectReviewer input.pkpSearch__input');
                    await box.waitFor({timeout: 30000});
                    await box.fill(words.alpha);
                    await box.press('Enter');
                    await L.sleep(2500);
                    await idle(mp).catch(() => {});
                    const items = await modal.locator('.listPanel--selectReviewer .listPanel__item').allInnerTexts();
                    await L.snap(mp, `r13-add-reviewer-${label}`);
                    return items.map((x) => L.flat(x, 160));
                };
                const first = await search('first');
                // the reader holding the same interest takes the reviewer role on their tab
                await signIn(page, `${t}rd`, {contextPath: t});
                profile = await L.openProfile(page, t, 'roles');
                await profile.roleBox(W.reviewer).check();
                const save = await L.pressSave(page, profile, dialogs);
                await signOut(page).catch(() => {});
                const second = await search('second');
                return {first, save, second};
            });
        }
    } finally {
        F('dialogs', dialogs.seen);
        F('managerDialogs', mdialogs.seen);
        F('serverLog', log.since(from).map((l) => L.flat(l, 400)));
        await A.close();
        await M.close();
    }
}

// ---------------------------------------------------------------------------
// public
async function publicTab(app, F) {
    const t = tag('u03sw2p');
    const res = await app.api.createContext({tag: t, context: {name: ctxName(t)}, users: [
        {username: `${t}au`, givenName: 'Pia', familyName: 'Public', roles: ['author']},
        {username: `${t}se`, givenName: 'Seth', familyName: 'Masthead', roles: ['sectionEditor']},
    ]});
    F('run', {run: RUN, t, contextId: res && res.contextId});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const dialogs = L.dialogRecorder(page);
    dialogs.answer = 'accept';
    const auId = userId(app, `${t}au`);
    const seId = userId(app, `${t}se`);
    const files = await (async () => { await page.goto(app.url('/index.php/index/en')); return L.makeFiles(page, outFile('files')); })();
    try {
        await signIn(page, `${t}au`, {contextPath: t});
        let profile = await L.openProfile(page, t, 'public');
        await step(F, 'p01-open', async () => {
            const s = await L.snap(page, 'p01-public');
            return {url: s.url, accept: await profile.imageFileInput().getAttribute('accept'), text: L.flat(await profile.form('public').innerText(), 1500),
                namesTypes: /jpe?g|png|gif/i.test(await profile.form('public').innerText()), image: await L.readImage(page), homepage: await L.homepageState(page), controls: await L.controls(page, 'form#publicProfileForm')};
        });
        const up = async (k, file) => step(F, k, async () => {
            const u = await L.upload(page, file, dialogs);
            const img = await L.readImage(page);
            await L.snap(page, k, {png: true});
            return {...u, image: img, stored: L.profileFiles(app, auId)};
        });
        await up('p02-big-png', files.bigPng);
        await up('p03-wide-jpg', files.wideJpg);
        await up('p04-small-jpg', files.smallJpg);
        await up('p05-small-jpeg', files.smallJpeg);
        await up('p06-upper-PNG', files.upperPng);
        await up('p07-small-gif', files.smallGif);
        await up('p08-exact-gif', files.exactGif);
        await up('p09-big-png-again', files.bigPng);
        // the oversize .gif: refused; the sentence after 5 s; then a reload (A2)
        await step(F, 'p10-big-gif', async () => {
            const u = await L.upload(page, files.bigGif, dialogs);
            const now = await L.readImage(page);
            await L.sleep(5000);
            const later = await L.readImage(page);
            await L.snap(page, 'p10-big-gif-refused');
            await page.reload();
            await profile.expectOpen('public').catch(() => {});
            await idle(page).catch(() => {});
            const reloaded = await L.readImage(page);
            await L.snap(page, 'p10-big-gif-reloaded');
            return {...u, now, later, reloaded, stored: L.profileFiles(app, auId)};
        });
        await up('p11-png-for-txt', files.bigPng);
        await step(F, 'p12-txt', async () => {
            const u = await L.upload(page, files.txt, dialogs);
            const img = await L.readImage(page);
            await L.snap(page, 'p12-txt-refused');
            return {...u, image: img};
        });
        await step(F, 'p13-txt-as-png', async () => {
            const before = await L.readImage(page);
            const u = await L.upload(page, files.txtPng, dialogs);
            const img = await L.readImage(page);
            await L.snap(page, 'p13-txt-as-png-refused');
            await page.reload();
            await profile.expectOpen('public').catch(() => {});
            await idle(page).catch(() => {});
            const reloaded = await L.readImage(page);
            return {...u, before, image: img, reloaded, stored: L.profileFiles(app, auId)};
        });
        // bio and homepage: a 300-character address typed, the refusal, a saved pair
        await step(F, 'p14-homepage-length', async () => {
            const long = 'https://example.org/' + 'a'.repeat(280);
            await profile.homepage().fill('');
            await profile.homepage().click();
            await profile.homepage().pressSequentially(long, {delay: 0});
            const st = await L.homepageState(page);
            return {typed: long.length, kept: (st.value || '').length, maxlength: st.maxlength};
        });
        await step(F, 'p15-bio-homepage', async () => {
            await L.typeBio(page, profile, 'Probe bio statement SW2.');
            await L.retype(profile.homepage(), 'example.org/home');
            const refused = await L.pressSave(page, profile, dialogs);
            const refusedState = {homepage: await L.homepageState(page), bio: await L.bioText(page)};
            await L.retype(profile.homepage(), 'https://example.org/home');
            await L.sleep(400);
            const corrected = await L.homepageState(page);
            const save = await L.pressSave(page, profile, dialogs);
            const same = {homepage: await L.homepageState(page), bio: await L.bioText(page)};
            await page.reload();
            await profile.expectOpen('public').catch(() => {});
            await profile.expectBioEditorReady().catch(() => {});
            const reloaded = {homepage: await L.homepageState(page), bio: await L.bioText(page)};
            await L.snap(page, 'p15-saved-reloaded');
            return {refused, refusedState, corrected, save, same, reloaded};
        });
        // the tab left with an unsaved bio (no other box changed), and with an unsaved homepage
        await step(F, 'p16-unsaved-leave', async () => {
            await L.typeBio(page, profile, 'Unsaved bio SW2.');
            const leave1 = await L.pressTab(page, profile, dialogs, 'identity', {answer: 'dismiss'});
            await L.pressTab(page, profile, dialogs, 'public');
            await profile.expectBioEditorReady().catch(() => {});
            const back1 = {bio: await L.bioText(page)};
            await L.retype(profile.homepage(), 'https://unsaved.example.org');
            await profile.homepage().blur();
            const leave2 = await L.pressTab(page, profile, dialogs, 'identity', {answer: 'dismiss', wait: false});
            const stay = {publicOpen: await profile.form('public').isVisible().catch(() => false), homepage: (await L.homepageState(page)).value};
            const leave3 = await L.pressTab(page, profile, dialogs, 'identity', {answer: 'accept'});
            await L.pressTab(page, profile, dialogs, 'public');
            const back2 = {homepage: (await L.homepageState(page)).value};
            return {leave1, back1, leave2, stay, leave3, back2};
        });
        // "Delete"
        await step(F, 'p17-delete', async () => {
            const before = await L.readImage(page);
            const n0 = dialogs.seen.length;
            const t2 = await L.traffic(page, async () => {
                const reloaded = page.waitForEvent('load', {timeout: 30000}).catch(() => null);
                await page.locator('form#publicProfileForm').getByRole('button', {name: 'Delete', exact: true}).click();
                await reloaded;
                await profile.expectOpen('public').catch(() => {});
                await idle(page).catch(() => {});
            }, {filter: /delete-profile-image|profile/});
            const after = await L.readImage(page);
            await profile.expectBioEditorReady().catch(() => {});
            const kept = {homepage: (await L.homepageState(page)).value, bio: await L.bioText(page)};
            await L.snap(page, 'p17-deleted');
            await page.reload();
            await profile.expectOpen('public').catch(() => {});
            const again = await L.readImage(page);
            return {before, requests: t2.requests, dialogs: dialogs.seen.slice(n0).map((d) => d.type), url: L.rel(page.url()), after, kept, again, stored: L.profileFiles(app, auId)};
        });
        // A9: an image and a homepage on the author and a masthead member, then the reader-facing pages
        await up('p18-au-image', files.bigPng);
        await signOut(page).catch(() => {});
        await signIn(page, `${t}se`, {contextPath: t});
        profile = await L.openProfile(page, t, 'public');
        await step(F, 'p19-se-image', async () => {
            const u = await L.upload(page, files.bigPng, dialogs);
            await L.typeBio(page, profile, 'Masthead member bio SW2.');
            await L.retype(profile.homepage(), 'https://example.org/seth');
            const save = await L.pressSave(page, profile, dialogs);
            return {u, save, image: await L.readImage(page), stored: L.profileFiles(app, seId)};
        });
        await signOut(page).catch(() => {});
        const pub = await app.api.createSubmission({tag: `${t}x`, context: t, submitter: `${t}au`, published: true, title: `Public item ${t}`});
        F('published', {submissionId: pub && pub.submissionId});
        // the item's contributor record (read-only SQL, for Evidence): what the profile copied into it
        await step(F, 'p21-contributor-record', async () => {
            const rows = sql(app, `select a.author_id, s.setting_name, coalesce(s.locale,''), left(s.setting_value, 80) from authors a join publications p on p.publication_id=a.publication_id left join author_settings s on s.author_id=a.author_id where p.submission_id=${pub.submissionId} and s.setting_name in ('givenName','familyName','url','biography') order by 1,2`);
            return {rows: rows.split('\n').filter(Boolean)};
        });
        await step(F, 'p20-reader-pages', async () => {
            const m = await L.masthead(page, t);
            await L.snap(page, 'p20-masthead');
            const itemPath = app.name === 'ojs' ? 'article/view' : app.name === 'omp' ? 'catalog/book' : 'preprint/view';
            const r = await page.goto(`/index.php/${t}/en/${itemPath}/${pub.submissionId}`);
            await idle(page).catch(() => {});
            const s = await L.snap(page, 'p20-item');
            const body = await page.locator('body').innerText().catch(() => '');
            const imgs = await page.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
            const links = await page.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
            return {masthead: {status: m.status, listsSeth: /Seth Masthead/.test(m.text || ''), text: L.flat(m.text, 800), profileImg: m.imgs.filter((x) => /profileImage/.test(x || '')), homepage: m.links.filter((x) => /example\.org/.test(x || ''))},
                item: {status: r && r.status(), url: s.url, authorBiography: /Author Biography/i.test(body), bio: /Probe bio statement SW2\./.test(body), around: L.flat((body.match(/Author Biograph[\s\S]{0,200}/i) || [''])[0], 260), profileImg: imgs.filter((x) => /profileImage/.test(x || '')), homepage: links.filter((x) => /example\.org/.test(x || ''))}};
        });
    } finally {
        F('dialogs', dialogs.seen);
        F('serverLog', log.since(from).map((l) => L.flat(l, 400)));
        await close();
    }
}

// ---------------------------------------------------------------------------
// banner
async function banner(app, F) {
    const tf = tag('u03sw2f');
    const tg = tag('u03sw2g');
    const th = tag('u03sw2h');
    const ti = tag('u03sw2i');
    const fu = `${th}fu`;
    await app.api.createContext({tag: th, context: {name: ctxName(th)}, users: [{username: fu, givenName: 'Fay', familyName: 'Future', roles: ['reader']}, {username: `${th}nu`, givenName: 'Nil', familyName: 'Control', roles: ['reader']}]});
    // a second journal where Fay holds a role, so the site-level page stays at the site level (Rule 3)
    await app.api.createContext({tag: ti, context: {name: ctxName(ti)}, users: [{username: fu, givenName: 'Fay', familyName: 'Future', roles: ['reader']}]});
    await app.api.createContext({tag: tf, context: {name: ctxName(tf)}, users: [{username: `${tf}mg`, roles: ['manager']}]});
    await app.api.createContext({tag: tg, context: {name: ctxName(tg)}, users: [{username: `${tg}mg`, roles: ['manager']}]});
    const c = CTX[app.name];
    const idOf = (p) => Number(sql(app, `select ${c.id} from ${c.table} where path='${p}'`).trim());
    const uid = userId(app, fu);
    const authorGroup = (cid) => Number(sql(app, `select ug.user_group_id from user_groups ug where ug.context_id=${cid} and ug.role_id=65536 order by ug.user_group_id limit 1`).trim());
    const today = new Date();
    const plus = (d) => { const x = new Date(today.getTime() + d * 86400000); return x.toISOString().slice(0, 10); };
    // a dated role waiting to start, as an accepted role invitation with a later start date leaves it
    sql(app, `insert into user_user_groups (user_group_id, user_id, date_start, masthead) values (${authorGroup(idOf(tf))}, ${uid}, '${plus(9)} 00:00:00', 1)`);
    sql(app, `insert into user_user_groups (user_group_id, user_id, date_start, masthead) values (${authorGroup(idOf(tg))}, ${uid}, '${plus(30)} 00:00:00', 1)`);
    F('run', {run: RUN, tf, tg, th, ti, fu, uid, rows: sql(app, `select user_group_id, date_start, date_end from user_user_groups where user_id=${uid} order by date_start`).split('\n').filter(Boolean), expected: plus(9)});
    const {page, close} = await launch(app);
    try {
        const readBanner = async (label, contextPath) => {
            const p = await L.openProfile(page, contextPath, 'identity');
            const s = await L.snap(page, `b-${label}`);
            const info = await page.evaluate(() => {
                const h = [...document.querySelectorAll('h1, h2')].map((x) => x.innerText.trim());
                const n = [...document.querySelectorAll('h2')].find((x) => /scheduled to begin/.test(x.innerText));
                const heading = [...document.querySelectorAll('h1')].find((x) => /Profile/.test(x.innerText));
                const above = n && heading ? !!(n.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
                const box = n ? (n.closest('[class*=otification]') || n.parentElement) : null;
                return {headings: h, banner: box ? box.innerText.replace(/\s+/g, ' ').trim() : null, aboveHeading: above};
            });
            return {url: s.url, ...info, tabs: await p.tabs.locator('> ul > li').count()};
        };
        await signIn(page, fu, {contextPath: th});
        await step(F, 'b1-own-journal-future', async () => readBanner('future-journal', tf));
        await step(F, 'b2-other-no-role', async () => readBanner('no-role-journal', app.contextPath));
        await step(F, 'b3-second-future', async () => readBanner('second-future-journal', tg));
        await step(F, 'b4-role-held', async () => readBanner('role-held', th));
        await step(F, 'b5-site-level', async () => readBanner('site-level', null));
        await signOut(page).catch(() => {});
        await signIn(page, `${th}nu`, {contextPath: th});
        await step(F, 'b6-control-no-future', async () => readBanner('control', app.contextPath));
    } finally {
        await close();
    }
}

// ---------------------------------------------------------------------------
// closed
async function closedPhase(app, F) {
    const W = L.WORDS[app.name];
    const tc = tag('u03sw2c');
    const to = tag('u03sw2o');
    const te = tag('u03sw2e');
    const cu = `${tc}cu`;
    await app.api.createContext({tag: tc, context: {name: ctxName(tc)}, users: [{username: cu, givenName: 'Cleo', familyName: 'Closed', roles: ['reader']}, {username: `${tc}mg`, roles: ['manager']}]});
    await app.api.createContext({tag: to, context: {name: ctxName(to)}, users: [{username: cu, givenName: 'Cleo', familyName: 'Closed', roles: ['reader', 'author']}, {username: `${tc}mg`, roles: ['manager']}]});
    await app.api.createContext({tag: te, context: {name: ctxName(te)}, users: [{username: cu, givenName: 'Cleo', familyName: 'Closed', roles: ['reader']}, {username: `${tc}mg`, roles: ['manager']}]});
    fs.writeFileSync(outFile('closed-state.json'), JSON.stringify({tc, to, te, cu}));
    F('run', {run: RUN, tc, to, te, cu});
    const names = [ctxName(tc), ctxName(to), ctxName(te)];
    const log = serverLog(app);
    const from = log.mark();
    const A = await launch(app);
    const M = await launch(app);
    const page = A.page, mp = M.page;
    const dialogs = L.dialogRecorder(page);
    const {SiteAccessTab} = L.pages('RolesConfigurationPages.js');
    try {
        await signIn(mp, `${tc}mg`, {contextPath: tc});
        // the Site Access Options choice, read then set
        await step(F, 'c01-site-access', async () => {
            const tab = new SiteAccessTab(mp, tc);
            await tab.goto();
            await L.snap(mp, 'c01-site-access');
            const radios = await tab.panel.getByRole('radio').evaluateAll((els) => els.map((e) => ({label: (e.labels && e.labels[0] ? e.labels[0].innerText : '').replace(/\s+/g, ' ').trim(), checked: e.checked})));
            const group = L.flat(await tab.group('User Registration').innerText().catch(() => null), 600);
            await tab.radio(W.closed).check();
            const r = await tab.save();
            await tab.reload();
            return {radios, group, saveStatus: r.status(), closedChecked: await tab.radio(W.closed).isChecked()};
        });
        await signIn(page, cu, {contextPath: tc});
        // the closed journal's own tab
        await step(F, 'c02-closed-own-tab', async () => {
            const profile = await L.openProfile(page, tc, 'roles');
            await L.snap(page, 'c02-closed-own');
            const r = await L.readRoles(page);
            await profile.toggleOtherContexts().catch(() => {});
            await L.sleep(700);
            const o = await L.readRoles(page);
            return {legend: r.legend, current: r.sections.filter((s) => !s.inFold).map((s) => ({label: s.label, ulLabel: s.ulLabel, boxes: s.boxes.length, height: s.height, text: s.text})), foldLink: r.foldLink, registerIn: r.registerIn,
                openLink: o.foldLink, listed: o.sections.filter((s) => s.inFold && s.ulLabel && names.includes(s.ulLabel)).map((s) => `${s.ulLabel}: ${s.boxes.map((b) => b.label + (b.checked ? ' [x]' : '')).join(', ')}`), text: L.flat(r.text, 600)};
        });
        // Save on the closed journal's tab, other journals open: the roles in the open one stay
        await step(F, 'c03-save-closed-tab', async () => {
            const profile = await L.openProfile(page, tc, 'roles');
            const save = await L.pressSave(page, profile, dialogs);
            const rowO = await L.usersRow(mp, to, cu);
            const rowC = await L.usersRow(mp, tc, cu);
            return {save, rowO, rowC};
        });
        // the closed journal in another journal's fold
        await step(F, 'c04-in-other-fold', async () => {
            const profile = await L.openProfile(page, to, 'roles');
            await profile.toggleOtherContexts();
            await L.sleep(700);
            await L.snap(page, 'c04-open-fold');
            const r = await L.readRoles(page);
            return {foldLink: r.foldLink, listed: r.sections.filter((s) => s.inFold && s.ulLabel && names.includes(s.ulLabel)).map((s) => ({name: s.ulLabel, boxes: s.boxes.map((b) => b.label), height: s.height}))};
        });
        // site level
        await step(F, 'c05-site-level', async () => {
            await L.openProfile(page, null, 'roles');
            await L.snap(page, 'c05-site-roles');
            const r = await L.readRoles(page);
            return {foldLink: r.foldLink, listed: r.sections.filter((s) => s.ulLabel && names.includes(s.ulLabel)).map((s) => ({name: s.ulLabel, boxes: s.boxes.map((b) => b.label + (b.checked ? ' [x]' : ''))}))};
        });
        await signOut(page).catch(() => {});
        // the Register pages, signed out
        await step(F, 'c06-register-pages', async () => {
            const site = await A4.readSiteRegister(page, app, names);
            await L.snap(page, 'c06-site-register');
            const items = (site.items || []).filter((i) => names.includes(i.name));
            const r = await page.goto(`/index.php/${tc}/en/user/register`);
            await idle(page).catch(() => {});
            await L.snap(page, 'c06-closed-register');
            const own = L.flat(await page.locator('.pkp_structure_main, main, body').first().innerText().catch(() => null), 600);
            return {siteH1: site.h1, items, ownStatus: r && r.status(), own, ownUrl: L.rel(page.url())};
        });
        // "Allow user self-registration" off for Reader on the open journal
        await signIn(mp, `${tc}mg`, {contextPath: to});
        await step(F, 'c07-selfreg-reader-off', async () => {
            const off = await A4.turnOffSelfRegistration(mp, app, to, ['Reader']);
            await signIn(page, cu, {contextPath: to});
            const profile = await L.openProfile(page, to, 'roles');
            await L.snap(page, 'c07-reader-flag-off');
            const r = await L.readRoles(page);
            const save = await L.pressSave(page, profile, dialogs);
            const row = await L.usersRow(mp, to, cu);
            return {off, current: r.sections.filter((s) => !s.inFold).map((s) => s.boxes.map((b) => b.label + (b.checked ? ' [x]' : ''))), save, row};
        });
        // every self-registering role off on a third journal, registrations left open
        await signIn(mp, `${tc}mg`, {contextPath: te});
        await step(F, 'c08-selfreg-all-off', async () => {
            const off = await A4.turnOffSelfRegistration(mp, app, te, W.boxes.filter((b) => b !== 'Chapter Author').concat(app.name === 'omp' ? ['Chapter Author'] : []));
            const profile = await L.openProfile(page, to, 'roles');
            await profile.toggleOtherContexts();
            await L.sleep(700);
            const r = await L.readRoles(page);
            const own = await L.openProfile(page, te, 'roles');
            const ro = await L.readRoles(page);
            await L.snap(page, 'c08-all-off-own');
            const save = await L.pressSave(page, own, dialogs);
            const row = await L.usersRow(mp, te, cu);
            await signOut(page).catch(() => {});
            const site = await A4.readSiteRegister(page, app, [ctxName(te)]);
            return {off, inFold: r.sections.filter((s) => s.ulLabel === ctxName(te)).map((s) => s.boxes.map((b) => b.label)), own: ro.sections.filter((s) => !s.inFold).map((s) => ({boxes: s.boxes.length, height: s.height})), ownFold: ro.foldLink, save, row,
                register: (site.items || []).filter((i) => i.name === ctxName(te))};
        });
    } finally {
        F('dialogs', dialogs.seen);
        F('serverLog', log.since(from).map((l) => L.flat(l, 400)));
        await A.close();
        await M.close();
    }
}

// ---------------------------------------------------------------------------
// exactone (exclusive lock): close every other open scratch context, read, reopen
async function exactone(app, F) {
    const W = L.WORDS[app.name];
    const st = JSON.parse(fs.readFileSync(outFile('closed-state.json'), 'utf8'));
    const before = contexts(app);
    const toClose = before.filter((c) => c.enabled && c.path !== app.contextPath && c.path !== st.tc && c.disableUserReg !== '1');
    F('before', {open: before.filter((c) => c.enabled && c.disableUserReg !== '1').map((c) => c.path), toClose: toClose.map((c) => c.path)});
    const {SiteAccessTab} = L.pages('RolesConfigurationPages.js');
    const A = await launch(app);
    const page = A.page;
    const setReg = async (p, closed) => {
        const tab = new SiteAccessTab(page, p);
        await tab.goto();
        const label = closed ? W.closed : (W.open || null);
        if (label) await tab.radio(label).check();
        else await tab.panel.getByRole('radio').filter({hasNot: page.locator('xxx')}).first().check();
        const r = await tab.save();
        return r.status();
    };
    const restored = [];
    try {
        await signIn(page, 'admin');
        const statuses = {};
        for (const c of toClose) statuses[c.path] = await setReg(c.path, true).catch((e) => `error ${L.flat(e.message, 120)}`);
        F('closedOthers', statuses);
        F('during', contexts(app).filter((c) => c.enabled && c.disableUserReg !== '1').map((c) => c.path));
        await signIn(page, st.cu, {contextPath: st.tc});
        await step(F, 'x1-closed-own-tab', async () => {
            await L.openProfile(page, st.tc, 'roles');
            await L.snap(page, 'x1-closed-own-exactly-one');
            const r = await L.readRoles(page);
            return {legend: r.legend, foldLink: r.foldLink, text: L.flat(r.text, 600), sections: r.sections.map((s) => ({label: s.label, ulLabel: s.ulLabel, boxes: s.boxes.length, height: s.height})), interests: r.interests, formTail: r.formTail};
        });
        // control: the site-level tab at the same moment
        await step(F, 'x2-site-level', async () => {
            await L.openProfile(page, null, 'roles');
            const r = await L.readRoles(page);
            return {landed: L.rel(page.url()), foldLink: r.foldLink, listed: r.sections.filter((s) => s.ulLabel).map((s) => `${s.ulLabel}: ${s.boxes.length}`)};
        });
    } finally {
        await signIn(page, 'admin').catch(() => {});
        for (const c of toClose) {
            // put back: the open choice ("Visitors can register…"), stored as disableUserReg false
            const s = await (async () => {
                const tab = new SiteAccessTab(page, c.path);
                await tab.goto();
                const radios = tab.panel.getByRole('radio');
                const n = await radios.count();
                let picked = null;
                for (let i = 0; i < n; i++) {
                    const lab = await radios.nth(i).evaluate((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim());
                    if (/^Visitors can register/.test(lab)) { await radios.nth(i).check(); picked = lab; break; }
                }
                const r = await tab.save();
                return {status: r.status(), picked};
            })().catch((e) => ({error: L.flat(e.message, 160)}));
            restored.push({path: c.path, ...s});
        }
        F('restored', restored);
        F('after', contexts(app).filter((c) => toClose.some((x) => x.path === c.path)).map((c) => `${c.path}:${c.disableUserReg}`));
        await A.close();
    }
}

// ---------------------------------------------------------------------------
// settings
async function settingsPhase(app, F) {
    const tl = tag('u03sw2l');
    const td = tag('u03sw2d');
    const tr = tag('u03sw2o');
    const lu = `${td}lu`;
    await app.api.createContext({tag: td, context: {name: ctxName(td)}, users: [{username: lu, givenName: 'Lu', familyName: 'Lang', roles: ['author']}, {username: `${td}mg`, givenName: 'Max', familyName: 'Manager', roles: ['manager']}]});
    await app.api.createContext({tag: tl, context: {name: ctxName(tl), supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, users: [{username: lu, givenName: 'Lu', familyName: 'Lang', roles: ['author']}, {username: `${td}mg`, roles: ['manager']}]});
    await app.api.createContext({tag: tr, context: {name: ctxName(tr)}, orcid: {enabled: true}, users: [{username: lu, givenName: 'Lu', familyName: 'Lang', roles: ['author']}]});
    F('run', {run: RUN, td, tl, tr, lu});
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const dialogs = L.dialogRecorder(page);
    const boxes = async (sel) => page.evaluate((sel) => {
        const f = document.querySelector(sel);
        if (!f) return null;
        const names = [...f.querySelectorAll('input[name], textarea[name]')].map((i) => i.name).filter((n) => /\[/.test(n));
        const iframes = [...f.querySelectorAll('iframe')].map((i) => i.id);
        return {multilingualNames: names, editors: iframes, text: f.innerText.replace(/\s+/g, ' ').slice(0, 600)};
    }, sel);
    try {
        await signIn(page, lu, {contextPath: td});
        await step(F, 's1-languages', async () => {
            const out = {};
            for (const [label, cp] of [['one-form-language', td], ['two-form-languages', tl], ['site-level', null]]) {
                const p = await L.openProfile(page, cp, 'identity');
                out[label] = {identity: await boxes('form#identityForm')};
                await L.snap(page, `s1-${label}-identity`, {png: label !== 'one-form-language'});
                // the French twin opens when the first box is focused
                await p.givenName('en').click().catch(() => {});
                await L.sleep(600);
                out[label].popover = L.flat(await page.locator('.localization_popover, .pkpFormLocales, [id$="-localization-popover-container0"]').first().innerText().catch(() => null), 200);
                await L.pressTab(page, p, dialogs, 'contact', {answer: 'accept'});
                out[label].contact = await boxes('form#contactForm');
                out[label].workingLanguages = await page.locator('form#contactForm').getByText('Working Languages').count();
                await L.pressTab(page, p, dialogs, 'public', {answer: 'accept'});
                await p.expectBioEditorReady().catch(() => {});
                out[label].public = await boxes('form#publicProfileForm');
                out[label].url = L.rel(page.url());
            }
            return out;
        });
        await step(F, 's2-orcid', async () => {
            const out = {};
            for (const [label, cp] of [['orcid-off', td], ['orcid-on', tr]]) {
                await L.openProfile(page, cp, 'identity');
                const txt = await page.locator('form#identityForm').innerText().catch(() => '');
                out[label] = {orcidWord: /ORCID/.test(txt), excerpt: L.flat((txt.match(/[^\n]*ORCID[\s\S]{0,160}/) || [''])[0], 220)};
                await L.snap(page, `s2-${label}`, {png: false});
            }
            return out;
        });
        await signOut(page).catch(() => {});
        // the editorial-report email: on (default), off, the manager's own Notifications tab
        await signIn(page, `${td}mg`, {contextPath: td});
        const editorsRows = async (cp) => {
            const p = await L.openProfile(page, cp, 'notifications');
            const t = await p.form('notifications').innerText().catch(() => '');
            return {statistics: /Statistics report summary\./.test(t), editorsGroup: L.flat((t.match(/Editors[\s\S]{0,300}/) || [''])[0], 320)};
        };
        await step(F, 's3-editorial-report', async () => {
            const before = await editorsRows(td);
            await page.goto(`/index.php/${td}/en/management/settings/workflow#emails`);
            await idle(page).catch(() => {});
            const off = page.getByRole('radio', {name: 'Do not send the email to editors.', exact: true});
            await off.waitFor({state: 'visible', timeout: 30000});
            const formLoc = page.locator('form').filter({has: off});
            const group = L.flat(await formLoc.innerText().catch(() => null), 900);
            await off.check();
            const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: 30000});
            await formLoc.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await saved;
            await L.sleep(1000);
            await L.snap(page, 's3-emails-off');
            const after = await editorsRows(td);
            await L.snap(page, 's3-notifications-off', {png: false});
            const site = await editorsRows(null);
            return {before, group, saveStatus: r.status(), after, siteLevel: site};
        });
        await signOut(page).catch(() => {});
        // the site password policy screen (read only)
        await signIn(page, 'admin');
        await step(F, 's4-password-policy', async () => {
            const {SiteSettingsPage} = L.pages('SiteSettingsPages.js');
            const sp = new SiteSettingsPage(page);
            await page.goto('/index.php/index/en/admin/settings');
            await idle(page).catch(() => {});
            const form = await sp.security();
            await L.snap(page, 's4-security');
            const text = await page.locator('[id="siteSecurity-minPasswordLength-control"]').locator('xpath=ancestor::form[1]').innerText().catch(() => null);
            const min = await page.locator('[id="siteSecurity-minPasswordLength-control"]').inputValue().catch(() => null);
            const box = await page.getByRole('checkbox', {name: 'Check passwords against compromised password databases'}).isChecked().catch(() => null);
            return {text: L.flat(text, 1500), min, compromisedTicked: box};
        });
    } finally {
        F('dialogs', dialogs.seen);
        F('serverLog', log.since(from).map((l) => L.flat(l, 400)));
        await close();
    }
}

const PHASES = {levels, roles, public: publicTab, banner, closed: closedPhase, exactone, settings: settingsPhase};

forEachApp(async (app) => {
    const fn = PHASES[PHASE];
    if (!fn) throw new Error(`unknown phase ${PHASE}`);
    const F = factsFor(app, PHASE);
    F('start', {app: app.name, line: app.line || 'main', run: RUN, phase: PHASE, at: new Date().toISOString()});
    try {
        await fn(app, F);
    } catch (e) {
        F('phase-error', L.flat(String(e && e.stack ? e.stack : e), 1500));
    }
});
