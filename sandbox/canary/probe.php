<?php
/**
 * The plugin sandbox's canary (bin/plugin-sandbox.js canary): a stand-in for
 * a plugin that tries every way out of the sandbox, harmlessly. It runs as a
 * plugin's code does, inside the app container, and answers what each
 * attempt got; the canary command checks the answers against the host's
 * egress log, the pod's DNS log and the file-tree snapshot.
 */
header('Content-Type: application/json');
$results = [];
$try = function (string $name, callable $attempt) use (&$results) {
    try {
        $results[$name] = $attempt();
    } catch (\Throwable $e) {
        $results[$name] = 'error: ' . $e->getMessage();
    }
};
$connect = function (string $host, int $port): string {
    $socket = @fsockopen($host, $port, $errno, $errstr, 3);
    if ($socket) {
        fclose($socket);
        return 'CONNECTED';
    }
    return 'failed';
};

$try('whoami', fn () => posix_getuid() . ':' . posix_getgid());
$try('capabilities', fn () => trim(implode(' ', preg_grep('/^Cap(Eff|Bnd):/', file('/proc/self/status')))));
$try('processes', fn () => count(glob('/proc/[0-9]*')));
$try('botHome', fn () => file_exists('/home/e2e') ? 'VISIBLE' : 'absent');
$try('botCredentials', fn () => @file_get_contents('/home/e2e/.claude.json') === false ? 'denied' : 'READ');
$try('shadow', fn () => @file_get_contents('/etc/shadow') === false ? 'denied' : 'READ');
$try('dnsLookup', function () {
    $address = gethostbyname('sandbox-canary.example.org');
    return $address === 'sandbox-canary.example.org' ? 'no address' : "RESOLVED $address";
});
$try('httpByName', function () {
    $context = stream_context_create(['http' => ['timeout' => 3]]);
    return @file_get_contents('http://sandbox-canary.example.org/', false, $context) === false ? 'failed' : 'REACHED';
});
$try('httpsByAddress', fn () => $connect('1.1.1.1', 443) === 'CONNECTED' ? 'CONNECTED' : 'failed');
$try('hostServices', function () use ($connect) {
    $out = [];
    foreach (['host.containers.internal', '169.254.1.2', '10.0.2.2'] as $host) {
        foreach ([5432, 22, 1025] as $port) {
            $out["$host:$port"] = $connect($host, $port);
        }
    }
    return $out;
});
// This machine's own addresses (targets.json, written by the canary command).
$try('ownAddresses', function () use ($connect) {
    $targets = json_decode((string) @file_get_contents(__DIR__ . '/targets.json'), true) ?: ['own' => []];
    $out = [];
    foreach ($targets['own'] as $address) {
        $host = str_contains($address, ':') ? "[$address]" : $address;
        foreach ([22, 5432, 19000] as $port) {
            $out["$host:$port"] = $connect($host, $port);
        }
    }
    return $out;
});
$dnsQuery = function (string $server): string {
    $packet = "\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00\x07example\x03org\x00\x00\x01\x00\x01";
    $socket = @stream_socket_client("udp://$server:53", $errno, $errstr, 3);
    if (!$socket) {
        return 'no answer';
    }
    stream_set_timeout($socket, 3);
    @fwrite($socket, $packet);
    $answer = @fread($socket, 512);
    fclose($socket);
    return ($answer === false || $answer === '') ? 'no answer' : 'ANSWERED';
};
$try('pastaDns', fn () => $dnsQuery('169.254.1.1') === 'no answer' && $connect('169.254.1.1', 53) === 'failed' ? 'failed' : 'REACHED');
$try('udpDns', fn () => $dnsQuery('1.1.1.1'));
$try('dbProgram', function () {
    $pdo = new PDO('pgsql:host=127.0.0.1;dbname=ojs-ci', 'ojs-ci', 'ojs-ci', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    try {
        $pdo->exec("COPY (SELECT 1) TO PROGRAM 'id'");
        return 'RAN';
    } catch (\Throwable $e) {
        return 'denied: ' . substr($e->getMessage(), 0, 160);
    }
});
$try('writeOutsidePlugin', function () {
    $dir = dirname(__DIR__) . '/sandboxCanaryDrop';
    @mkdir($dir);
    return @file_put_contents("$dir/dropped.txt", 'canary') !== false ? 'written (inside the pod only)' : 'failed';
});

// Last: the app's PHP log becomes a link to a host-looking file, which
// `logs` must not follow on the host.
$try('logLink', function () {
    $log = '/sandbox/log/php-error.log';
    @unlink($log);
    return @symlink('/etc/hostname', $log) ? 'planted' : 'failed';
});

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
