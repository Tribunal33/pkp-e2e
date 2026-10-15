// U15 claim check Y1: the upstream-sync accommodation of pkp/ojs#5832, pkp/omp#2464, pkp/ops#1422
// (pkp/pkp-lib#13307, merged 2026-10-14): the Search page's box label shown and its placeholder
// removed (OJS, OPS), the date filters' "Year", "Month", "Day" labels shown (default theme
// search.less), OMP's Search page form and OPS's archive header form with a visible label in place
// of their aria-label. Spec lines 64-70 (Fields), 291-299 (Rule 17), footnotes b and p.
//
// One run, per app:
//   1. seeds a scratch context (tag u15y1…) with two published items carrying one unique word
//      (published 2024-03-05 and 2026-02-10) and drains the queue so the index holds them;
//   2. as a visitor: the scratch context's Search page (empty, with the word, reloaded, a word that
//      finds nothing), publicknowledge's Search page, the site-wide Search page, the fr_CA Search
//      page; on OPS the home and Preprints pages' archive header, submitted with the word; on OJS
//      and OMP the home page as the control (no archive header); every page's label facts: the
//      label's text, whether it is on screen (box size, clip, visibility), the box's placeholder,
//      aria-label and the name a screen reader gives it, ids on the page;
//   3. signed in as reader.rosa and manager.maya on publicknowledge, the same pages;
//   4. OPS only: the scratch server's manager sets "Posting Mode" to the does-not-post choice on
//      Settings › Distribution, saves, reloads, and the home page is read again.
//   5. PHASE=filters (OJS, OPS; a press has no filters): a second scratch context with items published
//      2024-03-05, 2026-02-10, 2026-03-01 and a never-published one dated 2021-06-15; a visitor searches
//      with an empty box under each date choice (whole dates on both sides of a day, a Year alone, a
//      Year and Month, a Month alone, a Day alone, 30 February) and reads the results and the selects;
//      on OJS a third scratch journal with 26 published items drives "By Journal" on the site-wide page
//      (first page, the page links, page 2, a second search).
// PHASE=labels (default) runs 1-4, PHASE=filters runs 5, PHASE=all both.
// Run:  PROBE_FEATURE=U15 PROBE_AGENT=ccY1 PROBE_RUN=r1 node bin/probe.js all shared/playwright/checks/U15/Y1/y1.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, drainJobs, rawKeys, sql, tag} =
    require('../../../probe');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Everything about the page's query box(es), its label and the date selects' labels, read in the browser. */
async function labelFacts(page) {
    return page.evaluate(() => {
        const onScreen = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            let hiddenBy = null;
            for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
                const cs = getComputedStyle(n);
                if (cs.display === 'none') { hiddenBy = `display:none on ${n.tagName.toLowerCase()}.${n.className}`; break; }
                if (cs.visibility === 'hidden') { hiddenBy = `visibility:hidden on ${n.tagName.toLowerCase()}`; break; }
                if (cs.clip && cs.clip !== 'auto' && /rect\(\s*0/.test(cs.clip)) { hiddenBy = `clip ${cs.clip} on ${n.tagName.toLowerCase()}.${n.className}`; break; }
                if (cs.clipPath && cs.clipPath !== 'none' && /inset\((50|100)%/.test(cs.clipPath)) { hiddenBy = `clip-path ${cs.clipPath} on ${n.tagName.toLowerCase()}.${n.className}`; break; }
                if (cs.opacity === '0') { hiddenBy = `opacity 0 on ${n.tagName.toLowerCase()}`; break; }
            }
            const cs = getComputedStyle(el);
            return {
                rect: {x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height)},
                fontSize: cs.fontSize, color: cs.color, display: cs.display,
                onScreen: !hiddenBy && r.width > 1 && r.height > 1,
                hiddenBy,
                classes: el.className || null,
            };
        };
        const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
        const boxes = [...document.querySelectorAll('input[name="query"]')].map((input) => {
            const form = input.closest('form');
            return {
                id: input.id || null,
                type: input.type,
                value: input.value,
                placeholder: input.getAttribute('placeholder'),
                ariaLabel: input.getAttribute('aria-label'),
                labels: [...(input.labels || [])].map((l) => ({text: txt(l), ...onScreen(l)})),
                box: onScreen(input),
                form: form ? {
                    classes: form.className, role: form.getAttribute('role'), ariaLabel: form.getAttribute('aria-label'),
                    action: form.getAttribute('action'), rect: onScreen(form).rect,
                    controls: [...form.querySelectorAll('input:not([type=hidden]), select, button')].map((c) => `${c.tagName.toLowerCase()}[name=${c.name || ''}]${c.tagName === 'BUTTON' ? ` "${txt(c)}"` : ''}`),
                } : null,
            };
        });
        const ids = {};
        for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
        const dupIds = Object.fromEntries(Object.entries(ids).filter(([, n]) => n > 1));
        const labelsForQuery = [...document.querySelectorAll('label[for="query"]')].map((l) => ({text: txt(l), ...onScreen(l)}));
        const dateSelects = [...document.querySelectorAll('.date_range select, select[name^="date"]')].map((s) => {
            const l = s.labels && s.labels[0];
            return {
                name: s.name, id: s.id,
                label: l ? {text: txt(l), ...onScreen(l)} : null,
                select: onScreen(s),
                first: s.options[0] ? s.options[0].text.trim() : null,
                options: s.options.length,
                optionTexts: [...s.options].slice(0, 4).map((o) => o.text.trim()).concat(s.options.length > 4 ? [`… ${s.options[s.options.length - 1].text.trim()}`] : []),
            };
        });
        const legends = [...document.querySelectorAll('.page_search legend')].map((l) => ({text: txt(l), ...onScreen(l)}));
        const ctxSel = document.querySelector('select#searchContext');
        const contexts = ctxSel ? {
            label: ctxSel.labels && ctxSel.labels[0] ? {text: txt(ctxSel.labels[0]), ...onScreen(ctxSel.labels[0])} : null,
            options: [...ctxSel.options].map((o) => o.text.trim()).slice(0, 6), count: ctxSel.options.length,
        } : null;
        const archive = document.querySelector('.archiveHeader');
        const archiveLayout = archive ? {
            header: onScreen(archive).rect,
            search: onScreen(archive.querySelector('.archiveHeader_search')).rect,
            categories: onScreen(archive.querySelector('.archiveHeader_categories'))?.rect,
            categoryLinks: [...archive.querySelectorAll('.archiveHeader_categories a')].map(txt),
            textAlign: getComputedStyle(archive.querySelector('.pkp_search') || archive).textAlign,
        } : null;
        const h1 = document.querySelector('h1');
        const results = document.querySelector('.search_results, .cmp_monographs_list');
        return {
            url: location.pathname + location.search,
            h1: h1 ? {text: txt(h1), y: Math.round(h1.getBoundingClientRect().y + window.scrollY)} : null,
            queryBoxes: boxes, labelsForQuery, dupIds,
            dateSelects, legends, contexts, archive: archiveLayout,
            resultItems: document.querySelectorAll('.search_results > li, .cmp_monographs_list .obj_monograph_summary').length,
            resultsY: results ? Math.round(results.getBoundingClientRect().y + window.scrollY) : null,
            notice: txt(document.querySelector('.page_search .cmp_notification, .page_search .search_results[role=status]')),
            pageInfo: txt(document.querySelector('.cmp_pagination')),
        };
    });
}

/** The screen-reader view of each search form on the page (role, name, controls), plus role queries. */
async function a11yFacts(page) {
    const forms = page.locator('form').filter({has: page.locator('input[name="query"]')});
    const out = {forms: []};
    for (const f of await forms.all()) out.forms.push(await f.ariaSnapshot().catch((e) => `ERR ${flat(e.message, 120)}`));
    for (const [role, name] of [['textbox', 'Search articles for'], ['textbox', 'Search preprints for'], ['textbox', 'Search Query'],
        ['searchbox', 'Search Query'], ['search', 'Preprint Search'], ['search', 'Book Search'], ['textbox', 'Search']]) {
        out[`${role}:${name}`] = await page.getByRole(role, {name, exact: true}).count();
    }
    return out;
}

async function visit(page, name, url, facts) {
    if (url) {
        await page.goto(url);
        await idle(page).catch(() => {});
    }
    const s = await screen(page);
    record(name, s);
    await shot(page, name);
    const lf = await labelFacts(page);
    const af = await a11yFacts(page);
    const rk = await rawKeys(page).catch((e) => `ERR ${flat(e.message, 120)}`);
    facts[name] = {labels: lf, a11y: af, rawKeys: rk, notices: s.notices};
    const b = lf.queryBoxes.map((q) => `#${q.id} ph=${JSON.stringify(q.placeholder)} aria=${JSON.stringify(q.ariaLabel)} val=${JSON.stringify(q.value)} labels=${q.labels.map((l) => `${l.text}${l.onScreen ? '[shown]' : `[hidden:${l.hiddenBy || 'size'}]`}`).join(',') || 'none'}`).join(' ; ');
    const d = lf.dateSelects.map((x) => `${x.name}:${x.label ? `${x.label.text}${x.label.onScreen ? '' : '(hidden)'}` : '-'}`).join(' ');
    console.log(`[y1 ${page._y1app}] ${name} ${lf.url} | boxes ${lf.queryBoxes.length}: ${b} | dates ${d || 'none'} | results ${lf.resultItems} | dupIds ${JSON.stringify(lf.dupIds)}`);
    return lf;
}

async function submitForm(page, form) {
    await Promise.all([page.waitForEvent('load', {timeout: T}), form.locator('button[type="submit"]').first().click()]);
    await idle(page).catch(() => {});
}


const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function readSelects(page, prefix) {
    const out = [];
    for (const part of ['Year', 'Month', 'Day']) {
        const sel = page.locator(`select[name="${prefix}${part}"]`);
        out.push((await sel.count()) ? await sel.evaluate((x) => (x.selectedIndex < 0 ? null : x.options[x.selectedIndex].text.trim())) : 'none');
    }
    return out.join('/');
}

async function readResults(page) {
    const titles = await page.locator('.page_search .search_results > li').evaluateAll((lis) => lis.map((li) => {
        const a = li.querySelector('h3 a, .title a, a');
        return a ? a.textContent.replace(/\s+/g, ' ').trim() : null;
    }));
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        titles,
        notice: flat(await page.locator('.page_search .cmp_notification').first().innerText({timeout: 1000}).catch(() => null), 120),
        pageInfo: flat(await page.locator('.page_search .cmp_pagination').first().innerText({timeout: 1000}).catch(() => null), 200),
        after: await readSelects(page, 'dateFrom'),
        before: await readSelects(page, 'dateTo'),
        journal: await page.locator('select#searchContext').evaluate((x) => x.options[x.selectedIndex]?.text.trim() ?? null).catch(() => 'none'),
    };
}

async function filtersPhase(app, run) {
    const isOJS = app.name === 'ojs';
    const facts = {};
    const P = (s) => `y1f-${s}`;
    const t = tag('u15y1f');
    const ctx = await app.api.createContext({
        tag: t, context: {name: `U15 Y1F ${t}`, acronym: 'Y1F'},
        users: [{username: `${t}m`, roles: ['manager']}, {username: `${t}a`, roles: ['author']}],
        ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}]} : {}),
    });
    const items = {};
    for (const [k, d] of [['i1', '2024-03-05'], ['i2', '2026-02-10'], ['i3', '2026-03-01']]) {
        const r = await app.api.createSubmission({
            tag: `${t}${k}`, context: ctx.path, submitter: `${t}a`, title: `Y1F ${k} ${d}`, published: true, datePublished: d,
            ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {}),
        });
        items[k] = r.submissionId;
    }
    // a never-published submission carrying a publication date (A15): the scenario first, else the stored date
    try {
        const r = await app.api.createSubmission({tag: `${t}d1`, context: ctx.path, submitter: `${t}a`, title: `Y1F d1 draft dated 2021-06-15`, datePublished: '2021-06-15'});
        items.d1 = r.submissionId;
        facts.draftDate = 'scenario accepted datePublished on a draft';
    } catch (e) {
        const r = await app.api.createSubmission({tag: `${t}d1`, context: ctx.path, submitter: `${t}a`, title: `Y1F d1 draft dated 2021-06-15`});
        items.d1 = r.submissionId;
        facts.draftDate = `scenario refused (${flat(e.message, 160)}); date stored as the Publication Date field's save stores it`;
    }
    const dd = sql(app, `select date_published from publications where submission_id=${items.d1}`);
    if (!dd || !dd.startsWith('2021-06-15')) {
        sql(app, `update publications set date_published='2021-06-15' where submission_id=${items.d1}`);
        facts.draftDate += ' (sql)';
    }
    facts.draftRow = sql(app, `select publication_id, status, date_published from publications where submission_id=${items.d1}`);
    await drainJobs(app).catch((e) => { facts.drainJobs = flat(e.message); });
    facts.seed = {ctx: ctx.path, items};

    const {page, close} = await launch(app);
    try {
        const S = app.url(`/index.php/${ctx.path}/en/search`);
        await page.goto(S);
        await idle(page).catch(() => {});
        record(P('open'), await screen(page));
        await shot(page, P('open'));
        facts.lists = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.date_range select')].map((x) => [x.name, [...x.options].map((o) => o.text.trim())])));
        const cases = [
            ['C0 nothing chosen', {}],
            ['A1 After 2026 Feb 10', {dateFromYear: '2026', dateFromMonth: 'Feb', dateFromDay: '10'}],
            ['A2 After 2026 Feb 11', {dateFromYear: '2026', dateFromMonth: 'Feb', dateFromDay: '11'}],
            ['B1 Before 2026 Feb 10', {dateToYear: '2026', dateToMonth: 'Feb', dateToDay: '10'}],
            ['B2 Before 2026 Feb 11', {dateToYear: '2026', dateToMonth: 'Feb', dateToDay: '11'}],
            ['P1 After Year 2026 alone', {dateFromYear: '2026'}],
            ['P2 After 2026 Mar, no Day', {dateFromYear: '2026', dateFromMonth: 'Mar'}],
            ['P3 Before Year 2025 alone', {dateToYear: '2025'}],
            ['P4 After Month Feb alone', {dateFromMonth: 'Feb'}],
            ['P5 Before Day 5 alone', {dateToDay: '5'}],
            ['P6 Before Month Mar and Day 1, no Year', {dateToMonth: 'Mar', dateToDay: '1'}],
            ['X1 Before 2026 Feb 30', {dateToYear: '2026', dateToMonth: 'Feb', dateToDay: '30'}],
            ['X2 After 2026 Feb 30', {dateFromYear: '2026', dateFromMonth: 'Feb', dateFromDay: '30'}],
            ['Y1 After 2021 Jan 1 (the draft-only year)', {dateFromYear: '2021', dateFromMonth: 'Jan', dateFromDay: '1'}],
            ['W1 word i2 + After 2026 Feb 10', {query: 'i2', dateFromYear: '2026', dateFromMonth: 'Feb', dateFromDay: '10'}],
        ];
        facts.cases = {};
        for (const [name, choose] of cases) {
            await page.goto(S);
            await idle(page).catch(() => {});
            const form = page.locator('.page_search form');
            if (choose.query) await form.locator('input[name="query"]').fill(choose.query);
            for (const [k, v] of Object.entries(choose)) if (k !== 'query') await form.locator(`select[name="${k}"]`).selectOption({label: v});
            await submitForm(page, form);
            const id = name.split(' ')[0];
            record(P(`case-${id}`), await screen(page));
            const r = await readResults(page);
            facts.cases[name] = r;
            console.log(`[y1f ${run} ${app.name}] ${name}: ${r.titles.length} ${r.notice ? `"${r.notice}" ` : ''}[${r.titles.map((x) => (x || '').replace(/^Y1F /, '')).join(' | ')}] after=${r.after} before=${r.before}`);
            if (['P1', 'X1'].includes(id)) await shot(page, P(`case-${id}`));
        }

        if (isOJS) {
            // "By Journal" on the site-wide page: a journal with 26 published items, chosen with an empty box
            const tb = tag('u15y1j');
            await app.api.createContext({tag: tb, context: {name: `U15 Y1J ${tb}`, acronym: 'Y1J'},
                users: [{username: `${tb}a`, roles: ['author']}], issues: [{volume: 1, number: 1, year: 2026, published: true}]});
            for (let i = 1; i <= 26; i++) {
                await app.api.createSubmission({tag: `${tb}n${i}`, context: tb, submitter: `${tb}a`, title: `Y1J item ${i}`, published: true, issue: {volume: 1, number: 1, year: 2026}});
            }
            await drainJobs(app).catch((e) => { facts.drainJobs2 = flat(e.message); });
            const bj = {journal: `U15 Y1J ${tb}`};
            await page.goto(app.url('/index.php/index/en/search'));
            await idle(page).catch(() => {});
            record(P('site-open'), await screen(page));
            bj.options = await page.locator('select#searchContext option').allInnerTexts().then((a) => a.map((x) => x.trim()));
            bj.blankFirst = bj.options[0] === '';
            const form = page.locator('.page_search form');
            await form.locator('select#searchContext').selectOption({label: bj.journal});
            await submitForm(page, form);
            record(P('site-chosen-p1'), await screen(page));
            await shot(page, P('site-chosen-p1'));
            bj.page1 = await readResults(page);
            bj.page1.journalsListed = [...new Set(await page.locator('.search_results > li').evaluateAll((lis) => lis.map((li) => (li.querySelector('.title a, h3 a')?.textContent || '').replace(/\s+/g, ' ').trim().replace(/ \d+$/, ''))))];
            bj.page1.links = await page.locator('.cmp_pagination a').evaluateAll((as) => as.map((a) => `${a.textContent.trim()} ${new URL(a.href).searchParams.get('searchContext')}`));
            const two = page.locator('.cmp_pagination a', {hasText: /^2$/}).first();
            if (await two.count()) {
                await Promise.all([page.waitForEvent('load', {timeout: T}), two.click()]);
                await idle(page).catch(() => {});
                record(P('site-chosen-p2'), await screen(page));
                await shot(page, P('site-chosen-p2'));
                bj.page2 = await readResults(page);
                bj.page2.titles = bj.page2.titles.slice(0, 30);
            }
            // a second search from the form as it now stands
            await page.goto(app.url('/index.php/index/en/search') + `?searchContext=${encodeURIComponent('')}`);
            await idle(page).catch(() => {});
            await form.locator('select#searchContext').selectOption({label: bj.journal});
            await submitForm(page, form);
            const formNow = page.locator('.page_search form');
            await submitForm(page, formNow);
            record(P('site-second-search'), await screen(page));
            bj.secondSearch = await readResults(page);
            bj.secondSearch.titles = bj.secondSearch.titles.length;
            facts.byJournal = bj;
            console.log(`[y1f ${run} ojs] By Journal: p1 ${bj.page1.pageInfo} sel="${bj.page1.journal}" url=${bj.page1.url} links=${JSON.stringify(bj.page1.links)} | p2 ${bj.page2 && bj.page2.pageInfo} | second ${bj.secondSearch.pageInfo} sel="${bj.secondSearch.journal}"`);
        }
    } finally {
        record(P('facts'), facts);
        await close();
    }
}

forEachApp(async (app) => {
    const phase = process.env.PHASE || 'labels';
    if (phase !== 'labels') {
        if (app.name !== 'omp') await filtersPhase(app, process.env.PROBE_RUN || 'r0');
        if (phase === 'filters') return;
    }
    const run = process.env.PROBE_RUN || 'r0';
    const isOJS = app.name === 'ojs';
    const isOPS = app.name === 'ops';
    const isOMP = app.name === 'omp';
    const facts = {};
    const P = (s) => `y1-${s}`;

    // ------------------------------------------------------------- seed: scratch context, two published items
    const t = tag('u15y1');
    const word = `zq${t.slice(-6)}`; // a word no other item carries
    const ctx = await app.api.createContext({
        tag: t,
        context: {name: `U15 Y1 ${t}`, acronym: 'Y1'},
        users: [{username: `${t}m`, roles: ['manager']}, {username: `${t}a`, roles: ['author']}],
        ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}]} : {}),
    });
    const items = {};
    for (const [k, d] of [['i1', '2024-03-05'], ['i2', '2026-02-10']]) {
        const r = await app.api.createSubmission({
            tag: `${t}${k}`, context: ctx.path, submitter: `${t}a`, title: `Y1 ${k} ${word} published ${d}`,
            published: true, datePublished: d,
            ...(isOJS ? {issue: {volume: 1, number: 1, year: 2026}} : {}),
        });
        items[k] = {id: r.submissionId, pub: r.publicationId};
    }
    await drainJobs(app).catch((e) => { facts.drainJobs = flat(e.message); });
    facts.seed = {ctx: ctx.path, word, items};
    console.log(`[y1 ${run} ${app.name}] seeded ${ctx.path} word ${word} ${JSON.stringify(items)}`);

    const {page, close} = await launch(app);
    page._y1app = `${run} ${app.name}`;
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message(), url: page.url()}); await d.accept().catch(() => {}); });
    try {
        // ------------------------------------------------------------- visitor
        // every address carries /en: the fr_CA visit below would otherwise leave the session in French
        const S = (c) => app.url(`/index.php/${c}/en/search`);
        const E = (c, rest = '') => app.url(`/index.php/${c}/en${rest}`);
        // reached the way a reader does: the header's "Search" link on the scratch context's home
        await page.goto(E(ctx.path));
        await idle(page).catch(() => {});
        const home = await visit(page, P('v-scratch-home'), null, facts);
        const headerLink = page.locator('header a[href$="/search"], header a[href*="/search?"]').first();
        if (await headerLink.isVisible().catch(() => false)) {
            await Promise.all([page.waitForEvent('load', {timeout: T}), headerLink.click()]);
            await idle(page).catch(() => {});
            facts.reachedBy = 'header link';
        } else {
            await page.goto(S(ctx.path));
            await idle(page).catch(() => {});
            facts.reachedBy = 'address';
        }
        await visit(page, P('v-scratch-search-empty'), null, facts);
        if (!isOMP) {
            await loc(page, 'Search page: box by its visible label', page.getByRole('textbox', {name: isOPS ? 'Search preprints for' : 'Search articles for', exact: true}));
            await loc(page, 'Search page: the box label element', page.locator('.search_input label[for="query"]'));
            await loc(page, 'Search page: Published After Year select by label', page.locator('.date_range .from').getByLabel('Year', {exact: true}));
        } else {
            await loc(page, 'OMP Search page: box by its visible label', page.getByRole('searchbox', {name: 'Search Query', exact: true}));
            await loc(page, 'OMP Search page: the label element', page.locator('form.pkp_search label[for="query"]'));
        }

        // search with the word through the page's own form
        const form = page.locator('form').filter({has: page.locator('input[name="query"]')}).last();
        await form.locator('input[name="query"]').fill(word);
        await submitForm(page, form);
        const hit = await visit(page, P('v-scratch-search-word'), null, facts);
        if (isOMP) {
            // the press's "Search again" link beside the count: where it takes the reader
            const again = page.getByRole('link', {name: 'Search again', exact: true}).first();
            const y0 = await page.evaluate(() => window.scrollY);
            await again.click();
            await page.waitForTimeout(500);
            facts.searchAgain = {href: await again.getAttribute('href'), url: page.url(), scrollBefore: y0,
                scrollAfter: await page.evaluate(() => window.scrollY),
                focused: await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()} ${a.getAttribute('name') || ''} ${(a.textContent || '').trim().slice(0, 30)}` : null; }),
                labelTop: await page.locator('form.pkp_search label').evaluate((l) => Math.round(l.getBoundingClientRect().top))};
        }
        await page.reload();
        await idle(page).catch(() => {});
        await visit(page, P('v-scratch-search-word-reload'), null, facts);
        // a word that finds nothing
        const form2 = page.locator('form').filter({has: page.locator('input[name="query"]')}).last();
        await form2.locator('input[name="query"]').fill(`${word}none`);
        await submitForm(page, form2);
        await visit(page, P('v-scratch-search-none'), null, facts);
        // leave the page with words typed and not searched
        const form3 = page.locator('form').filter({has: page.locator('input[name="query"]')}).last();
        await form3.locator('input[name="query"]').fill('typed not searched');
        await form3.locator('input[name="query"]').blur();
        const before = dialogs.length;
        await page.goto(E(ctx.path, '/about'));
        await idle(page).catch(() => {});
        facts.leaveTyped = {dialogs: dialogs.slice(before), landed: page.url()};

        // publicknowledge (read-only) and the site-wide Search page
        await visit(page, P('v-pk-search'), S(app.contextPath), facts);
        await visit(page, P('v-site-search'), E('index', '/search'), facts);
        await visit(page, P('v-pk-search-fr'), app.url(`/index.php/${app.contextPath}/fr_CA/search`), facts);

        // OPS: archive header on home and Preprints; OJS/OMP: their home pages as controls
        if (isOPS) {
            await visit(page, P('v-scratch-ops-home'), E(ctx.path), facts);
            await loc(page, 'OPS archive header: form by role', page.locator('.archiveHeader_search').getByRole('search', {name: 'Preprint Search', exact: true}));
            await loc(page, 'OPS archive header: box by visible label', page.locator('.archiveHeader_search').getByRole('textbox', {name: 'Search Query', exact: true}));
            await loc(page, 'OPS archive header: the label element', page.locator('.archiveHeader_search label[for="query"]'));
            const af = page.locator('.archiveHeader_search form');
            await af.locator('input[name="query"]').fill(word);
            await submitForm(page, af);
            await visit(page, P('v-scratch-ops-home-submitted'), null, facts);
            await visit(page, P('v-scratch-ops-preprints'), E(ctx.path, '/preprints'), facts);
            const af2 = page.locator('.archiveHeader_search form');
            await af2.locator('input[name="query"]').fill(word);
            await submitForm(page, af2);
            await visit(page, P('v-scratch-ops-preprints-submitted'), null, facts);
            await page.goBack();
            await idle(page).catch(() => {});
            await visit(page, P('v-scratch-ops-preprints-back'), null, facts);
            await visit(page, P('v-pk-ops-home'), E(app.contextPath), facts);
            await visit(page, P('v-pk-ops-preprints'), E(app.contextPath, '/preprints'), facts);
        } else {
            await visit(page, P('v-pk-home'), E(app.contextPath), facts);
            if (isOJS) await visit(page, P('v-pk-archive'), E(app.contextPath, '/issue/archive'), facts);
            if (isOMP) await visit(page, P('v-pk-catalog'), E(app.contextPath, '/catalog'), facts);
        }
        // a narrow window (the less adds a tablet breakpoint): the Search page at 600 px
        await page.setViewportSize({width: 600, height: 900});
        await visit(page, P('v-scratch-search-narrow'), `${S(ctx.path)}?query=${word}`, facts);
        if (isOPS) await visit(page, P('v-scratch-ops-home-narrow'), E(ctx.path), facts);
        await page.setViewportSize({width: 1280, height: 900});

        // ------------------------------------------------------------- signed in
        for (const u of ['reader.rosa', 'manager.maya']) {
            await signIn(page, u, {contextPath: app.contextPath});
            await idle(page).catch(() => {});
            const k = u.split('.')[0];
            await visit(page, P(`${k}-pk-search`), `${S(app.contextPath)}?query=${encodeURIComponent('the')}`, facts);
            if (isOPS) await visit(page, P(`${k}-pk-ops-home`), E(app.contextPath), facts);
            await signOut(page);
        }

        // ------------------------------------------------------------- OPS: the does-not-post choice
        if (isOPS) {
            await signIn(page, `${t}m`, {contextPath: ctx.path});
            await page.goto(E(ctx.path, '/management/settings/distribution'));
            await idle(page).catch(() => {});
            const puts = [];
            page.on('request', (r) => { if (['PUT', 'POST'].includes(r.method()) && /\/api\/v1\/contexts\//.test(r.url())) puts.push({url: r.url(), method: r.method(), body: flat(r.postData(), 600)}); });
            // the posting mode sits on one of the Distribution tabs: find the tab whose panel names it
            const tabs = await page.getByRole('tab').allInnerTexts();
            facts.distTabs = tabs.map((x) => flat(x));
            for (const name of facts.distTabs) {
                const tab = page.getByRole('tab', {name, exact: true}).first();
                await tab.click().catch(() => {});
                await idle(page).catch(() => {});
                if (await page.getByText('Posting Mode').first().isVisible().catch(() => false)) { facts.postingTab = name; break; }
            }
            await visit(page, P('m-ops-posting-before'), null, facts);
            const none = page.getByRole('radio', {name: /will not be used to post/});
            facts.postingRadios = await page.getByRole('radio').evaluateAll((rs) => rs.map((r) => ({label: (r.labels && r.labels[0] ? r.labels[0].textContent : '').replace(/\s+/g, ' ').trim(), checked: r.checked, name: r.name, value: r.value})));
            if (await none.count()) {
                await none.first().check();
                const formEl = page.locator('form').filter({has: none.first()});
                await formEl.getByRole('button', {name: 'Save', exact: true}).click();
                await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 15000}).then(() => { facts.postingSaved = 'Saved shown'; }).catch(() => { facts.postingSaved = 'no Saved'; });
                await idle(page).catch(() => {});
                await visit(page, P('m-ops-posting-saved'), null, facts);
                facts.postingPut = puts.slice();
                await page.reload();
                await idle(page).catch(() => {});
                if (facts.postingTab) { await page.getByRole('tab', {name: facts.postingTab, exact: true}).first().click().catch(() => {}); await idle(page).catch(() => {}); }
                facts.postingRadiosAfterReload = await page.getByRole('radio').evaluateAll((rs) => rs.map((r) => ({label: (r.labels && r.labels[0] ? r.labels[0].textContent : '').replace(/\s+/g, ' ').trim(), checked: r.checked})));
                await visit(page, P('m-ops-posting-reload'), null, facts);
                facts.postingDb = sql(app, `select setting_name, setting_value from server_settings ss join servers s on s.server_id=ss.server_id where s.path='${ctx.path}' and setting_name='publishingMode'`);
            }
            await signOut(page);
            await visit(page, P('v-scratch-ops-home-after-posting'), E(ctx.path), facts);
        }
        facts.dialogs = dialogs;
        facts.summary = {home: home.queryBoxes.length, hitResults: hit.resultItems};
    } finally {
        record(P('facts'), facts);
        await close();
    }
});
