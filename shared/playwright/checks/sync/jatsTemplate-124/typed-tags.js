// PR review check — pkp/pkp-lib#13378, pkp/jatsTemplate#124 (`main`) and #125 (stable-3_5_0, with the pointer
// bump pkp/ojs#5921): a tag the author typed as text ("<i>species names</i>", stored entity-encoded) stays text
// in the generated JATS, beside markup set with the editor's buttons, which is still converted. One journal,
// PKP's default test dataset. It changes the data: reset the fleet first, for each side.
//
//   npm run fleet-prep -- --feature sync-13378 --dataset 1 --reset --apps ojs
//   PROBE_FEATURE=sync-13378 PROBE_AGENT=<base|head> node bin/probe.js ojs shared/playwright/checks/sync/jatsTemplate-124/typed-tags.js
//   php shared/playwright/checks/sync/jatsTemplate-123/validate-dtd.php checkouts/ojs .reports/sync-13378/<id>/*.xml
// and on the line with PKP_E2E_LINE=stable-3_5_0 in front and --feature sync-13378-3_5 (3.5's JATS carries the
// titles alone, no abstract: the other reads record what the line writes).
//
//   0 (as dbarnes) the generated JATS of every version of every submission, as loaded        → asloaded-<s>-<p>.xml
//   1 submission 5, in Production: Publication › "Title & Abstract"; "Title" typed as
//     "The <i>species</i> element in HTML" and "Abstract" as the issue's sentence, "Save"     → shots 1-typed, 1-saved
//   2 "JATS XML" in the same menu: the page, its "Download"                              → shot 2-jats-page, typed-5-download.xml
//   3 GET …/publications/{p}/jats                                                           → typed-5.xml
//   4 submission 6, in Production: typed tags beside real markup in the title, subtitle, their French twins,
//     the abstract (a typed link, a typed list item in a real list, a lone "<i>", "1 < 2 > 0", entities typed
//     as text), the first contributor's biography and competing interests, the data availability statement
//     and a reference, each saved in the form the editor stores                             → mixed-6.xml
//   5 submission 9, in Production: an ordinary rich-text abstract (the control)              → rich-9.xml
//   6 submission 17, published: unpublished, the issue's sentence saved as its abstract and the typed title,
//     published again, "Make available with publication", "JATS Metadata Format" ticked:
//     the signed-out download and the OAI-PMH `jats` record                                 → public-17.xml, oai-17.xml
//
// Facts go to facts-typed-tags-ojs.json; no assertions. At the plugin's base c4de3af (`main`) the typed
// abstract of step 3 comes out as four <p> with <italic>species names</italic>; at the PR head 642946c it is
// one <p> holding the sentence as typed (2026-10-10).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, idle, record, shot, screen, outDir} = require('../../../probe');
const {enablePlugin} = require('../../issues/oai-jats-list-refused-for-one-subscription-article/lib');

const CTX = 'publicknowledge';
const T = 30_000;
const TITLE = 'The <i>species</i> element in HTML';
const SENTENCE = 'Write <i>species names</i> in italics and H<sub>2</sub>O with a subscript; a <br> tag breaks the line and <p>text</p> is a paragraph.';
/** Text as the rich-text box stores it. */
const enc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const RICH = JSON.parse(fs.readFileSync(path.join(__dirname, '../ojs-5813/abstracts.json'), 'utf8')).rich;
const MIXED = {
    title: {
        en: `Typed ${enc('<b>bold</b>')} beside <b>real bold</b> &amp; p&lt;0.05`,
        fr_CA: `Du ${enc('<i>texte</i>')} et de l'<i>italique</i>`,
    },
    subtitle: {
        en: `A ${enc('<sup>typed</sup>')} and a <sup>real</sup> superscript`,
        fr_CA: `Un ${enc('<u>mot</u>')} et un <u>soulignement</u>`,
    },
    abstract: {
        en: `<p>Typed ${enc('<a href="https://example.org/typed">link</a>')} beside a <a href="https://example.org/real?a=1&amp;b=2">real link</a>.</p>`
            + `<ul><li>Typed ${enc('<li>item</li>')} in a real item</li><li>Second ${enc('<br>')} item</li></ul>`
            + `<p>Use the ${enc('<i>')} tag alone, 1 &lt; 2 &gt; 0, and ${enc('&lt;i&gt;')} typed as entities.</p>`,
    },
    biography: {en: `<p>Writes about the ${enc('<em>em</em>')} element, with <em>emphasis</em>.</p>`},
    competingInterests: {en: `<p>None beyond the ${enc('<strong>strong</strong>')} tag; <strong>none</strong>.</p>`},
    dataAvailability: {en: `<p>Data: ${enc('<a href="https://example.org/d">typed</a>')} and <a href="https://example.org/data">real</a>.</p>`},
    // "References" is a plain text box: the first line is a tag typed as its entities, the second a tag typed as such
    citationsRaw: `Doe, J. (2020). On the ${enc('<i>i</i>')} element. Journal of Tests, 1(1), 1-2.\nRoe, R. (2021). On the <i>raw</i> element. Journal of Tests, 2(1), 3-4.`,
};

async function sessionApi(page, method, url, data) {
    return page.evaluate(async ({method, url, data}) => {
        const token = window.pkp?.currentUser?.csrfToken || null;
        const res = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json', 'X-Csrf-Token': token || ''},
            body: data === undefined ? undefined : JSON.stringify(data),
            credentials: 'same-origin',
        });
        const text = await res.text();
        let body = null;
        try { body = JSON.parse(text); } catch (e) { body = text.slice(0, 800); }
        return {status: res.status, body};
    }, {method, url, data});
}

const part = (xml, tagName) => (xml.match(new RegExp(`<${tagName}[\\s>][\\s\\S]*?</${tagName}>`, 'g')) || []);
/** The parts of a JATS document the conversion writes, flattened to one line each. */
const converted = (xml) => Object.fromEntries(
    ['title-group', 'abstract', 'bio', 'author-notes', 'notes', 'funding-statement', 'sec', 'mixed-citation']
        .map((t) => [t, part(xml, t).map((s) => s.replace(/\s*\n\s*/g, ''))])
        .filter(([, v]) => v.length)
);

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // the plugin ships in OJS alone
    if (!app.dataset) throw new Error('typed-tags.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const api = (p) => app.url(`/index.php/${CTX}/api/v1/${p}`);
    const save = (name, text) => fs.writeFileSync(path.join(outDir(), name), text);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes', {contextPath: CTX});
        await page.goto(app.url(`/index.php/${CTX}/dashboard/editorial`));
        await idle(page);

        const sub = async (sid) => (await sessionApi(page, 'GET', api(`submissions/${sid}`))).body;
        const pubUrl = (sid, pid) => api(`submissions/${sid}/publications/${pid}`);
        const jats = async (key, sid, pid, name) => {
            const r = await sessionApi(page, 'GET', `${pubUrl(sid, pid)}/jats`);
            if (r.status === 200 && typeof r.body?.jatsContent === 'string') {
                save(name, r.body.jatsContent);
                if (key) fact(key, {status: 200, generated: r.body.isDefaultContent, file: name, converted: converted(r.body.jatsContent)});
                return r.body.jatsContent;
            }
            if (key) fact(key, {status: r.status, body: r.body});
            return null;
        };
        const put = async (key, url, data) => {
            const r = await sessionApi(page, 'PUT', url, data);
            fact(key, {status: r.status, stored: Object.fromEntries(Object.keys(data).map((k) => [k, r.body?.[k]])), error: r.status >= 400 ? r.body : undefined});
            return r;
        };

        // 0: everything as loaded
        const list = await sessionApi(page, 'GET', api('submissions?count=100'));
        const asLoaded = [];
        for (const item of list.body?.items ?? []) {
            for (const p of (await sub(item.id)).publications ?? []) {
                const xml = await jats(null, item.id, p.id, `asloaded-${item.id}-${p.id}.xml`);
                asLoaded.push(`${item.id}/${p.id}:${xml === null ? 'none' : xml.length}`);
            }
        }
        fact('0 as loaded (submission/version:bytes)', asLoaded);

        // 1: the issue's steps, typed through the editor
        const s5 = await sub(5);
        const p5 = s5.publications.at(-1);
        await page.goto(app.url(`/index.php/${CTX}/dashboard/editorial?workflowSubmissionId=5`));
        await idle(page);
        const dlg = page.locator('[role="dialog"]:visible').first();
        const entry = dlg.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await entry.isVisible().catch(() => false))) {
            await dlg.getByRole('link', {name: 'Publication', exact: true}).first().click({timeout: T});
            await idle(page);
        }
        await entry.click({timeout: T});
        await idle(page);
        await page.waitForFunction(() => window.tinymce && window.tinymce.get().length > 1 && window.tinymce.get().every((e) => e.initialized), null, {timeout: T});
        await page.waitForTimeout(1000);
        const editors = await page.evaluate(() => window.tinymce.get().map((e) => ({id: e.id, inline: e.inline})));
        const pick = (re) => editors.find((e) => re.test(e.id) && /-en$/.test(e.id)) || editors.find((e) => re.test(e.id));
        const typeInto = async (ed, text) => {
            const box = ed.inline ? page.locator(`[id="${ed.id}"]`) : page.frameLocator(`[id="${ed.id}_ifr"]`).locator('body');
            await box.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            await page.keyboard.type(text, {delay: 5});
            await page.waitForTimeout(300);
            return {editor: ed.id, shows: (await box.innerText().catch(() => null))?.trim(), content: await page.evaluate((i) => window.tinymce.get(i).getContent(), ed.id)};
        };
        const titleEd = pick(/-title-control/);
        const abstractEd = pick(/-abstract-control/);
        fact('1 editors', {all: editors.map((e) => e.id), title: titleEd?.id, abstract: abstractEd?.id});
        fact('1 typed "Title"', await typeInto(titleEd, TITLE));
        fact('1 typed "Abstract"', await typeInto(abstractEd, SENTENCE));
        await shot(page, '1-typed').catch(() => {});
        const saved = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/publications\/\d+$/.test(r.url()), {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Save', exact: true}).first().click();
        const res = await saved;
        await idle(page);
        const stored5 = (await sessionApi(page, 'GET', pubUrl(5, p5.id))).body;
        fact('1 "Save"', {status: res ? res.status() : null, title: stored5?.title?.en, abstract: stored5?.abstract?.en});
        await shot(page, '1-saved').catch(() => {});

        // 2: the "JATS XML" page and its download
        await dlg.getByRole('link', {name: 'JATS XML', exact: true}).first().click({timeout: T}).catch((e) => fact('2 "JATS XML" not pressed', e.message.slice(0, 200)));
        await idle(page);
        await page.waitForTimeout(1500);
        const shown = (await screen(page)).text?.dialog || '';
        fact('2 "JATS XML" page', {
            titleGroup: (shown.match(/<title-group>[\s\S]*?<\/title-group>/) || [null])[0],
            abstract: (shown.match(/<abstract[\s>][\s\S]*?<\/abstract>/) || [null])[0],
            head: shown.match(/<title-group>|<abstract/) ? undefined : shown.slice(0, 600),
        });
        // the typed text brought into view inside the XML: "species names" of the abstract, or the title's "species" on 3.5
        await page.evaluate(() => {
            const code = [...document.querySelectorAll('[role="dialog"] pre, [role="dialog"] code')].find((e) => e.textContent.includes('species'));
            if (!code) return;
            const needle = code.textContent.includes('species names') ? 'species names' : 'species';
            const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
                const at = node.textContent.indexOf(needle);
                if (at < 0) continue;
                const range = document.createRange();
                range.setStart(node, at);
                range.setEnd(node, at + needle.length);
                let scroller = node.parentElement;
                while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) scroller = scroller.parentElement;
                (scroller || document.scrollingElement).scrollBy(0, range.getBoundingClientRect().top - 420);
                return;
            }
        });
        await page.waitForTimeout(500);
        await shot(page, '2-jats-page').catch(() => {});
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', {timeout: 15_000}),
                dlg.getByRole('button', {name: /download/i}).or(dlg.getByRole('link', {name: /download/i})).first().click({timeout: 5000}),
            ]);
            const file = path.join(outDir(), 'typed-5-download.xml');
            await download.saveAs(file);
            fact('2 "Download"', {name: download.suggestedFilename(), converted: converted(fs.readFileSync(file, 'utf8'))});
        } catch (e) {
            fact('2 "Download"', {notTaken: e.message.slice(0, 200)});
        }

        // 3: the API's copy
        await jats('3 submission 5, typed through the editor', 5, p5.id, 'typed-5.xml');

        // 4: typed tags beside real markup, field by field
        const s6 = await sub(6);
        const p6 = s6.publications.at(-1);
        await put('4 title, subtitle, abstract', pubUrl(6, p6.id), {title: MIXED.title, subtitle: MIXED.subtitle, abstract: MIXED.abstract});
        await put('4 data availability statement', pubUrl(6, p6.id), {dataAvailability: MIXED.dataAvailability});
        await put('4 reference', pubUrl(6, p6.id), {citationsRaw: MIXED.citationsRaw});
        const people = await sessionApi(page, 'GET', `${pubUrl(6, p6.id)}/contributors`);
        const first = (people.body?.items ?? people.body)?.[0];
        if (first) {
            const data = {...first, biography: MIXED.biography, competingInterests: MIXED.competingInterests};
            if (Array.isArray(first.contributorRoles)) data.contributorRoles = first.contributorRoles.map((r) => r.id ?? r);
            const r = await sessionApi(page, 'PUT', `${pubUrl(6, p6.id)}/contributors/${first.id}`, data);
            fact('4 contributor', {status: r.status, name: r.body?.fullName, biography: r.body?.biography, competingInterests: r.body?.competingInterests, error: r.status >= 400 ? r.body : undefined});
        } else fact('4 contributor', {status: people.status, note: 'no contributor read'});
        await jats('4 submission 6, typed tags beside real markup', 6, p6.id, 'mixed-6.xml');

        // 5: the control, an ordinary rich-text abstract
        const p9 = (await sub(9)).publications.at(-1);
        await put('5 rich-text abstract', pubUrl(9, p9.id), {abstract: {en: RICH}});
        await jats('5 submission 9, an ordinary rich-text abstract', 9, p9.id, 'rich-9.xml');

        // 6: the published routes
        const p17 = (await sub(17)).publications.at(-1);
        const un = await sessionApi(page, 'PUT', `${pubUrl(17, p17.id)}/unpublish`);
        const edit = await sessionApi(page, 'PUT', pubUrl(17, p17.id), {title: {en: enc(TITLE)}, abstract: {en: `<p>${enc(SENTENCE)}</p>`}});
        const pub = await sessionApi(page, 'PUT', `${pubUrl(17, p17.id)}/publish`);
        const vis = await sessionApi(page, 'PUT', `${pubUrl(17, p17.id)}/jats/visibility`, {jatsPublicVisibility: true});
        fact('6 submission 17 republished', {unpublish: un.status, edit: edit.status, publish: pub.status, status: pub.body?.status, visibility: vis.status,
            error: [un, edit, pub, vis].filter((r) => r.status >= 400).map((r) => r.body)});
        const dl = await fetch(`${pubUrl(17, p17.id)}/jats/download`);
        const dlText = await dl.text();
        if (dl.status === 200) save('public-17.xml', dlText);
        fact('6 signed-out download', {status: dl.status, type: dl.headers.get('content-type'), converted: dl.status === 200 ? converted(dlText) : dlText.slice(0, 300)});
        try {
            fact('6 "JATS Metadata Format" ticked', await enablePlugin(page, 'JATS Metadata Format'));
        } catch (e) {
            fact('6 "JATS Metadata Format" ticked', {notDone: e.message.slice(0, 200)});
        }
    } finally {
        await close();
    }

    const oai = async (q) => (await fetch(app.url(`/index.php/${CTX}/oai?${q}`))).text();
    const formats = ((await oai('verb=ListMetadataFormats')).match(/<metadataPrefix>[^<]*/g) || []).map((m) => m.replace('<metadataPrefix>', ''));
    if (formats.includes('jats')) {
        const ids = ((await oai('verb=ListIdentifiers&metadataPrefix=jats')).match(/<identifier>([^<]*)/g) || []).map((m) => m.replace('<identifier>', ''));
        const id = ids.find((i) => /\/17$/.test(i)) || ids[0];
        const rec = id ? await oai(`verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(id)}`) : '';
        if (rec) save('oai-17.xml', rec);
        fact('6 OAI jats record', {formats, identifier: id, error: (rec.match(/<error[^>]*>[^<]*/) || [null])[0], converted: converted(rec)});
    } else fact('6 OAI jats record', {formats, note: 'the journal does not list the jats format'});

    record('facts-typed-tags', facts);
    fs.writeFileSync(path.join(outDir(), `facts-typed-tags-${app.name}.json`), JSON.stringify(facts, null, 2));
});
