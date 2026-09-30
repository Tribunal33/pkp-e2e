# OAI-PMH GetRecord for a malformed identifier such as "…/2abc" answers record 2 instead of refusing it

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [3a83ef9f41](https://github.com/pkp/ojs/commit/3a83ef9f41d30221fca8c3f90561ff29458c5fe9) (2005-01-03)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester that sends GetRecord the identifier `oai:ops.localhost:preprint/2abc`
gets back preprint 2, whose header shows `…:preprint/2`, not what it
sent. OAI-PMH asks for the refusal "Identifier is not in a valid
format". An identifier with only letters after the prefix, such as
`…:preprint/abc`, gets "No matching identifier in this repository"
instead of that refusal, which is the same fault.

Only identifiers that carry the app's own prefix are affected
(`…:publicationFormat/` on a press, `…:preprint/` on a preprint server,
`…:article/` on a journal); any other identifier is refused as it
should be. Journals on `main` already refuse both shapes, since their
identifier handling was rewritten in July 2026; journals on 3.5 and
older answer like presses and preprint servers.

The fix is small in each app, but it is needed in two apps on `main`
and in all three on 3.5.

## Impact

- **Lost.** Nothing stored in the press, server or journal, and no
  error tells the client its identifier was malformed.
- **Who.** Only a client that sends a malformed identifier, for example
  a truncated or mistyped one. Harvesters normally send identifiers they
  took from the interface's own lists, and those answer correctly.
- **Way round.** There is nothing to set. A client that compares the
  identifier in the answer's header with the one it asked for can tell
  that the record is not the one it asked for.

Low: a wrong answer to a malformed request, which nothing downstream
relies on. It would be medium if a harvester or validator in use were
found to send such identifiers and to store the wrong record under
them.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, loaded into OMP or
into OPS, context `publicknowledge`. Its OAI interface is on, as by
default. No sign-in is needed. The addresses below use the dataset's
repository ids, `omp.localhost` and `ops.localhost`. An install whose
`config.inc.php` keeps the template's `repository_id` (`omp.pkp.sfu.ca`,
`ops.pkp.sfu.ca`) has other identifiers: use the prefix of the
identifiers step 1 lists in every later step. [On 3.5 a journal answers
the same way: on OJS take the same steps with
`oai:ojs2.localhost:article/1`.]

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   The first identifier is `oai:omp.localhost:publicationFormat/2` on
   OMP and `oai:ops.localhost:preprint/2` on OPS.
2. Open `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ops.localhost:preprint/2`
   (OMP: `identifier=oai:omp.localhost:publicationFormat/2`). The record
   shows: "The Facets Of Job Satisfaction: A Nine-Nation Comparative
   Study Of Construct Equivalence" on OPS, "Bomb Canada and Other
   Unkind Remarks in the American Media" on OMP.
3. Open the same address with `identifier=oai:ops.localhost:preprint/abc`
   (OMP: `…:publicationFormat/abc`).
4. Open the same address with `identifier=oai:ops.localhost:preprint/2abc`
   (OMP: `…:publicationFormat/2abc`).

**Expected.** Steps 3 and 4 answer:

```xml
<error code="badArgument">Identifier is not in a valid format</error>
```

as a journal on `main` does for `oai:ojs2.localhost:article/abc` and
`…:article/1abc`.

**Observed.**

- Step 3 answers `<error code="idDoesNotExist">No matching identifier in this repository</error>`.
- Step 4 answers the record of step 2, its header carrying
  `oai:ops.localhost:preprint/2` (OMP: `oai:omp.localhost:publicationFormat/2`),
  not the identifier asked for.

Control: `identifier=foo`, with no prefix, answers "Identifier is not in
a valid format" on both apps.

## Cause

OMP's `PressOAI::identifierToPublicationFormatId()`
([classes/oai/omp/PressOAI.php, lines 73–82](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/classes/oai/omp/PressOAI.php#L73-L82))
and OPS's `ServerOAI::identifierToPreprintId()`
([classes/oai/ops/ServerOAI.php, lines 69–77](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/oai/ops/ServerOAI.php#L69-L77))
turn an identifier into an ID like this:

```php
if (strstr($identifier, $prefix)) {
    return (int) str_replace($prefix, '', $identifier);
} else {
    return false;
}
```

`strstr()` accepts the prefix anywhere in the identifier, and `(int)`
reads whatever is left. `(int) '2abc'` is `2`, so the identifier is
taken as record 2; `(int) 'abc'` is `0`. Only an identifier without the
prefix at all returns `false`.

pkp-lib's `OAI::getRecord()`
([classes/oai/OAI.php, lines 242–252](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/classes/oai/OAI.php#L242-L252))
answers "Identifier is not in a valid format" only when the app's
`validIdentifier()` returns `false`, and both apps' `validIdentifier()`
only asks whether the method above returned `false`. `record()` then
looks up record 2 for `2abc`; for `0` it does no lookup and returns
`false`, which `getRecord()` answers with "No matching identifier".

OJS had the same code until `pkp/ojs#5674` (for `pkp/pkp-lib#12922`, OAI
records for DOI versions) rewrote `JournalOAI::identifierToArticleId()`
on `main` in July 2026. It now requires the exact prefix and a suffix
matching `^(\d+)(?:/version/(AO|PMUR|VoR)/(\d+))?$`, and OJS's
`tests/classes/oai/JournalOAITest.php` checks that malformed identifiers
are refused. The OMP and OPS twins were not changed, and 3.5 and older
still have the old code in OJS too.

Reach:

- GetRecord at the context's address (checked on screen).
- ListMetadataFormats with `identifier`: `…/2abc` lists record 2's
  formats instead of answering "No matching identifier in this
  repository", as OJS `main` does (checked on screen).
- The prefix given twice (`…:preprint/oai:ops.localhost:preprint/2`)
  answers record 2, since `str_replace()` removes every copy (checked on
  screen).
- Any suffix that `(int)` reads as a number answers a record: `2.9` and
  ` 2` are record 2, and `2e1` is record 20 (read in the code and the
  PHP cast, not walked). A trailing newline (`…/2%0A`) answers record 2
  (checked on screen).
- OJS `main` has one gap of the same kind: its expression ends in `$`
  without the `D` modifier, and `$` also matches before a final newline,
  so `oai:ojs2.localhost:article/1%0A` answers article 1 (checked on
  screen).
- The site-wide address (`/index.php/index/oai`) uses the same method
  with no context filter (read in the code).
- No other caller: the two methods are called only from their own
  class's `validIdentifier()`, `identifierExists()` and `record()`.

## Proposed fix

In OMP's `PressOAI::identifierToPublicationFormatId()` and OPS's
`ServerOAI::identifierToPreprintId()`, accept an identifier only when it
starts with the app's prefix and the rest is digits and nothing else, as
OJS's `JournalOAI::identifierToArticleStageAndVersionMajor()` does on
`main`, ending the expression in `\z` so that a trailing newline is
refused too. The OPS diff,
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-ops.diff):

```diff
     public function identifierToPreprintId(string $identifier): false|int
     {
         $prefix = 'oai:' . $this->config->repositoryId . ':' . 'preprint/';
-        if (strstr($identifier, $prefix)) {
-            return (int) str_replace($prefix, '', $identifier);
-        } else {
+        if (!str_starts_with($identifier, $prefix) || !preg_match('#^(\d+)\z#', substr($identifier, strlen($prefix)), $matches)) {
             return false;
         }
+        return (int) $matches[1];
     }
```

and the same change in OMP,
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-omp.diff).
The rule belongs in these methods, the one place each app turns an
identifier into an ID, so GetRecord and ListMetadataFormats, at the
context's and the site-wide address, are covered together. Following
OJS's parser keeps the three apps alike, and leaves OMP and OPS ready
for the version suffix `pkp/pkp-lib#12922` plans for them later.

Tried on `main` in OMP and OPS: steps 3 and 4, the prefix given twice
and the trailing newline answered "Identifier is not in a valid
format", and ListMetadataFormats with `…/2abc` answered "No matching
identifier in this repository". Well-formed identifiers answered the
same with the fix in and out: GetRecord of each listed identifier at
the context's and the site-wide address, ListMetadataFormats with one,
an unknown number, and Identify's sample identifier.

**Alternatives**

- Move the parsing into pkp-lib's `OAI` base class. The three apps'
  identifiers have different prefixes and OJS's carries a version
  suffix, so a shared parser would need a hook per app; more change for
  the same rule.
- Check `ctype_digit()` on the suffix instead of the expression. It is
  as strict as `\z` (it refuses a trailing newline too); the expression
  is kept because OJS's parser uses one and will need it for the version
  suffix.

**What goes with it**

- A client that sent a malformed identifier now gets `badArgument` on
  GetRecord and `idDoesNotExist` on ListMetadataFormats, which OAI-PMH
  requires. No stored data, REST endpoint or plugin hook is involved.
- OJS `main`: the same `\z` in place of `$` in
  `identifierToArticleStageAndVersionMajor()` closes its trailing-newline
  gap (not tried).
- Backport to 3.5: the `main` diffs do not apply there (the 3.5
  signatures are untyped, and OMP calls `_getIdentifierPrefix()`), so
  3.5 has its own,
  [fix-omp-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-omp-3_5.diff)
  and
  [fix-ops-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-ops-3_5.diff)
  (both pass `git apply --check` on the 3.5 tips; not walked). OJS 3.5
  needs the `pkp/ojs#5674` parser backported to
  `JournalOAI::identifierToArticleId()` as well, without the version
  suffix. 3.4 has the same code as 3.5. On 3.3 (PHP 7.3)
  `str_starts_with()` does not exist, so it becomes
  `strpos($identifier, $prefix) === 0` in the `.inc.php` files.
- Test: a `PressOAITest` in OMP and a `ServerOAITest` in OPS, built like
  OJS's `JournalOAITest` (an instance without the constructor and an
  `OAIConfig`; neither app has a `tests/classes/oai` folder yet). Its
  malformed cases should add what OJS's test lacks: a number followed by
  letters (`…/2abc`), the prefix given twice and a trailing newline.

Medium: a few lines per app, but in two repos on `main`, and the 3.5
backport touches all three apps, OJS included.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js)
  takes the Steps on OJS, OMP and OPS on a fresh load of the default
  dataset, typing each address in the browser and reading the XML the
  server sent (status, OAI error, the identifiers and titles in the
  answer, server log lines), then the Reach checks (ListMetadataFormats,
  the prefix given twice, a trailing newline). With the argument
  `neighbour` it sends the well-formed identifiers of "Proposed fix"
  instead. Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js [neighbour]`.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, all three apps. MySQL was
  not driven; the fault is in PHP before any query.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: the parsers at 3.5 (`JournalOAI.php` line 83,
  `PressOAI.php` line 87, `ServerOAI.php` line 82), 3.4 (lines 83, 88,
  83) and 3.3 (`JournalOAI.inc.php` line 72 in OJS and in OPS, which
  keeps the class under that name with `preprint/`; `PressOAI.inc.php`
  line 77); pkp-lib's `OAI::getRecord()` refuses only on
  `validIdentifier() === false` on every line.
- Introduced: `git blame` on the `strstr()` lines points at the PSR-12
  reformat ([01088072a8](https://github.com/pkp/omp/commit/01088072a8b4d6bcf46c5f456664a2318cf10277)
  in OMP, [ee952a951d](https://github.com/pkp/ops/commit/ee952a951d5cf31203842642c4badea773011523)
  in OPS, 2021). `git log -S 'strstr($identifier, $prefix)'` finds the
  code first in OJS 2's initial OAI interface (the commit in the header,
  2005-01-03), which OPS's history carries, and in OMP in
  [f22c5e4bc1](https://github.com/pkp/omp/commit/f22c5e4bc1f27e5a47f138271f89e0ca134136d0)
  ("Introduced OAI and tombstones", 2012-03-10, Bruno Beghelli). OJS
  `main` replaced it in
  [4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761)
  (`pkp/ojs#5674`, kaitlinnewson, 2026-07-27).
- Upstream (searched 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and pull requests, by the symptom and by
  `identifierToPreprintId`, `identifierToPublicationFormatId`,
  `identifierToArticleId` and `validIdentifier`). Not the same fault:
  `pkp/pkp-lib#3053` (URL-encoded identifiers refused, closed),
  `pkp/pkp-lib#12922` (OAI records for DOI versions; it rewrote OJS's
  parser and leaves OMP and OPS versions to a later sub-issue).
- Not driven: 3.4 and 3.3; the 3.5 diffs were checked with `git apply --check` only.
- The well-formed identifiers were sent with an earlier form of the fix
  that ended the expression in `$`; the final `\z` form differs only for
  a trailing newline, and its walk answered step 2 with the record as
  before. The trailing-newline case was walked on `main` only.
- Unverified: whether any harvester or OAI-PMH validator in use sends
  malformed identifiers of this shape. None was checked.
