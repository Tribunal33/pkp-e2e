// Issue report docs/issues/U40-A21-author-new-version-changes-published-funders.md (U40 A21):
// an Author allowed to edit a new version of a published item adds a funder on that version's
// "Funding" page, and the published version's reader page lists it at once.
// Takes the report's Steps on PKP's default test dataset:
//   OJS submission 1 (amwandenga; version 1.1 already there, permission already on),
//   OMP submission 14 (dbarnes: "Create New Version", then Production › Participants ›
//   "Michael Dawson" › "Edit", the metadata permission ticked, "OK"),
//   OPS submission 2 (dbarnes: "Create New Version"; ckwantes has the permission);
//   then as the author: the published version's "Funding" page (control), the new version's,
//   "Add Funder" › "Funder sxx7" › "Save"; signed out, the reader page.
// Modes (first argument):
//   steps (default)  the Steps above.
//   nb               what a fix must leave alone, on the state `steps` left (no reset): as the
//                    author, the new version's "Title & Abstract" (still editable, "Save" enabled);
//                    as dbarnes, the new version's "Funding" › "Add Funder" › "Funder sxx7 editor"
//                    › "Save" (editors still change funders), then the reader page.
//   server           (OJS) the fix's server half, which no screen reaches once "Add Funder" is
//                    disabled: the "Add Funder" request sent from the signed-in page, as the
//                    author (refused with the fix) and as dbarnes (permitted). Saves a funder
//                    without the fix.
// stable-3_5_0 (PKP_E2E_LINE): no funders list at all; the author's and the editor's Publication
//   tabs are recorded (their tab names) for the Affects read.
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:          PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=fix|nb-in|nb-out] node bin/probe.js all shared/playwright/checks/issues/author-new-version-changes-published-funders/walk.js [steps|nb]
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {sleep, flat, frame, stored, openFunding, fundingState, addFunder, readerFunding} = require('./lib');
const {createNewVersion} = require('../older-version-tab-current-title/lib');
const {openStage, setParticipantPermission} = require('../change-language-offered-then-refused/lib');

const MODE = process.argv[2] || 'steps';
const RUN = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
const SUB = {ojs: 1, omp: 14, ops: 2};
const AUTHOR = {ojs: 'amwandenga', omp: 'mdawson', ops: 'ckwantes'};
const READER = {ojs: 'article/view', omp: 'catalog/book', ops: 'preprint/view'};
const FUNDER = 'Funder sxx7';

async function step(facts, name, fn) {
    try {
        facts[name] = await fn();
    } catch (e) {
        facts[name] = {error: flat(String(e.message).split('\n')[0], 300)};
    }
    console.log(`[fact] ${facts.app} ${name}: ${flat(JSON.stringify(facts[name]), 1500)}`);
    return facts[name];
}

async function visitor(app, facts, name, address) {
    const {page, close} = await launch(app);
    try {
        await step(facts, name, () => readerFunding(page, app, address));
        record(`a21f-${MODE}-${name}`, await screen(page));
    } finally {
        await close();
    }
}

/** stable-3_5_0: the workflow's Publication menu entries as the author and as dbarnes, and the shown page's Save. */
async function line35(app, facts, sid) {
    for (const who of [AUTHOR[app.name], 'dbarnes']) {
        const {page, close} = await launch(app);
        try {
            await signIn(page, who);
            const wf = frame(page, app);
            if (who === 'dbarnes') await wf.gotoEditorial(sid);
            else await wf.gotoAuthor(sid);
            await idle(page).catch(() => {});
            await wf.revealPublicationEntry('Title & Abstract').catch(() => {});
            await sleep(1200);
            const save = wf.dialog().getByRole('button', {name: 'Save', exact: true}).first();
            await step(facts, `r35-${who}`, async () => ({
                url: page.url().replace(/^https?:\/\/[^/]+/, ''),
                menu: (await wf.menuEntries().catch(() => [])).map((e) => e.label),
                titleAbstractSave: (await save.count()) ? {enabled: await save.isEnabled()} : {shown: false},
                fundingAnywhere: /\bFunding\b|\bFunders?\b/.test(await page.locator('body').innerText()),
            }));
            record(`a21f-r35-${who}`, await screen(page));
        } finally {
            await close();
        }
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const sid = SUB[app.name];
    const author = AUTHOR[app.name];
    const reader = `/index.php/${app.contextPath}/${READER[app.name]}/${sid}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null, submission: sid};

    if (app.line && app.line !== 'main') {
        await line35(app, facts, sid);
        record(`a21f-facts-${app.line}`, facts);
        return;
    }

    facts.before = stored(app, sid);
    const published = facts.before.publications.find((p) => p.status === 3);

    if (MODE === 'steps') {
        // Preconditions (OMP, OPS): dbarnes creates the new version; OMP: the permission ticked.
        if (app.name !== 'ojs') {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                const wf = frame(page, app);
                await wf.gotoEditorial(sid);
                await idle(page).catch(() => {});
                await sleep(1200);
                await step(facts, 'pre-createVersion', () => createNewVersion(page, app));
                if (app.name === 'omp') {
                    await step(facts, 'pre-permission', async () => {
                        await openStage(page, 'Production');
                        return setParticipantPermission(page, 'Michael Dawson', true);
                    });
                }
                record(`a21f-steps-pre`, await screen(page));
                await signOut(page).catch(() => {});
            } finally {
                await close();
            }
        }
        facts.afterPre = stored(app, sid);
        const latest = facts.afterPre.publications[facts.afterPre.publications.length - 1];
        facts.publishedId = published && published.id;
        facts.newId = latest.id;

        const {page, close} = await launch(app);
        try {
            // 1. The author signs in and opens the submission.
            await signIn(page, author);
            // 2. The published version's "Funding" page (control).
            let wf = await openFunding(page, app, sid, published.id, {author: true});
            await step(facts, 'step2-published-funding', () => fundingState(page, wf));
            record(`a21f-steps-2-published`, await screen(page));
            // 3. The new version's "Funding" page.
            wf = await openFunding(page, app, sid, latest.id, {author: true});
            await step(facts, 'step3-new-funding', () => fundingState(page, wf));
            record(`a21f-steps-3-new`, await screen(page));
            // 4. "Add Funder", "Funder sxx7", "Save" (when offered).
            if (facts['step3-new-funding'].addFunder && facts['step3-new-funding'].addFunder.enabled) {
                await step(facts, 'step4-add', () => addFunder(page, wf, FUNDER));
                await step(facts, 'step4-after', () => fundingState(page, wf));
                record(`a21f-steps-4-added`, await screen(page));
            } else {
                facts['step4-add'] = {offered: false};
                console.log(`[fact] ${app.name} step4-add: not offered`);
            }
            await signOut(page).catch(() => {});
        } finally {
            await close();
        }
        facts.afterAdd = stored(app, sid);
        // 5. Signed out: the published item's reader page.
        await visitor(app, facts, 'step5-reader', reader);
        record(`a21f-steps-facts`, facts);
        return;
    }

    if (MODE === 'server') {
        // The fix's server half, which no screen reaches once "Add Funder" is disabled: the request
        // the "Add Funder" window sends, sent from the signed-in page itself (its CSRF token), as the
        // author and then as dbarnes (who must stay permitted). OJS submission 1 only.
        if (app.name !== 'ojs') return;
        const latestId = facts.before.publications[facts.before.publications.length - 1].id;
        for (const who of [author, 'dbarnes']) {
            const {page, close} = await launch(app);
            try {
                await signIn(page, who);
                const wf = await openFunding(page, app, sid, latestId, {author: who === author});
                await step(facts, `srv-${who}-page`, () => fundingState(page, wf));
                const api = app.url(`/index.php/${app.contextPath}/api/v1/submissions/${sid}/publications/${latestId}/funders`);
                await step(facts, `srv-${who}-post`, () => page.evaluate(async ([url, name]) => {
                    const r = await fetch(url, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json', 'X-Csrf-Token': pkp.currentUser.csrfToken},
                        body: JSON.stringify({funder: {name: {en: name}}, grants: []}),
                    });
                    return {status: r.status, body: (await r.text()).slice(0, 300)};
                }, [api, `${FUNDER} direct ${who}`]));
            } finally {
                await close();
            }
        }
        facts.afterServer = stored(app, sid);
        record('a21f-server-facts', facts);
        return;
    }

    // MODE nb, on the state the steps left.
    const latest = facts.before.publications[facts.before.publications.length - 1];
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, author);
            const wf = frame(page, app);
            await wf.gotoAuthor(sid, {menuKey: `publication_${latest.id}_titleAbstract`});
            await idle(page).catch(() => {});
            const save = wf.dialog().getByRole('button', {name: 'Save', exact: true}).first();
            await save.waitFor({timeout: 30_000}).catch(() => {});
            await sleep(1000);
            await step(facts, 'nb1-author-title-abstract', async () => ({
                heading: flat(await wf.heading().innerText().catch(() => null), 120),
                save: (await save.count()) ? {enabled: await save.isEnabled()} : {shown: false},
            }));
            record(`a21f-nb-1-author-title`, await screen(page));
        } finally {
            await close();
        }
    }
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            const wf = await openFunding(page, app, sid, latest.id, {author: false});
            await step(facts, 'nb2-editor-new-funding', () => fundingState(page, wf));
            if (facts['nb2-editor-new-funding'].addFunder && facts['nb2-editor-new-funding'].addFunder.enabled) {
                await step(facts, 'nb2-editor-add', () => addFunder(page, wf, `${FUNDER} editor`));
                await step(facts, 'nb2-editor-after', () => fundingState(page, wf));
            }
            record(`a21f-nb-2-editor`, await screen(page));
        } finally {
            await close();
        }
    }
    facts.afterNb = stored(app, sid);
    await visitor(app, facts, 'nb3-reader', reader);
    record(`a21f-nb-facts`, facts);
});
