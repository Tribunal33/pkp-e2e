// Issue report for U10 A20: a thumbnail removed under Settings › Website › "Appearance" › "Setup" ("Journal thumbnail",
// "Press thumbnail", "Server thumbnail") is gone from the box, but its file stays public at its old address. Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), as `rvaca`:
//   WALK=steps (default)  "Setup": "Upload File" h19p-thumbnail.png under the thumbnail and h19p-logo.png under "Logo",
//                         "Save" (step 3); reloaded, both pictures' addresses read (step 4); "Remove" under both, "Save"
//                         (step 5); reloaded, what the boxes show (step 6); signed out, both addresses opened (step 7).
//   WALK=lang             the Steps' second group, which is also the neighbour (fix in and out): an English and a French
//                         thumbnail uploaded, "Save" (L2-3); reloaded, both addresses read, "Save" again untouched and both
//                         opened signed out (L4: neither may go); signed in, "Remove" under the English one only, "Save"
//                         (L5); reloaded, what the boxes show (L6); signed out, both addresses opened (L7: the English one
//                         gone, the French one kept); then "Remove" and "Upload File" h19p-thumbnail-2.png under the
//                         English box in one save, its address opened (the replacement served).
//   WALK=around           the Impact's way round and replacements: a thumbnail and a logo uploaded; the thumbnail replaced
//                         by a harmless PNG (h19p-blank.png), then removed, its address opened after each; a PNG thumbnail
//                         again, then thumbnail and logo replaced by JPEGs in one save; signed out, the old PNG addresses
//                         and the new JPEG ones opened.
// Each step records what it saw and never throws on a state the fix changes.
//
// Reset first:  npm run fleet-prep -- --feature issues-h19p --dataset 8 --reset
// Run (main):   PROBE_FEATURE=issues-h19p PROBE_AGENT=h19p node bin/probe.js all shared/playwright/checks/issues/removed-thumbnail-stays-public/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19p-3_5 PROBE_AGENT=h19p node bin/probe.js all shared/playwright/checks/issues/removed-thumbnail-stays-public/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, outFile, serverLog} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const name = (s) => `a20-${MODE}-${s}`;
    const files = L.makeFiles(path.dirname(outFile('files.txt')));
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => {
        fact(`dialog ${Object.keys(facts.steps).length}`, {type: d.type(), message: d.message()});
        d.accept().catch(() => null);
    });
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out || {});
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const field = L.THUMB[app.name];
    const th = L.box(page, 'appearanceSetup', field, 'en');
    const thFr = L.box(page, 'appearanceSetup', field, 'fr_CA');
    const logo = L.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');
    const setup = async () => {
        await L.openAppearance(page, app, 'setup');
        await th.field.waitFor({timeout: L.T});
    };
    const log = serverLog(app);
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return {url: page.url()}; });
        if (MODE === 'steps') {
            await step('2 Appearance › Setup', async () => { await setup(); return {thumbnail: await L.boxState(page, th), logo: await L.boxState(page, logo)}; });
            await step('3 Upload File h19p-thumbnail.png and h19p-logo.png, Save', async () => {
                const a = await L.pressUploadFile(page, th, files.thumb);
                const b = await L.pressUploadFile(page, logo, files.logo);
                return {thumbnail: a, logo: b, ...(await L.save(page, th))};
            });
            const stored = await step('4 reload, Setup: the pictures\' addresses', async () => {
                await setup();
                return {thumbnail: await L.pictureSrc(th), logo: await L.pictureSrc(logo)};
            });
            record(name('stored'), await screen(page));
            await step('5 Remove both, Save', async () => {
                const from = log.mark();
                const a = await L.pressRemove(th);
                const b = await L.pressRemove(logo);
                const s = await L.save(page, th);
                await L.sleep(500);
                return {thumbnail: a, logo: b, ...s, serverLog: log.since(from)};
            });
            await step('6 reload, Setup: what the boxes show', async () => {
                await setup();
                return {thumbnail: await L.boxState(page, th), logo: await L.boxState(page, logo)};
            });
            record(name('after-remove'), await screen(page));
            await shot(page, name('after-remove'));
            await step('7 sign out, open the thumbnail address', async () => {
                await signOut(page);
                return L.openAddress(page, stored && stored.thumbnail);
            });
            record(name('thumbnail-address'), await screen(page));
            await shot(page, name('thumbnail-address'));
            await step('7 open the logo address (control)', async () => L.openAddress(page, stored && stored.logo));
        } else if (MODE === 'lang') {
            await step('L2-3 Setup, Upload File h19p-thumbnail.png, "French", Upload File h19p-thumbnail-fr.png, Save', async () => {
                await setup();
                const a = await L.pressUploadFile(page, th, files.thumb);
                const lang = await L.showLanguage(th, 'French');
                const b = await L.pressUploadFile(page, thFr, files.thumbFr);
                return {en: a, french: lang, fr: b, ...(await L.save(page, th))};
            });
            const stored = await step('L4 reload, Setup, "French": both addresses; Save untouched (neighbour)', async () => {
                await setup();
                await L.showLanguage(th, 'French');
                const s = {en: await L.pictureSrc(th), fr: await L.pictureSrc(thFr)};
                return {...s, ...(await L.save(page, th))};
            });
            const both = async () => ({
                en: await L.openAddress(page, stored && stored.en),
                fr: await L.openAddress(page, stored && stored.fr),
            });
            await step('L4b signed out after the untouched Save: both addresses (neighbour)', async () => { await signOut(page); return both(); });
            await step('L5 sign in, Setup, "French", Remove under the English thumbnail only, Save', async () => {
                await signIn(page, 'rvaca');
                await setup();
                await L.showLanguage(th, 'French');
                const from = log.mark();
                const r = await L.pressRemove(th);
                const s = await L.save(page, th);
                return {remove: r, ...s, serverLog: log.since(from)};
            });
            await step('L6 reload, Setup, "French": what the boxes show', async () => {
                await setup();
                await L.showLanguage(th, 'French');
                return {en: await L.boxState(page, th), fr: await L.boxState(page, thFr)};
            });
            record(name('after-remove'), await screen(page));
            await shot(page, name('after-remove'));
            await step('L7 sign out, open both addresses (English: the finding; French: the neighbour)', async () => { await signOut(page); return both(); });
            await step('nb sign in, Remove (when shown) and Upload File h19p-thumbnail-2.png under the English box, Save', async () => {
                await signIn(page, 'rvaca');
                await setup();
                const r = await L.pressRemove(th);
                const a = await L.pressUploadFile(page, th, files.thumb2);
                const s = await L.save(page, th);
                await setup();
                return {remove: r, en: a, ...s, src: await L.pictureSrc(th)};
            });
            await step('nb signed out after the new upload: both addresses', async () => { await signOut(page); return both(); });
        } else if (MODE === 'around') {
            const dir = path.dirname(outFile('files.txt'));
            const jpgThumb = await L.makeJpeg(page, dir, 'h19p-thumbnail.jpg');
            const jpgLogo = await L.makeJpeg(page, dir, 'h19p-logo.jpg');
            const srcs = async () => { await setup(); return {thumbnail: await L.pictureSrc(th), logo: await L.pictureSrc(logo)}; };
            await step('W1 Setup, Upload File h19p-thumbnail.png and h19p-logo.png, Save', async () => {
                await setup();
                const a = await L.pressUploadFile(page, th, files.thumb);
                const b = await L.pressUploadFile(page, logo, files.logo);
                return {thumbnail: a, logo: b, ...(await L.save(page, th))};
            });
            const first = await step('W1 reload: the addresses', srcs);
            await step('W2 way round: Remove and Upload File h19p-blank.png under the thumbnail, Save', async () => {
                await setup();
                const r = await L.pressRemove(th);
                const a = await L.pressUploadFile(page, th, files.blank);
                return {remove: r, thumbnail: a, ...(await L.save(page, th))};
            });
            await step('W2 open the thumbnail address (the harmless picture, 188 bytes)', async () => L.openAddress(page, first && first.thumbnail));
            await step('W3 way round: Remove under the thumbnail, Save', async () => {
                await setup();
                const r = await L.pressRemove(th);
                return {remove: r, ...(await L.save(page, th))};
            });
            await step('W3 reload: the boxes', srcs);
            await step('W3 open the thumbnail address (what stays: the harmless picture)', async () => L.openAddress(page, first && first.thumbnail));
            await step('W4 Upload File h19p-thumbnail.png under the thumbnail again, Save', async () => {
                await setup();
                const a = await L.pressUploadFile(page, th, files.thumb);
                return {thumbnail: a, ...(await L.save(page, th))};
            });
            await step('W5 replace both with a JPEG: Remove and Upload File h19p-thumbnail.jpg / h19p-logo.jpg, Save', async () => {
                await setup();
                const r1 = await L.pressRemove(th);
                const a = await L.pressUploadFile(page, th, jpgThumb);
                const r2 = await L.pressRemove(logo);
                const b = await L.pressUploadFile(page, logo, jpgLogo);
                return {thumbRemove: r1, thumbnail: a, logoRemove: r2, logo: b, ...(await L.save(page, th))};
            });
            const second = await step('W5 reload: the new addresses', srcs);
            await step('W6 sign out, open the old PNG addresses and the new JPEG ones', async () => {
                await signOut(page);
                return {
                    oldThumbnail: await L.openAddress(page, first && first.thumbnail),
                    oldLogo: await L.openAddress(page, first && first.logo),
                    newThumbnail: await L.openAddress(page, second && second.thumbnail),
                    newLogo: await L.openAddress(page, second && second.logo),
                };
            });
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
