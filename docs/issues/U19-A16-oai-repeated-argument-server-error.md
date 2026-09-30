# A harvester that repeats an OAI-PMH argument gets a blank server error instead of a refusal

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
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U19 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a16)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A harvester that sends an argument twice, such as
`metadataPrefix=oai_dc&metadataPrefix=oai_dc` or `set` twice, expects
"Multiple values are not allowed for the metadataPrefix parameter". The
app fails with a server error and an empty page instead; the next
request is answered as usual.

Every argument fails this way when it is repeated on a verb that takes
it: `verb` itself, where the protocol's "Illegal OAI verb" is expected,
and `identifier`, `metadataPrefix`, `from`, `until`, `set` and
`resumptionToken`. An argument the verb does not take is still refused
as illegal. The request is invalid either way, so no record is withheld,
but the harvester is not told what it did wrong.

## Impact

- **Lost.** The OAI-PMH error that tells the harvester which argument it
  repeated. The server log also gains a fatal error per such request.
- **Who.** Any harvester or validator that sends a repeated argument to a
  journal's, press's or server's OAI address, or the site-wide one.
- **Way round.** Sending each argument once.

Low: the fault only changes how an invalid request is turned away. It
would be medium if a harvester or a conformance validator that sites run
against their OAI address sent repeated arguments, which this report did
not establish.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main`. Its context
  `publicknowledge` ("Journal of Public Knowledge", "Public Knowledge
  Press", "Public Knowledge Preprint Server") has published items, and
  the context itself is an OAI set, `publicknowledge`. Nobody signs in.

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   It lists the context's records.
2. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc`.
3. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=publicknowledge&set=publicknowledge`.
4. Open `/index.php/publicknowledge/oai?verb=Identify&verb=Identify`.
5. Open `/index.php/publicknowledge/oai?verb=Identify`.

**Expected:** steps 2, 3 and 4 each answer the OAI error page, "OAI
Error(s)", with one error:

- step 2: `<error code="badArgument">Multiple values are not allowed for the metadataPrefix parameter</error>`
- step 3: `<error code="badArgument">Multiple values are not allowed for the set parameter</error>`
- step 4: `<error code="badVerb">Illegal OAI verb</error>` (OAI-PMH
  2.0 lists a repeated verb under `badVerb`)

Steps 1 and 5 answer as usual.

**Observed:** steps 2, 3 and 4 answer `500` with an empty body, and the
browser shows a blank page. The server log gives the same error for
each; for step 2:

```
PHP Fatal error:  Uncaught TypeError: PKP\oai\OAI::getParam(): Return value must be of type ?string, array returned in lib/pkp/classes/oai/OAI.php:725
#0 lib/pkp/classes/oai/OAI.php(767): PKP\oai\OAI->getParam('metadataPrefix')
#1 lib/pkp/classes/oai/OAI.php(508): PKP\oai\OAI->checkParams(Array, Array)
#2 lib/pkp/classes/oai/OAI.php(95): PKP\oai\OAI->listRecords()
```

Steps 1 and 5 answer `200`.

## Cause

`PKP\oai\OAI::__construct()` reads the request's arguments with
`OAIUtils::parseStr()`, which keeps a repeated argument's values as an
array (`metadataPrefix => ['oai_dc', 'oai_dc']`). That is on purpose:
`checkParams()` looks for such an array and refuses it with "Multiple
values are not allowed for the {argument} parameter".

`checkParams()` asks through `getParam()`
(`lib/pkp/classes/oai/OAI.php`, lines 767 and 775). c8a6694c74 declared
`getParam(string $name): ?string` (line 723) as part of a type-hint
cleanup of the OAI classes. For a repeated argument `getParam()` now
returns an array, which PHP refuses as a `TypeError`, so the check
meant to catch it fails first. Before that commit `getParam()` had no
return type.

A repeated `verb` fails earlier: `OAI::execute()` switches on
`getParam('verb')` (line 81) before any verb runs.

Reach:

- Every verb passes the arguments it takes to `checkParams()`, which
  calls `getParam()` on each of them, so any of them repeated fails
  (checked in the code; `metadataPrefix`, `set` and `resumptionToken` on
  ListRecords on screen). An argument the verb does not take is found by
  the illegal-parameter loop, which does not call `getParam()`, and is
  refused as before (checked on screen, an unknown argument twice).
- The site-wide address runs the same class (checked in the code).
- A form sent by POST as `metadataPrefix[]=…` reaches the same array
  through `$_POST` (checked in the code).
- The other `getParam()` callers run after `checkParams()`, which then
  has refused any array, so they are safe once it works (checked in the
  code). No app class or plugin calls `getParam()`.

## Proposed fix

Let `checkParams()` and `execute()` look at the stored value itself
before they call `getParam()`, through one small helper, so `getParam()`
keeps the `?string` type the cleanup gave it, and a repeated verb falls
to `badVerb`. This is the whole
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-repeated-argument-server-error/fix.diff)
in `lib/pkp/classes/oai/OAI.php`:

```diff
     public function execute(): void
     {
-        switch ($this->getParam('verb')) {
+        // A repeated verb is not a legal verb (OAI-PMH 2.0, badVerb)
+        switch ($this->isRepeatedParam('verb') ? null : $this->getParam('verb')) {
 …
+    public function isRepeatedParam(string $name): bool
+    {
+        return is_array($this->params[$name] ?? null);
+    }
 …
-            } elseif (is_array($this->getParam($k))) {
+            } elseif ($this->isRepeatedParam($k)) {
 …
-            if ($this->paramExists($k) && is_array($this->getParam($k))) {
+            if ($this->isRepeatedParam($k)) {
```

Tried on `main`, OJS, OMP and OPS: the Steps then show Expected. These
requests answered the same with the fix in and out: `set` once,
ListIdentifiers from a date, ListMetadataFormats, ListSets, a missing
`metadataPrefix`, an unknown argument twice, an unknown verb, and a
`resumptionToken` beside `metadataPrefix`. A repeated `resumptionToken`
answered `500` without the fix and "Multiple values are not allowed for
the resumptionToken parameter" with it.

**Alternatives:**

- Widen the return type to `string|array|null`. This is one line and
  restores the behaviour before c8a6694c74, but every typed caller
  (`resumptionToken(string)`, `identifierExists(string)`) would then be
  handed a type it does not accept, and only the order of the calls
  would keep them safe.
- Make `getParam()` return the first value of a repeated argument. That
  hides the repetition from `checkParams()`, so the refusal would never
  be sent.

**What goes with it:**

- A guard: pkp's Cypress OAI test
  (`lib/pkp/cypress/tests/integration/oai/Verbs.cy.js`, added by the
  same commit) requests each verb once. A case with `metadataPrefix`
  twice and one with `verb` twice would have caught this. In pkp-e2e, a
  U19 scenario for the "Errors" table.
- Left out: a POST form that repeats a plain key
  (`metadataPrefix=a&metadataPrefix=b`) is read from `$_POST`, where PHP
  keeps only the last value, so it is answered rather than refused on
  every version. `$GLOBALS['HTTP_RAW_POST_DATA']`, the constructor's
  way to see the raw body, is not set since PHP 7.0. This gap in the
  POST reading predates c8a6694c74 and needs its own change (code; not
  driven).
- Backport: none (see Affects).
- No stored data to repair.

Small: a few lines in one class, and two test cases.

## Evidence

- Kept scripts, under
  [shared/playwright/checks/issues/oai-repeated-argument-server-error/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-repeated-argument-server-error/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-repeated-argument-server-error/walk.js)
    takes the Steps on a fresh load of the default dataset and records
    each answer's status, its raw XML, what the browser shows and the
    server log lines. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-repeated-argument-server-error/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-repeated-argument-server-error/neighbour.js)
    is the neighbour check, walked with the fix in and out.
  - [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-repeated-argument-server-error/trial.sh)
    tried the fix: `node bin/try-fix.js apply fix.diff ojs omp ops`, the
    walk and the neighbour check, then the revert and the neighbour
    check without the fix.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, all three apps. The fault
  does not depend on the database. The typed addresses without a
  language are sent on to `…/publicknowledge/en/oai` with the query
  unchanged, and the answers above are that address's.
- 3.5, walked and read: `getParam($name)` in
  `lib/pkp/classes/oai/OAI.php` has no return type, and the Steps answer
  the Expected errors on OJS, OMP and OPS (a repeated verb's array
  matches no `case` in `execute()` and falls to `badVerb`). c8a6694c74 is not on
  `stable-3_5_0`.
- 3.4 (code): `classes/oai/OAI.php` on pkp-lib `origin/stable-3_4_0` has
  `getParam($name)` with no return type and the same `checkParams()`
  refusal.
- 3.3 (code): `classes/oai/OAI.inc.php` on pkp-lib `origin/stable-3_3_0`
  likewise (`function getParam($name)`, the same refusal).
- Introduced: `git blame` on line 723 (`getParam(string $name): ?string`)
  gives c8a6694c74, the squash of `pkp/pkp-lib#13028`, "add OAI record
  versions for DOI versions and cleanup OAI classes". The
  `checkParams()` lines that call it date from 2021 (e3f570bc37).
- Upstream search (2026-09-30), pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ops, issues and PRs: "OAI multiple values", "OAI repeated
  argument", "OAI duplicate parameter", "OAI badArgument", "OAI
  TypeError", "OAI 500", `getParam`, `checkParams`. `pkp/pkp-lib#13144`
  (open) is a different OAI `TypeError` (ListSets and a section with no
  abbreviation); `pkp/pkp-lib#12917` is a PostgreSQL date error.
- Tips:
  - OJS `main`
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - OMP `main`
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS `main`
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb)
    and OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - pkp-lib `stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    and `stable-3_3_0`
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Not driven: the POST form and the site-wide address (code only).
- Unverified: whether any harvester or validator in common use sends
  repeated arguments. `from`, `until` and `identifier` repeated were not
  driven; they reach the same `getParam()` call in `checkParams()`.
