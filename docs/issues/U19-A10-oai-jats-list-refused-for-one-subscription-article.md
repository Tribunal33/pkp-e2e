# On a subscription journal, the OAI-PMH record list in JATS is refused whole when it holds one article that needs a subscription

- **Severity** medium
- **Effort** large
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; the plugin comes from the Plugin Gallery)
  - 3.3: OJS (code; the plugin comes from the Plugin Gallery)
- **Introduced** no PR · [610e4202bf](https://github.com/pkp/oaiJats/commit/610e4202bf0ece5da297fe0957e12f04ab42b397) · 2020-07-30 · Alec Smecher (asmecher), in pkp/oaiJats
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a subscription journal with "JATS Metadata Format" on, a harvester
that asks for the list of records in `jats` gets one error, "Cannot
disseminate format (unauthenticated access to JATS XML not allowed)",
as soon as the list holds one article of a subscription issue. The
articles that need no subscription are lost with it. The list comes in
parts of 100 records: the part that holds such an article is refused,
and the harvester cannot reach the parts after it.

The right answer for a list is a choice for the team: leave the
restricted articles out of the `jats` list, or list them with their
metadata and without their text. Today's answer is neither.

The harvester can still get the open articles one at a time, since
ListIdentifiers lists every article and GetRecord serves each open one.
The plugin ships with OJS on `main` and 3.5 and is off by default. The
same records in Dublin Core are not affected.

## Impact

- **Lost.** The JATS records of the articles outside subscription
  issues, for a service that harvests the list. The harvester gets an
  error; the journal is told nothing.
- **Who.** Journals in the publishing mode "The journal will require
  subscriptions to access some or all of its contents." with at least
  one published issue set to "Subscription".
- **Way round.** None for the journal, short of setting the issue to
  "Open access".

Medium: a secondary output fails in a setup few journals have, with an
error and a way round for the harvester. It would be high if the
refusal reached the Dublin Core list, which every harvester reads.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded: the journal
  `publicknowledge` is open access, its issue "Vol. 1 No. 2 (2014)" is
  published with articles 1 and 17, and "JATS Template Plugin" is on.
- Submission 5, "Genetic transformation of forest trees", is in
  Production. Step 5 publishes it, so that the journal has one article
  outside the subscription issue.

Steps:

1. Sign in as `dbarnes` (Journal editor).
2. Open Settings › Distribution › "Access", choose "The journal will
   require subscriptions to access some or all of its contents." and
   press "Save".
3. Open Settings › Website › "Plugins" and tick "JATS Metadata Format"
   under "OAI Metadata Format Plugins".
4. Open Issues › "Back Issues", press "Edit" on "Vol. 1 No. 2 (2014)",
   open "Access", choose "Subscription" and press "Save".
5. Open submission 5 and press "Schedule For Publication". In "Review
   Publishing Details" choose "Don't Assign To An Issue", press
   "Confirm", then "Publish". [3.5, where an article needs an issue:
   first Issues › "Future Issues" › "Vol. 2 No. 1 (2015)" › "Publish
   Issue", which stays "Open access"; then, on submission 5,
   Publication › "Issue" › "Assign to Issue", that issue, "Save", and
   "Schedule For Publication" › "Publish".]
6. Sign out and open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=jats`.
7. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=jats`,
   then
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=jats&identifier=oai:ojs2.localhost:article/5`
   (the identifier as ListIdentifiers gives it for article 5).

**Expected.** The list of step 6 holds the record of article 5, which
needs no subscription. Articles 1 and 17 are left out of it, or listed
without their text, as the team decides. The refusal answers only a
GetRecord of article 1 or 17.

**Observed.** The page of step 6 shows "OAI Error(s)", error code
`cannotDisseminateFormat`, and no record. As sent:

```xml
<request verb="ListRecords" metadataPrefix="jats">http://…/index.php/publicknowledge/en/oai</request>
<error code="cannotDisseminateFormat">Cannot disseminate format (unauthenticated access to JATS XML not allowed)</error>
```

In step 7 ListIdentifiers lists `article/1`, `article/5` and
`article/17`, and GetRecord of article 5 answers its JATS `<article>`.

Control: `verb=ListRecords&metadataPrefix=oai_dc` lists the three
articles. Before step 4 the `jats` list held articles 1 and 17, and the
list of step 6 opened in `dbarnes`'s signed-in browser holds all three.

## Cause

`OAIMetadataFormat_JATS::toXml()`
([`plugins/oaiMetadataFormats/oaiJats/OAIMetadataFormat_JATS.php`](https://github.com/pkp/oaiJats/blob/627c48842a/OAIMetadataFormat_JATS.php#L178-L192))
writes one record's metadata. When the article's issue needs a
subscription and the request has no user with pre-publication access
and no subscribed domain, it does not return: it calls
`$oaiDao->oai->error('cannotDisseminateFormat', …)`, which prints a
complete OAI-PMH error answer, and then `exit()`.

`toXml()` is called once per record. `OAI::listRecords()`
([`lib/pkp/classes/oai/OAI.php`](https://github.com/pkp/pkp-lib/blob/2e377d27fc/classes/oai/OAI.php#L546-L563))
calls it through `formatMetadata()` inside its loop, while it is still
collecting the records into a string. The `exit()` ends the request
there: the error answer is what goes out, and the records collected so
far are dropped with the rest. For GetRecord the same lines give the
right answer, since the request is about that one record.

The rule it breaks is OAI-PMH's for ListRecords: records are "included
only for those items from which the metadata format matching the
metadataPrefix can be disseminated". `cannotDisseminateFormat` on a list
means the repository does not offer the format at all.

The mechanism is older than the symptom. c728396652 (2017-12-22) first
printed an error from inside `toXml()`, for "JATS XML not available",
in place of an empty `<article>` stub; `exit()` followed in cb1be38
(2018-07-19). The subscription test was added in 1c70763 (2018-02-22)
with a condition that never held (`$subscriptionRequired &&
!$subscriptionRequired`). 610e4202bf (2020-07-30, "Fix typos") corrected
the condition, and from then on a subscription article refuses the
list.

Reach:

- Which articles refuse: every article of an issue that needs a
  subscription. `toXml()` tests the issue only, so an article marked
  "Open Access" inside such an issue refuses too (code). An article in
  no issue, in an "Open access" issue or in an issue past its open
  access date is served.
- The second refusal in the same method, "Cannot disseminate format
  (JATS XML not available)", ends a list the same way. `findJats()`
  returns nothing only when the "JATS Template Plugin" gives no
  document, which on `main` means that plugin is off; on 3.5 it also
  needs the article to have no XML file of its own. Two XML galleys do
  not refuse: `findJats()` logs a warning and takes the first (code).
- A list comes in parts of `[oai] oai_max_records` records (100 by
  default), each fetched with the resumption token of the part before.
  The part that holds a restricted article is refused, and the
  harvester has no token for the parts after it (code).
- ListIdentifiers in `jats` lists the restricted articles (on screen).
  By the protocol it should leave out what the format cannot give; the
  diff below does not change it.
- A signed-in manager or editor passes the access test and gets every
  record (on screen). So does a request carrying such a user's API key,
  which `OAIHandler` reads (code; `pkp/oaiJats#22`).
- No other format writes an answer from `toXml()`: `oai->error` and
  `exit()` appear in no other OAI format plugin of OJS, OMP or OPS
  (code).

## Proposed fix

A decision comes first: what a `jats` list holds for an article the
harvester may not read. The two answers the protocol allows:

- **Leave it out.** The list holds the open articles only. This is what
  the diff below does, and what was tried.
- **List it without its text.** The record carries the article's
  metadata (the `<front>`, which the Dublin Core record already gives
  to everyone) and no `<body>`. Every record is listed, so the parts
  and their counts stay as they are. It needs a ruling on what a
  subscription hides, and was not tried.

For "leave it out", let `toXml()` say that one record cannot be given,
and let the caller decide what that means for its verb
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/fix.diff)):

- pkp-lib: a new `PKP\oai\OAIFormatUnavailableException`.
  `OAI::getRecord()` catches it and answers `cannotDisseminateFormat`
  with the exception's message, as today. `OAI::listRecords()` catches
  it and leaves the record out. When that leaves a part empty, it reads
  the next records, since a ListRecords answer must hold a record; when
  nothing is left, it answers `noRecordsMatch`.
- pkp/oaiJats: the two refusals throw it instead of printing and
  exiting.

```diff
-                $oaiDao->oai->error('cannotDisseminateFormat', 'Cannot disseminate format (unauthenticated access to JATS XML not allowed)');
-                exit();
+                throw new OAIFormatUnavailableException('Cannot disseminate format (unauthenticated access to JATS XML not allowed)');
```

Tried on OJS `main`. With the diff applied, the list of step 6 holds the
record of article 5 alone. GetRecord of article 17 still answers "Cannot
disseminate format (unauthenticated access to JATS XML not allowed)".
The list with only restricted articles (after step 4) answers "No
matching records in this repository"; the list before step 4, the
signed-in editor's list and the Dublin Core list are unchanged.

The diff leaves two cases open. Neither was driven: the dataset's list
is one part long.

- **A resumed list whose remaining records are all restricted.** The
  diff answers `noRecordsMatch` to a valid resumption token. The right
  answer is that the part before was the last, which that part cannot
  know without reading ahead. Not decided here.
- **A long run of restricted articles.** The loop that refills an empty
  part has no bound, so one request reads part after part until a
  record can be given: on a journal with thousands of subscription
  articles in a row, all of them. A bound would send an empty part with
  a token, which the protocol does not allow. Not decided here.

Both go away when the restricted articles are left out in the query
(the first alternative), or when they are listed without their text.

How this was settled:

- **Where the rule lives.** What a missing record means differs by
  verb, and the verbs live in `PKP\oai\OAI`. The plugin only knows that
  this record cannot be given.
- **How the code base does it.** pkp-lib has small exception classes
  beside the code that throws them (`PKP\sushi\SushiException`,
  `PKP\jats\exceptions\UnableToCreateJATSContentException`). No OAI
  format returns "no metadata" today, so inside `classes/oai` this is a
  new pattern.
- **What the introducing changes were for.** c728396652 wanted a
  harvester told why a record is not served, and 610e4202bf wanted the
  subscription respected. GetRecord keeps both messages.
- **What it touches.** GetRecord answers are unchanged. A ListRecords
  part can hold fewer records than the part size, which the protocol
  allows; `completeListSize` still counts the restricted records.
  Nothing is stored.

**Alternatives**

- Leave restricted articles out in the query, for ListRecords and
  ListIdentifiers alike: exact parts and counts, and the two open cases
  above do not arise. The access rule (publishing mode, the issue's
  access and open access date, the request's user) would have to be
  written in SQL for one format.
- Return `null` from `toXml()` instead of throwing: no new class, but
  the two messages are lost on GetRecord, or need a second channel.

**What goes with it**

- On `main` and 3.5 the plugin is a submodule of OJS, so the two halves
  go out together.
- A backport to 3.4 and 3.3 needs more than the two halves. There the
  plugin is installed from the Plugin Gallery, apart from pkp-lib: a
  plugin release that throws the new class on a pkp-lib without it
  fails with "Class not found", for GetRecord too. The release needs a
  minimum version in its Gallery entry, or a `class_exists()` test that
  falls back to today's lines. On 3.3 the file is
  `classes/oai/OAI.inc.php` without namespaces, and its PHP floor needs
  a variable in the `catch`.
- The U19 spec's subscription scenario, asserting that the `jats` list
  holds the open article, as the test (a Planned item).

Large: the fix cannot be written without the team's choice between the
two answers, and the tried one adds a new pattern (an exception from
`toXml()`) across pkp-lib and the pkp/oaiJats plugin with two list
cases still to decide. The diff itself is a reworked loop, one catch,
one small class and four plugin lines.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/walk.js)
  takes the Steps on OJS and, between them, the controls of the
  paragraph "Tried on OJS `main`". It changes the journal's settings, an issue and
  submission 5, so it runs on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  2c84c3c (2026-10-01). A database plays no part (the refusal is
  decided in PHP). The 3.5 walk took step 5 as its bracket says and saw
  the same answers.
- Differences from the Steps: the script reads each OAI address twice,
  in the browser and as a plain request without a session; step 7's
  identifier is built from the repository identifier that Identify
  gives.
- The spec's register called this fault latent. It is not: a manager
  reaches it through three settings (the publishing mode, the plugin's
  box, an issue's "Access"), so it was walked.
- Tips: OJS `main` 06fd981b01 (`lib/pkp` 2e377d27fc, pkp/oaiJats
  627c48842a); `stable-3_5_0` 18d097d94e (`lib/pkp` 1fb843f491,
  pkp/oaiJats 35d1f06867); pkp-lib `stable-3_4_0` df13621c2d and
  `stable-3_3_0` d446601ebe; pkp/oaiJats `stable-3_4_0` f3fe83b and
  `stable-3_3_0` 719e696.
- Code reads: on `main`, `OAIMetadataFormat_JATS::toXml()` and
  `findJats()`, `OAI::getRecord()`, `listRecords()`, `formatMetadata()`,
  `error()` and `response()`, `IssueAction::subscriptionRequired()`, and
  a search of the OAI format plugins of the three apps for `oai->error`
  and `exit()`. On 3.5 the same two refusals with `exit()` in the
  plugin and the same loop in `OAI.php`. On 3.4 and 3.3 the plugin is
  not part of the OJS checkout; its own `stable-3_4_0` and
  `stable-3_3_0` branches hold the two refusals with `exit()`, and
  pkp-lib's `OAI::listRecords()` on both calls `formatMetadata()` inside
  the loop.
- Introduced: `git log -S` of `cannotDisseminateFormat`, of `exit();`
  and of `subscriptionRequired` in pkp/oaiJats, and the diff of
  610e4202bf; the commits were pushed without a PR. `pkp/oaiJats#22`
  names the same commit as the one that began to refuse embargoed
  content.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/oaiJats searched by
  "ListRecords", "cannotDisseminateFormat", "oai jats subscription" and
  "exit", and pkp/oaiJats's whole issue list read. Related, not the
  same fault: `pkp/oaiJats#22` (harvesting embargoed content with an
  API key, closed) and `pkp/oaiJats#50` (the refusal's wording, closed).
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-jats-list-refused-for-one-subscription-article/fix.diff ojs`,
  the kept script, then `revert`.
- Not driven: 3.4 and 3.3 (code only); a list longer than one part,
  with or without the diff; the "JATS XML not available" refusal inside
  a list; an article marked "Open Access" inside a subscription issue;
  a request with an API key; a subscribed domain or IP range; the
  site-wide address; an issue with an open access date; the second
  answer (records without their text).
- Unverified: whether a harvester in use (Coalition Publica's) reads
  the list or record by record.
