// Helpers for walk.js (issue report U45-OJS11): the Crossref file "Export DOIs" leaves in the files dir's temp/
// folder on a test install (which cannot fetch Crossref's schema), its journal_article records, and the file
// checked against Crossref's schema outside the app. Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const REPO = path.resolve(__dirname, '../../../../..');
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The fleet's files dir, read from its config. */
function filesDir(app) {
    const config = fs.readFileSync(path.isAbsolute(app.configFile) ? app.configFile : path.join(REPO, app.configFile), 'utf8');
    return (config.match(/^files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
}

/** The Crossref files in temp/ written at or after `since` (ms), newest last. */
function exportedFiles(app, since) {
    const dir = path.join(filesDir(app), 'temp');
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => /^crossref(plugin)?-.*\.xml$/.test(f))
        .map((f) => ({f: path.join(dir, f), m: fs.statSync(path.join(dir, f)).mtimeMs}))
        .filter((x) => x.m >= since - 1000)
        .sort((a, b) => a.m - b.m)
        .map((x) => x.f);
}

/** A journal's Crossref file: per `journal_article` its DOI, page, version relations and Crossmark updates. */
function journalRecords(xml) {
    const out = [];
    for (const m of xml.matchAll(/<journal_article\b[\s\S]*?<\/journal_article>/g)) {
        const block = m[0];
        out.push({
            doi: (block.match(/<doi>([^<]*)<\/doi>/) || [])[1] || null,
            resource: ((block.match(/<resource[^>]*>([^<]*)<\/resource>/) || [])[1] || '').replace(/&amp;/g, '&').replace(/^https?:\/\/[^/]+/, ''),
            relations: [...block.matchAll(/<rel:intra_work_relation[^>]*relationship-type="([^"]+)"[^>]*>([^<]*)</g)].map((r) => `${r[1]} ${r[2]}`),
            updates: [...block.matchAll(/<update\b[^>]*>([^<]*)<\/update>/g)].map((r) => r[1]),
        });
    }
    return out;
}

/** The file against Crossref's 5.4.0 schema, outside the app (the OPS6 walk's validate.php). */
function validate(file) {
    try {
        const out = execFileSync('php', [path.join(__dirname, '../preprint-crossref-file-doi-twice/validate.php'), file], {encoding: 'utf8', timeout: 300000});
        return JSON.parse(out.trim().split('\n').pop());
    } catch (e) {
        return {error: flat(String(e.stdout || e.message), 600)};
    }
}

module.exports = {REPO, filesDir, exportedFiles, journalRecords, validate};
