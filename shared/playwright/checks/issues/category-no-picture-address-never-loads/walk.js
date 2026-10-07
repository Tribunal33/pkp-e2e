// Issue report U16 A22: a category's picture addresses, typed for a category with no picture. Takes the report's
// Steps on PKP's default test dataset (a dataset fleet), as `rvaca` (the manager):
//   1-5  Settings › Journal (Press, Server) › "Categories", "Applied Science" › "Edit", "Cover Image" a 400 × 400
//        PNG, "Save" (3.5: the older form, "OK"). On a freshly loaded dataset this is what creates the journal's
//        own public files folder (3.5: its private `categories/` folder), as any journal with a category picture
//        has it.
//   6    type the small picture's address of "Computer Science", which has no picture
//        (…/catalog/thumbnail?type=category&id=<id>, OPS …/preprints/…);
//   7    type its full-size address (…/fullSize?type=category&id=<id>).
//   Before step 1 it types step 6's address once on the fresh dataset (no folder yet), and after step 7 an unknown
//   id (999), the 404 control. OMP runs the same steps as the press control.
//   The OPS 3.5 dataset has neither category: "Social sciences" takes the picture and "History" is the one without.
// Neighbour mode (fix in and out), alone:
//   WALK=nb  steps 1-5, then "Social Sciences" gets the picture too (the folder exists by then, so its small copy
//            is written); its small and full-size addresses and Applied Science's full-size address must still
//            answer the picture, and id 999 the 404.
//
// Reset first:  npm run fleet-prep -- --feature issues-r4 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-r4 PROBE_AGENT=r4 node bin/probe.js all shared/playwright/checks/issues/category-no-picture-address-never-loads/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r4-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r4-3_5 PROBE_AGENT=r4 node bin/probe.js all shared/playwright/checks/issues/category-no-picture-address-never-loads/walk.js
const path = require('path');
const {forEachApp, launch, signIn, record, idle, sql, serverLog} = require('../../../probe');
const {setCategoryPicture, typeAddress} = require('./lib');

const MODE = process.env.WALK || 'walk';
const FILES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');
const PICTURE = path.join(FILES, 'profile-image-400.png'); // a real 400 × 400 PNG

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const line = app.line || 'main';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = `nopic-${MODE}${run}`;
    const facts = {app: app.name, line, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        const from = log.mark();
        try {
            const out = await action();
            const logged = log.since(from);
            fact(label, out === undefined ? 'done' : out);
            if (logged && logged.length) fact(`${label} server log`, logged.slice(0, 12));
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const word = app.name === 'ops' ? 'preprints' : 'catalog';
    const ctx = app.contextPath;
    const idOf = (p) => sql(app, `SELECT category_id FROM categories WHERE path = '${p}'`).trim();
    const has = (p) => !!idOf(p);
    const pic = has('applied-science') ? {name: 'Applied Science', path: 'applied-science'} : {name: 'Social sciences', path: 'social-sciences'};
    const nopic = has('comp-sci') ? {name: 'Computer Science', path: 'comp-sci'} : {name: 'History', path: 'history'};
    pic.id = idOf(pic.path);
    nopic.id = idOf(nopic.path);
    fact('categories', {picture: pic, noPicture: nopic, storedImage: sql(app, `SELECT category_id, setting_value FROM category_settings WHERE setting_name = 'image'`).trim() || 'none'});
    const addr = (kind, id) => app.url(`/index.php/${ctx}/${word}/${kind}?type=category&id=${id}`);

    try {
        if (MODE === 'walk') {
            await step(`0 fresh dataset: ${nopic.name}'s small picture address`, () => typeAddress(page, addr('thumbnail', nopic.id)));
        }
        await step('1 sign in as rvaca', async () => {
            await signIn(page, 'rvaca');
            return page.url();
        });
        await step(`2-5 ${pic.name}: Cover Image, Save`, () => setCategoryPicture(page, app, pic.name, PICTURE));
        fact('stored pictures', sql(app, `SELECT category_id, setting_value FROM category_settings WHERE setting_name = 'image'`).trim() || 'none');

        if (MODE === 'walk') {
            await step(`6 type ${nopic.name}'s small picture address`, () => typeAddress(page, addr('thumbnail', nopic.id)));
            await step(`7 type ${nopic.name}'s full-size address`, () => typeAddress(page, addr('fullSize', nopic.id)));
            await step('control: an unknown id (999)', () => typeAddress(page, addr('thumbnail', 999)));
        }

        if (MODE === 'nb') {
            // A top-level category (its row shows without opening a parent's), pictured once the folder exists.
            if (line === 'main' && has('social-sciences')) {
                await step('nb Social Sciences: Cover Image, Save', () => setCategoryPicture(page, app, 'Social Sciences', PICTURE));
                const soc = idOf('social-sciences');
                await step('nb Social Sciences small picture', () => typeAddress(page, addr('thumbnail', soc)));
                await step('nb Social Sciences full size', () => typeAddress(page, addr('fullSize', soc)));
            }
            await step(`nb ${pic.name} full size`, () => typeAddress(page, addr('fullSize', pic.id)));
            await step('nb unknown id (999)', () => typeAddress(page, addr('thumbnail', 999)));
        }
    } finally {
        record(name, facts);
        await close();
    }
});
