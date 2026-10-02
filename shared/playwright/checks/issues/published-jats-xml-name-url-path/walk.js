// U48 A9: the article page's "JATS XML" file name. With a URL path on the
// version the path runs into "publication-" with no hyphen, and a reader who
// downloaded the file before the path was set keeps getting the earlier name.
//
// Takes the report's steps on PKP's default test dataset (a dataset fleet,
// OJS): `dbarnes` is the editor; readers B and C are two browsers that never
// sign in. Submission 17 (publication 18, published). The editor first saves
// the page's own XML with "Download" and puts it back with "Upload", so the
// served XML is a file a URL path does not change (the generated XML carries
// the article's address, and U48 A8 keeps it stale besides).
//
// WALK=steps (default) takes the steps. WALK=nb is the neighbour check for a
// fix trial: with no URL path the name stays "submission-17-publication-18-
// jats.xml", and a reader who downloads twice with nothing changed is
// answered 304 the second time. WALK=clear sets the URL path, clears it
// again, reads what is stored, and lets a new reader download.
//
//   PROBE_FEATURE=issues-u48r7 PROBE_AGENT=u48r7 node bin/probe.js ojs \
//     shared/playwright/checks/issues/published-jats-xml-name-url-path/walk.js
'use strict';
const fs = require('fs');
const {forEachApp, launch, signIn, idle, note, record, outFile, sql} = require('../../../probe');
const L = require('../published-jats-xml-stays-old-after-edit/lib');

const MODE = process.env.WALK || 'steps';
const K = `u48r7-a9-${MODE}`;
const SUB = {sid: 17, pid: 18, urlPath: 'u48r7-article'};
const short = (d) => (d ? {...d, text: undefined} : d);

forEachApp(async (app) => {
    const out = {mode: MODE, app: app.name, line: app.line, steps: {}};
    const ed = await launch(app);
    const b = await launch(app);
    const page = ed.page;
    const log = (k, v) => {
        out.steps[k] = v;
        console.log(`[${app.name}] ${k}`, JSON.stringify(v));
    };
    try {
        await signIn(page, 'dbarnes');
        await idle(page);
        // Step 1: "Download", then "Upload" that file, then tick "Make available with publication".
        const jp = await L.openJats(page, app, SUB.sid, SUB.pid);
        const saved = await jp.download();
        const file = outFile(`u48r7-a9-${MODE}-${saved.name}`);
        fs.writeFileSync(file, saved.text);
        const up = await jp.upload(file);
        log('s1-upload', {downloaded: saved.name, upload: up.status(), line: L.flat(await jp.line().innerText().catch(() => null), 160)});
        log('s1-tick', {save: await L.tickMakeAvailable(jp)});
        // Step 2: reader B's first download.
        log('s2-article', await L.openArticle(b.page, app, SUB.sid));
        const first = await L.pressJats(b.page, app);
        log('s2-download-B', short(first));
        await L.snap(b.page, `${K}-s2-article-B`);

        if (MODE === 'steps') {
            // Step 3: the published version's "URL Path".
            log('s3-url-path', await L.saveUrlPath(page, app, SUB.sid, SUB.pid, SUB.urlPath));
            await L.snap(page, `${K}-s3-issue-page`);
            // Step 4: reader C, a new browser.
            const c = await launch(app);
            try {
                log('s4-article-C', await L.openArticle(c.page, app, SUB.sid));
                log('s4-download-C', short(await L.pressJats(c.page, app)));
                await L.snap(c.page, `${K}-s4-article-C`);
            } finally {
                await c.close();
            }
            // Step 5: reader B again.
            log('s5-article-B', await L.openArticle(b.page, app, SUB.sid));
            const again = await L.pressJats(b.page, app);
            log('s5-download-B', {...short(again), identicalToFirst: again.text === first.text});
            await L.snap(b.page, `${K}-s5-article-B`);
        } else if (MODE === 'clear') {
            log('c-set', await L.saveUrlPath(page, app, SUB.sid, SUB.pid, SUB.urlPath));
            log('c-clear', await L.saveUrlPath(page, app, SUB.sid, SUB.pid, ''));
            log('c-stored', sql(app, `select url_path is null, '[' || coalesce(url_path, '<null>') || ']' from publications where publication_id = ${SUB.pid}`));
            const c = await launch(app);
            try {
                log('c-article-C', await L.openArticle(c.page, app, SUB.sid));
                log('c-download-C', short(await L.pressJats(c.page, app)));
                await L.snap(c.page, `${K}-c-article-C`);
            } finally {
                await c.close();
            }
        } else {
            // Control: nothing changed, reader B downloads again.
            log('nb-article-B', await L.openArticle(b.page, app, SUB.sid));
            const again = await L.pressJats(b.page, app);
            log('nb-download-B', {...short(again), identicalToFirst: again.text === first.text});
        }
    } catch (e) {
        out.error = String(e.stack || e.message).slice(0, 900);
        note(`u48r7 ${app.name} a9 ${MODE}: ${out.error.split('\n')[0]}`);
        await L.snap(page, `${K}-error`).catch(() => {});
        console.log(`[${app.name}] ERROR`, out.error);
    } finally {
        record(`${K}-facts`, out);
        await ed.close();
        await b.close();
    }
});
