<?php
// Validates an export's file text the way the export does, on a machine that reaches NLM's and DOAJ's
// sites (no [proxy]): PubMed by its DOCTYPE (DOMDocument::validate(), as XMLTypeDescription does for
// "xml::dtd"), DOAJ against the plugin's doajArticles.xsd (schemaValidate(), "xml::schema(…)").
// Prints whether the file is valid, how long the check took and every remote file it fetched.
// Usage (from the OJS root): php <this file> pubmed <file.xml> | doaj <file.xml> [<schema.xsd>]
[$self, $kind, $file] = $argv + [null, null, null];
$schema = $argv[3] ?? 'plugins/generic/doaj/doajArticles.xsd';
$fetched = [];
libxml_set_external_entity_loader(function ($public, $system, $context) use (&$fetched) {
    if (preg_match('#^https?://#', $system)) {
        $fetched[] = $system;
    }
    return $system;
});
libxml_use_internal_errors(true);
$started = microtime(true);
$doc = new DOMDocument();
$doc->load($file);
$valid = $kind === 'pubmed' ? $doc->validate() : $doc->schemaValidate($schema);
printf("%s %s: valid=%s, %.1f s, %d remote file(s)\n", $kind, basename($file), var_export($valid, true), microtime(true) - $started, count($fetched));
foreach (libxml_get_errors() as $e) {
    echo '  error: ', trim($e->message), "\n";
}
foreach ($fetched as $u) {
    echo '  fetched: ', $u, "\n";
}
