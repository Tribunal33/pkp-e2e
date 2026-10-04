// Helpers of walk.js (U60 OMP1: a press site never loads the "Site style sheet"). Requiring this file runs nothing.
// The Appearance box helpers are A7's (refused-upload-locks-box/lib.js), the address opener and the context save
// U10 A5's (removed-style-sheet-stays-public/lib.js), "Create Press" U63's (all-dates-error-nothing-published/lib.js).
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');
const A5 = require('../removed-style-sheet-stays-public/lib');
const {createContext} = require('../all-dates-error-nothing-published/lib');

/** The walk's sheets under <dir>/files: the site's and the press's, each drawing a bar with its own words. */
function makeFiles(dir) {
    const d = path.join(dir, 'files');
    fs.mkdirSync(d, {recursive: true});
    const site = path.join(d, 'u60i-site.css');
    const press = path.join(d, 'u60i-press.css');
    fs.writeFileSync(site, 'body::before { content: "u60i site style sheet"; display: block; background: #ff0; }\n');
    fs.writeFileSync(press, 'body::before { content: "u60i press style sheet"; display: block; background: #0ff; }\n');
    return {site, press};
}

/**
 * Open a context's (or the site's, `index`) home page as a visitor: the uploaded style sheets its head links, in
 * order (every `styleSheet.css`), how many style sheets it links in all, and the bar the sheets draw (body::before).
 */
async function look(page, app, ctxPath) {
    const res = await page.goto(app.url(`/index.php/${ctxPath}`));
    await idle(page);
    const hrefs = await page.locator('link[rel="stylesheet"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    const bar = await page.evaluate(() => getComputedStyle(document.body, '::before').content);
    return {
        status: res ? res.status() : null,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        sheetsLinked: hrefs.length,
        uploadedSheets: hrefs.filter((h) => /styleSheet\.css/.test(h)).map((h) => h.replace(/^https?:\/\/[^/]+/, '')),
        bar,
    };
}

module.exports = {...A5, createContext, makeFiles, look};
