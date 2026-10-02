// Spec U46 OPS2 (docs/specs/U46-galleys.md#ops2): before posting, a Moderator whose assignment
// has "Permissions" unticked is offered the whole "Galleys" page, and "Edit", a new galley's
// "Save" and "Save Order" do not hold. Issue report:
// docs/issues/U46-OPS2-moderator-galleys-offered-then-refused.md.
//
// Starts from PKP's default test dataset (OPS), freshly loaded:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/moderator-galleys-offered-then-refused/walk.js
// MODE=nb walks the neighbours alone: the Author with "Permissions" unticked before posting and
// the Author of a posted preprint keep a read-only "View"; a Moderator with the box unticked on a
// posted preprint keeps the whole page.
const {forEachApp, launch, signIn, signOut, record, shot, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'steps';
const SUB = 1; // "The influence of lactation on the quantity and quality of cashmere production", Production, not posted
const PUB = 1;
const POSTED = 2; // "The Facets Of Job Satisfaction: …", posted
const REMOTE = 'u46w6 Remote';
const NEW = 'u46w6 HTML';

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // only a preprint server ties galleys to the "Permissions" box
    const out = {mode: MODE, line: app.line || 'main', steps: {}};
    const {page, close} = await launch(app);
    const dialogs = L.watchDialogs(page);
    const step = async (name, fn) => {
        try {
            out.steps[name] = await fn();
        } catch (e) {
            out.steps[name] = {error: L.flat(e.message, 400)};
            await shot(page, `${MODE}-fail-${name}`).catch(() => {});
        }
        record(`w6a-${MODE}`, out);
    };
    try {
        if (MODE === 'steps') {
            out.before = {galleys: L.storedGalleys(app, PUB), assignments: L.storedAssignments(app, SUB)};
            // Preconditions as dbarnes: a second galley, a saved order, dbuskins's box unticked.
            await signIn(page, 'dbarnes');
            await step('p1-remote-galley', async () => {
                const g = await L.openGalleys(page, app, SUB);
                const win = await g.openCreate();
                await win.type(win.labelBox(), REMOTE);
                await win.setRemote(true);
                await win.type(win.remoteUrlBox(), 'https://example.org/u46w6');
                await win.save();
                await g.cancelWizard();
                await idle(page);
                return {labels: await g.labels()};
            });
            await step('p2-order', async () => {
                const g = await L.openGalleys(page, app, SUB);
                await g.startOrdering();
                await g.arrange(['PDF', REMOTE]);
                const r = await g.saveOrder();
                return {status: r.status(), labels: await g.labels(), stored: L.storedGalleys(app, PUB)};
            });
            await step('p3-untick', () => L.setPermissions(page, app, SUB, 'David Buskins', 'Moderator', false));
            out.preconditions = {galleys: L.storedGalleys(app, PUB), assignments: L.storedAssignments(app, SUB)};
            await signOut(page);

            await signIn(page, 'dbuskins');
            let g;
            await step('5-offers', async () => {
                g = await L.openGalleys(page, app, SUB);
                await shot(page, 'steps-5-galleys');
                return await L.offers(g);
            });
            await step('6-edit', async () => {
                g = await L.openGalleys(page, app, SUB);
                const items = await g.menuOffers('PDF');
                if (!items.includes('Edit')) {
                    // the state a fix brings: a read-only "View" instead
                    if (!items.includes('View')) return {items, edit: 'not offered'};
                    const view = await g.openView('PDF');
                    const read = await L.readWindow(view);
                    await L.closeWindow(page, view.dialog());
                    return {items, edit: 'not offered', view: read};
                }
                const win = await g.openEdit('PDF');
                const read = await L.readWindow(win);
                await shot(page, 'steps-6-edit');
                await L.closeWindow(page, win.dialog());
                return read;
            });
            await step('7-add', async () => {
                g = await L.openGalleys(page, app, SUB);
                if (!(await g.addButton().isVisible().catch(() => false))) return {addGalley: 'not offered', labels: await g.labels()};
                const win = await g.openCreate();
                const opened = await L.readWindow(win);
                await win.type(win.labelBox(), NEW);
                const answered = page.waitForResponse((r) => r.url().includes('update-galley') && r.request().method() === 'POST', {timeout: L.T});
                await win.saveButton().click();
                const r = await answered;
                const body = L.flat(await r.text().catch(() => null), 300);
                await idle(page);
                await L.sleep(1500);
                await shot(page, 'steps-7-after-save');
                const stillOpen = await win.dialog().isVisible().catch(() => false);
                const after = stillOpen ? await L.readWindow(win) : {open: false};
                // the state a fix brings: the window closes and the upload window opens for the new galley's file
                const wizard = page.getByRole('dialog', {name: 'Upload a File Ready for Publication', exact: true});
                const wizardOpened = await wizard.isVisible().catch(() => false);
                let listAfterClose = null;
                if (stillOpen) {
                    await L.closeWindow(page, win.dialog());
                    listAfterClose = await g.labels().catch(() => null);
                } else if (wizardOpened) {
                    await g.cancelWizard().catch(() => {});
                }
                const g2 = await L.openGalleys(page, app, SUB);
                return {opened, save: {status: r.status(), body}, after, wizardOpened, listAfterClose, afterReload: await g2.labels(), stored: L.storedGalleys(app, PUB)};
            });
            await step('8-order', async () => {
                g = await L.openGalleys(page, app, SUB);
                const before = await g.labels();
                if (!(await g.orderButton().isVisible().catch(() => false))) return {order: 'not offered', labels: before};
                await g.startOrdering();
                await g.downArrow('PDF').click();
                await L.sleep(300);
                const moved = await g.labels();
                const r = await g.saveOrder();
                const body = L.flat(await r.text().catch(() => null), 300);
                await idle(page);
                await L.sleep(1000);
                const afterSave = await g.labels();
                const g2 = await L.openGalleys(page, app, SUB);
                return {before, moved, save: {status: r.status(), body}, afterSave, afterReload: await g2.labels(), stored: L.storedGalleys(app, PUB)};
            });
            await signOut(page);

            // Control: sberardo, whose box is ticked, on the same page.
            await signIn(page, 'sberardo');
            await step('control-sberardo-edit', async () => {
                const g3 = await L.openGalleys(page, app, SUB);
                const win = await g3.openEdit('PDF');
                const read = await L.readWindow(win);
                await win.cancel();
                return read;
            });
            await signOut(page);
        } else {
            // Neighbours: what the fix must leave alone (the Author's rights) and the posted case it keeps.
            await signIn(page, 'dbarnes');
            await step('nb0-untick-author', () => L.setPermissions(page, app, SUB, 'Carlo Corino', 'Author', false));
            await step('nb0-untick-posted-moderator', () => L.setPermissions(page, app, POSTED, 'David Buskins', 'Moderator', false));
            await signOut(page);
            const viewOnly = async (user, id) => {
                await signIn(page, user);
                const g = await L.openGalleys(page, app, id, {author: true});
                const o = await L.offers(g);
                let view = null;
                if ((o.rows.PDF || []).includes('View')) {
                    const win = await g.openView('PDF');
                    view = await L.readWindow(win);
                    await L.closeWindow(page, win.dialog());
                }
                await signOut(page);
                return {offers: o, view};
            };
            await step('nb1-author-unticked-unposted', () => viewOnly('ccorino', SUB));
            await step('nb2-author-posted', () => viewOnly('ckwantes', POSTED));
            await signIn(page, 'dbuskins');
            await step('nb3-moderator-unticked-posted', async () => {
                const g = await L.openGalleys(page, app, POSTED);
                const o = await L.offers(g);
                const win = await g.openEdit('PDF');
                const read = await L.readWindow(win);
                await win.cancel();
                return {offers: o, edit: read, assignments: L.storedAssignments(app, POSTED)};
            });
            await signOut(page);
        }
    } finally {
        out.dialogs = dialogs;
        record(`w6a-${MODE}`, out);
        await close();
    }
});
