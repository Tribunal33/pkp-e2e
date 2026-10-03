// Spec U75 A1, A2 (docs/specs/U75-preprint-relations.md#a1, #a2): the "Relations" panel offers an
// active "Save" to the Author of a posted preprint and to a Moderator without "Permissions", and
// the save is refused with "An unexpected error has occurred. …". Issue report:
// docs/issues/U75-A1-A2-relations-save-refused.md.
//
// Starts from PKP's default test dataset (OPS), freshly loaded:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/relations-save-refused/walk.js
// MODE=nb walks the neighbours alone (a fresh dataset): the Author's "Title & Abstract" on the
// posted preprint stays read-only; the Preprint Server Manager's relation save on another posted
// preprint is accepted and kept; a recommend-only Moderator (sberardo, "Permissions" ticked) on
// submission 1, and a Moderator who is not (dbuskins), as "Relations" offers itself to them.
const {forEachApp, launch, signIn, signOut, record, shot, screen} = require('../../../probe');
const L = require('./lib');
const G = require('../moderator-galleys-offered-then-refused/lib');

const MODE = process.env.MODE || 'steps';
const POSTED = 2; // "The Facets Of Job Satisfaction: …", posted; Author ckwantes
const UNPOSTED = 1; // "The influence of lactation …", Production, not posted; Moderators dbuskins, sberardo
const OTHER = 3; // "Computer Skill Requirements …", posted (2 versions)
const PUBLISHED = 'This preprint has been published elsewhere.';
const NONE = 'This preprint has not been published elsewhere.';
const DOI = 'https://doi.org/10.1234/u75r1';

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // preprint relations are a preprint server's alone
    const out = {mode: MODE, line: app.line || 'main', steps: {}};
    const {page, close} = await launch(app);
    const dialogs = G.watchDialogs(page);
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: L.flat(e.message, 400)};
            await shot(page, `${MODE}-fail-${name}`).catch(() => {});
        }
        record(`u75r1-${MODE}`, out);
    };
    try {
        if (MODE === 'steps') {
            out.before = {posted: L.storedRelations(app, POSTED), unposted: L.storedRelations(app, UNPOSTED), assignments: G.storedAssignments(app, UNPOSTED)};

            // A. The Author on a posted preprint (A1)
            await signIn(page, 'ckwantes');
            let o;
            await step('A3-page', async () => {
                o = await L.openTitleAbstract(page, app, POSTED, {author: true});
                return L.readPage(o.frame);
            });
            await step('A4-save', async () => {
                await L.openPanel(o.relations);
                const offered = await L.readPanel(o.relations);
                const saved = await L.saveRelation(page, o.relations, PUBLISHED, DOI);
                await shot(page, `${MODE}-A4-after-save`);
                return {offered, ...saved, screen: (await screen(page)).notices};
            });
            out.afterA4 = L.storedRelations(app, POSTED);
            await step('A5-reload', () => L.readAfterReload(page, app, POSTED, {author: true}));
            await step('A6-preprint-page', () => L.preprintNotices(page, app, POSTED));
            await signOut(page);

            // Precondition of B: dbuskins's "Permissions" unticked on submission 1
            await signIn(page, 'dbarnes');
            await step('pB-untick', () => G.setPermissions(page, app, UNPOSTED, 'David Buskins', 'Moderator', false));
            out.assignmentsAfterUntick = G.storedAssignments(app, UNPOSTED);
            await signOut(page);

            // B. A Moderator without "Permissions" (A2)
            await signIn(page, 'dbuskins');
            await step('B8-page', async () => {
                o = await L.openTitleAbstract(page, app, UNPOSTED);
                return L.readPage(o.frame);
            });
            await step('B9-save', async () => {
                await L.openPanel(o.relations);
                const offered = await L.readPanel(o.relations);
                const saved = await L.saveRelation(page, o.relations, PUBLISHED, DOI);
                await shot(page, `${MODE}-B9-after-save`);
                return {offered, ...saved};
            });
            out.afterB9 = L.storedRelations(app, UNPOSTED);
            await step('B10-reload', () => L.readAfterReload(page, app, UNPOSTED));
            await signOut(page);

            // Control: the Preprint Server Manager, step 4 on submission 2
            await signIn(page, 'dbarnes');
            await step('control-manager-save', async () => {
                o = await L.openTitleAbstract(page, app, POSTED);
                const before = await L.readPage(o.frame);
                await L.openPanel(o.relations);
                return {before, ...(await L.saveRelation(page, o.relations, PUBLISHED, DOI))};
            });
            out.afterControl = L.storedRelations(app, POSTED);
            await step('control-preprint-page', () => L.preprintNotices(page, app, POSTED));
        } else {
            // Neighbours: what the fix must leave alone.
            out.before = {posted: L.storedRelations(app, POSTED), other: L.storedRelations(app, OTHER)};
            await signIn(page, 'ckwantes');
            await step('nb1-author-title-abstract-read-only', async () => {
                const {frame} = await L.openTitleAbstract(page, app, POSTED, {author: true});
                const title = frame.dialog().locator('input[name="title-en"], input[name^="title"]').first();
                return {...(await L.readPage(frame)), titleBox: (await title.count()) ? {readonly: await title.getAttribute('readonly'), disabled: await title.isDisabled()} : null};
            });
            await signOut(page);
            await signIn(page, 'dbarnes');
            let o;
            await step('nb2-manager-save', async () => {
                o = await L.openTitleAbstract(page, app, OTHER);
                await L.openPanel(o.relations);
                return L.saveRelation(page, o.relations, NONE);
            });
            out.afterNb2 = L.storedRelations(app, OTHER);
            await step('nb3-manager-reload', () => L.readAfterReload(page, app, OTHER));
            // A recommend-only Moderator ("Permissions" left ticked) on submission 1
            await step('nb4-recommend-only', () => L.setRecommendOnly(page, app, UNPOSTED, 'Stephanie Berardo', 'Moderator', true));
            out.assignmentsAfterNb4 = G.storedAssignments(app, UNPOSTED);
            await signOut(page);
            await signIn(page, 'sberardo');
            await step('nb5-recommend-only-relations', async () => {
                o = await L.openTitleAbstract(page, app, UNPOSTED);
                const read = await L.readPage(o.frame);
                const offered = await o.relations.button().isVisible().catch(() => false);
                if (!offered) return {...read, relations: 'not offered'};
                await L.openPanel(o.relations);
                return {...read, relations: 'offered', ...(await L.saveRelation(page, o.relations, NONE))};
            });
            out.afterNb5 = L.storedRelations(app, UNPOSTED);
            await signOut(page);
            await signIn(page, 'dbuskins');
            await step('nb6-moderator-relations-offered', async () => {
                o = await L.openTitleAbstract(page, app, UNPOSTED);
                return {...(await L.readPage(o.frame)), relations: (await o.relations.button().isVisible().catch(() => false)) ? 'offered' : 'not offered'};
            });
        }
    } finally {
        out.dialogs = dialogs;
        record(`u75r1-${MODE}`, out);
        await close();
    }
});
