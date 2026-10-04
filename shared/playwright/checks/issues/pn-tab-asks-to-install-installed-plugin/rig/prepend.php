<?php
// Walk rig of walk.js: serves the PKP|PN plugin's classes (namespace APP\plugins\generic\pln) from a
// copy of its release outside the app checkout, so the walk runs without adding files to the app.
// Loaded by the fleet's server through PHP_INI_SCAN_DIR (lib.js serveWithPln) and by state.php.
spl_autoload_register(function (string $class): void {
    $prefix = 'APP\\plugins\\generic\\pln\\';
    if (strncmp($class, $prefix, strlen($prefix)) !== 0) {
        return;
    }
    $dir = getenv('U67B_PLN_DIR') ?: dirname(__DIR__, 6) . '/.reports/issues/pln-v4_0_1-0';
    $file = $dir . '/' . strtr(substr($class, strlen($prefix)), '\\', '/') . '.php';
    if (is_file($file)) {
        require $file;
    }
}, true, true);
