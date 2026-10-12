#!/usr/bin/env node
/**
 * @file bin/plugin-fetch.js
 *
 * A plugin review's first lens, integrity (MAINTENANCE "Plugin review"):
 * everything here downloads and reads, nothing from the package runs.
 *
 *   node bin/plugin-fetch.js <gallery PR number> <review>
 *
 * Reads the pkp/plugin-gallery PR's plugins.xml against its base, and for
 * every release the PR adds or changes:
 *   - downloads the package and checks it against the XML's MD5;
 *   - lists the archive before unpacking it (absolute paths, `..`, links
 *     refuse the unpack), checks version.xml against the XML entry;
 *   - clones the homepage repository at the release's tag and lists what
 *     the package has that the source does not, and the reverse;
 *   - for an update, lists what changed since the previous gallery release;
 *   - runs `composer audit` on a bundled composer.lock (lock file only, no
 *     plugins, no scripts);
 *   - maps the code's hot spots (remote calls, code execution, file
 *     writes, hooks, injected scripts) for the reader: a map, not a verdict.
 * Writes .reports/plugin-review/<review>/integrity.md (the reader's input)
 * and leaves the packages, unpacked trees and the PR head's plugins.xml
 * beside it for `bin/plugin-sandbox.js stage`.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {execFileSync, spawnSync} = require('child_process');
const {REPO_ROOT} = require('./apps.js');

const GALLERY = 'pkp/plugin-gallery';

function die(message) {
    console.error(`plugin-fetch: ${message}`);
    process.exit(1);
}

function gh(args) {
    return execFileSync('gh', ['api', ...args], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
}

function fetchTo(url, file) {
    const result = spawnSync('curl', ['-fsSL', '--max-time', '120', '--max-filesize', '104857600', '-o', file, url], {encoding: 'utf8'});
    return result.status === 0 ? null : (result.stderr || `curl exit ${result.status}`).trim();
}

const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');

/** The <plugin> blocks of a plugins.xml by product, each with its releases. */
function parseGallery(xml) {
    const plugins = new Map();
    for (const block of xml.match(/<plugin\b[\s\S]*?<\/plugin>/g) || []) {
        const attr = (name) => (block.match(new RegExp(`<plugin\\b[^>]*\\b${name}="([^"]*)"`)) || [])[1];
        const releases = [];
        for (const rel of block.match(/<release\b[\s\S]*?<\/release>/g) || []) {
            const ra = (name) => (rel.match(new RegExp(`<release\\b[^>]*\\b${name}="([^"]*)"`)) || [])[1];
            releases.push({
                version: ra('version'),
                date: ra('date'),
                md5: ra('md5'),
                package: ((rel.match(/<package>\s*([^<]+?)\s*<\/package>/) || [])[1] || '').trim(),
                compatibility: [...rel.matchAll(/<compatibility application="([^"]+)">([\s\S]*?)<\/compatibility>/g)].map((m) => ({
                    application: m[1],
                    versions: [...m[2].matchAll(/<version>([^<]+)<\/version>/g)].map((v) => v[1]),
                })),
                text: rel,
            });
        }
        plugins.set(attr('product'), {
            product: attr('product'),
            category: attr('category'),
            homepage: ((block.match(/<homepage>([^<]*)<\/homepage>/) || [])[1] || '').trim(),
            releases,
            text: block,
        });
    }
    return plugins;
}

/** tar's verbose listing: refuse anything that could land outside the target or link elsewhere. */
function inspectArchive(file) {
    const listing = execFileSync('tar', ['-tzvf', file], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).split('\n').filter(Boolean);
    const problems = [];
    const names = [];
    for (const line of listing) {
        const type = line[0];
        const name = line.replace(/^.*?\d\d:\d\d(:\d\d)? /, '').replace(/ -> .*$/, '').replace(/ link to .*$/, '');
        names.push(name);
        if (type === 'l' || type === 'h') problems.push(`link: ${line.replace(/^.*?\d\d:\d\d(:\d\d)? /, '')}`);
        if (name.startsWith('/') || name.split('/').includes('..')) problems.push(`path escapes the folder: ${name}`);
        if (!['-', 'd', 'l', 'h'].includes(type)) problems.push(`special file (${type}): ${name}`);
    }
    const tops = [...new Set(names.map((n) => n.split('/')[0]).filter(Boolean))];
    return {count: names.length, tops, problems};
}

function unpack(file, into) {
    fs.rmSync(into, {recursive: true, force: true});
    fs.mkdirSync(into, {recursive: true});
    execFileSync('tar', ['-xzf', file, '-C', into, '--no-same-owner', '--no-same-permissions']);
}

function walk(dir, base = dir, out = []) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, base, out);
        else out.push({rel: path.relative(base, full), size: fs.statSync(full).size});
    }
    return out;
}

/** `diff -rq` between two trees, as lists. */
function treeDiff(a, b, excludes = ['.git', '.github']) {
    const args = ['-rq', ...excludes.flatMap((e) => ['--exclude', e]), a, b];
    const out = spawnSync('diff', args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024}).stdout || '';
    const onlyA = [];
    const onlyB = [];
    const differ = [];
    for (const line of out.split('\n')) {
        let m;
        if ((m = line.match(/^Only in (.+): (.+)$/))) {
            const rel = path.relative(m[1].startsWith(a) ? a : b, path.join(m[1], m[2]));
            (m[1].startsWith(a) ? onlyA : onlyB).push(rel);
        } else if ((m = line.match(/^Files (.+) and (.+) differ$/))) {
            differ.push(path.relative(a, m[1]));
        }
    }
    return {onlyA, onlyB, differ};
}

const HOT_SPOTS = [
    ['code execution', /\b(eval|assert|create_function|shell_exec|exec|system|passthru|proc_open|popen|pcntl_exec)\s*\(|`[^`\n]*\$[^`\n]*`/],
    ['obfuscation', /\b(base64_decode|gzinflate|gzuncompress|str_rot13|hex2bin|convert_uudecode)\s*\(|\\x[0-9a-f]{2}\\x[0-9a-f]{2}\\x[0-9a-f]{2}/i],
    ['remote calls', /\b(curl_exec|curl_init|fsockopen|stream_socket_client|getHttpClient|GuzzleHttp|file_get_contents\s*\(\s*['"]https?:)|https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i],
    ['dynamic include', /\b(include|require)(_once)?\s*\(?\s*\$/],
    ['archives and code writes', /\b(ZipArchive|PharData|Phar|extractTo|installPlugin|move_uploaded_file)\b/],
    ['file writes and deletes', /\b(file_put_contents|fwrite|unlink|rmdir|rename|copy|chmod|mkdir)\s*\(/],
    ['secrets and config', /\b(Config::getVar\s*\(\s*['"](database|security|email)|config\.inc\.php|api_key_secret|salt)\b/],
    ['users and roles', /\b(Repo::user\(\)->(add|edit)|assignUserToGroup|UserUserGroup|user_user_groups|setPassword|Validation::(login|registerUserSession))\b/],
    ['injected scripts and markup', /\b(addJavaScript|addHeader|addStyleSheet)\b|<script\b[^>]*\bsrc=|v-html|\|\s*strip_unsafe_html|nofilter/],
    ['hooks', /\bHook(Registry)?::(add|register)\s*\(\s*['"]([^'"]+)/],
    ['scheduled and queued work', /\b(ScheduledTask|scheduledTasks\.xml|acron|PKPScheduler|Queue::push|dispatch\s*\()/],
];

function hotSpots(root) {
    const found = new Map(HOT_SPOTS.map(([name]) => [name, []]));
    for (const {rel, size} of walk(root)) {
        if (size > 2 * 1024 * 1024 || !/\.(php|inc|tpl|js|vue|xml|json|html)$/i.test(rel)) continue;
        const lines = fs.readFileSync(path.join(root, rel), 'utf8').split('\n');
        lines.forEach((line, i) => {
            for (const [name, re] of HOT_SPOTS) {
                if (re.test(line)) found.get(name).push(`${rel}:${i + 1}: ${line.trim().slice(0, 160)}`);
            }
        });
    }
    return found;
}

function main() {
    const [prArg, reviewArg] = process.argv.slice(2);
    const pr = parseInt(prArg, 10);
    if (!pr || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(reviewArg || '')) die('usage: plugin-fetch.js <gallery PR number> <review>');
    const dir = path.join(REPO_ROOT, '.reports', 'plugin-review', reviewArg);
    fs.rmSync(dir, {recursive: true, force: true});
    for (const sub of ['packages', 'unpacked', 'source']) fs.mkdirSync(path.join(dir, sub), {recursive: true});

    const info = JSON.parse(gh([`repos/${GALLERY}/pulls/${pr}`]));
    const raw = (repo, sha, file) => {
        const target = path.join(dir, file);
        const err = fetchTo(`https://raw.githubusercontent.com/${repo}/${sha}/plugins.xml`, target);
        if (err) die(`plugins.xml at ${repo}@${sha}: ${err}`);
        return fs.readFileSync(target, 'utf8');
    };
    const headXml = raw(info.head.repo.full_name, info.head.sha, 'plugins.xml');
    // The PR's own base is where its branch left the gallery's main, not
    // main's tip today: against the tip, an older PR would seem to change
    // every plugin merged since.
    const mergeBase = JSON.parse(gh([`repos/${GALLERY}/compare/${info.base.sha}...${info.head.sha}`])).merge_base_commit.sha;
    const baseXml = raw(GALLERY, mergeBase, 'plugins.base.xml');
    const head = parseGallery(headXml);
    const base = parseGallery(baseXml);

    const md = [
        `# Integrity: ${GALLERY}#${pr} — ${info.title}`,
        '',
        `- PR head \`${info.head.sha.slice(0, 10)}\` (${info.head.repo.full_name}:${info.head.ref}), merge base \`${mergeBase.slice(0, 10)}\`, by ${info.user.login}, ${info.state}`,
        `- Fetched ${new Date().toISOString()} by bin/plugin-fetch.js; nothing from the packages was run`,
        '',
    ];
    const products = [...head.keys()].filter((p) => !base.has(p) || base.get(p).text !== head.get(p).text);
    const removed = [...base.keys()].filter((p) => !head.has(p));
    if (removed.length) md.push(`**The PR removes plugins:** ${removed.join(', ')}`, '');
    if (!products.length) md.push('The PR changes no <plugin> entry.');
    const summary = [];

    for (const product of products) {
        const plugin = head.get(product);
        const before = base.get(product);
        const known = new Set((before ? before.releases : []).map((r) => `${r.version} ${r.md5}`));
        const releases = plugin.releases.filter((r) => !known.has(`${r.version} ${r.md5}`));
        md.push(`## ${product} (${plugin.category}) — ${before ? 'update' : 'new plugin'}`, '', `- Homepage: ${plugin.homepage || '(none)'}`);
        if (before && before.homepage !== plugin.homepage) md.push(`- **Homepage changed** from ${before.homepage}`);
        md.push('');

        for (const rel of releases) {
            const label = `${product}-${rel.version}`;
            const pkg = path.join(dir, 'packages', `${label}.tar.gz`);
            const compat = rel.compatibility.map((c) => `${c.application} ${c.versions.join(' ')}`).join('; ');
            md.push(`### Release ${rel.version} (${rel.date}) — ${compat}`, '', `- Package: ${rel.package}`);
            const err = rel.package.startsWith('https://') ? fetchTo(rel.package, pkg) : 'the package URL is not https';
            if (err) {
                md.push(`- **Download failed:** ${err}`, '');
                summary.push({label, problem: 'download failed'});
                continue;
            }
            const sum = md5(pkg);
            md.push(`- MD5: ${sum === rel.md5 ? `matches (${sum})` : `**does not match**: XML ${rel.md5}, file ${sum}`}`, `- Size: ${fs.statSync(pkg).size} bytes`);
            const archive = inspectArchive(pkg);
            md.push(`- Archive: ${archive.count} entries, top folder(s) ${archive.tops.join(', ')}${archive.tops.length === 1 && archive.tops[0] === product ? '' : ` (**expected one folder named ${product}**)`}`);
            if (archive.problems.length) {
                md.push('- **Not unpacked**, the listing has:', ...archive.problems.slice(0, 20).map((p) => `  - ${p}`), '');
                summary.push({label, problem: 'unsafe archive'});
                continue;
            }
            const into = path.join(dir, 'unpacked', label);
            unpack(pkg, into);
            const root = archive.tops.length === 1 ? path.join(into, archive.tops[0]) : into;
            const files = walk(root);
            const vendor = files.filter((f) => /(^|\/)vendor\//.test(f.rel));
            const minified = files.filter((f) => /\.min\.js$|\.bundle\.js$/.test(f.rel) || (f.rel.endsWith('.js') && f.size > 300 * 1024));
            const binaries = files.filter((f) => /\.(phar|so|dll|exe|bin|jar|wasm)$/i.test(f.rel));
            md.push(
                `- Files: ${files.length} (${vendor.length} under vendor/), ${files.reduce((s, f) => s + f.size, 0)} bytes`,
                `- Minified or bundled JS: ${minified.length ? minified.map((f) => f.rel).slice(0, 15).join(', ') : 'none'}`,
                `- Binaries: ${binaries.length ? binaries.map((f) => f.rel).join(', ') : 'none'}`,
            );

            const versionXml = path.join(root, 'version.xml');
            if (fs.existsSync(versionXml)) {
                const v = fs.readFileSync(versionXml, 'utf8');
                const tag = (t) => ((v.match(new RegExp(`<${t}>([^<]*)</${t}>`)) || [])[1] || '').trim();
                const checks = [
                    ['application', tag('application'), product],
                    ['type', tag('type'), `plugins.${plugin.category}`],
                    ['release', tag('release'), rel.version],
                ];
                md.push(`- version.xml: ${checks.map(([k, got, want]) => (got === want ? `${k} ${got}` : `**${k} ${got || '(missing)'}, the XML says ${want}**`)).join(', ')}; class ${tag('class') || '(none)'}, lazy-load ${tag('lazy-load') || '(none)'}`);
            } else {
                md.push('- **No version.xml** in the package');
            }

            // The tagged source: the package URL names the tag on GitHub releases.
            const repo = plugin.homepage.match(/github\.com\/([^/]+\/[^/#?]+)/);
            const tagMatch = rel.package.match(/github\.com\/[^/]+\/[^/]+\/releases\/download\/([^/]+)\//);
            if (repo && tagMatch) {
                const src = path.join(dir, 'source', label);
                const clone = spawnSync('git', ['clone', '--quiet', '--depth', '1', '--branch', decodeURIComponent(tagMatch[1]), '--no-recurse-submodules', `https://github.com/${repo[1].replace(/\.git$/, '')}.git`, src], {
                    encoding: 'utf8',
                    env: {...process.env, GIT_TERMINAL_PROMPT: '0', GIT_LFS_SKIP_SMUDGE: '1'},
                });
                if (clone.status !== 0) {
                    md.push(`- Source: **could not clone** ${repo[1]} at ${tagMatch[1]}: ${(clone.stderr || '').trim().split('\n').pop()}`);
                } else {
                    const d = treeDiff(root, src);
                    md.push(
                        `- Source at tag ${tagMatch[1]} (${repo[1]}): ${d.differ.length} file(s) differ, ${d.onlyA.length} only in the package, ${d.onlyB.length} only in the source`,
                        ...(d.differ.length ? [`  - **Differ:** ${d.differ.slice(0, 30).join(', ')}`] : []),
                        ...(d.onlyA.length ? [`  - Only in the package: ${d.onlyA.slice(0, 30).join(', ')}${d.onlyA.length > 30 ? ' …' : ''}`] : []),
                        ...(d.onlyB.length ? [`  - Only in the source: ${d.onlyB.slice(0, 30).join(', ')}${d.onlyB.length > 30 ? ' …' : ''}`] : []),
                    );
                }
            } else {
                md.push('- Source: not compared (the homepage is not a GitHub repository, or the package URL names no release tag)');
            }

            const previous = before && before.releases.find((r) => r.version !== rel.version && r.package.startsWith('https://'));
            if (previous) {
                const prevPkg = path.join(dir, 'packages', `${product}-${previous.version}.tar.gz`);
                const prevErr = fetchTo(previous.package, prevPkg);
                const prevArchive = prevErr ? null : inspectArchive(prevPkg);
                if (prevErr || prevArchive.problems.length) {
                    md.push(`- Previous gallery release ${previous.version}: not compared (${prevErr || 'unsafe archive'})`);
                } else {
                    const prevInto = path.join(dir, 'unpacked', `${product}-${previous.version}`);
                    unpack(prevPkg, prevInto);
                    const prevRoot = prevArchive.tops.length === 1 ? path.join(prevInto, prevArchive.tops[0]) : prevInto;
                    const d = treeDiff(prevRoot, root, ['.git']);
                    md.push(`- Since the previous gallery release ${previous.version}: ${d.differ.length} changed, ${d.onlyB.length} added, ${d.onlyA.length} removed (the reader starts here: \`diff -ru unpacked/${product}-${previous.version} unpacked/${label}\`)`);
                }
            }

            const lock = path.join(root, 'composer.lock');
            if (fs.existsSync(lock)) {
                const tmp = fs.mkdtempSync(path.join(dir, 'audit-'));
                fs.copyFileSync(lock, path.join(tmp, 'composer.lock'));
                if (fs.existsSync(path.join(root, 'composer.json'))) fs.copyFileSync(path.join(root, 'composer.json'), path.join(tmp, 'composer.json'));
                const audit = spawnSync('composer', ['audit', '--locked', '--no-plugins', '--no-scripts', '--no-interaction', '--format=plain'], {cwd: tmp, encoding: 'utf8'});
                md.push(`- composer audit (lock file only): ${(audit.stdout + audit.stderr).trim().split('\n').slice(0, 12).join(' / ') || `exit ${audit.status}`}`);
                fs.rmSync(tmp, {recursive: true, force: true});
            } else if (vendor.length) {
                md.push('- **vendor/ without a composer.lock**: the bundled dependencies cannot be checked against their published versions');
            }

            const spots = hotSpots(root);
            md.push('', `#### Hot spots in ${label} (a map for the reader, not a verdict)`, '');
            for (const [name, hits] of spots) {
                if (!hits.length) continue;
                md.push(`- ${name} (${hits.length})`, ...hits.slice(0, 25).map((h) => `  - \`${h.replace(/`/g, "'")}\``));
                if (hits.length > 25) md.push(`  - … ${hits.length - 25} more`);
            }
            md.push('');
            summary.push({label, md5: sum === rel.md5, unpacked: path.relative(REPO_ROOT, root)});
        }
    }
    fs.writeFileSync(path.join(dir, 'integrity.md'), md.join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'fetch.json'), JSON.stringify({pr, head: info.head.sha, base: mergeBase, products, summary}, null, 2) + '\n');
    console.log(`integrity → ${path.relative(REPO_ROOT, path.join(dir, 'integrity.md'))}`);
    for (const s of summary) console.log(`  ${s.label}: ${s.problem || (s.md5 ? 'MD5 matches' : 'MD5 MISMATCH')}${s.unpacked ? `, unpacked at ${s.unpacked}` : ''}`);
}

main();
