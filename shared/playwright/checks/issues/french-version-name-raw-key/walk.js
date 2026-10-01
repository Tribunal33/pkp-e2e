// Issue report docs/issues/U13-A1-french-version-name-raw-key.md (U13 A1):
// on a page shown in French the "Versions" list (and a preprint's label
// line) names every version "##publication.versionStage.display##".
// Steps, on PKP's default test dataset, signed out:
//   1. Open the home page in French, /index.php/publicknowledge/fr_CA
//      (the dataset shows no language menu).
//   2. Open the item: OJS "Signalling Theory Dividends" (submission 1),
//      OPS "Computer Skill Requirements …" (preprint 3, two versions),
//      OMP "Bomb Canada …" (book 5, through the catalogue).
//   3. Read the "Versions" list (OPS: and the line above the title).
// Control and neighbour check (fix in and out): the same pages in English.
// Reach read: dbarnes opens the same submission's workflow in French and
// the script reads the version names the page was given.
// The walk changes nothing in the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-version-name-raw-key/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');

const T = 15_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
const TARGET = {
    ojs: {id: 1, title: 'Signalling Theory Dividends', direct: 'article/view/1'},
    ops: {id: 3, title: 'Computer Skill Requirements for New and Existing Teachers', direct: 'preprint/view/3'},
    omp: {id: 5, title: 'Bomb Canada and Other Unkind Remarks', direct: 'catalog/book/5', list: 'catalog'},
};

forEachApp(async (app) => {
    const target = TARGET[app.name];
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (PKP default test dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };

    const {page, close} = await launch(app);
    try {
        for (const lang of ['fr_CA', 'en']) {
            // 1. The home page at the language's own address
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}`));
            await idle(page);
            record(`${lang}-1-home`, await screen(page));
            // 2. The item, from the home page's list (the catalogue on a press)
            let link = page.getByRole('link', {name: new RegExp(target.title)}).first();
            let via = 'home';
            if (!(await link.count()) && target.list) {
                await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/${target.list}`));
                await idle(page);
                link = page.getByRole('link', {name: new RegExp(target.title)}).first();
                via = target.list;
            }
            if (await link.count()) {
                await link.click();
            } else {
                via = 'address';
                await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/${target.direct}`));
            }
            await idle(page);
            record(`${lang}-2-item`, await screen(page));
            // 3. The "Versions" list, and a preprint's label line
            const versions = page.locator('.versions').last();
            await versions.waitFor({timeout: T}).catch(() => {});
            const labelLine = page.locator('.preprint_version');
            fact(`${lang} item`, {
                via, url: rel(page.url()), htmlLang: await page.getAttribute('html', 'lang'),
                versionsHeading: (await versions.count()) ? flat(await versions.locator('.label').first().innerText()) : null,
                versions: (await versions.count()) ? (await versions.locator('li').allInnerTexts()).map((t) => flat(t)) : null,
                labelLine: (await labelLine.count()) ? flat(await page.locator('.preprint_label, .preprint_label + .separator, .preprint_version').allInnerTexts().then((a) => a.join(' '))) : null,
                rawKeys: (await rawKeys(page)).map((k) => k.key || k).filter((k, i, a) => a.indexOf(k) === i),
            });
        }

        // Reach: the editor's workflow in French, the version names the API hands the page
        await signIn(page, 'dbarnes');
        const seen = [];
        page.on('response', async (r) => {
            if (new RegExp(`/submissions/${target.id}(\\?|$)`).test(r.url()) && r.request().method() === 'GET') {
                const j = await r.json().catch(() => null);
                for (const p of j?.publications || []) seen.push(p.versionString);
            }
        });
        await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/dashboard/editorial?workflowSubmissionId=${target.id}`));
        await idle(page);
        const s = await screen(page);
        record('fr_CA-workflow', s);
        const text = `${s.text?.dialog || ''} ${s.text?.main || ''}`;
        fact('fr_CA workflow', {url: rel(page.url()), versionStrings: seen.filter((v, i, a) => a.indexOf(v) === i),
            onScreen: [...new Set(text.match(/##publication\.versionStage[^#]*##( \d+\.\d+)?/g) || [])]});
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
