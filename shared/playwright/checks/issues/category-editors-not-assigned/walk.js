// U16 A13 and OPS1 walk: a category's "Editorial Assignments" (issue reports
// docs/issues/U21-A8-section-editors-not-assigned-second-journal.md, which A13 joins, and
// docs/issues/U16-OPS1-preprint-category-offers-no-moderator.md). On PKP's default test dataset.
//
// WALK=a13 (OJS, OMP; the default there): `admin` creates a second journal (press) on screen, gives
//   dbuskins its Section editor (Series editor) role and ccorino (aclark) its Author role, turns the
//   wizard's "Categories" on, adds the category "u16c8 Arts" ticking "Assign David Buskins as …". The
//   author submits choosing "u16c8 Arts". Control on publicknowledge: "u16c8 Control" ticking Minoti
//   Inoue, the author submits choosing it. `admin` reads both "Participants"; the mailbox is read.
// WALK=ops1 (OPS; the default there): `rvaca` opens "Add Category" and reads "Editorial Assignments",
//   names "u16c8 Moderated", ticks "Assign Minoti Inoue as Moderator" when offered, saves; turns the
//   wizard's "Categories" on; ccorino submits choosing "u16c8 Moderated"; `rvaca` reads "Participants".
//   Control: the "Preprints" section's window and its "Editorial Assignments" boxes.
// WALK=nb (neighbour of the OPS1 fix; runs alone, fix in and out): as `admin` on publicknowledge,
//   "Add Category" is opened and its "Editorial Assignments" boxes are read; nothing is saved.
//
//   npm run fleet-prep -- --feature issues-c8 --dataset 8 --reset
//   PROBE_FEATURE=issues-c8 PROBE_AGENT=c8 node bin/probe.js all shared/playwright/checks/issues/category-editors-not-assigned/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-c8-3_5, PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, tag} = require('../../../probe');
const U21 = require('../section-editors-not-assigned-second-journal/lib.js');
const H = require('./lib.js');

const CTX = 'u16c8';
const MODE_ENV = process.env.WALK || '';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const mode = MODE_ENV || (app.name === 'ops' ? 'ops1' : 'a13');
    if (mode === 'a13' && app.name === 'ops') return;
    if (mode === 'ops1' && app.name !== 'ops') return;
    const w = U21.WORDS[app.name];
    const rec = (n, d) => record(`c8-${mode}-${n}`, d);
    const facts = {app: app.name, line: app.line || 'main', mode, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            const v = await fn();
            fact(k, v === undefined ? 'done' : v);
            return v;
        } catch (e) {
            fact(`${k} threw`, String(e.message).split('\n')[0]);
            return null;
        }
    };
    const {page, close} = await launch(app);
    try {
        if (mode === 'nb') {
            await signIn(page, 'admin');
            await step('add category window', async () => {
                const o = await H.openAddCategory(page, app, app.contextPath);
                return {heading: o.heading, sentence: o.sentence, boxes: o.boxes};
            });
            rec('01-add-window', await screen(page));
            return;
        }

        if (mode === 'a13') {
            const name = `Second ${w.noun} u16c8`;
            const runTag = tag('u16c8');
            // 1-4: the second journal and its roles
            await signIn(page, 'admin');
            await step('1-2 create', () => U21.createContext(page, app, {name, initials: 'SJC', path: CTX, email: 'u16c8@mailinator.com'}));
            await step('3 editor role', () => U21.giveRole(page, app, {username: 'dbuskins', role: w.se}));
            await step('4 author role', () => U21.giveRole(page, app, {username: w.author, role: 'Author'}));
            rec('01-roles', await screen(page));
            // 5: the wizard's "Categories"
            await step('5 categories in wizard', () => H.categoriesInWizard(page, app, CTX));
            // 6: the category and its tick
            await step('6 category', async () => {
                const o = await H.openAddCategory(page, app, CTX);
                const offered = {heading: o.heading, boxes: o.boxes};
                const saved = await H.fillAndSaveCategory(page, app, o, {name: 'u16c8 Arts', path: 'u16c8-arts', editorBox: `Assign David Buskins as ${w.se}`});
                return {offered, saved};
            });
            rec('02-category', await screen(page));
            // 10-11: control category on publicknowledge
            await step('10 control categories in wizard', () => H.categoriesInWizard(page, app, app.contextPath));
            await step('11 control category', async () => {
                const o = await H.openAddCategory(page, app, app.contextPath);
                const offered = {heading: o.heading, boxes: o.boxes};
                const saved = await H.fillAndSaveCategory(page, app, o, {name: 'u16c8 Control', path: 'u16c8-control', editorBox: `Assign Minoti Inoue as ${w.se}`});
                return {offered, saved};
            });
            await signOut(page);

            // 7, 12: the author submits to each
            await signIn(page, w.author);
            const t2 = `${runTag} second ${w.noun.toLowerCase()}`;
            const id2 = await step('7 begin', () => U21.beginSubmission(page, app, CTX, {title: t2, section: w.section}));
            await step('7 submit', () => H.completeWithCategory(page, app, CTX, {category: 'u16c8 Arts'}));
            rec('03-second-submitted', await screen(page));
            const t1 = `${runTag} first ${w.noun.toLowerCase()}`;
            const id1 = await step('12 begin', () => U21.beginSubmission(page, app, app.contextPath, {title: t1, section: w.controlSection}));
            await step('12 submit', () => H.completeWithCategory(page, app, app.contextPath, {series: w.controlSection, category: 'u16c8 Control'}));
            rec('04-first-submitted', await screen(page));
            await signOut(page);

            // 8, 13: participants
            await signIn(page, 'admin');
            const p2 = U21.participantsPart(await U21.openWorkflow(page, app, CTX, id2));
            rec('05-second-workflow', await screen(page));
            const p1 = U21.participantsPart(await U21.openWorkflow(page, app, app.contextPath, id1));
            rec('06-first-workflow', await screen(page));
            fact('8 second participants', p2);
            fact('13 control participants', p1);
            await signOut(page);
            // 9: mail
            const m2admin = await U21.mailFor(app, 'pkpadmin@mailinator.com', t2, {wait: 20_000});
            const m2db = await U21.mailFor(app, 'dbuskins@mailinator.com', t2, {wait: 5_000});
            const m1mi = await U21.mailFor(app, 'minoue@mailinator.com', t1, {wait: 20_000});
            const m1admin = await U21.mailFor(app, 'pkpadmin@mailinator.com', t1);
            fact('9 mail', {second: {admin: m2admin, dbuskins: m2db}, control: {minoue: m1mi, admin: m1admin}});
            facts.observed = {
                secondDbuskinsListed: /David Buskins/.test(p2 || ''),
                secondNeedsEditorMail: m2admin.some((m) => /needs an editor/i.test(m.subject)),
                secondDbuskinsMail: m2db.length,
                controlMinoueListed: /Minoti Inoue/.test(p1 || ''),
                controlMinoueMail: m1mi.length,
                controlNeedsEditorMail: m1admin.some((m) => /needs an editor/i.test(m.subject)),
            };
            return;
        }

        // ops1
        await signIn(page, 'rvaca');
        await step('2-3 category', async () => {
            const o = await H.openAddCategory(page, app, app.contextPath);
            const offered = {heading: o.heading, sentence: o.sentence, part: o.part, boxes: o.boxes};
            rec('01-add-window', await screen(page));
            const saved = await H.fillAndSaveCategory(page, app, o, {name: 'u16c8 Moderated', path: 'u16c8-moderated', editorBox: 'Assign Minoti Inoue as Moderator'});
            return {offered, saved};
        });
        await step('4 categories in wizard', () => H.categoriesInWizard(page, app, app.contextPath));
        await step('7 control: section window', async () => {
            const {SectionsTab} = require('../../../pages/SectionsPages.js');
            const tab = new SectionsTab(page, app.contextPath, {tab: 'Sections', addLabel: 'Create Section', locale: U21.L(app).replace('/', '')});
            await tab.goto();
            const win = await tab.openEdit('Preprints');
            const boxes = await win.assignmentBoxes().evaluateAll((els) => els.map((e) => ({label: ((e.closest('label') || {}).innerText || '').replace(/\s+/g, ' ').trim(), checked: e.checked})));
            rec('02-section-window', await screen(page));
            return {boxes};
        });
        await signOut(page);
        await signIn(page, 'ccorino');
        const runTag = tag('u16c8');
        const t = `${runTag} moderated preprint`;
        const id = await step('5 begin', () => U21.beginSubmission(page, app, app.contextPath, {title: t, section: null}));
        await step('5 submit', () => H.completeWithCategory(page, app, app.contextPath, {category: 'u16c8 Moderated'}));
        rec('03-submitted', await screen(page));
        await signOut(page);
        await signIn(page, 'rvaca');
        const p = U21.participantsPart(await U21.openWorkflow(page, app, app.contextPath, id));
        rec('04-workflow', await screen(page));
        fact('6 participants', p);
        facts.observed = {
            boxesOffered: (facts.steps['2-3 category'] || {offered: {boxes: []}}).offered.boxes.length,
            minoueListed: /Minoti Inoue/.test(p || ''),
        };
    } finally {
        record(`c8-${mode}-facts`, facts);
        console.log(JSON.stringify(facts.observed || {}, null, 1));
        await close();
    }
});
