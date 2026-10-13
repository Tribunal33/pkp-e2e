// PR review kit — pkp/pkp-lib#13507 (pkp-lib#13508, crossref-ojs#114, crossref-ops#73): a local
// stand-in for Crossref, so a check can see what a deposit sends and what it is answered. The test
// installs' outbound calls are hermetic (`[proxy]` on a dead port): nothing here reaches Crossref
// while an app runs, and nothing may.
//
// What it is: an HTTP proxy on 127.0.0.1:<port>, after ../pkp-lib-13493's ORCID stand-in (in git,
// 290b4d85). The fleet's `[proxy]` keys point at it; PHP (Guzzle's curl for the deposit, libxml's
// PHP streams for the schema, which PKPContainer::settingProxyForStreamContext() sends through the
// same proxy) then sends `CONNECT <host>:443`; the stand-in accepts, ends TLS itself with a
// certificate for that host signed by a throwaway CA, and answers:
//   - a plain `GET http://…` through the proxy (the w3.org files the schema imports) and a tunnelled
//     `GET /schemas/...` (any host): the file from `<dir>/schemas/<host>/...`, a copy of Crossref's
//     published schema set (crossref5.4.0.xsd and every file it includes or imports), fetched
//     once by `--fetch-schemas` before any app runs; anything not in the copy: 404;
//   - `POST /v2/deposits` (any host): the deposit. The `mdFile` part is kept as
//     `<dir>/deposits/<n>.xml` and logged with its DOI; the answer depends on the file: one with an
//     empty `<surname>` gets Crossref's refusal of an invalid file (403, a `doi_batch_diagnostic`
//     with the reason in `<msg>`, the shape crossref-ojs's depositXML() reads); any other gets the
//     current answer (ANSWERS below, `200-ok` unless switched);
//   - anything else: 404.
// The answers are written to the shapes the plugin parses, not captured from Crossref.
//
// Trusting it: as for the ORCID stand-in, `curl.cainfo` (Guzzle) and `openssl.cafile` (PHP
// streams, which libxml uses) in `<dir>/php/99-crossref-stub-ca.ini`, and the fleet's server
// started with that directory on PHP's ini scan path:
//
//   node crossref-stub.js --dir <dir> --fetch-schemas     # the CA, and the schema copy
//   npm run probe-servers -- --stop --dataset <n>
//   PHP_INI_SCAN_DIR=:<dir>/php npm run probe-servers -- --start --dataset <n>
//
// Stand-alone:
//   node crossref-stub.js --dir <dir> [--port 8771] [--answer 200-failure]
//   curl 'http://127.0.0.1:8771/__stub/answer?name=200-ok'   # switch the answer
//   curl  http://127.0.0.1:8771/__stub/log                    # what it received
const {execFileSync} = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const tls = require('tls');

const DEFAULT_PORT = 8771;
const SCHEMA = 'https://www.crossref.org/schemas/crossref5.4.0.xsd';

const diagnostic = ({status, doi, msg, success, failure}) =>
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<doi_batch_diagnostic status="completed" sp="stub">\n' +
    '  <submission_id>1500000001</submission_id>\n' +
    '  <batch_id>e2e-stub-batch</batch_id>\n' +
    `  <record_diagnostic status="${status}">\n    <doi>${doi}</doi>\n    <msg>${msg}</msg>\n  </record_diagnostic>\n` +
    `  <batch_data>\n    <record_count>1</record_count>\n    <success_count>${success}</success_count>\n    <warning_count>0</warning_count>\n    <failure_count>${failure}</failure_count>\n  </batch_data>\n` +
    '</doi_batch_diagnostic>\n';

// What a deposit is answered, by name (the DOI is filled in from the file).
const ANSWERS = {
    '200-ok': (doi) => ({status: 200, body: diagnostic({status: 'Success', doi, msg: 'Successfully added', success: 1, failure: 0})}),
    '200-failure': (doi) => ({status: 200, body: diagnostic({status: 'Failure', doi, msg: 'Record not processed because submitted version: 1 is less or equal to previously submitted version (DOI match)', success: 0, failure: 1})}),
};
const REFUSAL = (doi) => ({
    status: 403,
    body: diagnostic({status: 'Failure', doi, msg: 'Deposit failed: cvc-minLength-valid: Value \'\' with length = \'0\' is not facet-valid with respect to minLength \'1\' for type \'#AnonType_surnameperson_name\'.', success: 0, failure: 1}),
});

function openssl(args) {
    return execFileSync('openssl', args, {stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8'});
}

/** The CA, the leaf key and the php.ini fragment under `dir`, made when missing. */
function ensureCa(dir) {
    const abs = path.resolve(dir);
    fs.mkdirSync(path.join(abs, 'php'), {recursive: true});
    const caKey = path.join(abs, 'ca.key');
    const caFile = path.join(abs, 'ca.pem');
    const leafKey = path.join(abs, 'leaf.key');
    let made = false;
    if (!fs.existsSync(caKey) || !fs.existsSync(caFile)) {
        openssl([
            'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30',
            '-subj', '/O=pkp-e2e throwaway/CN=pkp-e2e Crossref stand-in CA',
            '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign',
            '-keyout', caKey, '-out', caFile,
        ]);
        fs.chmodSync(caKey, 0o600);
        for (const file of fs.readdirSync(abs).filter((name) => /^host-.*\.pem$/.test(name))) {
            fs.rmSync(path.join(abs, file));
        }
        made = true;
    }
    if (!fs.existsSync(leafKey)) {
        openssl(['genrsa', '-out', leafKey, '2048']);
        fs.chmodSync(leafKey, 0o600);
    }
    const iniDir = path.join(abs, 'php');
    fs.writeFileSync(
        path.join(iniDir, '99-crossref-stub-ca.ini'),
        `; pkp-e2e: PHP trusts the Crossref stand-in's throwaway CA (crossref-stub.js)\ncurl.cainfo="${caFile}"\nopenssl.cafile="${caFile}"\n`,
    );
    return {dir: abs, caKey, caFile, leafKey, iniDir, made};
}

/** A certificate for `host`, signed by the CA (cached in `dir`). */
function hostCertificate(ca, host) {
    if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error(`not a host name: ${host}`);
    const certFile = path.join(ca.dir, `host-${host}.pem`);
    if (!fs.existsSync(certFile)) {
        const csr = path.join(ca.dir, `host-${host}.csr`);
        const ext = path.join(ca.dir, `host-${host}.ext`);
        openssl(['req', '-new', '-key', ca.leafKey, '-subj', `/CN=${host}`, '-out', csr]);
        fs.writeFileSync(ext, `subjectAltName=DNS:${host}\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`);
        openssl(['x509', '-req', '-in', csr, '-CA', ca.caFile, '-CAkey', ca.caKey, '-CAcreateserial', '-days', '30', '-sha256', '-extfile', ext, '-out', certFile]);
        fs.rmSync(csr);
        fs.rmSync(ext);
    }
    return fs.readFileSync(certFile);
}

const cachePath = (dir, url) => {
    const u = new URL(url);
    return path.join(path.resolve(dir), 'schemas', u.host, ...u.pathname.split('/').filter(Boolean));
};

function get(url) {
    return new Promise((resolve, reject) => {
        (url.startsWith('http:') ? http : https).get(url, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume();
                resolve(get(new URL(res.headers.location, url).href));
                return;
            }
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => (res.statusCode === 200 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${url}: ${res.statusCode}`))));
        }).on('error', reject);
    });
}

/** Copy the schema and every file it includes or imports (by schemaLocation) into `<dir>/schemas`. */
async function fetchSchemas(dir, root = SCHEMA) {
    const seen = new Set();
    const queue = [root];
    while (queue.length) {
        const url = queue.shift();
        if (seen.has(url)) continue;
        seen.add(url);
        const file = cachePath(dir, url);
        let body;
        if (fs.existsSync(file)) {
            body = fs.readFileSync(file);
        } else {
            body = await get(url);
            fs.mkdirSync(path.dirname(file), {recursive: true});
            fs.writeFileSync(file, body);
        }
        for (const m of body.toString('utf8').matchAll(/<(?:xsd?:)?(?:include|import|redefine)\b[^>]*\bschemaLocation\s*=\s*"([^"]+)"/g)) {
            queue.push(new URL(m[1], url).href);
        }
    }
    return [...seen];
}

/** The `mdFile` part of a multipart body (the deposited XML), as text. */
function mdFile(body, contentType) {
    const boundary = /boundary=("?)([^";]+)\1/.exec(contentType || '');
    if (!boundary) return '';
    for (const part of body.split(`--${boundary[2]}`)) {
        if (/name="mdFile"/.test(part)) return part.replace(/^[\s\S]*?\r\n\r\n/, '').replace(/\r\n$/, '');
    }
    return '';
}

/**
 * Start the stand-in.
 *
 * @param {{dir: string, port?: number, answer?: string, logFile?: string, depositDir?: string}} options
 *   (`depositDir`: where the deposited files go, default `<dir>/deposits`)
 */
async function startStub({dir, port = DEFAULT_PORT, answer = '200-ok', logFile, depositDir: depositsTo} = {}) {
    if (!dir) throw new Error('crossref-stub: a --dir under .reports/ is required (the CA, keys and schema copy are there)');
    const ca = ensureCa(dir);
    const key = fs.readFileSync(ca.leafKey);
    const contexts = new Map();
    const lines = [];
    const depositDir = depositsTo || path.join(path.resolve(dir), 'deposits');
    fs.mkdirSync(depositDir, {recursive: true});
    let deposits = fs.readdirSync(depositDir).length;
    let current = answer;
    const log = (line) => {
        const stamped = `${new Date().toISOString()} ${line}`;
        lines.push(stamped);
        if (logFile) fs.appendFileSync(logFile, `${stamped}\n`);
    };
    const setAnswer = (name) => {
        if (!ANSWERS[name]) throw new Error(`crossref-stub: no answer named ${name} (${Object.keys(ANSWERS).join(', ')})`);
        current = name;
        log(`[stub] answer set: ${name}`);
    };
    setAnswer(answer);

    const inner = http.createServer((req, res) => {
        req.socket.stubAnswered = true;
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const host = req.socket.stubHost || req.headers.host || '?';
            // PHP streams send the full address inside the tunnel (`request_fulluri`), curl the path
            const address = /^https?:\/\//i.test(req.url) ? req.url : `https://${host}${req.url}`;
            const {pathname} = new URL(address);
            let said = {status: 404, type: 'text/plain', body: 'the Crossref stand-in answers GET /schemas/… and POST /v2/deposits only\n'};
            let note = '';
            if (req.method === 'GET' && pathname.startsWith('/schemas/')) {
                const file = cachePath(dir, address);
                if (fs.existsSync(file)) said = {status: 200, type: 'application/xml', body: fs.readFileSync(file)};
                else note = ' (not in the schema copy)';
            } else if (req.method === 'POST' && pathname === '/v2/deposits') {
                const xml = mdFile(Buffer.concat(chunks).toString('utf8'), req.headers['content-type']);
                const n = ++deposits;
                fs.writeFileSync(path.join(depositDir, `${n}.xml`), xml);
                const doi = (/<doi>([^<]*)<\/doi>/.exec(xml) || [])[1] || '';
                const invalid = /<surname\s*\/>|<surname>\s*<\/surname>/.test(xml);
                const a = invalid ? REFUSAL(doi) : ANSWERS[current](doi);
                said = {status: a.status, type: 'application/xml', body: a.body};
                note = ` deposit #${n} doi=${doi} ${invalid ? 'empty <surname> → refusal' : `answer ${current}`} operation=${/name="operation"\r\n\r\n(\w+)/.exec(Buffer.concat(chunks).toString('utf8'))?.[1] || '?'}`;
            }
            log(`${req.method} ${address} -> ${said.status}${note}`);
            res.writeHead(said.status, {'Content-Type': said.type, 'Content-Length': Buffer.byteLength(said.body), Connection: 'close'});
            res.end(said.body);
        });
    });

    const outer = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://stub.invalid');
        if (!/^https?:\/\//i.test(req.url) && url.pathname === '/__stub/answer') {
            try {
                setAnswer(url.searchParams.get('name'));
                res.writeHead(200, {'Content-Type': 'text/plain'});
                res.end(`${current}\n`);
            } catch (error) {
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end(`${error.message}\n`);
            }
            return;
        }
        if (!/^https?:\/\//i.test(req.url) && url.pathname === '/__stub/log') {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end(`${lines.join('\n')}\n`);
            return;
        }
        // a plain (http://) request through the proxy: a schema file from the copy (xml.xsd, MathML …)
        if (req.method === 'GET' && /^http:\/\//i.test(req.url) && fs.existsSync(cachePath(dir, req.url))) {
            const body = fs.readFileSync(cachePath(dir, req.url));
            log(`GET ${req.url} -> 200 (plain, from the schema copy)`);
            res.writeHead(200, {'Content-Type': 'application/xml', 'Content-Length': body.length, Connection: 'close'});
            res.end(body);
            return;
        }
        log(`${req.method} ${req.url} -> 404 (plain request, not in the schema copy)`);
        res.writeHead(404, {'Content-Type': 'text/plain', Connection: 'close'});
        res.end('the Crossref stand-in answers over CONNECT only\n');
    });

    outer.on('connect', (req, socket, head) => {
        const host = String(req.url).replace(/:\d+$/, '');
        let secureContext = contexts.get(host);
        try {
            if (!secureContext) {
                secureContext = tls.createSecureContext({key, cert: hostCertificate(ca, host)});
                contexts.set(host, secureContext);
            }
        } catch (error) {
            log(`CONNECT ${req.url} -> 502 (no certificate: ${String(error.message).split('\n')[0]})`);
            socket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
            return;
        }
        log(`CONNECT ${req.url} -> 200 (TLS ended here)`);
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head && head.length) socket.unshift(head);
        const secure = new tls.TLSSocket(socket, {isServer: true, secureContext});
        secure.stubHost = host;
        secure.on('error', (error) => log(`[stub] TLS with the caller failed for ${host}: ${error.code || ''} ${String(error.message).split('\n')[0]}`));
        secure.on('close', () => {
            if (!secure.stubAnswered) log(`[stub] the tunnel to ${host} closed before any request (the caller does not trust ${path.basename(ca.caFile)}?)`);
        });
        socket.on('error', () => {});
        inner.emit('connection', secure);
    });
    outer.on('clientError', (error, socket) => socket.destroy());

    await new Promise((resolve, reject) => {
        outer.once('error', reject);
        outer.listen(port, '127.0.0.1', resolve);
    });
    log(`[stub] listening on 127.0.0.1:${port}; CA ${ca.caFile}${ca.made ? ' (new)' : ''}`);
    return {
        port,
        proxyUrl: `http://127.0.0.1:${port}`,
        iniDir: ca.iniDir,
        depositDir,
        setAnswer,
        mark: () => lines.length,
        since: (from = 0) => lines.slice(from),
        close: () => new Promise((resolve) => {
            outer.closeAllConnections();
            outer.close(() => resolve());
        }),
    };
}

module.exports = {startStub, ensureCa, fetchSchemas, ANSWERS, DEFAULT_PORT};

if (require.main === module) {
    const args = process.argv.slice(2);
    const value = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
    const dir = value('--dir');
    if (!dir) {
        console.error('usage: node crossref-stub.js --dir <a folder under .reports/> [--fetch-schemas] [--port 8771] [--answer <name>]');
        process.exit(1);
    }
    if (args.includes('--fetch-schemas')) {
        const ca = ensureCa(dir);
        fetchSchemas(dir).then((files) => {
            console.log(`CA ${ca.caFile}${ca.made ? ' (new)' : ' (kept)'}; ${files.length} schema files in ${path.join(path.resolve(dir), 'schemas')}`);
            console.log(`start the fleet's server with PHP_INI_SCAN_DIR=:${ca.iniDir}`);
        }).catch((error) => {
            console.error(String(error.message));
            process.exit(1);
        });
    } else {
        startStub({dir, port: Number(value('--port', DEFAULT_PORT)), answer: value('--answer', '200-ok'), logFile: path.join(path.resolve(dir), 'stub.log')})
            .then((stub) => console.log(`Crossref stand-in on ${stub.proxyUrl}; log ${path.join(path.resolve(dir), 'stub.log')}`))
            .catch((error) => {
                console.error(String(error.message));
                process.exit(1);
            });
    }
}
