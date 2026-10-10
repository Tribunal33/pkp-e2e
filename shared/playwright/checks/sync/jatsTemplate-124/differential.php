<?php
// PR review check — pkp/pkp-lib#13378, pkp/jatsTemplate#124 and #125: JatsHelper at two commits of the plugin,
// side by side on the same stored HTML, with no app and no database.
//   php differential.php <app checkout> <base sha> <head sha> [<cases>]
// The inputs are a fixed list (the issue's sentence, the PR's own cases, edge shapes) and <cases> (default 20000)
// strings put together from real tags, tags typed as text and plain words by a seeded generator; each is
// sanitized by HTMLPurifier under the checkout's `allowed_html`, as PKPString::stripUnsafeHtml() does, and
// converted as inline content (<article-title>) and as block content (<abstract>). Three reads:
//   same     an input with no "<" typed as text converts to the same bytes at both commits
//   text     at a commit, an input and its twin with every typed "<" swapped for "‹" give the same elements
//            in the same order and the same text: no element comes from what the author typed as text
//   changed  how many inputs with a typed "<" convert differently at the head
// Exits 1 when `same` or the head's `text` has a failure; the base's `text` failures are the fault itself.
[$self, $root, $base, $head] = $argv + [null, null, null, null];
$cases = (int) ($argv[4] ?? 20000);
$plugin = "$root/plugins/generic/jatsTemplate";
if (!$head || !is_dir($plugin)) {
    exit("usage: php differential.php <app checkout> <base sha> <head sha> [<cases>]\n");
}
require "$root/lib/pkp/lib/vendor/autoload.php";

// The one app call the helper makes, stood in with the same HTMLPurifier settings
preg_match('/^allowed_html\s*=\s*"([^"]*)"/m', file_get_contents("$root/config.TEMPLATE.inc.php"), $m) ?: exit("no allowed_html in the config template\n");
define('ALLOWED_HTML', $m[1]);
$stub = sys_get_temp_dir() . '/jats-differential-' . getmypid();
mkdir($stub);
file_put_contents("$stub/PKPString.php", <<<'PHP'
<?php
namespace PKP\core;
class PKPString
{
    public static function stripUnsafeHtml(?string $input, string $configKey = 'allowed_html'): string
    {
        static $purifier;
        if (!$purifier) {
            $config = \HTMLPurifier_Config::createDefault();
            $config->set('Core.Encoding', 'utf-8');
            $config->set('HTML.Doctype', 'HTML 4.01 Transitional');
            $config->set('HTML.Allowed', ALLOWED_HTML);
            $config->set('Cache.DefinitionImpl', null);
            $config->set('Attr.AllowedFrameTargets', ['_blank']);
            $purifier = new \HTMLPurifier($config);
        }
        return $purifier->purify((string) $input);
    }
}
PHP);
require "$stub/PKPString.php";
foreach (['base' => $base, 'head' => $head] as $side => $sha) {
    $source = shell_exec('git -C ' . escapeshellarg($plugin) . ' show ' . escapeshellarg("$sha:classes/JatsHelper.php"));
    $source ?: exit("no classes/JatsHelper.php at $sha\n");
    file_put_contents("$stub/$side.php", str_replace('namespace APP\plugins\generic\jatsTemplate\classes;', "namespace jats$side;", $source));
    require "$stub/$side.php";
}
array_map('unlink', glob("$stub/*"));
rmdir($stub);

function convert(string $side, string $html, bool $block): string
{
    $document = new DOMDocument();
    $rootElement = $document->appendChild($document->createElement('root'));
    $node = ("jats$side\\JatsHelper")::htmlToJatsElement($document, $block ? 'abstract' : 'article-title', $html, [], $block);
    if ($node) {
        $rootElement->appendChild($node);
    }
    return $document->saveXML($rootElement);
}

/** The element names in document order and the text, of converted content. */
function shape(string $xml): array
{
    $document = new DOMDocument();
    @$document->loadXML($xml); // a link's xlink prefix is declared on <article>, not here
    $names = [];
    foreach ($document->getElementsByTagName('*') as $element) {
        $names[] = $element->tagName;
    }
    return [implode(' ', $names), preg_replace('/\s+/', ' ', trim($document->documentElement->textContent))];
}

const TYPED_LT = '/&lt;|&#0*60;|&#x0*3c;/i';
$neutral = fn (string $html) => preg_replace(TYPED_LT, '‹', $html);

$fixed = [
    '<p>Write &lt;i&gt;species names&lt;/i&gt; in italics and H&lt;sub&gt;2&lt;/sub&gt;O with a subscript; a &lt;br&gt; tag breaks the line and &lt;p&gt;text&lt;/p&gt; is a paragraph.</p>',
    '<p>Write &lt;i&gt;species names&lt;/i&gt; in <i>italics</i> and H&lt;sub&gt;2&lt;/sub&gt;O; a &lt;br&gt; tag breaks the line and &lt;p&gt;text&lt;/p&gt; is a paragraph.</p>',
    'The &lt;i&gt;species&lt;/i&gt; element in <b>HTML</b>',
    'A &lt;a href=&quot;x&quot;&gt;link&lt;/a&gt;',
    '<p>Use the &lt;i&gt; tag to set species names in italics.</p>',
    '<p>This <strong>rich</strong> abstract carries <em>italic</em> and <b>bold</b> runs, x<sup>2</sup> and H<sub>2</sub>O, Smith &amp; Jones, and a <a href="https://example.org/data?x=1&amp;y=2">link with a query</a>.</p><ul><li>A first bullet</li><li>A second bullet with <i>italics</i></li></ul><ol><li>Step one</li><li>Step two</li></ol><p>A line<br>broken with a break.</p>',
    'Effects at p&lt;0.05 in small trials',
    'Effects at p<0.05 in small trials',
    '1 &lt; 2 &gt; 0 &amp; 3 &gt; 2',
    'a < b and c > d',
    '<a href="https://example.org/">see &lt;/a&gt; here</a> and <a href="mailto:a@example.org">mail &lt;a&gt;</a>',
    '<a>no address &lt;a href="x"&gt;</a>',
    '<p>&lt;p&gt;</p><p>&lt;/p&gt;</p>',
    '<ul><li>&lt;li&gt;</li><li>&lt;/li&gt;&lt;/ul&gt;</li></ul>',
    '&lt;br&gt;&lt;br/&gt;&lt;br /&gt;<br>',
    '&amp;lt;i&amp;gt;entities typed as text&amp;lt;/i&amp;gt;',
    '&#60;i&#62;numeric&#60;/i&#62; and &#x3C;b&#x3E;hex&#x3C;/b&#x3E;',
    '<i>&lt;i&gt;</i>&lt;/i&gt;',
    '&lt;script&gt;alert(1)&lt;/script&gt;<script>alert(2)</script>',
    '&lt;!-- a comment --&gt;<!-- gone -->',
    '&lt;i', '&lt;', 'i&gt;', '', '   ', '<p></p>',
    "<p>Line one\n&lt;i&gt;two&lt;/i&gt;</p>",
    'Café &lt;é&gt; 日本語 &lt;日本&gt;',
];
$real = ['<i>', '</i>', '<b>', '</b>', '<em>e</em>', '<strong>', '</strong>', '<u>u</u>', '<p>', '</p>', '<p class="c">', '<br>', '<br />',
    '<a href="https://example.org/?a=1&amp;b=2">', '<a href="mailto:a@example.org">', '<a>', '</a>', '<ul><li>', '<li>', '</li>', '</li></ul>', '<ol><li>', '</li></ol>',
    '<sup>2</sup>', '<sub>', '</sub>'];
$typed = ['&lt;i&gt;', '&lt;/i&gt;', '&lt;b&gt;', '&lt;/b&gt;', '&lt;em&gt;', '&lt;/em&gt;', '&lt;sub&gt;', '&lt;/sub&gt;', '&lt;br&gt;', '&lt;br /&gt;',
    '&lt;p&gt;', '&lt;/p&gt;', '&lt;p class=&quot;c&quot;&gt;', '&lt;a href=&quot;x&quot;&gt;', '&lt;a href="https://example.org/t"&gt;', "&lt;a href='y'&gt;", '&lt;/a&gt;',
    '&lt;li&gt;', '&lt;/li&gt;', '&lt;ul&gt;', '&lt;/ul&gt;', '&lt;ol&gt;', '&lt;/ol&gt;', '&lt;script&gt;', '&lt;', '&lt; ', '&#60;i&#62;', '&#x3c;/i&#x3e;'];
$plain = ['word ', 'two words ', ' ', '1 ', 'é', 'x', '&gt;', '&gt; ', '&amp;', '&amp;lt;i&amp;gt;', '&quot;', "'", 'i&gt;', '/i&gt;', "\n"];
mt_srand(13378);
$inputs = $fixed;
for ($n = 0; $n < $cases; $n++) {
    $html = '';
    for ($k = mt_rand(1, 9); $k > 0; $k--) {
        $pool = [$real, $typed, $plain][mt_rand(0, 2)];
        $html .= $pool[mt_rand(0, count($pool) - 1)];
    }
    $inputs[] = $html;
}

$tally = ['inputs' => count($inputs), 'conversions' => 0, 'with a typed "<"' => 0, 'same' => ['checked' => 0, 'failed' => 0],
    'text at the base' => ['checked' => 0, 'failed' => 0], 'text at the head' => ['checked' => 0, 'failed' => 0], 'changed' => 0];
$examples = [];
$example = function (string $read, array $lines) use (&$examples) {
    if (count($examples[$read] ?? []) < 6) {
        $examples[$read][] = $lines;
    }
};
foreach ($inputs as $raw) {
    $html = \PKP\core\PKPString::stripUnsafeHtml($raw);
    $hasTyped = (bool) preg_match(TYPED_LT, $html);
    foreach ([false, true] as $block) {
        $tally['conversions']++;
        $out = ['base' => convert('base', $html, $block), 'head' => convert('head', $html, $block)];
        if (!$hasTyped) {
            $tally['same']['checked']++;
            if ($out['base'] !== $out['head']) {
                $tally['same']['failed']++;
                $example('same', ['stored' => $html, 'base' => $out['base'], 'head' => $out['head']]);
            }
            continue;
        }
        $tally['with a typed "<"']++;
        $tally['changed'] += $out['base'] !== $out['head'];
        foreach (['base', 'head'] as $side) {
            $tally["text at the $side"]['checked']++;
            [$names, $text] = shape($out[$side]);
            [$twinNames, $twinText] = shape(convert($side, $neutral($html), $block));
            if ($names !== $twinNames || str_replace('<', '‹', $text) !== $twinText) {
                $tally["text at the $side"]['failed']++;
                $example("text at the $side", ['stored' => $html, 'converted' => $out[$side], 'elements' => $names, 'twin elements' => $twinNames]);
            }
        }
    }
}
echo json_encode(['plugin' => ['base' => $base, 'head' => $head], 'tally' => $tally, 'examples' => $examples], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
exit($tally['same']['failed'] || $tally['text at the head']['failed'] ? 1 : 0);
