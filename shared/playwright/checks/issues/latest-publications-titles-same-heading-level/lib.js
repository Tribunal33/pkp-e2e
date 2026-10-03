// Helpers for walk.js (U10 OJS6). Requiring this file runs nothing.
// setContentOrganization (Settings › Website › Appearance › Theme ›
// "Journal Content Organization", tick by label, "Save") is U13 A4's.
const {setContentOrganization, flat} = require('../listing-offers-galley-without-file/lib');

/**
 * The journal home page's heading outline as a screen reader lists it:
 * every h1–h6 in the page body that is not hidden from assistive
 * technology, in document order, with its level, its text and the home
 * page part it sits in ("latest" for "Latest Publications", "issue" for
 * "Current Issue", "" elsewhere).
 */
async function outline(page) {
    return page.evaluate(() =>
        [...document.querySelectorAll('.pkp_structure_main h1, .pkp_structure_main h2, .pkp_structure_main h3, .pkp_structure_main h4, .pkp_structure_main h5, .pkp_structure_main h6')]
            .filter((h) => !h.closest('[aria-hidden="true"]'))
            .map((h) => ({
                level: Number(h.tagName.slice(1)),
                text: h.innerText.replace(/\s+/g, ' ').trim().slice(0, 90),
                part: h.closest('.latest_articles') ? 'latest' : h.closest('.current_issue') ? 'issue' : '',
            }))
    );
}

/** The outline as one line per heading, indented by level ("h2 Latest Publications"). */
function outlineLines(items) {
    return items.map((h) => `${'  '.repeat(h.level - 1)}h${h.level} ${h.text}${h.part ? ` [${h.part}]` : ''}`);
}

module.exports = {setContentOrganization, flat, outline, outlineLines};
