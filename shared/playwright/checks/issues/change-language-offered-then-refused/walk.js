// Issue report walks for spec U40 (docs/specs/U40-publication-metadata.md) register entries
// A19 and OJS1: "Change" beside "Current Submission Language" offered, and Confirm refused.
// Takes the reports' Steps through the screens on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"): its context `publicknowledge` and its own users. The kit builds
// nothing; the invitation is accepted from its email, as the invited user would.
//
// PART=a19 (docs/issues/U40-A19-change-language-offered-then-refused.md):
//   path 1 (OJS, OMP): dbarnes ticks "Allow this person to make changes to the publication…" on
//     Maria Fritz's (mfritz, Copyeditor) assignment on OJS submission 3 / OMP submission 7
//     (Copyediting); mfritz opens Title & Abstract, "Change", French (Canada), Title (+ Abstract),
//     "Confirm". (A preprint server's one assistant role, Editorial Board Member, cannot be assigned
//     to a submission: no path 1 there.)
//   path 2 (OJS, OMP, OPS): rvaca invites admin (pkpadmin@mailinator.com) as Copyeditor (OPS:
//     Editorial Board Member); admin accepts from the email (read from the slot's Mailpit); admin
//     removes their own manager role on Users & Roles › Edit (the last role cannot be removed, hence
//     the invitation first); admin opens OJS 6 / OMP 4 / OPS 1 by address, Title & Abstract, "Change",
//     French (Canada), Title (+ Abstract), "Confirm".
// PART=ojs1 (U40 OJS1, not reproduced on main 2026-10-03: no report; REDRIVE=1 first creates a future issue "Vol. 9 No. 9 (2099)" on Issues ›
//   Future Issues › "Create Issue", as the register's footnote did, and publishes into it), OJS only: dbarnes publishes submission 5 into the unpublished
//   issue "Vol. 2 No. 1 (2015)" with "Assign To Future Issue and Publish Immediately"; the readout
//   read; "Change", French (Canada), Title + Abstract, "Confirm".
// MODE=nb (the neighbour check of A19's fix, alone): the roles who must keep "Change": dbuskins
//   (Section editor / Series editor / Moderator, assigned) on OJS 3 / OMP 1 / OPS 1 changes the
//   language to French (Canada); dbarnes (manager-level) changes it back to English; on OJS and OMP,
//   rvaca (Journal / Press manager) is invited as Copyeditor, accepts, is assigned by dbarnes as
//   Copyeditor on OJS 19 / OMP 13 (Copyediting), and changes that submission's language.
//
// Reset first: npm run fleet-prep -- --feature issues-r3 --dataset 3 --reset
// Run (main):  PART=a19 PROBE_FEATURE=issues-r3 PROBE_AGENT=r3 node bin/probe.js all shared/playwright/checks/issues/change-language-offered-then-refused/walk.js
//              PART=ojs1 PROBE_FEATURE=issues-r3 PROBE_AGENT=r3 node bin/probe.js ojs shared/playwright/checks/issues/change-language-offered-then-refused/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r3-3_5 --dataset 3 --reset
//              PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PART=… PROBE_FEATURE=issues-r3-3_5 PROBE_AGENT=r3 node bin/probe.js all shared/playwright/checks/issues/change-language-offered-then-refused/walk.js
// Fix trial (A19): node bin/try-fix.js apply shared/playwright/checks/issues/change-language-offered-then-refused/fix.diff ojs omp ops;
//   reset; PROBE_RUN=fix PART=a19 …; reset; PROBE_RUN=nb-in MODE=nb PART=a19 …; revert; reset; PROBE_RUN=nb-out MODE=nb PART=a19 ….
// Facts: .reports/<feature>/r3/cl-<part>-facts[-<run>]-<app>.json; screens cl-<part>-NN-<name>.
// No assertions: the script records, the reader judges.
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, sql} = require('../../../probe');
const {pause, flat, openWorkflow, openStage, openEntry, readout, changeLanguage, setParticipantPermission, removeRole} = require('./lib');

const PART = process.env.PART || 'a19';
const MODE = process.env.MODE || 'walk';
if (!['a19', 'ojs1'].includes(PART)) throw new Error(`PART=${PART}: a19 or ojs1`);

const TITLES = {
    ojs: {3: 'The Facets Of Job Satisfaction', 4: 'Computer Skill Requirements', 5: 'Genetic transformation of forest trees', 6: 'Investigating the Shared Background'},
    omp: {1: 'The ABCs of Human Survival', 4: 'How Canadians Communicate', 7: 'Accessible Elements'},
    ops: {1: 'The influence of lactation'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (PART === 'ojs1' && app.name !== 'ojs') return; // issues are a journal's
    const tag = `cl-${PART}${MODE === 'nb' ? '-nb' : ''}`;
    const facts = {line: app.line, dataset: app.dataset, part: PART, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = (prefix) => async (name) => {
        const s = await screen(page);
        record(`${tag}-${String(++n).padStart(2, '0')}-${prefix}-${name}`, s);
        return s;
    };
    const T = TITLES[app.name];
    /** Open `sid`'s Title & Abstract, read the readout, then Change › language › Confirm, then reload and read again. */
    async function tryChange(who, sid, language, words) {
        const out = {who, sid};
        await openWorkflow(page, app, sid);
        out.titleAbstract = await openEntry(page, 'Title & Abstract');
        out.before = await readout(page);
        await snap(`${who}-${sid}`)('title-abstract');
        if (out.before.change.present && out.before.change.enabled) {
            out.change = await changeLanguage(page, {title: T[sid], language, words, snap: snap(`${who}-${sid}`)});
            await openWorkflow(page, app, sid);
            await openEntry(page, 'Title & Abstract');
            out.afterReload = await readout(page);
            await snap(`${who}-${sid}`)('reloaded');
        }
        return out;
    }
    try {
        if (MODE === 'nb' && PART === 'a19') {
            const sid = {ojs: 3, omp: 1, ops: 1}[app.name];
            await signIn(page, 'dbuskins');
            fact('dbuskins', await tryChange('dbuskins', sid, 'French (Canada)', 'Titre u40r3 nb'));
            await signIn(page, 'dbarnes');
            fact('dbarnes', await tryChange('dbarnes', sid, 'English', 'Title u40r3 nb'));
            if (app.name !== 'ops') {
                // A journal (press) manager assigned here as a Copyeditor: the server admits them.
                const {inviteAndAccept} = require('../subscription-manager-offered-institutions-refused/lib');
                fact('rvacaInvitation', await inviteAndAccept(page, app, {email: 'rvaca@mailinator.com', roleName: 'Copyeditor', mark: snap('rvaca')}).catch((e) => ({err: flat(e.message, 300)})));
                const msid = {ojs: 19, omp: 13}[app.name];
                await signIn(page, 'dbarnes');
                await openWorkflow(page, app, msid);
                await openStage(page, 'Copyediting');
                const {completeAssignParticipantForm} = require('../../../../../apps/ojs/playwright/pages/ReviewStagePages.js');
                fact('rvacaAssigned', await (async () => {
                    await page.getByRole('button', {name: 'Assign', exact: true}).first().click();
                    await completeAssignParticipantForm(page, {group: 'Copyeditor', name: 'Ramiro Vaca', searchName: 'Vaca'});
                    return 'ok';
                })().catch((e) => flat(e.message, 300)));
                await snap('dbarnes')('rvaca-assigned');
                await signIn(page, 'rvaca');
                fact('rvacaAsCopyeditor', await tryChange('rvaca', msid, 'French (Canada)', 'Titre u40r3 manager copyeditor'));
            }
        } else if (PART === 'a19') {
            if (app.name !== 'ops') {
                // Path 1: a Copyeditor allowed to edit the publication.
                const sid = {ojs: 3, omp: 7}[app.name];
                await signIn(page, 'dbarnes');
                await openWorkflow(page, app, sid);
                await openStage(page, 'Copyediting');
                await snap('dbarnes')('copyediting');
                fact('permission', await setParticipantPermission(page, 'Maria Fritz', true).catch((e) => ({err: flat(e.message, 200)})));
                await snap('dbarnes')('permission-ticked');
                await signIn(page, 'mfritz');
                fact('mfritz', await tryChange('mfritz', sid, 'French (Canada)', 'Titre u40r3 copyeditor'));
            }
            // Path 2: the Site Administrator left with an assistant role. (Users & Roles refuses to
            // remove a user's last role: "You cannot remove the role. At least one role must be
            // assigned to the user.", so the assistant role comes first.)
            const role = app.name === 'ops' ? 'Editorial Board Member' : 'Copyeditor';
            const sid = {ojs: 6, omp: 4, ops: 1}[app.name];
            await signIn(page, 'rvaca');
            const {inviteAndAccept} = require('../subscription-manager-offered-institutions-refused/lib');
            fact('invitation', await inviteAndAccept(page, app, {email: 'pkpadmin@mailinator.com', roleName: role, mark: snap('admin')}).catch((e) => ({err: flat(e.message, 300)})));
            await signIn(page, 'admin');
            fact('removeManager', await removeRole(page, app, 'admin', /manager/i));
            await snap('admin')('manager-role-removed');
            await signIn(page, 'admin');
            const r = await tryChange('admin', sid, 'French (Canada)', 'Titre u40r3 admin');
            r.saveButton = await page.getByRole('button', {name: 'Save', exact: true}).first().isEnabled().catch(() => null);
            fact('admin', r);
        } else {
            // OJS1: published into an issue that is not yet published.
            await signIn(page, 'dbarnes');
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, app.contextPath);
            let issueLabel = /Vol\. 2 No\. 1 \(2015\)/;
            if (process.env.REDRIVE) {
                // The footnote's own route: a future issue created on Issues › Future Issues › "Create Issue".
                const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
                const issues = new IssuesAdmin(page, app.contextPath);
                await issues.goto('Future Issues');
                const {form} = await issues.openCreate();
                await form.volumeBox().fill('9');
                await form.numberBox().fill('9');
                await form.yearBox().fill('2099');
                await form.titleBox().fill('u40r3 Future Issue');
                const r = await form.save();
                fact('issueCreated', r ? r.status() : null);
                await snap('dbarnes')('issue-created');
                issueLabel = /Vol\. 9 No\. 9 \(2099\)/;
            }
            await pub.gotoWorkflow(5);
            await pub.openEntry('Title & Abstract');
            fact('beforePublish', await readout(page));
            await snap('dbarnes-5')('before-publish');
            const published = await pub.publish({futureIssueLabel: issueLabel}).then(() => 'ok').catch((e) => flat(e.message, 300));
            fact('publish', published);
            await pause(1000);
            fact('afterPublish', await readout(page));
            await snap('dbarnes-5')('after-publish');
            fact('stored', sql(app, 'select p.publication_id, p.status as publication_status, p.version_stage, p.issue_id, i.published as issue_published, s.status as submission_status from publications p join submissions s using (submission_id) left join issues i on i.issue_id = p.issue_id where p.submission_id = 5'));
            fact('dbarnes', await tryChange('dbarnes', 5, 'French (Canada)', 'Titre u40r3 published'));
            await page.goto(app.url(`/index.php/${app.contextPath}/en/article/view/5`)).catch(() => {});
            const s = await screen(page);
            record(`${tag}-${String(++n).padStart(2, '0')}-article-page`, s);
            fact('articlePage', flat(s.text.main || s.text.body || '', 300));
        }
        await shot(page, `${tag}-end`).catch(() => {});
    } finally {
        record(`${tag}-facts`, facts);
        await close();
    }
});
