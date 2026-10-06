# OAI-PMH GetRecord answers a malformed identifier with a record, not "Identifier is not in a valid format"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced further than the first OAI interface; present since at least [3a83ef9f41](https://github.com/pkp/ojs/commit/3a83ef9f41d30221fca8c3f90561ff29458c5fe9) (2005-01-03)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press and a preprint server, the OAI-PMH address answers a
malformed record identifier as if it were well formed. Every identifier
of the app begins with a fixed start
(`oai:{repository identifier}:publicationFormat/` on a press,
`…:preprint/` on a preprint server), and the record's number follows
it.

- An identifier with a number and then anything else after the start,
  such as `…/2abc`, makes GetRecord answer record 2.
- An identifier with no number after the start, such as `…/abc`, makes
  it answer "No matching identifier in this repository".
- For `…/2abc`, ListMetadataFormats lists the formats of record 2.

A harvester expects "Identifier is not in a valid format" from
GetRecord and "No matching identifier in this repository" from
ListMetadataFormats. A journal on main answers so; a journal on 3.5 and
earlier answers like the other two.

A malformed identifier reaches no record a well-formed one could not.
It goes through the same lookup, in the same press or preprint server
and among published records only, and the record comes back under its
own, correct identifier. The harvester is only not told that its
identifier was malformed.

## Impact

- **Lost.** Nothing, and nothing is shown that the well-formed
  identifier of the same record would not show.
- **Who.** Outside harvesters and people testing the OAI-PMH address
  who send an identifier that is cut short, padded or mistyped. No
  editor or reader meets it.
- **Way round.** None is needed: every well-formed identifier is
  answered correctly.

Low: only the answer to a malformed request is wrong. It would be
medium if a harvester were shown to store the record under the
malformed identifier it asked for, which was not established.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`: the press "Public
  Knowledge Press" (`publicknowledge`) with its two published books.
  Nothing else is needed and nobody signs in: the OAI-PMH address is
  public, and a browser's address bar sends what a harvester sends.
- On a preprint server (the default dataset, OPS `main`) the steps are
  the same with `oai:ops.localhost:preprint/2`. [On 3.5 a journal shows
  it too, with `oai:ojs2.localhost:article/1`.]

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   The first identifier is `oai:omp.localhost:publicationFormat/2`.
   `omp.localhost` is the dataset's repository identifier
   (`repository_id` in `config.inc.php`): on another install, use the
   start and the number this step shows in the steps below.
2. Open `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:omp.localhost:publicationFormat/2`.
3. Open the same address with `identifier=oai:omp.localhost:publicationFormat/2abc`.
4. Open it with `identifier=oai:omp.localhost:publicationFormat/abc`.
5. Open it with `identifier=2oai:omp.localhost:publicationFormat/`
   (the number moved in front of the start).
6. Open `/index.php/publicknowledge/oai?verb=ListMetadataFormats&identifier=oai:omp.localhost:publicationFormat/2abc`.
7. Open the site-wide address,
   `/index.php/index/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:omp.localhost:publicationFormat/2abc`.
8. Open the address of step 2 with `identifier=foo`.

**Expected.** Step 2 shows the record of "Bomb Canada and Other Unkind
Remarks in the American Media". Steps 3, 4, 5, 7 and 8 answer the error
`badArgument`, "Identifier is not in a valid format". Step 6 answers
`idDoesNotExist`, "No matching identifier in this repository".

**Observed.** Steps 3, 5 and 7 show the same record as step 2, with the
header identifier `oai:omp.localhost:publicationFormat/2`, while the
answer's `request` element repeats what was asked:

```
<request verb="GetRecord" metadataPrefix="oai_dc" identifier="oai:omp.localhost:publicationFormat/2abc">…/index.php/publicknowledge/en/oai</request>
…
<identifier>oai:omp.localhost:publicationFormat/2</identifier>
```

Step 4 answers `idDoesNotExist`, "No matching identifier in this
repository". Step 6 lists the format `oai_dc`. Step 8 answers
"Identifier is not in a valid format".

On the preprint server, steps 3, 5 and 7 show the record of "The Facets
Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct
Equivalence" (`oai:ops.localhost:preprint/2`), and steps 4, 6 and 8
answer as on the press.

Control: on a journal on main (`oai:ojs2.localhost:article/1abc` and
the others) steps 3 to 8 answer as Expected.

## Cause

OMP's `PressOAI::identifierToPublicationFormatId()`
([`classes/oai/omp/PressOAI.php`, lines 73 to 81 on main](https://github.com/pkp/omp/blob/3b0ecf794c/classes/oai/omp/PressOAI.php#L73-L81))
and OPS's `ServerOAI::identifierToPreprintId()`
([`classes/oai/ops/ServerOAI.php`, lines 69 to 77](https://github.com/pkp/ops/blob/c8af945bb7/classes/oai/ops/ServerOAI.php#L69-L77))
turn an identifier into a record's number without checking its shape:

```php
$prefix = $this->getIdentifierPrefix();
if (strstr($identifier, $prefix)) {
    return (int) str_replace($prefix, '', $identifier);
} else {
    return false;
}
```

`strstr()` accepts the start anywhere in the identifier, not only at
its beginning. `str_replace()` then removes it, and the `(int)` cast
reads whatever leading digits are left: `2abc`, `2.9` and the `2` of
`2oai:omp.localhost:publicationFormat/` all become 2, and `abc` becomes
0. OMP's method has had this body since its first version,
`identifierToMonographId()` with the start `monograph/`
([f22c5e4bc1](https://github.com/pkp/omp/commit/f22c5e4bc1f27e5a47f138271f89e0ca134136d0),
2012-03-10), a copy of OJS's; OPS shares OJS's history.

`validIdentifier()` only asks whether the method returned `false`, so
`OAI::getRecord()` (pkp-lib `classes/oai/OAI.php`, line 243) never
answers "Identifier is not in a valid format" for an identifier holding
the start. `record()` looks the number up only when it is not 0: 2
finds record 2, and for 0 it returns `false` without a lookup, which
gives "No matching identifier in this repository".

OJS's `JournalOAI` read the same way until `pkp/ojs#5674` (for
`pkp/pkp-lib#12922`, 2026-07-27) rewrote its parser to take versioned
identifiers: `identifierToArticleStageAndVersionMajor()` asks for the
start with `str_starts_with()` and for digits with a regular
expression. The OMP and OPS changes for the same issue (`pkp/omp#2411`,
`pkp/ops#1349`) added types to the two methods and left their bodies.
That rewrite is the one change that took the fault out of OJS, and it
is on main only: on 3.5 and earlier `JournalOAI::identifierToArticleId()`
still has the body above, so a fix there needs OJS's lines too.

Reach, checked in the code unless marked:

- `validIdentifier()`, `record()` and `identifierExists()` of both
  classes are the methods' only callers. They serve GetRecord and
  ListMetadataFormats with `identifier`, at the context's address and
  the site-wide one (reproduced, steps 3 to 7).
- A malformed identifier reaches no record a well-formed one could
  not. The methods return a number and nothing else, and `record()` and
  `identifierExists()` hand it to `PKPOAIDAO::getRecord()` with the
  address's own press or server, as they do for a well-formed
  identifier. That is the query the lists use: published records of
  that context, and its deleted ones.

## Proposed fix

A proposal, tried on main:
[`fix-omp.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-omp.diff)
applied to OMP and
[`fix-ops.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/fix-ops.diff)
to OPS. With them, the Steps show Expected on both apps. GetRecord and
ListMetadataFormats of a well-formed identifier, of a number no record
has, of `foo` and of another repository's identifier, ListRecords and
the site-wide GetRecord answer the same with the fix in and out.

Recommended: make the two methods ask for the start at the beginning
and for digits only after it, as OJS's
`identifierToArticleStageAndVersionMajor()` does. OMP shown; OPS's
method takes the same body.

```diff
--- a/classes/oai/omp/PressOAI.php
+++ b/classes/oai/omp/PressOAI.php
@@ -73,11 +73,11 @@
     public function identifierToPublicationFormatId(string $identifier): false|int
     {
         $prefix = $this->getIdentifierPrefix();
-        if (strstr($identifier, $prefix)) {
-            return (int) str_replace($prefix, '', $identifier);
-        } else {
+        if (!str_starts_with($identifier, $prefix)) {
             return false;
         }
+        $suffix = substr($identifier, strlen($prefix));
+        return ctype_digit($suffix) ? (int) $suffix : false;
     }
 
     /**
```

The diff uses `ctype_digit()` where OJS has a regular expression,
because these identifiers have no version part to capture.
`ctype_digit()` also refuses a final line break, which OJS's expression
lets through (below).

**Alternatives:**

- One shared parser in pkp-lib's `OAI` class, given the start by each
  app. It would cover the three apps at once, but OJS's identifiers
  carry a version part the other two do not have, and OJS's parser was
  written a few weeks ago for that; a larger change for the same
  result.
- Checking the shape in `validIdentifier()` only. `record()` and
  `identifierExists()` call the parser themselves, so
  ListMetadataFormats would still list record 2's formats.

**Left out:**

- Leading zeros. `…/02` passes `ctype_digit()` and still answers record
  2 under the identifier `…/2`, as OJS's `\d+` lets `…:article/01`
  through on main. The proposal accepts that, to keep the three apps
  alike. Refusing it is one more comparison,
  `(string) (int) $suffix === $suffix`, which would best go into the
  three apps together; not tried, and not driven on screen.
- OJS on main: a number followed by a line break (`…:article/1%0A`)
  still answers record 1, because the regular expression's `$` matches
  before a final line break. Ending the expression with `\z` closes it;
  not tried. It is the same fault in OJS's own parser, so it belongs
  with this issue as a second, OJS-only change, or with the leading
  zeros if the team tightens all three.

**What goes with it:**

- No hook or stored data is touched; only the answers to malformed
  identifiers change.
- Backport: on `stable-3_5_0` and `stable-3_4_0` the three apps carry
  the same body (the methods there have no type declarations), so the
  same lines apply to OMP and OPS, and to OJS's
  `identifierToArticleId()`. On 3.3, which still supports PHP 7,
  `strpos($identifier, $prefix) !== 0` stands in for
  `str_starts_with()`.
- Guard: a unit test per app after OJS's
  `JournalOAITest::testMalformedIdentifiersAreRejected()`
  (`tests/classes/oai/JournalOAITest.php`); OMP and OPS have no OAI
  test class yet.

Small: three lines replaced by three in one method of each of two apps
on main, following the journal's parser.

## Evidence

- Kept script that takes the Steps on the three apps (OJS as the
  control on main), signed out, each on an install freshly loaded from
  PKP's default test dataset (pkp/datasets 2c84c3c, 2026-10-01, the
  `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js),
  run with `PROBE_FEATURE=issues-a17 PROBE_AGENT=a17 node bin/probe.js all shared/playwright/checks/issues/oai-malformed-identifier-answers-record/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each address
  in the browser and reads the raw XML beside it; it takes the start
  and the number from the first identifier step 1 lists. No request
  failed and no page script failed on either line.
- The fix, tried with `node bin/try-fix.js apply …/fix-omp.diff omp`
  and `… apply …/fix-ops.diff ops`, then `walk.js` on OMP and OPS as
  above, and the same script with `neighbour` as its argument with the
  fix in and out: GetRecord of the first record, of `…/99999`
  ("No matching identifier in this repository"), of `foo` and of
  `oai:other.example:…` ("Identifier is not in a valid format"),
  ListMetadataFormats of the first record (`oai_dc`) and of `…/99999`
  ("No matching identifier in this repository"), ListRecords, and the
  site-wide GetRecord of the first record. Both runs gave the same
  answers. Reverted with `node bin/try-fix.js revert` for each diff.
- main walked at OMP 3b0ecf794c (lib/pkp 3dc90c81a6), OPS c8af945bb7
  (lib/pkp 3dc90c81a6), OJS 06fd981b01 (lib/pkp 2e377d27fc); 3.5 at
  OJS 18d097d94e, OMP b24879c3db, OPS 3f0919468c (lib/pkp 1fb843f491).
  On 3.5 the three apps answered steps 3 to 8 as Observed above (OJS
  with record 1, "The Signalling Theory Dividends: A Review Of The
  Literature And Empirical Evidence", and step 6 listing `marcxml`,
  `oai_dc`, `oai_marc` and `rfc1807`). Code on 3.5: the same body in
  `JournalOAI::identifierToArticleId()` (line 83),
  `PressOAI::identifierToPublicationFormatId()` (line 87) and
  `ServerOAI::identifierToPreprintId()` (line 82).
- Code read on main beyond the files the Cause names: lib/pkp
  `classes/oai/PKPOAIDAO.php` (`getRecord()`, `recordExists()`), and a
  search of the three apps' and pkp-lib's `classes`, `pages` and
  `plugins` for the methods' callers and for another
  `(int) str_replace(` on an identifier (none).
- Outside the kept script, one request each on main, all without the
  fix: `…:publicationFormat/2.9` answered record 2 and `…/-2` "No
  matching identifier in this repository" on OMP; a number of twenty
  digits answered "No matching identifier in this repository" on the
  three apps; `…:article/1%0A` answered record 1 on OJS.
- Unverified: the twenty-digit number with the fix in. It passes
  `ctype_digit()` and the cast gives the same number as without the
  fix, so the same lookup is expected; it was not sent. `…/02` was not
  sent either, with or without the fix: the leading-zero item rests on
  the code.
- Introduced: `git log -S` for the cast line gives 3a83ef9f41 in OJS
  ("initial OAI interface for OJS2", 2005-01-03, whose
  `JournalOAI::identifierToArticleId()` has the body quoted in the
  Cause), which OPS's history shares, and f22c5e4bc1 in OMP
  ("Introduced OAI and tombstones", 2012-03-10, the method then named
  `identifierToMonographId()`). `git blame` on main
  gives the 2021 PSR-12 reformat for the body and 5aca008c5b
  (`pkp/omp#2411`) and 8489ccf13d (`pkp/ops#1349`) for the signatures.
  OJS's rewrite is 4ea46f5f35 (`pkp/ojs#5674`).
- 3.4 by code: `upstream/stable-3_4_0` of OJS (9571d8fde7,
  `classes/oai/ojs/JournalOAI.php` line 86), OMP (0aec65441f,
  `classes/oai/omp/PressOAI.php` line 91) and OPS (acd8ae704b,
  `classes/oai/ops/ServerOAI.php` line 86): the same two lines.
- 3.3 by code: `upstream/stable-3_3_0` of OJS (9fdb9bcf9a,
  `classes/oai/ojs/JournalOAI.inc.php` line 74), OMP (8e72fc8836,
  `classes/oai/omp/PressOAI.inc.php` line 79) and OPS (c5532e2161,
  `classes/oai/ojs/JournalOAI.inc.php` line 74, with the `preprint/`
  start): the same two lines.
- Upstream search, 2026-10-01, pkp/pkp-lib, pkp/omp, pkp/ops and
  pkp/ojs, issues and PRs, open and
  closed, by "OAI identifier valid format", "OAI GetRecord identifier",
  "OAI malformed identifier", "validIdentifier" and the three methods'
  names: nothing on this fault. `pkp/pkp-lib#3053` (closed) is about
  URL-encoded identifiers being refused, another fault.
- The walks ran on PostgreSQL. The fault is in PHP, before any query.
- Unverified: whether any harvester stores a record under the
  identifier it asked for rather than the one the answer carries, on
  which a higher severity would rest.
