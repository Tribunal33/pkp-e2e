// U48 A8: the article page's "JATS XML" keeps serving the XML it first served
// (for up to 24 hours) after the editor corrects the published version's
// title, and after publishing a version whose "JATS XML" was downloaded from
// "Preview".
//
// Takes the report's steps on PKP's default test dataset (a dataset fleet,
// OJS): `dbarnes` is the editor, a second browser that never signs in is the
// reader. Submission 17 (publication 18, published) for the edit; submission
// 1's unpublished version 1.1 (publication 2) for the preview.
//
// WALK=steps (default) takes the steps. WALK=nb is the neighbour check for a
// fix trial: an uploaded JATS file is still what the reader gets, before and
// after a title edit, and the unpublished version's JATS address stays
// refused to a signed-out reader.
//
//   PROBE_FEATURE=issues-u48r7 PROBE_AGENT=u48r7 node bin/probe.js ojs \
//     shared/playwright/checks/issues/published-jats-xml-stays-old-after-edit/walk.js
'use strict';
const path = require('path');
const {forEachApp, launch, signIn, idle, note, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';
const K = `u48r7-a8-${MODE}`;
const EDIT = {sid: 17, pid: 18, title: 'Antimicrobial resistance in hospital coliforms (u48r7)'};
const PREV = {sid: 1, pid: 2, title: 'Signalling Theory Dividends (u48r7)'};
const short = (d) => (d ? {...d, text: undefined, head: L.flat(d.text, 160)} : d);

forEachApp(async (app) => {
    const out = {mode: MODE, app: app.name, line: app.line, steps: {}};
    const ed = await launch(app);
    const rd = await launch(app);
    const page = ed.page;
    const reader = rd.page;
    const log = (k, v) => {
        out.steps[k] = v;
        console.log(`[${app.name}] ${k}`, JSON.stringify(v));
    };
    try {
        await signIn(page, 'dbarnes');
        await idle(page);

        if (MODE === 'steps') {
            // Steps 1-2: tick "Make available with publication" on submission 17.
            let jp = await L.openJats(page, app, EDIT.sid, EDIT.pid);
            log('s2-tick', {save: await L.tickMakeAvailable(jp)});
            // Step 3: the reader's first download.
            log('s3-article', await L.openArticle(reader, app, EDIT.sid));
            const first = await L.pressJats(reader, app);
            log('s3-download', short(first));
            await L.snap(reader, `${K}-s3-article`);
            // Step 4: the title corrected.
            log('s4-retitle', await L.retitle(page, app, EDIT.sid, EDIT.pid, EDIT.title));
            // Step 5: the "JATS XML" page.
            jp = await L.openJats(page, app, EDIT.sid, EDIT.pid);
            const shown = await jp.xmlText();
            log('s5-jats-page', L.xmlFacts(shown));
            await L.snap(page, `${K}-s5-jats-page`);
            // Step 6: a reader who never downloaded it (a new browser) opens the article and downloads.
            const fresh = await launch(app);
            try {
                log('s6-article', await L.openArticle(fresh.page, app, EDIT.sid));
                const second = await L.pressJats(fresh.page, app);
                log('s6-download', {...short(second), identicalToFirst: second.text === first.text});
                await L.snap(fresh.page, `${K}-s6-article`);
            } finally {
                await fresh.close();
            }

            // Steps 7-8: submission 1's version 1.1: tick, then "Preview" › "JATS XML".
            jp = await L.openJats(page, app, PREV.sid, PREV.pid);
            log('s7-tick', {save: await L.tickMakeAvailable(jp)});
            const tab = await L.openPreview(page);
            await L.snap(tab, `${K}-s8-preview`);
            const preview = await L.pressJats(tab, app);
            log('s8-preview-download', {previewUrl: L.rel(tab.url()), ...short(preview)});
            if (tab !== page) await tab.close().catch(() => {});
            // Step 9: the title of 1.1 changed.
            log('s9-retitle', await L.retitle(page, app, PREV.sid, PREV.pid, PREV.title));
            // Step 10: publish 1.1.
            const {publishShownVersion} = require('../older-version-tab-current-title/lib');
            log('s10-publish', await publishShownVersion(page));
            // Step 11: the reader's download from the article page.
            log('s11-article', await L.openArticle(reader, app, PREV.sid));
            const after = await L.pressJats(reader, app);
            log('s11-download', {...short(after), identicalToPreview: after.text === preview.text});
            await L.snap(reader, `${K}-s11-article`);
            jp = await L.openJats(page, app, PREV.sid, PREV.pid);
            log('s11-jats-page', L.xmlFacts(await jp.xmlText()));
        } else {
            // Neighbour 1: an uploaded file is served, and stays served after a title edit.
            let jp = await L.openJats(page, app, EDIT.sid, EDIT.pid);
            log('nb-tick', {save: await L.tickMakeAvailable(jp)});
            const up = await jp.upload(path.join(L.REPO, 'apps/ojs/playwright/fixtures/files/article.xml'));
            log('nb-upload', {status: up.status()});
            const uploaded = await jp.xmlText();
            log('nb-uploaded-page', L.xmlFacts(uploaded));
            await L.openArticle(reader, app, EDIT.sid);
            const one = await L.pressJats(reader, app);
            log('nb-download-1', short(one));
            log('nb-retitle', await L.retitle(page, app, EDIT.sid, EDIT.pid, EDIT.title));
            await L.openArticle(reader, app, EDIT.sid);
            const two = await L.pressJats(reader, app);
            log('nb-download-2', {...short(two), identicalToFirst: two.text === one.text});
            // Neighbour 2: the unpublished 1.1's JATS address, refused to a signed-out reader.
            jp = await L.openJats(page, app, PREV.sid, PREV.pid);
            log('nb-tick-1.1', {save: await L.tickMakeAvailable(jp)});
            const tab = await L.openPreview(page);
            const href = await tab.locator('a.obj_galley_link.xml').getAttribute('href');
            if (tab !== page) await tab.close().catch(() => {});
            const res = await reader.goto(href).catch((e) => ({error: L.flat(e.message, 200)}));
            const body = L.flat(await reader.locator('body').innerText().catch(() => ''), 300);
            log('nb-unpublished-address', {href: L.rel(href), status: res && res.status ? res.status() : res, body});
            await L.snap(reader, `${K}-nb-unpublished`);
        }
    } catch (e) {
        out.error = String(e.stack || e.message).slice(0, 900);
        note(`u48r7 ${app.name} a8 ${MODE}: ${out.error.split('\n')[0]}`);
        await L.snap(page, `${K}-error`).catch(() => {});
        await L.snap(reader, `${K}-error-reader`).catch(() => {});
        console.log(`[${app.name}] ERROR`, out.error);
    } finally {
        record(`${K}-facts`, out);
        await ed.close();
        await rd.close();
    }
});
