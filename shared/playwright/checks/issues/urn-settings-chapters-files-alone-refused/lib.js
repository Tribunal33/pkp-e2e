// Shared screen helpers for walk.js and neighbour.js (spec U44 register OMP1).
// Opens the URN plugin's settings window through the screens (U44 A8's helpers), sets exactly the given
// "Press Content" boxes, fills the starred fields, "Save", and, after a save, reopens the window to read the boxes.
const A8 = require('../urn-suffix-pattern-refusal-text-code/lib');

const {sleep, flat, snap, form} = A8;

// The "Press Content" boxes, by their label on screen.
const BOXES = {Monographs: 'enablePublicationURN', Chapters: 'enableChapterURN', 'Publication Formats': 'enableRepresentationURN', Files: 'enableSubmissionFileURN'};

async function readBoxes(page) {
    const f = form(page);
    const out = {};
    for (const [label, name] of Object.entries(BOXES)) {
        const c = f.locator(`input[type=checkbox][name="${name}"]`);
        out[label] = (await c.count()) ? await c.isChecked() : 'absent';
    }
    return out;
}

/** Steps 4-8: "Settings" on the URN row, tick exactly `kinds`, prefix, default patterns, namespace, resolver, "Save". */
async function trySave(page, app, kinds, name) {
    const out = {kinds};
    out.open = await A8.openUrnSettings(page, app, `${name}-a-open`);
    const f = form(page);
    for (const [label, box] of Object.entries(BOXES)) {
        const c = f.locator(`input[type=checkbox][name="${box}"]`);
        if (!(await c.count())) continue;
        if ((await c.isChecked()) !== kinds.includes(label)) await c.click();
    }
    await f.locator('input[name="urnPrefix"]').fill('urn:nbn:de:0000-');
    await f.locator('input[type=radio][name="urnSuffix"][value="default"]').check();
    await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
    await f.locator('input[name="urnResolver"]').fill('https://nbn-resolving.de/');
    out.ticked = await readBoxes(page);
    await snap(page, `${name}-b-filled`, {ticked: out.ticked});
    const s = await A8.save(page, app, `${name}-c-saved`);
    Object.assign(out, {saveStatus: s.saveStatus, windowOpen: s.windowOpen, top: s.top, notices: s.notices});
    if (!s.windowOpen) {
        await A8.openUrnSettings(page, app, `${name}-d-reopened`);
        out.reopened = await readBoxes(page);
        await A8.closeWindow(page);
    } else {
        await A8.closeWindow(page);
    }
    return out;
}

module.exports = {BOXES, readBoxes, trySave, sleep, flat, snap};
