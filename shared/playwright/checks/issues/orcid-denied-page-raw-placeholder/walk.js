// Issue reports U04 A2 (a contributor who presses "Deny" at ORCID lands on an "ORCID
// Authorization" page showing a raw placeholder) and U04 A8 (every failure on that page tells
// a press's or preprint server's contributor to contact "the journal manager").
// Steps: the reports' "Steps to reproduce". Runs on PKP's default test dataset (a dataset
// fleet, reset before each walk), as the dataset's own users. The kit builds nothing.
//
//   MODE=steps (default)  ORCID on as `rvaca` (Settings > Users & Roles > ORCID); as `dbarnes`,
//                         "Request verification" on the submission's contributor; from the
//                         contributor's email, the address ORCID's "Deny" returns the browser to
//                         (the link's redirect_uri plus error=access_denied); then the same
//                         address once more (a used link).
//   MODE=nb               the neighbour, signed out, on any state: the verify page typed bare,
//                         a denial carrying a token no contributor holds (must stay the generic
//                         "could not be verified" failure, not the denial text), and the
//                         "What is ORCID?" page. Changes nothing.
//
// Reset:  npm run fleet-prep -- --feature issues-u04r2 --dataset 2 --reset
// Run:    PROBE_FEATURE=issues-u04r2 PROBE_AGENT=u04r2 [MODE=nb] [PROBE_RUN=…] \
//           node bin/probe.js all shared/playwright/checks/issues/orcid-denied-page-raw-placeholder/walk.js
// 3.5:    PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-u04r2-3_5, PROBE_RUN=r35.
// Facts:  .reports/<feature>/u04r2/u04r2-<mode>-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, record, serverLog, sql} = require('../../../probe');
const {flat, DENIAL, openContributorEditor, requestVerification, readAuthorizationLink, openOnInstall, readVerifyPage} = require('./lib');
const {setOrcidMember} = require('../publish-without-issue-orcid-contributor-error/lib');

const MODE = process.env.MODE || 'steps';
// The dataset's submission and its first contributor, per app.
const SUBJECT = {
    ojs: {id: 8, name: 'Elinor Ostrom', email: 'eostrom@mailinator.com'},
    omp: {id: 3, name: 'Bob Barnetson', email: 'bbarnetson@mailinator.com'},
    ops: {id: 1, name: 'Carlo Corino', email: 'ccorino@mailinator.com'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: process.env.PROBE_RUN || null, dataset: app.dataset};
    const key = `u04r2-${MODE}-facts`;
    const fact = (k, v) => {
        facts[k] = v;
        record(key, facts);
        console.log(`[u04r2 ${app.name} ${MODE}] ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const part = async (name, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${name} error`, flat(e.message, 500));
        }
    };
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    try {
        if (MODE === 'nb') {
            await part('nb verify typed bare', async () => {
                const status = await openOnInstall(page, app, app.url(`/index.php/${app.contextPath}/orcid/verify`));
                fact('nb verify typed bare', {status, ...(await readVerifyPage(page, 'u04r2-nb-bare'))});
            });
            await part('nb denial with an unknown token', async () => {
                const status = await openOnInstall(page, app, app.url(`/index.php/${app.contextPath}/orcid/verify?token=u04r2nomatch&state=1&author_id=1&${DENIAL}`));
                fact('nb denial with an unknown token', {status, ...(await readVerifyPage(page, 'u04r2-nb-unknown'))});
            });
            await part('nb about page', async () => {
                const status = await openOnInstall(page, app, app.url(`/index.php/${app.contextPath}/orcid/about`));
                fact('nb about page', {status, heading: flat(await page.locator('h1, h2').first().innerText().catch(() => null), 120)});
            });
            fact('serverLog', log.since(from).map((l) => flat(l, 400)));
            return;
        }

        const who = SUBJECT[app.name];
        // Steps 1-4: ORCID on, as the context's manager.
        await part('S1-4 ORCID settings', async () => {
            await signIn(page, 'rvaca');
            const s = await setOrcidMember(page, app, {}, {prefix: 'u04r2-'});
            fact('S1-4 ORCID settings', {apiChoice: s.apiChoice, save: s.save, savedStatus: s.savedStatus, stored: s.stored});
            await signOut(page);
        });
        // Steps 5-7: "Request verification" on the contributor, as the editor.
        const since = new Date();
        await part('S5-7 request verification', async () => {
            await signIn(page, 'dbarnes');
            const modal = await openContributorEditor(page, app, who.id, who.name);
            fact('S5-7 request verification', await requestVerification(page, modal));
        });
        // Step 8: the contributor's email and its authorization link.
        let link = null;
        await part('S8 email', async () => {
            link = await readAuthorizationLink(page, app, who.email, since);
            fact('S8 email', link);
            fact('S8 stored token', sql(app, `select a.author_id, s.setting_name, s.setting_value from authors a join author_settings s on s.author_id=a.author_id join submissions sub on sub.current_publication_id=a.publication_id where sub.submission_id=${who.id} and a.email='${who.email}' and s.setting_name like 'orcid%' order by 2`).split('\n'));
        });
        await signOut(page).catch(() => {});
        if (!link || !link.redirectUri) {
            fact('stopped', 'no authorization link in the contributor\'s email');
            return;
        }
        // Steps 8-9: the address ORCID's "Deny" returns the browser to (signed out, as the contributor).
        const denied = `${link.redirectUri}&${DENIAL}`;
        await part('S9 denial landing', async () => {
            const status = await openOnInstall(page, app, denied);
            fact('S9 denial landing', {address: denied.replace(/^https?:\/\/[^/]+/, ''), status, ...(await readVerifyPage(page, 'u04r2-s9-denied'))});
            fact('S9 stored after denial', sql(app, `select s.setting_name, s.setting_value from authors a join author_settings s on s.author_id=a.author_id join submissions sub on sub.current_publication_id=a.publication_id where sub.submission_id=${who.id} and a.email='${who.email}' and s.setting_name like 'orcid%' order by 1`).split('\n'));
        });
        // Steps 10-11: the same address once more (the link used).
        await part('S11 used link', async () => {
            const status = await openOnInstall(page, app, denied);
            fact('S11 used link', {status, ...(await readVerifyPage(page, 'u04r2-s11-used'))});
        });
        fact('serverLog', log.since(from).map((l) => flat(l, 400)));
    } finally {
        await close();
    }
});
