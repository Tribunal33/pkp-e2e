#!/usr/bin/env node
/**
 * @file bin/plugin-sandbox.js
 *
 * The bot's side of the plugin sandbox (harness.md "The plugin sandbox"):
 * a third-party plugin runs only in a rootless Podman pod owned by the
 * sandbox user e2e-plugin, whose every outbound packet the host logs and
 * drops unless the review's request allowed the host. This script stages
 * what the pod needs (read and copied as the bot, nothing executed), drives
 * sandbox/pod.sh through the sandbox's socket, and reads what comes back
 * as data.
 *
 *   node bin/plugin-sandbox.js stage <review> [--package <file.tar.gz>]… [--gallery <plugins.xml>] [--copy <dir>:<app path>]…
 *   node bin/plugin-sandbox.js allow <review> <host>… [--hours N]   (before up: the pod reads the allowance when it starts)
 *   node bin/plugin-sandbox.js up|logs|down|status <review>
 *   node bin/plugin-sandbox.js snapshot <review> <label>
 *   node bin/plugin-sandbox.js diff <review> <from> <to>
 *   node bin/plugin-sandbox.js egress <review>
 *   node bin/plugin-sandbox.js php <review> <args>…
 *   node bin/plugin-sandbox.js purge <review>    (after the report: in/, out/ and .reports/plugin-review/<review>)
 *   node bin/plugin-sandbox.js canary
 *
 * OJS on stable-3_5_0 for now: the app is the line checkout with the
 * harness's overlays left out, the data PKP's dataset for the line. The
 * app answers at http://127.0.0.1:13000 (admin / admin and the dataset's
 * users), Mailpit at http://127.0.0.1:13025. `--gallery` takes the plugin
 * gallery's XML (the PR's plugins.xml): the app's gallery reads it from the
 * pod, and each release whose MD5 is a staged --package file's is
 * served from the pod too, so the install takes the app's real gallery
 * path, MD5 check included, without leaving the machine. `down` also
 * withdraws every egress allowance. `canary` is the acceptance test of
 * the walls: re-run it after any change to sandbox/ or the VM setup.
 */
process.env.PKP_E2E_LINE = process.env.PKP_E2E_LINE || 'stable-3_5_0';

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const {execFileSync, spawnSync} = require('child_process');
const {REPO_ROOT, resolveApp} = require('./apps.js');
const {DATASETS_DIR, cleanDump} = require('../shared/playwright/dataset.js');
const {patchIni} = require('../shared/playwright/ini.js');

const ROOT = '/srv/plugin-sandbox';
const IN = path.join(ROOT, 'in');
const OUT = path.join(ROOT, 'out');
const SOCKET = '/run/plugin-sandbox.sock';
const EGRESS_LOG = '/var/log/plugin-egress.log';
const APP_URL = 'http://127.0.0.1:13000';
const GALLERY_URL = 'http://127.0.0.1:8081'; // inside the pod
const APP_NAME = 'ojs';

function die(message) {
    console.error(`plugin-sandbox: ${message}`);
    process.exit(1);
}

function reviewId(value) {
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(value || '')) die('a review id is lowercase letters, digits and dashes');
    return value;
}

/**
 * One request through the sandbox's socket: `egress` runs plugin-egress as
 * root, `pod` runs pod.sh as e2e-plugin (sandbox/vm/plugin-sandbox-dispatch).
 * Not sudo: the bot's unit sets NoNewPrivileges. The output is printed as
 * it arrives; the dispatcher's last line carries the exit status.
 */
function request(kind, args, {check = true, quiet = false} = {}) {
    if (args.some((a) => /[\t\n]/.test(String(a)))) die('an argument holds a tab or a newline');
    return new Promise((resolve) => {
        let pending = '';
        let status = null;
        const socket = net.createConnection(SOCKET, () => socket.write(`${[kind, ...args].join('\t')}\n`));
        const emit = (line) => {
            const m = line.match(/^__exit__ (\d+)$/);
            if (m) status = Number(m[1]);
            else if (!quiet) console.log(line);
        };
        socket.setEncoding('utf8');
        socket.on('data', (chunk) => {
            const lines = (pending + chunk).split('\n');
            pending = lines.pop();
            lines.forEach(emit);
        });
        socket.on('error', (error) => die(`the sandbox socket ${SOCKET}: ${error.message} (is sandbox/vm/setup.sh installed?)`));
        socket.on('close', () => {
            if (pending) emit(pending);
            if (status === null) status = 1;
            if (check && status !== 0) die(`${kind === 'pod' ? 'pod.sh' : 'plugin-egress'} ${args[0]} failed (exit ${status})`);
            resolve(status);
        });
    });
}

const pod = (args, options) => request('pod', args, options);
const egressHelper = (args, options) => request('egress', args, options);

function md5(file) {
    return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
}

/** The harness's files in the checkout, which the sandbox's copy leaves out. */
function overlayExcludes(appRoot) {
    const manifest = path.join(appRoot, '.pkp-e2e-mount.json');
    const mounted = fs.existsSync(manifest) ? Object.keys(JSON.parse(fs.readFileSync(manifest, 'utf8'))) : [];
    return [
        '.git',
        'node_modules/',
        '/cache/*',
        '/public/',
        '/public-ds*/',
        '/config.inc.php',
        '/config.test*.inc.php',
        '/.pkp-e2e-mount.json',
        ...mounted.map((file) => `/${file}`),
    ];
}

function stage(review, argv) {
    const packages = [];
    const copies = [];
    let gallery = null;
    for (let i = 0; i < argv.length; i++) {
        const value = argv[i + 1];
        if (argv[i] === '--package' && value) packages.push(path.resolve(value)), i++;
        else if (argv[i] === '--gallery' && value) (gallery = path.resolve(value)), i++;
        else if (argv[i] === '--copy' && value && value.includes(':')) copies.push(value.split(':')), i++;
        else die(`stage: unknown argument ${argv[i]}`);
    }
    for (const file of [...packages, ...(gallery ? [gallery] : [])]) {
        if (!fs.existsSync(file)) die(`stage: no such file ${file}`);
    }

    const app = resolveApp(APP_NAME);
    const source = path.join(DATASETS_DIR, APP_NAME, app.line, 'pgsql');
    if (!fs.existsSync(path.join(source, 'database.sql'))) die(`no ${app.line} dataset at ${source} (npm run fetch-datasets)`);
    const dir = path.join(IN, review);
    fs.rmSync(dir, {recursive: true, force: true});
    for (const sub of ['app', 'files', 'gallery']) fs.mkdirSync(path.join(dir, sub), {recursive: true});

    const excludes = path.join(dir, '.excludes');
    fs.writeFileSync(excludes, overlayExcludes(app.root).join('\n') + '\n');
    execFileSync('rsync', ['-a', `--exclude-from=${excludes}`, `${app.root}/`, `${dir}/app/`], {stdio: 'inherit'});
    fs.rmSync(excludes);

    // The dataset: files, public files (with the directories the installer
    // makes, as dataset.js does), the dump as the harness loads it.
    execFileSync('cp', ['-r', `${source}/files/.`, `${dir}/files/`]);
    fs.mkdirSync(path.join(dir, 'app', 'public'), {recursive: true});
    execFileSync('cp', ['-r', `${source}/public/.`, `${dir}/app/public/`]);
    for (const sub of ['site', 'journals']) fs.mkdirSync(path.join(dir, 'app', 'public', sub), {recursive: true});
    const {text, counts} = cleanDump(path.join(source, 'database.sql'));
    fs.writeFileSync(path.join(dir, 'db.sql'), text);

    const config = patchIni(fs.readFileSync(path.join(source, 'config.inc.php'), 'utf8'), {
        general: {
            base_url: `"${APP_URL}"`,
            allowed_hosts: `"[\\"127.0.0.1\\",\\"127.0.0.1:13000\\"]"`,
            // The app's own beacon would fill the egress log with core traffic.
            enable_beacon: 'Off',
        },
        database: {host: '"127.0.0.1"', username: 'ojs-ci', password: 'ojs-ci', name: 'ojs-ci'},
        files: {files_dir: '/sandbox/files', public_files_dir: 'public'},
        email: {default: 'smtp', smtp: 'On', smtp_server: '127.0.0.1', smtp_port: '1025'},
        security: {plugin_gallery_urls: `'["${GALLERY_URL}/plugins.xml"]'`},
    });
    fs.writeFileSync(path.join(dir, 'app', 'config.inc.php'), `; Generated by bin/plugin-sandbox.js stage — the sandbox's config\n${config}`);

    const staged = [];
    for (const file of packages) {
        fs.copyFileSync(file, path.join(dir, 'gallery', path.basename(file)));
        staged.push({file: path.basename(file), md5: md5(file)});
    }
    if (gallery) {
        let xml = fs.readFileSync(gallery, 'utf8');
        let served = 0;
        // A release whose md5 is a staged package's is served from the pod.
        xml = xml.replace(/<release\b[^>]*\bmd5="([0-9a-f]{32})"[\s\S]*?<\/release>/g, (release, sum) => {
            const match = staged.find((p) => p.md5 === sum);
            if (!match) return release;
            served++;
            return release.replace(/<package>\s*[^<]+?\s*<\/package>/, `<package>${GALLERY_URL}/${encodeURIComponent(match.file)}</package>`);
        });
        fs.writeFileSync(path.join(dir, 'gallery', 'plugins.xml'), xml);
        if (packages.length && !served) die("stage: no <release> in the gallery XML has a staged --package file's MD5");
    }
    for (const [from, to] of copies) {
        const target = path.join(dir, 'app', to);
        if (!target.startsWith(path.join(dir, 'app') + path.sep)) die(`stage: --copy target outside the app: ${to}`);
        fs.mkdirSync(target, {recursive: true});
        execFileSync('cp', ['-r', `${path.resolve(from)}/.`, `${target}/`]);
    }

    const commit = spawnSync('git', ['-C', app.root, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).stdout.trim();
    const meta = {review, staged: new Date().toISOString(), app: APP_NAME, line: app.line, commit, packages: staged, gallery: Boolean(gallery), copies: copies.map(([, to]) => to)};
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    execFileSync('chmod', ['-R', 'g+rX', dir]);
    console.log(
        `staged ${review}: ${app.line} ${APP_NAME} at ${commit.slice(0, 10)}, dataset ${app.line} ` +
            `(${counts.cleanDropped} --clean drops, ${counts.ownerDropped} OWNER TO lines left out), ` +
            `${staged.length} package(s)${gallery ? ', gallery XML' : ''}${copies.length ? `, ${copies.length} copied dir(s)` : ''}`,
    );
}

function meta(review) {
    const file = path.join(IN, review, 'meta.json');
    if (!fs.existsSync(file)) die(`nothing staged for ${review}`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Tree and table snapshots compared: what the plugin (or the drive) changed between two labels. */
function diff(review, from, to) {
    const dir = (label) => path.join(OUT, review, 'snapshots', label);
    for (const label of [from, to]) if (!fs.existsSync(dir(label))) die(`no snapshot ${label} for ${review}`);
    const tree = (label) =>
        new Map(
            fs
                .readFileSync(path.join(dir(label), 'tree.txt'), 'utf8')
                .split('\n')
                .filter(Boolean)
                .map((line) => [line.slice(66), line.slice(0, 64)]),
        );
    const a = tree(from);
    const b = tree(to);
    const added = [...b.keys()].filter((f) => !a.has(f));
    const removed = [...a.keys()].filter((f) => !b.has(f));
    const changed = [...b.keys()].filter((f) => a.has(f) && a.get(f) !== b.get(f));
    const out = [`# ${review}: ${from} → ${to}`, ''];
    const list = (title, files) => {
        out.push(`## ${title} (${files.length})`, ...files.slice(0, 200).map((f) => `- ${f}`));
        if (files.length > 200) out.push(`- … ${files.length - 200} more`);
        out.push('');
    };
    list('Files added', added);
    list('Files removed', removed);
    list('Files changed', changed);

    const lines = (label, file) => {
        const full = path.join(dir(label), file);
        return fs.existsSync(full) ? fs.readFileSync(full, 'utf8').split('\n').filter(Boolean) : [];
    };
    const setDiff = (x, y) => {
        const counts = new Map();
        for (const line of y) counts.set(line, (counts.get(line) || 0) + 1);
        return x.filter((line) => (counts.get(line) || 0) === 0 || (counts.set(line, counts.get(line) - 1), false));
    };
    const schemaAdded = setDiff(lines(to, 'schema.tsv'), lines(from, 'schema.tsv'));
    const schemaRemoved = setDiff(lines(from, 'schema.tsv'), lines(to, 'schema.tsv'));
    out.push(`## Schema: ${schemaAdded.length} column(s) added, ${schemaRemoved.length} removed`);
    out.push(...schemaAdded.map((l) => `+ ${l}`), ...schemaRemoved.map((l) => `- ${l}`), '');
    const countMap = (label) => new Map(lines(label, 'counts.tsv').map((l) => l.split('\t')));
    const ca = countMap(from);
    const cb = countMap(to);
    const moved = [...new Set([...ca.keys(), ...cb.keys()])].filter((t) => ca.get(t) !== cb.get(t));
    out.push(`## Row counts changed (${moved.length})`, ...moved.map((t) => `- ${t}: ${ca.get(t) ?? 'absent'} → ${cb.get(t) ?? 'absent'}`), '');
    const tables = fs.readdirSync(dir(to)).filter((f) => f.endsWith('.csv'));
    for (const table of tables) {
        const before = lines(from, table);
        const after = lines(to, table);
        const plus = setDiff(after.slice(1), before.slice(1));
        const minus = setDiff(before.slice(1), after.slice(1));
        if (!plus.length && !minus.length) continue;
        out.push(`## ${table.replace(/\.csv$/, '')} (watched): ${plus.length} row(s) added or changed, ${minus.length} removed or changed`);
        out.push(`  columns: ${after[0] || before[0]}`);
        out.push(...plus.slice(0, 50).map((l) => `+ ${l}`), ...minus.slice(0, 50).map((l) => `- ${l}`), '');
    }
    console.log(out.join('\n'));
}

/** The drops and the allowances since the review was staged, and the names the app looked up. */
function egress(review) {
    const since = Date.parse(meta(review).staged);
    const drops = new Map();
    const audit = [];
    const text = fs.existsSync(EGRESS_LOG) ? fs.readFileSync(EGRESS_LOG, 'utf8') : '';
    for (const line of text.split('\n')) {
        const stamp = Date.parse(line.split(' ')[0]);
        if (!(stamp >= since)) continue;
        if (line.includes('plugin-egress: drop ')) {
            const field = (k) => (line.match(new RegExp(`\\b${k}=(\\S+)`)) || [])[1] || '?';
            const key = `${field('PROTO')} ${field('DST')}:${field('DPT')}`;
            const seen = drops.get(key) || {count: 0, first: line.split(' ')[0]};
            seen.count++;
            seen.last = line.split(' ')[0];
            drops.set(key, seen);
        } else if (line.includes('plugin-egress: ')) {
            audit.push(line.replace(/^\S+ /, '').trim());
        }
    }
    const names = new Map();
    const dns = path.join(OUT, review, 'dns.log');
    if (fs.existsSync(dns)) {
        for (const line of fs.readFileSync(dns, 'utf8').split('\n')) {
            const m = line.match(/^(\S+) .*query\[(\w+)\] (\S+) from/);
            if (!m) continue;
            const seen = names.get(m[3]) || {types: new Set(), first: m[1]};
            seen.types.add(m[2]);
            names.set(m[3], seen);
        }
    }
    console.log(`# ${review}: egress since ${meta(review).staged}`);
    console.log(`\n## Allowances (${audit.length})`);
    for (const line of audit) console.log(`- ${line}`);
    console.log(`\n## Connections dropped (${drops.size} destinations)`);
    for (const [key, seen] of drops) console.log(`- ${key} ×${seen.count} (${seen.first} … ${seen.last})`);
    console.log(`\n## Names looked up, none answered (${names.size})${fs.existsSync(dns) ? '' : ' — no dns.log yet: run `logs` first'}`);
    for (const [name, seen] of names) console.log(`- ${name} (${[...seen.types].join(', ')}; first ${seen.first})`);
}

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({status: res.statusCode, body}));
        }).on('error', reject);
    });
}

/** The acceptance test of the walls: a plugin that tries every way out. */
async function canary() {
    const review = 'canary';
    await pod(['down', review], {check: false, quiet: true});
    stage(review, ['--copy', `${path.join(REPO_ROOT, 'sandbox', 'canary')}:plugins/generic/sandboxCanary`]);
    await pod(['up', review]);
    await pod(['snapshot', review, 'before']);
    const res = await get(`${APP_URL}/plugins/generic/sandboxCanary/probe.php`);
    await pod(['snapshot', review, 'after']);
    await pod(['logs', review]);
    let probe;
    try {
        probe = JSON.parse(res.body);
    } catch {
        await pod(['down', review]);
        die(`the canary did not answer JSON (HTTP ${res.status}): ${res.body.slice(0, 500)}`);
    }
    const dns = fs.readFileSync(path.join(OUT, review, 'dns.log'), 'utf8');
    const drops = fs.readFileSync(EGRESS_LOG, 'utf8').split('\n').filter((l) => Date.parse(l.split(' ')[0]) >= Date.parse(meta(review).staged) && l.includes('plugin-egress: drop '));
    const tree = fs.readFileSync(path.join(OUT, review, 'snapshots', 'after', 'tree.txt'), 'utf8');
    const checks = [
        ['runs as an unprivileged uid', /^33:/.test(probe.whoami)],
        ['every capability dropped', /CapEff:\s*0+\b/.test(probe.capabilities)],
        ["the bot's home does not exist", probe.botHome === 'absent'],
        ["the bot's credentials are unreadable", probe.botCredentials === 'denied'],
        ['/etc/shadow is unreadable', probe.shadow === 'denied'],
        ['a name lookup gets no address', probe.dnsLookup === 'no address'],
        ['the lookup is in the DNS log', dns.includes('sandbox-canary.example.org')],
        ['HTTP by name fails', probe.httpByName === 'failed'],
        ['HTTPS to an address fails', /^failed/.test(probe.httpsByAddress)],
        ['the address attempt is in the egress log', drops.some((l) => l.includes('DST=1.1.1.1 ') && l.includes('DPT=443'))],
        ["the host's own services are unreachable", Object.values(probe.hostServices).every((v) => v === 'failed')],
        ['a file written outside the plugin shows in the snapshot', tree.includes('app/plugins/generic/sandboxCanaryDrop/dropped.txt')],
    ];
    await pod(['down', review]);
    console.log('\ncanary:');
    for (const [name, ok] of checks) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}`);
    console.log(`\nprobe answer:\n${JSON.stringify(probe, null, 2)}`);
    if (checks.some(([, ok]) => !ok)) die('the canary got through a wall');
    console.log('\ncanary: every wall held');
}

async function main() {
    const [command, ...rest] = process.argv.slice(2);
    switch (command) {
        case 'stage':
            return stage(reviewId(rest[0]), rest.slice(1));
        case 'allow':
            return egressHelper(['allow', reviewId(rest[0]), ...rest.slice(1)]);
        case 'up':
            meta(reviewId(rest[0]));
            return pod(['up', rest[0]]);
        case 'snapshot':
            return pod(['snapshot', reviewId(rest[0]), rest[1] || die('snapshot needs a label')]);
        case 'logs':
            return pod(['logs', reviewId(rest[0])]);
        case 'down':
            await pod(['down', reviewId(rest[0])]);
            return egressHelper(['reset']);
        case 'status':
            return pod(['status']);
        case 'purge':
            await pod(['purge', reviewId(rest[0])]);
            fs.rmSync(path.join(IN, rest[0]), {recursive: true, force: true});
            fs.rmSync(path.join(REPO_ROOT, '.reports', 'plugin-review', rest[0]), {recursive: true, force: true});
            return console.log(`purge: ${rest[0]} removed from in/, out/ and .reports/plugin-review/`);
        case 'php':
            return pod(['php', reviewId(rest[0]), ...rest.slice(1)]);
        case 'diff':
            return diff(reviewId(rest[0]), rest[1] || die('diff needs two labels'), rest[2] || die('diff needs two labels'));
        case 'egress':
            return egress(reviewId(rest[0]));
        case 'canary':
            return canary();
        default:
            die('usage: plugin-sandbox.js stage|allow|up|snapshot|diff|egress|logs|php|down|purge|status|canary … (see the file header)');
    }
}

main().catch((error) => die(error.stack || String(error)));
