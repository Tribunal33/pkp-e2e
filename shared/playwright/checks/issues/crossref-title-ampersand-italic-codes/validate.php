<?php
// Helper of walk.js: validates a Crossref XML file against Crossref's published schema, fetched from
// crossref.org, as "Export DOIs" does on an install that reaches it. A plain PHP process, outside the app (whose
// [proxy] setting would apply to the fetch). Prints one JSON line: valid, and the first errors.
// Usage: php validate.php <file.xml>
libxml_use_internal_errors(true);
$doc = new DOMDocument('1.0', 'utf-8');
$doc->load($argv[1]);
$schema = 'https://www.crossref.org/schemas/crossref5.4.0.xsd';
$valid = $doc->schemaValidate($schema);
// Errors only: the schema's own imports raise warnings about a namespace imported twice.
$errors = array_values(array_filter(libxml_get_errors(), fn ($e) => $e->level >= LIBXML_ERR_ERROR));
$errors = array_map(fn ($e) => trim($e->message) . ' (line ' . $e->line . ')', array_slice($errors, 0, 8));
echo json_encode(['schema' => $schema, 'valid' => $valid, 'errors' => $errors]), "\n";
