// Issue report docs/issues/U26-OJS1-author-read-review-no-text.md (U26
// OJS1): the report's Steps to reproduce, walked through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset
// fleets"), `publicknowledge`, as the dataset's own users. The kit builds
// nothing. A preprint server has no review: OPS is not walked.
//
// MODE=walk (default), OJS submission 10 (Aisla McCrae) / OMP submission 16
// (Adela Gallego), the press being the control:
//   1 `dbarnes` opens the submission; 2 the reviewer's row › "More Actions"
//   › "Edit": review type "Open", "OK"; 3 sign in as the author (`jnovak` /
//   `mpower`), My Submissions › "View"; 4 "Read Review" on the reviewer's
//   row: the window's review part is read (name, completion, recommendation,
//   review text). The window's files section is not read.
// MODE=redrive, OJS only (the register footnote's own path, a review typed
//   on screen): submission 12 "Sodium butyrate improves growth performance
//   …": 1 `phudson` accepts the review request, types "u26w3 shared
//   remark" for author and editor and "u26w3 editor-only remark" for the
//   editor, recommends "Accept Submission", "Submit Review"; 2 `dbarnes`:
//   Paul Hudson's row › "Edit": "Open", "OK"; 3 `lchristopher`, My
//   Submissions › "View"; 4 "Read Review" on Paul Hudson's row.
// MODE=nb, the neighbour alone (walked with a fix in and out), OJS and OMP:
//   the same steps on the other completed review of the same round (OJS
//   Adela Gallego, OMP submission 11 "Dreamwork" Gonzalo Favio), after the
//   editor's own "Read Review" window has been read for the reviewer's
//   comments, so the author's window can be compared with what is shared.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/author-read-review-no-text/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/ojs1-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const R = require('../emptied-review-text-kept-after-save/lib.js');
const REDRIVE = {ojs: {id: 12, title: 'Sodium butyrate improves growth performance of weaned piglets during the first period after weaning', author: 'lchristopher', reviewer: 'Paul Hudson', reviewerUser: 'phudson', comment: 'u26w3 shared remark', private: 'u26w3 editor-only remark'}};

forEachApp(async (app) => {
    const c = MODE === 'nb' ? L.NEIGHBOUR[app.name] : MODE === 'redrive' ? REDRIVE[app.name] : L.CASES[app.name];
    if (!c) { console.log(`[ojs1 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE, submission: c.id, reviewer: c.reviewer};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {error: L.flat(e.message, 600)}; }
    };
    try {
        if (c.reviewerUser) {
            await signIn(page, c.reviewerUser);
            await step('r1', async () => {
                const open = await R.openStep3(page, app, c.id, {accept: true});
                await R.typeBoxes(page, app, {author: c.comment, editor: c.private});
                return {open, submit: await R.submitReview(page, app, 'Accept Submission')};
            });
            await signOut(page);
        }
        await signIn(page, 'dbarnes');
        await step('s1', async () => { await L.openEditorial(page, app, c.id); return {row: L.flat(await L.reviewerRow(page, c.reviewer).innerText(), 300)}; });
        await step('s2', () => L.setReviewType(page, c.reviewer, 'Open'));
        await step('s2row', async () => L.flat(await L.reviewerRow(page, c.reviewer).innerText(), 300));
        await signOut(page);
        await signIn(page, c.author);
        await step('s3', async () => { await L.openAsAuthor(page, app, c); const s = await screen(page); return {dialog: L.flat(s.text.dialog, 2500)}; });
        await step('s4', async () => {
            const {out, win, part} = await L.authorReadReview(page, c);
            if (part) await part.screenshot({path: require('../../../probe').outFile(`ojs1-${MODE}-window`) + '.png'}).catch(() => {});
            if (win) await L.closeWindow(page, win);
            if (c.private) out.privateShown = (out.reviewPartText || '').includes(c.private);
            return out;
        });
    } finally {
        record(`ojs1-${MODE}`, o);
        await close();
    }
});
