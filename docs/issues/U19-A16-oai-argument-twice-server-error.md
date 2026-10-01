# An OAI-PMH request that gives an argument twice gets a server error instead of the refusal message

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#13028` for `pkp/pkp-lib#12922` · [c8a6694c74](https://github.com/pkp/pkp-lib/commit/c8a6694c7423a4dea5515aa9f6affdc46fd03abb) · 2026-07-27 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The app fails with a server error when a harvester sends an OAI-PMH
request that gives an argument twice, such as
`metadataPrefix=oai_dc&metadataPrefix=oai_dc`. The harvester expects
the refusal "Multiple values are not allowed for the metadataPrefix
parameter", or "Illegal OAI verb" when the repeated argument is `verb`.
It gets an empty page with status 500 instead.

Such a request is malformed and is refused on every version, so no
record and no well-formed request is affected, and the next request is
answered as usual.

Every request name and every argument is affected, at a journal's,
press's or preprint server's own OAI-PMH address and at the site-wide
one.

## Impact

- **Lost.** The refusal message that names the repeated argument.
- **Who.** A harvester, or a person testing the OAI-PMH address by
  hand, whose request repeats an argument. Each such request also
  writes a fatal error to the PHP error log.
- **Way round.** Send each argument once.

Low: the fault changes only how a refusal reads, a server error in
place of the OAI-PMH error response. Nothing would raise it: no version
answers a request that repeats an argument with records, so no harvest
that worked before can fail from it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`: the journal "Journal of
  Public Knowledge" (`publicknowledge`). Nothing else is needed and
  nobody signs in: the OAI-PMH address is public, and a browser's
  address bar sends what a harvester sends. On OMP and OPS the steps
  are the same, with the press's and the preprint server's
  `publicknowledge`.

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
2. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`.
3. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge&set=publicknowledge`.
4. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01&from=2001-01-01`.
5. Open `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=x&identifier=y`.
6. Open `/index.php/publicknowledge/oai?verb=ListMetadataFormats&identifier=x&identifier=y`.
7. Open `/index.php/publicknowledge/oai?verb=ListRecords&resumptionToken=a&resumptionToken=b`.
8. Open `/index.php/publicknowledge/oai?verb=Identify&verb=Identify`.
9. Open the site-wide address,
   `/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`.
10. Open `/index.php/publicknowledge/oai?verb=Identify`.

**Expected.** Step 1 lists the records. Steps 2 to 7 and 9 each answer
the OAI-PMH error `badArgument` with "Multiple values are not allowed
for the metadataPrefix parameter" (steps 2 and 9; `set` at step 3,
`from` at step 4, `identifier` at steps 5 and 6, `resumptionToken` at
step 7). Step 8 answers `badVerb` with "Illegal OAI verb", which the
protocol asks for when `verb` is repeated. Step 10 answers Identify.

**Observed.** With PHP's `display_errors` off, step 1 shows the page "OAI 2.0 Request Results" with the
records (2 on OJS and OMP, 17 on OPS). Steps 2 to 9 each show an empty
page. Each address redirects to the same address with "/en/" in it, and
that request answers status 500 with no body:

```
GET /index.php/publicknowledge/en/oai?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc   500   (text/html, 0 bytes)
```

The PHP error log, for each of them:

```
PHP Fatal error:  Uncaught TypeError: PKP\oai\OAI::getParam(): Return value must be of type ?string, array returned in lib/pkp/classes/oai/OAI.php:725
```

Step 10 answers Identify as usual.

`display_errors` off is what the dataset's own configuration sets. With
it on, PHP prints the TypeError into the page instead (not driven).

Control: `/index.php/publicknowledge/oai?verb=Identify&foo=1&foo=2`,
which repeats an argument Identify does not take, answers "foo is an
illegal parameter".

## Cause

`PKP\oai\OAI::getParam()`
([`lib/pkp/classes/oai/OAI.php`, line 723 on main](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAI.php#L723))
declares the return type `?string`, but a request's parameter is an
array when the request gives it more than once.

```php
public function getParam(string $name): ?string
{
    return $this->params[$name] ?? null;
}
```

The constructor fills `$this->params` with `OAIUtils::parseStr()`,
which exists to keep repeated arguments: its docblock reads "Acts like
parse_str($string, $array) except duplicate variable names in $string
are converted to an array."
`checkParams()` then looks for those arrays to refuse them, and it reads
each one through `getParam()` (lines 767 and 775):

```php
} elseif (is_array($this->getParam($k))) {
    $this->error('badArgument', "Multiple values are not allowed for the {$k} parameter");
```

So the check that should refuse a repeated argument throws a TypeError
on the call that fetches it, and "Multiple values are not allowed" can
no longer be answered. `execute()` reads `verb` the same way (line 81,
`switch ($this->getParam('verb'))`) before any check runs, so a
repeated `verb` throws there. Nothing on the way catches the error.

The return type came with the type hints that `pkp/pkp-lib#13028` added
to the OAI classes as a cleanup beside its feature (OAI records per DOI
version). Before it, `getParam($name)` had no return type, the array
reached `is_array()`, and a repeated `verb` fell to the `switch`'s
default, "Illegal OAI verb".

Reach, checked in the code unless marked:

- Each of the six request handlers calls `checkParams()` before it
  reads any argument. `getRecord()`, `identify()` and
  `listMetadataFormats()` call it first. `listIdentifiers()`,
  `listRecords()` and `listSets()` first ask
  `paramExists('resumptionToken')`, then call
  `checkParams(['resumptionToken'])` inside that branch (lines 353, 493,
  596) or the full check after it. So every argument a request takes
  fails when repeated (reproduced for
  `metadataPrefix`, `set`, `from`, `identifier` and `resumptionToken`,
  steps 2 to 7 and 9).
- `execute()`: a repeated `verb` (reproduced, step 8).
- An argument the request does not take never reaches `getParam()`:
  the illegal-parameter loop reads `$this->params` itself (the control).
- `OAI.php` is the same file in the three apps' pkp-lib, and
  `JournalOAI`, `PressOAI` and `ServerOAI` do not override either
  method. No other class calls `getParam()` (searched in the apps'
  `classes/oai`, `pages/oai` and the `oaiMetadataFormats` plugins).
- A request sent by POST with no query string is read from `$_POST`,
  where an argument written `metadataPrefix[]=…` is an array as well.
- No stored data is involved.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-argument-twice-server-error/fix.diff)
applied to OJS, OMP and OPS. With it, the Steps show Expected: steps 2
to 7 and 9 answer "Multiple values are not allowed for the … parameter"
naming the repeated argument, and step 8 answers "Illegal OAI verb".
Each request name with its arguments given once and the other refusals
answer the same with the fix in and out.

Recommended: keep `getParam()`'s `?string`, and have the three lines
that meet an unchecked parameter read `$this->params` directly: the
`switch` in `execute()` and the two duplicate tests inside
`checkParams()`. The illegal-parameter loop in `checkParams()` already
reads it that way (`foreach ($this->params as …)`).

`?string` then holds for every other call. All twelve later
`getParam()` calls (lines 239, 240, 358, 372, 373, 450, 454, 498, 512,
513, 561, 601) follow a `checkParams()` that returned true. That
includes the resumption-token path: the token's id is read after
`checkParams(['resumptionToken'])`, and `setParams($token->params)`
restores parameters that were saved after the same check.

The risk that stays: `getParam()` is public, so a plugin's subclass
that calls it before `checkParams()` would still get the TypeError on a
repeated argument. No such caller exists in the three apps or pkp-lib,
and the type tells such a caller to run the check first.

```diff
--- a/lib/pkp/classes/oai/OAI.php
+++ b/lib/pkp/classes/oai/OAI.php
@@ -78,7 +78,9 @@
     public function execute(): void
     {
-        switch ($this->getParam('verb')) {
+        // A repeated verb is an array (OAIUtils::parseStr()): refuse it as badVerb
+        $verb = $this->params['verb'] ?? null;
+        switch (is_array($verb) ? null : $verb) {
             case 'GetRecord':
@@ -764,7 +766,7 @@
-            } elseif (is_array($this->getParam($k))) {
+            } elseif (is_array($this->params[$k])) {
@@ -772,7 +774,7 @@
-            if ($this->paramExists($k) && is_array($this->getParam($k))) {
+            if ($this->paramExists($k) && is_array($this->params[$k])) {
```

**Alternatives:**

- Widen the return type to `string|array|null`. One line, and it
  restores the earlier behaviour, but it gives every caller a union
  type that the cleanup set out to remove, for a value that is an array
  only before `checkParams()`.
- Have `OAIUtils::parseStr()` keep one value of a repeated argument.
  Not proposed: the request would then be answered, where the protocol
  asks for a refusal.

**What goes with it:**

- No API, hook or stored-data change: requests that failed are refused
  with the protocol's error, as on 3.5.
- No backport: the return type is on `main` only.
- Guard: a test of its own in pkp-lib's
  `cypress/tests/integration/oai/Verbs.cy.js` (added by the same PR)
  that sends `metadataPrefix` twice and expects the `badArgument`
  error. It cannot be a row of that file's `verbs` table, whose loop
  asserts that the answer has no `error` element. The refusal comes
  with status 200. Once this is fixed, pkp-e2e's OAI-PMH test of the
  refusals sends an argument twice as well.

Small: three lines in one pkp-lib class, following the loop beside
them, and one test case.

## Evidence

- Kept script that takes the Steps on the three apps, signed out, each
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 2c84c3c, 2026-10-01, the `main` and `stable-3_5_0`
  PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-argument-twice-server-error/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-argument-twice-server-error/walk.js),
  run with `PROBE_FEATURE=issues-a16 PROBE_AGENT=a16 node bin/probe.js all shared/playwright/checks/issues/oai-argument-twice-server-error/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each address
  in the browser and reads the raw XML beside it; the control is its
  step 11.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6): steps 2 to 9 answered 500 on
  each app, eight server errors per app, with the log line above (read
  from the web server's log; the stack passes through
  `OAI::checkParams()` line 767 or `OAI::execute()` line 81).
- 3.5 walked at OJS 18d097d94e, OMP b24879c3db, OPS 3f0919468c (lib/pkp
  1fb843f491): steps 2 to 7 and 9 answered "Multiple values are not
  allowed for the … parameter" and step 8 "Illegal OAI verb", on each
  app, with no server error. Its `OAI::getParam($name)` (line 738) has
  no return type, and c8a6694c74 is not on the branch.
- 3.4 by code: pkp-lib `origin/stable-3_4_0` (df13621c2d),
  `classes/oai/OAI.php`, `getParam($name)` at line 732 without a return
  type. 3.3 by code: pkp-lib `origin/stable-3_3_0` (d446601ebe),
  `classes/oai/OAI.inc.php`, `getParam($name)` at line 698, the same.
  Both carry the "Multiple values" checks.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-argument-twice-server-error/fix.diff ojs omp ops`,
  then `walk.js` as above, and the same script with `neighbour` as its
  argument with the fix in and out: Identify, ListIdentifiers,
  ListRecords, ListSets, ListMetadataFormats (with and without an
  identifier), GetRecord of the first identifier, a list with `from`
  and `until`, a missing `metadataPrefix`, an illegal argument given
  once, an unknown verb, no verb, an unknown resumption token, an
  unknown format, a resumption token beside `metadataPrefix`, and the
  site-wide Identify. Both runs gave the same answers on each app.
  Reverted with `node bin/try-fix.js revert` and the same arguments.
- In the neighbour run, OPS's list with `from` and `until` answered 500
  with the fix in and out. That is another fault, reported as
  [U19-OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-OPS1-preprint-server-oai-until-fails.md).
- Code read on main: lib/pkp `classes/oai/OAI.php` (the constructor,
  `execute()`, `checkParams()`, `getParam()`, `error()`, `response()`)
  and `classes/oai/OAIUtils.php` (`parseStr()`, `prepInput()`); the
  three apps' `pages/oai/OAIHandler.php`; a search for `getParam(` in
  the apps' `classes/oai`, `pages/oai` and `oaiMetadataFormats`
  plugins; the twelve `getParam()` calls after a `checkParams()`, and
  `setParams()` on the resumption-token path.
- Introduced: `git blame` on line 723 gives c8a6694c74, whose diff
  changes `public function getParam($name)` to
  `public function getParam(string $name): ?string`; the lines of
  `checkParams()` that call it are older than that change. GitHub's
  `commits/<sha>/pulls` gives PR `pkp/pkp-lib#13028`.
- Upstream search, 2026-10-01, pkp/pkp-lib and pkp/ojs (pkp/ui-library
  has no part in it), issues and PRs, open and closed, by "OAI
  duplicate parameter", "OAI repeated argument", "OAI 500 argument
  twice", "OAI badArgument", "OAI Multiple values", "OAI TypeError",
  "OAI getParam", "OAI checkParams" and "OAI Return value must be of
  type": nothing on this fault. `pkp/pkp-lib#13144` (open) is a
  TypeError in ListSets for a section without an abbreviation, another
  fault.
- `display_errors`: the walks ran with it off, in PHP and in the
  dataset's `config.inc.php`. The page with it on was not driven.
- The walks ran on PostgreSQL; the fault does not reach the database.
- Unverified: a request sent by POST. No walk sent one, with the fix in
  or out; that the fault and the fix reach it rests on reading the
  constructor (`array_merge($_GET, $_POST)`) and the fix's `is_array()`
  tests.
- Unverified: whether any harvester in use repeats an argument. None
  was looked at.
