<?php
// Used by lib.js: `php validate.php <schema.xsd> <marcxml|oai_marc> < record.xml`.
// Checks one MARC record against its schema with libxml2 (the library `xmllint --schema`
// uses), and reads its fields the way a MARC reader does: by element name and by the
// attribute that holds the field number and the subfield code. Prints JSON.
[$self, $xsd, $format] = $argv;
libxml_use_internal_errors(true);
$doc = new DOMDocument();
$doc->loadXML(stream_get_contents(STDIN));
$valid = $doc->schemaValidate($xsd);
$errors = array_map(fn ($e) => 'line ' . $e->line . ': ' . trim($e->message), libxml_get_errors());
$xp = new DOMXPath($doc);
$marcxml = $format === 'marcxml';
$xp->registerNamespace('m', $marcxml ? 'http://www.loc.gov/MARC21/slim' : 'http://www.openarchives.org/OAI/1.1/oai_marc');
[$control, $data, $num, $code] = $marcxml ? ['controlfield', 'datafield', 'tag', 'code'] : ['fixfield', 'varfield', 'id', 'label'];
$fields = [];
foreach ($xp->query("/*/m:$control" . "[@$num]") as $f) {
    $fields[] = [$f->getAttribute($num), [['', $f->textContent]]];
}
foreach ($xp->query("/*/m:$data" . "[@$num]") as $f) {
    $subs = [];
    foreach ($xp->query("m:subfield[@$code]", $f) as $s) {
        $subs[] = [$s->getAttribute($code), preg_replace('/\s+/', ' ', trim($s->textContent))];
    }
    $fields[] = [$f->getAttribute($num), $subs];
}
echo json_encode(['valid' => $valid, 'errors' => $errors, 'fields' => $fields]);
