// U75 A3: saving another relation status keeps the DOI of the published version
// (docs/issues/U75-A3-relation-change-keeps-published-version-doi.md).
// Walks the report's Steps on OPS (the only app with preprint relations), on a fleet loaded from
// PKP's default test dataset: `dbarnes` on submission 2 (posted), through "Relations".
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/relation-change-keeps-published-version-doi/walk.js
//   MODE=nb …   the neighbour check alone: "published elsewhere" with a DOI saved, then "Title & Abstract"
//               saved; the relation and its DOI must stay (the path a fix must leave alone).
//   MODE=wizard …  the wizard steps: `ccorino` starts a submission, on "For Readers" ticks "published
//               elsewhere", types the DOI, ticks "not published elsewhere" and submits; then `dbarnes`
//               opens the new submission's "Relations" and ticks "published elsewhere" again.
//
// No assertions: the script records each screen and the browser's own save traffic; the report reads them.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const {T, flat, sleep, openPublication, relationsButton, relationsPanel, openRelations, readRelations,
    tickStatus, typeDoi, saveRelations, readerNotice} = require('./lib');

const MODE = process.env.MODE || 'walk';
const SID = 2;
const DOI = 'https://doi.org/10.1234/u75r2';
const PUBLISHED = 'This preprint has been published elsewhere.';
const NONE = 'This preprint has not been published elsewhere.';
const UNKNOWN = "This preprint's relations have not been entered.";

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // OJS and OMP have no preprint relations
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; record(`a3-${MODE}-facts`, facts); console.log('[a3]', k, JSON.stringify(v).slice(0, 400)); };
    const snap = async (name, extra = {}) => {
        const sc = await screen(page);
        record(`a3-${MODE}-${name}`, {...sc, ...extra});
        await shot(page, `a3-${MODE}-${name}`).catch(() => {});
        return sc;
    };
    const preprintPage = app.url(`/index.php/${app.contextPath}/en/preprint/view/${SID}`);
    try {
        if (MODE === 'wizard') {
            const A8 = require('../preprint-submits-without-required-relation-status/lib.js');
            const W = require('../wizard-refused-save-hangs-saving/lib.js');
            const D = require('../double-submit-empty-problems-banner/lib.js');
            const S = require('../section-editors-not-assigned-second-journal/lib.js');
            const W2 = require(require('path').join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
            const saves = [];
            page.on('request', (r) => {
                if (r.method() !== 'GET' && /\/api\/v1\/submissions\/\d+\/publications\/\d+$/.test(r.url().split('?')[0])) {
                    const body = r.postData() || '';
                    if (/relationStatus/.test(body)) saves.push(flat(decodeURIComponent(body.replace(/\+/g, ' ')), 300));
                }
            });
            // W1–W2: start a submission as the author
            await signIn(page, 'ccorino');
            const id = await A8.beginSubmission(page, app, {title: 'u75r2 wizard relation', section: 'Preprints'});
            fact('wizardId', id);
            // W3–W4: through the steps; on "For Readers" published + DOI, then "not published elsewhere"
            const done = new Set();
            for (let i = 0; i < 10; i++) {
                const step = (await W.currentStep(page)).replace(/^\d+\s*/, '');
                if (/(^|\s)Review$/.test(step)) break;
                if (!done.has(step)) {
                    done.add(step);
                    if (step === 'Upload Files') await W2.addGalleyFile(page, {label: 'PDF'});
                    else if (step === 'Details') await S.typeAbstract(page, 'An abstract for the u75r2 walk.');
                    else if (step === 'For Readers') {
                        await page.getByRole('radio', {name: PUBLISHED, exact: true}).check();
                        await sleep(300);
                        const box = page.locator('input[name="vorDoi"]').first();
                        await box.fill(DOI).catch(() => {});
                        fact('wizardTyped', {value: await box.inputValue().catch(() => null)});
                        await page.getByRole('radio', {name: NONE, exact: true}).check();
                        await sleep(300);
                        fact('wizardBoxAfterNone', {shown: await box.isVisible().catch(() => false)});
                        await snap('w4-for-readers');
                    }
                }
                await W.pressContinue(page);
                await idle(page);
                await sleep(500);
            }
            await D.reviewChecked(page);
            fact('wizardReview', await A8.readReviewRelation(page).then((r) => ({panel: r.panel, line: r.line})).catch((e) => ({error: flat(e.message)})));
            await snap('w5-review');
            fact('wizardSaves', saves);
            fact('wizardSubmit', await A8.submitIfOffered(page).then((r) => ({pressed: r.pressed, complete: r.complete})).catch((e) => ({error: flat(e.message)})));
            await snap('w5-submitted');
            // W6: the editor's "Relations" on the new submission
            await signOut(page);
            await signIn(page, 'dbarnes');
            await openPublication(page, app, id);
            await openRelations(page);
            fact('wizardRelations', await readRelations(page));
            await tickStatus(page, PUBLISHED);
            await sleep(300);
            fact('wizardRelationsPublished', await readRelations(page));
            await snap('w6-relations-published-ticked');
            return;
        }

        // 1–2
        await signIn(page, 'dbarnes');
        await openPublication(page, app, SID);
        fact('relationsOffered', await relationsButton(page).count());

        // 3: "published elsewhere" with the DOI
        await openRelations(page);
        fact('start', await readRelations(page));
        await tickStatus(page, PUBLISHED);
        fact('typed', await typeDoi(page, DOI));
        fact('save1', await saveRelations(page));
        await snap('03-published-saved');

        // 4: the preprint page
        fact('reader1', await readerNotice(page, preprintPage));
        await snap('04-preprint-page');

        if (MODE === 'nb') {
            // Neighbour: "Title & Abstract" saved with the relation untouched.
            await openPublication(page, app, SID);
            const save = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Save', exact: true}).first();
            await save.waitFor({state: 'visible', timeout: T}).catch(() => {});
            const w = page.waitForResponse((r) => /\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
            await save.click({timeout: 5000}).catch(() => {});
            const resp = await w;
            const body = resp ? await resp.json().catch(() => null) : null;
            fact('titleAbstractSave', {status: resp && resp.status(), sent: resp && flat(resp.request().postData(), 300), relationStatus: body && body.relationStatus, vorDoi: body && body.vorDoi});
            await idle(page);
            await snap('nb-title-abstract-saved');
            await openPublication(page, app, SID);
            await openRelations(page);
            fact('nbAfterReload', await readRelations(page));
            await snap('nb-relations-after-reload');
            fact('nbReader', await readerNotice(page, preprintPage));
            await snap('nb-preprint-page');
            return;
        }

        // 5: "not published elsewhere"
        await openPublication(page, app, SID);
        await openRelations(page);
        await tickStatus(page, NONE);
        fact('afterTickNone', await readRelations(page));
        fact('save2', await saveRelations(page));
        await snap('05-none-saved');

        // 6: the preprint page
        fact('reader2', await readerNotice(page, preprintPage));
        await snap('06-preprint-page');

        // 7: reload, "published elsewhere" ticked again
        await openPublication(page, app, SID);
        await openRelations(page);
        fact('reloadNone', await readRelations(page));
        await tickStatus(page, PUBLISHED);
        await sleep(300);
        fact('step7', await readRelations(page));
        await snap('07-published-ticked-again');

        // 8: "not entered" (not offered on 3.5, whose panel has two choices)
        if (!(await tickStatus(page, UNKNOWN))) {
            fact('step8', {offered: false, panel: await readRelations(page)});
            return;
        }
        fact('save3', await saveRelations(page));
        await snap('08-unknown-saved');

        // 9: reload, "published elsewhere" ticked again
        await openPublication(page, app, SID);
        await openRelations(page);
        fact('reloadUnknown', await readRelations(page));
        await tickStatus(page, PUBLISHED);
        await sleep(300);
        fact('step9', await readRelations(page));
        await snap('09-published-ticked-again');
        fact('reader3', await readerNotice(page, preprintPage));
    } catch (e) {
        fact('error', String(e && e.stack || e).slice(0, 800));
        await snap('error').catch(() => {});
    } finally {
        await close();
    }
});
