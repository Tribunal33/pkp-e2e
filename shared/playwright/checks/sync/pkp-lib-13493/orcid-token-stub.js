// PR review kit — pkp/pkp-lib#13283 (pkp-lib#13493): a local stand-in for ORCID's token endpoint,
// so a check can choose what `POST https://<orcid>/oauth/token` answers to the app server. The
// test installs' outbound calls are hermetic (`[proxy]` on a dead port): nothing here reaches
// ORCID's service, and nothing may.
//
// What it is: an HTTP proxy on 127.0.0.1:<port>. The app server is pointed at it with
// `[proxy] http_proxy` / `https_proxy` in its config; PHP's curl then sends
// `CONNECT <host>:443`, the stand-in accepts, terminates TLS itself with a certificate for
// that host signed by a throwaway CA of its own, and answers:
//   - `POST /oauth/token` (any host): the status and body of the current answer (ANSWERS below);
//   - anything else, tunnelled or plain: 404.
// Every request it receives is logged (method, address, the form's field names, `code` and
// `client_id`; the secret's value is never written), and so is every TLS handshake that failed
// (the caller did not trust the CA).
//
// The CA: `<dir>/ca.pem` with `ca.key`, made with openssl on the first start and kept for the
// later ones (a running `php -S` reads the path it was started with), plus one key and one
// certificate per requested host. `<dir>` is under `.reports/`, never in the repo.
//
// Trusting it. pkp-lib builds its Guzzle client in `PKPApplication::getHttpClient()` with the
// `[proxy]` keys, a User-Agent and `allow_redirects` only: no `verify` option, and no
// config.inc.php key for a CA bundle (the old `[curl] cainfo` is gone). Guzzle's default
// `verify => true` leaves the bundle to PHP, so the only switch is PHP's own `curl.cainfo`,
// a php.ini setting. The stand-in writes `<dir>/php/99-orcid-stub-ca.ini` holding it, and the
// fleet's server is started with that directory added to PHP's ini scan path:
//
//   node shared/playwright/checks/sync/pkp-lib-13493/orcid-token-stub.js --init --dir <dir>
//   npm run probe-servers -- --stop --dataset <n>
//   PHP_INI_SCAN_DIR=:<dir>/php npm run probe-servers -- --start --dataset <n>
//
// (`php -S` inherits the variable; the leading colon keeps PHP's own conf.d.) No app code and
// no file under `checkouts/` changes for it; the two `[proxy]` lines of the fleet's generated
// config are set by the check that uses the stand-in.
//
// Use from a check (in-process):
//   const {startStub} = require('./orcid-token-stub');
//   const stub = await startStub({dir, port});      // {port, proxyUrl, caFile, iniDir, setAnswer, mark, since, close}
//   stub.setAnswer('401-invalid-client');
//
// Stand-alone:
//   node orcid-token-stub.js --dir <dir> [--port 8670] [--answer 401-invalid-client]
//   curl 'http://127.0.0.1:8670/__stub/answer?name=400-invalid-grant'   # switch the answer
//   curl  http://127.0.0.1:8670/__stub/log                              # what it received
const {execFileSync} = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const tls = require('tls');

const DEFAULT_PORT = 8670;

// ORCID's answers to the token request, by name. `200-token` is ORCID's documented success
// shape (https://info.orcid.org/documentation/api-tutorials/api-tutorial-get-and-authenticated-orcid-id/);
// the 401 `invalid_client` and 400 `invalid_grant` bodies are the shapes its OAuth errors take.
const ANSWERS = {
    '401-invalid-client': {
        status: 401,
        type: 'application/json;charset=UTF-8',
        body: '{"error":"invalid_client","error_description":"Client not found: APP-TEST"}',
    },
    '401-not-json': {status: 401, type: 'text/html;charset=UTF-8', body: '<html><body><h1>401 Unauthorized</h1></body></html>'},
    '401-empty-object': {status: 401, type: 'application/json;charset=UTF-8', body: '{}'},
    '400-invalid-grant': {
        status: 400,
        type: 'application/json;charset=UTF-8',
        body: '{"error":"invalid_grant","error_description":"Invalid authorization code: abc123"}',
    },
    500: {status: 500, type: 'application/json;charset=UTF-8', body: '{"error":"server_error","error_description":"Internal Server Error"}'},
    '200-token': {
        status: 200,
        type: 'application/json;charset=UTF-8',
        body: JSON.stringify({
            access_token: 'f5af9f51-07e6-4332-8f1a-c0c11c1e3728',
            token_type: 'bearer',
            refresh_token: 'f725f747-3a65-49f6-a231-3e8944ce464d',
            expires_in: 631138518,
            scope: '/authenticate',
            name: 'Sofia Garcia',
            orcid: '0000-0001-2345-6789',
        }),
    },
};

function openssl(args, options = {}) {
    return execFileSync('openssl', args, {stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', ...options});
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
            '-subj', '/O=pkp-e2e throwaway/CN=pkp-e2e ORCID stand-in CA',
            '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign',
            '-keyout', caKey, '-out', caFile,
        ]);
        fs.chmodSync(caKey, 0o600);
        for (const file of fs.readdirSync(abs).filter((name) => /^host-.*\.pem$/.test(name))) {
            fs.rmSync(path.join(abs, file)); // signed by the CA this one replaces
        }
        made = true;
    }
    if (!fs.existsSync(leafKey)) {
        openssl(['genrsa', '-out', leafKey, '2048']);
        fs.chmodSync(leafKey, 0o600);
    }
    const iniDir = path.join(abs, 'php');
    fs.writeFileSync(
        path.join(iniDir, '99-orcid-stub-ca.ini'),
        `; pkp-e2e: PHP's curl trusts the ORCID stand-in's throwaway CA (orcid-token-stub.js)\ncurl.cainfo="${caFile}"\nopenssl.cafile="${caFile}"\n`,
    );
    return {dir: abs, caKey, caFile, leafKey, iniDir, made};
}

/** A certificate for `host`, signed by the CA (cached in `dir`). */
function hostCertificate(ca, host) {
    if (!/^[a-z0-9.-]+$/i.test(host)) {
        throw new Error(`not a host name: ${host}`);
    }
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

/**
 * Start the stand-in.
 *
 * @param {{dir: string, port?: number, answer?: string, logFile?: string}} options
 * @returns {Promise<object>}
 */
async function startStub({dir, port = DEFAULT_PORT, answer = '401-invalid-client', logFile} = {}) {
    if (!dir) {
        throw new Error('orcid-token-stub: a --dir under .reports/ is required (the CA and keys are written there)');
    }
    const ca = ensureCa(dir);
    const key = fs.readFileSync(ca.leafKey);
    const contexts = new Map();
    const lines = [];
    let current = answer;
    const log = (line) => {
        const stamped = `${new Date().toISOString()} ${line}`;
        lines.push(stamped);
        if (logFile) {
            fs.appendFileSync(logFile, `${stamped}\n`);
        }
    };
    const setAnswer = (name) => {
        if (!ANSWERS[name]) {
            throw new Error(`orcid-token-stub: no answer named ${name} (${Object.keys(ANSWERS).join(', ')})`);
        }
        current = name;
        log(`[stub] answer set: ${name}`);
    };
    setAnswer(answer);

    // What the tunnelled (TLS-terminated) requests get.
    const inner = http.createServer((req, res) => {
        req.socket.stubAnswered = true;
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const host = req.socket.stubHost || req.headers.host || '?';
            const address = `https://${host}${req.url}`;
            const body = Buffer.concat(chunks).toString('utf8');
            let said = {status: 404, type: 'application/json', body: '{"error":"not_found","error_description":"the ORCID stand-in answers POST /oauth/token only"}'};
            let form = '';
            if (req.method === 'POST' && new URL(address).pathname === '/oauth/token') {
                said = ANSWERS[current];
                const fields = new URLSearchParams(body);
                form = ` form{${[...fields.keys()].join(',')}} code=${fields.get('code')} client_id=${fields.get('client_id')} grant_type=${fields.get('grant_type')} client_secret=(${(fields.get('client_secret') || '').length} chars)`;
            }
            log(`${req.method} ${address} -> ${said.status}${said === ANSWERS[current] ? ` (${current})` : ''}${form} accept=${req.headers.accept || ''} ua=${req.headers['user-agent'] || ''}`);
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
        // a plain (http://) request sent through the proxy, or anything else
        log(`${req.method} ${req.url} -> 404 (plain request, not tunnelled)`);
        res.writeHead(404, {'Content-Type': 'text/plain', Connection: 'close'});
        res.end('the ORCID stand-in answers POST /oauth/token over CONNECT only\n');
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
        if (head && head.length) {
            socket.unshift(head);
        }
        const secure = new tls.TLSSocket(socket, {isServer: true, secureContext});
        secure.stubHost = host;
        secure.on('error', (error) => {
            log(`[stub] TLS with the caller failed for ${host}: ${error.code || ''} ${String(error.message).split('\n')[0]} (the caller does not trust ${path.basename(ca.caFile)}?)`);
        });
        secure.on('close', () => {
            if (!secure.stubAnswered) {
                log(`[stub] the tunnel to ${host} closed before any request: the TLS handshake failed (the caller does not trust ${path.basename(ca.caFile)}: see the header, "Trusting it")`);
            }
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
        caFile: ca.caFile,
        caIsNew: ca.made,
        iniDir: ca.iniDir,
        answers: ANSWERS,
        setAnswer,
        current: () => current,
        mark: () => lines.length,
        since: (from = 0) => lines.slice(from),
        close: () =>
            new Promise((resolve) => {
                outer.closeAllConnections();
                outer.close(() => resolve());
            }),
    };
}

module.exports = {startStub, ensureCa, ANSWERS, DEFAULT_PORT};

if (require.main === module) {
    const args = process.argv.slice(2);
    const value = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
    const dir = value('--dir');
    if (!dir) {
        console.error('usage: node orcid-token-stub.js --dir <a folder under .reports/> [--init] [--port 8670] [--answer <name>]');
        console.error(`answers: ${Object.keys(ANSWERS).join(', ')}`);
        process.exit(1);
    }
    if (args.includes('--init')) {
        const ca = ensureCa(dir);
        console.log(`CA ${ca.caFile}${ca.made ? ' (new)' : ' (kept)'}`);
        console.log(`start the fleet's server with PHP_INI_SCAN_DIR=:${ca.iniDir}`);
    } else {
        startStub({dir, port: Number(value('--port', DEFAULT_PORT)), answer: value('--answer', '401-invalid-client'), logFile: path.join(path.resolve(dir), 'stub.log')})
            .then((stub) => console.log(`ORCID stand-in on ${stub.proxyUrl} (answer ${stub.current()}); log ${path.join(path.resolve(dir), 'stub.log')}`))
            .catch((error) => {
                console.error(String(error.message));
                process.exit(1);
            });
    }
}
