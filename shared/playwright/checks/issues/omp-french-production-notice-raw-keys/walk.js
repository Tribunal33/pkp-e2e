// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (its fix.diff), the part
// from spec U33 OMP3: in French (Canada) a press's Production stage keeps the notice box's
// French heading ("En attente d'approbation.", "Gestion du catalogue") over a raw code,
// "##notification.type.formatNeedsApprovedSubmission##" or "##notification.type.visitCatalog##".
// Takes that group of the report's Steps on PKP's default test dataset (OMP):
//   1-2. dbarnes signs in; the initials menu > "Change Language" > "français" (French (Canada))
//   3-4. book 4 "How Canadians Communicate …" (Production, not published) > "Production": the box
//   5.   book 14 "From Bricks to Brains …" (published) > "Production": the box
//   6-8. bbeaty (book 4's author) signs in, changes the language, opens book 4 from
//        "Mes soumissions" > "Production": the box
// Changes nothing. Only OMP has the box; on OJS and OPS the script does nothing.
// NB=1 runs the neighbour check alone: the same screens in English (no language change),
// which the fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-french-production-notice-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, record, shot, idle} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const L = require('./lib');

const UNPUBLISHED = {id: 4, author: 'bbeaty'};
const PUBLISHED = {id: 14};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const language = async (page, n) => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${n === 7 ? 'mySubmissions' : 'editorial'}`));
        await idle(page);
        if (nb) return;
        try {
            await changeLanguage(page, 'français', 'fr_CA');
            fact(`${n} language`, {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        } catch (e) {
            fact(`${n} language`, {error: L.flat(e.message, 400)});
        }
    };
    const {page, close} = await launch(app);
    try {
        // The editor: steps 1-5.
        await signIn(page, 'dbarnes');
        await language(page, 2);
        fact('4 editor book 4', await L.readProductionNotice(page, app, UNPUBLISHED.id, {lang, label: `${lang}-4-editor-4`}));
        await shot(page, `${lang}-4-editor-4`);
        fact('5 editor book 14', await L.readProductionNotice(page, app, PUBLISHED.id, {lang, label: `${lang}-5-editor-14`}));
        await shot(page, `${lang}-5-editor-14`);
        await signOut(page);
        // The author: steps 6-8.
        await signIn(page, UNPUBLISHED.author);
        await language(page, 7);
        fact('8 author book 4', await L.readProductionNotice(page, app, UNPUBLISHED.id, {lang, author: true, label: `${lang}-8-author-4`}));
        await shot(page, `${lang}-8-author-4`);
        await signOut(page).catch(() => {});
    } catch (e) {
        fact('error', L.flat(e.message, 600));
        await shot(page, `${lang}-error`).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
