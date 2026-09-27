// U64 K2 seeding: the scratch contexts the "Articles" ("Monographs",
// "Preprints") drives read. Everything goes through the _test scenarios
// (docs/process/scenarios.md "usage[]"); a press's two series are added on
// screen in k2.js (the context scenario takes no series), so the OMP books
// that go into them are seeded there, after the series exist.
//
// Contexts per app (tags start with u64k2):
//   M  the main one: three works with visits in the last 30 days (A, B, C),
//      one with none (D), one with visits 200 days ago and on 2025-01-15
//      only (E); A first published 2024-03-05 (Rule 9's start), A also has
//      visits 60 days ago (Last 90 days). OJS: sections ART and REV, issues
//      1/1 (2025) and 1/2 (2026), both published. OPS: sections PRE and SEC2.
//   P  pagination: 31 works with one abstract view yesterday each.
//   E  nothing published (A1), one section.
//   J  {OJS} JATS: a work with JATS views and one with JATS views alone.
const fs = require('fs');
const path = require('path');
const {tag, outDir} = require('../../../probe');

const FILES = {
    ojs: {pdf: 'article.pdf', html: 'article.html', other: 'notes.md'},
    omp: {pdf: 'article.pdf', html: 'article.html', other: 'notes.md'},
    ops: {pdf: 'preprint.pdf', html: 'preprint.html', other: 'not-an-image.txt'},
};

const stateFile = (app) => path.join(outDir(), `state-${app.name}.json`);

function loadState(app) {
    try {
        return JSON.parse(fs.readFileSync(stateFile(app), 'utf8'));
    } catch {
        return null;
    }
}

function saveState(app, st) {
    fs.writeFileSync(stateFile(app), JSON.stringify(st, null, 2));
}

function reps(app, withFiles) {
    const f = FILES[app.name];
    if (!withFiles) return {};
    return app.name === 'omp'
        ? {publicationFormats: [
            {name: 'PDF', file: f.pdf, genre: 'Book Manuscript'},
            {name: 'HTML', file: f.html, genre: 'Book Manuscript'},
            {name: 'Other', file: f.other, genre: 'Book Manuscript'},
        ]}
        : {galleys: [{label: 'PDF', file: f.pdf}, {label: 'HTML', file: f.html}, {label: 'Other', file: f.other}]};
}

// The main context's works (placement keys per app are added in seedWorks).
const WORKS = [
    {k: 'A', title: 'Alpha usage work', au: 'au1', files: true, datePublished: '2024-03-05', place: 0,
        usage: [{daysAgo: 1, abstractViews: 10, fileViews: [4, 3, 1]}, {daysAgo: 5, abstractViews: 2}, {daysAgo: 60, abstractViews: 4}]},
    {k: 'B', title: 'Beta usage work', au: 'au2', files: true, place: 1,
        usage: [{daysAgo: 2, abstractViews: 5, fileViews: [1]}]},
    {k: 'C', title: 'Gamma usage work', au: 'au1', files: false, place: 2,
        usage: [{daysAgo: 3, abstractViews: 1}]},
    {k: 'D', title: 'Delta quiet work', au: 'au2', files: false, place: 0, usage: []},
    {k: 'E', title: 'Epsilon older work', au: 'au1', files: false, place: 0,
        usage: [{daysAgo: 200, abstractViews: 7}, {date: '2025-01-15', abstractViews: 3}]},
];

// OJS: place 0 = ART in issue 1/1, 1 = REV in issue 1/2, 2 = ART in issue 1/2.
// OPS: place 0/2 = PRE, 1 = SEC2. OMP: the series path given by k2.js (s1/s2/none).
function placement(app, place, series) {
    if (app.name === 'ojs') {
        return [
            {section: 'ART', issue: {volume: 1, number: '1', year: 2025}},
            {section: 'REV', issue: {volume: 1, number: '2', year: 2026}},
            {section: 'ART', issue: {volume: 1, number: '2', year: 2026}},
        ][place];
    }
    if (app.name === 'ops') return {section: place === 1 ? 'SEC2' : 'PRE'};
    return series && series[place] ? {series: series[place]} : {};
}

async function seedWorks(app, ctxTag, series) {
    const out = {};
    for (const w of WORKS) {
        const body = {
            tag: `${ctxTag}${w.k.toLowerCase()}`,
            context: ctxTag,
            submitter: `${ctxTag}${w.au}`,
            title: w.title,
            published: true,
            ...reps(app, w.files),
            ...placement(app, w.place, series),
            ...(w.datePublished ? {datePublished: w.datePublished} : {}),
            ...(w.usage.length ? {usage: w.usage} : {}),
        };
        const r = await app.api.createSubmission(body);
        out[w.k] = {id: r.submissionId, publicationId: r.publicationId, title: w.title};
    }
    return out;
}

async function seedContexts(app) {
    const t0 = Date.now();
    const st = {app: app.name, timings: {}};
    const users = (t) => [
        {username: `${t}au1`, givenName: 'Ada', familyName: 'Quill', roles: ['author']},
        {username: `${t}au2`, givenName: 'Bruno', familyName: 'Zephyr', roles: ['author']},
        {username: `${t}mgr`, givenName: 'Mia', familyName: 'Manager', roles: ['manager']},
        {username: `${t}sed`, givenName: 'Sam', familyName: 'Sectioned', roles: ['sectionEditor']},
    ];
    // M
    const m = tag('u64k2m');
    const mBody = {tag: m, context: {supportedLocales: ['en', 'fr_CA']}, users: users(m)};
    if (app.name === 'ojs') {
        mBody.sections = [{abbrev: 'ART', title: 'Articles'}, {abbrev: 'REV', title: 'Reviews'}];
        mBody.issues = [
            {volume: 1, number: '1', year: 2025, published: true, datePublished: '2025-01-10'},
            {volume: 1, number: '2', year: 2026, published: true},
        ];
    }
    if (app.name === 'ops') {
        mBody.sections = [{abbrev: 'PRE', title: 'Preprints'}, {abbrev: 'SEC2', path: 'sec2', title: 'Second Section'}];
    }
    const mRes = await app.api.createContext(mBody);
    st.M = {tag: m, contextId: mRes.contextId, issues: mRes.issues || []};
    if (app.name !== 'omp') {
        st.M.works = await seedWorks(app, m);
    }
    st.timings.M = Date.now() - t0;
    // E: nothing published
    const e = tag('u64k2e');
    const eRes = await app.api.createContext({tag: e, users: users(e)});
    st.E = {tag: e, contextId: eRes.contextId};
    // P: 31 works with one view yesterday
    const t1 = Date.now();
    const p = tag('u64k2p');
    const pRes = await app.api.createContext({tag: p, users: users(p)});
    st.P = {tag: p, contextId: pRes.contextId, works: []};
    for (let i = 1; i <= 31; i++) {
        const r = await app.api.createSubmission({
            tag: `${p}w${i}`, context: p, submitter: `${p}au1`, title: `Paged work ${String(i).padStart(2, '0')}`,
            published: true, usage: [{daysAgo: 1, abstractViews: i}],
        });
        st.P.works.push(r.submissionId);
    }
    st.timings.P = Date.now() - t1;
    // J: OJS JATS views
    if (app.name === 'ojs') {
        const j = tag('u64k2j');
        const jRes = await app.api.createContext({tag: j, users: users(j)});
        st.J = {tag: j, contextId: jRes.contextId, works: {}};
        const a = await app.api.createSubmission({
            tag: `${j}a`, context: j, submitter: `${j}au1`, title: 'JATS and abstract work', published: true,
            jats: {file: 'article.xml', makePublic: true},
            usage: [{daysAgo: 1, abstractViews: 2, jatsViews: 3}],
        });
        const b = await app.api.createSubmission({
            tag: `${j}b`, context: j, submitter: `${j}au1`, title: 'JATS only work', published: true,
            jats: {file: 'article.xml', makePublic: true},
            usage: [{daysAgo: 1, jatsViews: 2}],
        });
        st.J.works = {a: a.submissionId, b: b.submissionId};
    }
    st.timings.total = Date.now() - t0;
    saveState(app, st);
    return st;
}

module.exports = {seedContexts, seedWorks, loadState, saveState, stateFile};
