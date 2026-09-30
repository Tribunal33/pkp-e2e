# A harvester listing a subscription journal's JATS records gets only an error, articles in open issues included

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; the JATS format from the Plugin Gallery)
  - 3.3: OJS (code; the JATS format from the Plugin Gallery)
- **Introduced** subscription refusal: [610e420](https://github.com/pkp/oaiJats/commit/610e4202bf0ece5da297fe0957e12f04ab42b397) (pkp/oaiJats, no pull request) · 2020-07-30 · Alec Smecher (asmecher); "JATS XML not available" refusal: [cb1be38](https://github.com/pkp/oaiJats/commit/cb1be385b3703d4ad6b1bfbf2e52690d1c3aabb2) (pkp/oaiJats, no pull request) · 2018-07-19 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester asks a subscription journal for its records in the JATS
format (`jats`). It expects the records of articles in open issues, and
none for articles in issues that still require a subscription. Instead,
the first answer that contains one article from a subscription issue
holds only the error "Cannot disseminate format (unauthenticated access
to JATS XML not allowed)". None of that answer's records arrive, the ones
from open issues included. The answer also carries no link to the rest
of the list, so every later record is lost too.

The journal is not told. The error's code is the one OAI-PMH uses when a
format is not available, so the harvester has no sign that the other
records exist. It can still fetch each article on its own. It happens
only to journals that sell subscriptions and have turned on "JATS
Metadata Format".

## Impact

- **Lost**: the JATS records of the articles in the journal's open
  issues, for every service that harvests it in JATS, from the first
  answer that contains an article from a subscription issue to the end
  of the list.
- **Who**: journals that require subscriptions and have turned on "JATS
  Metadata Format". The format is built into OJS 3.5 and later but off
  until a manager turns it on. On 3.4 and 3.3 it is installed from the
  Plugin Gallery. Records are listed in the order the articles were
  submitted, 100 to an answer by default. So a harvest fails at its first
  answer whenever one of the journal's first 100 published articles is in
  a subscription issue, and at a later answer otherwise.
- **Way round**: the harvester can list the identifiers and ask for each
  record on its own, which serves the articles in open issues. The
  journal can only make its issues open access or turn the JATS format
  off.

Medium: the JATS list stops at the first article from a subscription
issue, but only in a setup that is not the default, and a harvester can
fetch records one by one. It would be high if the JATS format were on by
default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: `publicknowledge`, whose
  published issue "Vol. 1 No. 2 (2014)" is open access and holds articles
  1 "Signalling Theory Dividends" and 17 "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms…"; its issue "Vol. 2 No. 1
  (2015)" is not yet published; submission 5 "Genetic transformation of
  forest trees" is in Production. The dataset's repository identifier is
  `ojs2.localhost`, so article 1's OAI identifier is
  `oai:ojs2.localhost:article/1`.
- Nothing else. Steps 2 to 6 turn on what the dataset leaves off: the
  JATS format, subscriptions, and one article in a subscription issue.

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › Plugins › Installed Plugins: tick "JATS Metadata
   Format" ("JATS Template Plugin" is already on).
3. Settings › Distribution › Access: choose "The journal will require
   subscriptions to access some or all of its contents." › "Save".
4. Issues › Future Issues › "Vol. 2 No. 1 (2015)" › "Edit" › "Access":
   set "Access status" to "Subscription" › "Save".
5. Open submission 5, "Genetic transformation of forest trees" › "Title &
   Abstract" › "Schedule For Publication". In "Review Publishing
   Details", set "Publication Stage" to "Version of Record (VoR)",
   "Revision Significance" to "Major Revision", "Issue Assignment" to
   "Assign To Future Issue and Schedule Only" and "Issue" to "Vol. 2 No.
   1 (2015)" › "Confirm" › "Schedule For Publication". [3.5: the button
   opens "Select an issue to schedule for publication": choose "Vol. 2
   No. 1 (2015)" › "Save" › "Schedule For Publication".]
6. Issues › Future Issues › "Vol. 2 No. 1 (2015)" › "Publish Issue" ›
   "OK".
7. Sign out, and open
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=jats`.

**Expected**: the list holds the JATS records of articles 1 and 17, whose
issue is open access, and leaves out article 5, which a signed-out
reader may not read.

**Observed**: the page "OAI 2.0 Request Results" shows only "OAI
Error(s)": "The request could not be completed due to the following
error or errors.", "Error Code cannotDisseminateFormat", "Cannot
disseminate format (unauthenticated access to JATS XML not allowed)".
No record, and no "Resume". The answer is:

```xml
<request verb="ListRecords" metadataPrefix="jats">http://…/index.php/publicknowledge/en/oai</request>
<error code="cannotDisseminateFormat">Cannot disseminate format (unauthenticated access to JATS XML not allowed)</error></OAI-PMH>
```

In the same state, signed out, `metadataPrefix=oai_dc` lists articles 1,
5 and 17.
`verb=GetRecord&metadataPrefix=jats&identifier=oai:ojs2.localhost:article/1`
serves article 1's JATS record, and the same with `article/5` answers the
error above. `verb=ListIdentifiers&metadataPrefix=jats` names all three.
Signed in as `rvaca`, step 7 lists all three JATS records.

## Cause

The JATS format decides per record whether it may be given out.
`OAIMetadataFormat_JATS::toXml()` (pkp/oaiJats, bundled with OJS since
3.5 as `plugins/oaiMetadataFormats/oaiJats`) refuses an article when
`IssueAction::subscriptionRequired()` is true for its issue. That method
reads only the journal's publishing mode and the issue's access status
and open-access date. The refusal is skipped for a request from a
subscribed institution's IP range, and for a signed-in user whom
`allowedIssuePrePublicationAccess()` lets in: a Journal Manager, Section
Editor, Assistant or Subscription Manager of the journal.

To refuse, `toXml()` calls `$oaiDao->oai->error('cannotDisseminateFormat',
…)`, which prints a complete OAI-PMH error answer, and then `exit()`.
`OAI::listRecords()` (`lib/pkp/classes/oai/OAI.php`) calls
`formatMetadata()`, and so `toXml()`, for each record of the answer. It
builds the answer as a string and prints it only at the end. The
`exit()` therefore throws away the records already built. The
resumption token is never written, so the rest of the list cannot be
reached.

OAI-PMH answers a GetRecord of an item that lacks a format with
`cannotDisseminateFormat`. A ListRecords lists only the items that have
the format. The OAI class has no way for a format to decline one record,
so the plugin ends the whole request.

The `exit()` came with cb1be38 ("Resolve warnings", 2018), so that
nothing is printed after the error answer. From then on, the "JATS XML
not available" refusal ended lists. The subscription check had a
condition that could never be true, `$subscriptionRequired &&
!$subscriptionRequired`, until 610e420 ("Fix typos", 2020) changed it to
`!$isSubscribedDomain`. From then on, the subscription refusal ended
lists too. It said "JATS XML not available" at first; the
"unauthenticated access" wording came later.

Reach:

- An article marked "Open Access" in a subscription issue is refused
  too, since `subscriptionRequired()` does not read the article's own
  access status (code; seen on a running install when the spec was
  written). The article page does serve such an article to anyone
  (`ArticleHandler`, the `ARTICLE_ACCESS_OPEN` test). The proposed fix
  does not change this: such an article is left out of the list.
- An article whose JATS cannot be built empties a list the same way,
  with "JATS XML not available". An example is an article with two XML
  galleys: `findJats()` takes the first as its candidate and leaves the
  second in the list of candidates, and the JATS Template Plugin builds a
  document only when that list is empty (code).
- ListIdentifiers in `jats` names the restricted articles (on screen),
  where OAI-PMH lists only the items that have the format.
- ListRecords with a section's set, with `from` and `until`, and in the
  "DRIVER" plugin's `driver` set go through the same loop (code).
- OMP and OPS have no JATS format, and no other format calls `error()` or
  `exit()` (code).

## Proposed fix

A proposal. Let a format decline one record by throwing an exception
that the OAI class catches. GetRecord answers `cannotDisseminateFormat`
with the exception's message, as today. ListRecords leaves the record out
and goes on. The JATS format throws instead of printing the error and
exiting. The full diff, tried on `main`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-jats-list-emptied-by-restricted-article/fix.diff).

- pkp-lib: a new `PKP\oai\exceptions\CannotDisseminateFormatException`,
  in the `classes/<area>/exceptions/` pattern of
  `UnableToCreateJATSContentException` and the others.
- pkp-lib `OAI::getRecord()`: format the metadata before building the
  answer; on the exception, `$this->error('cannotDisseminateFormat',
  $e->getMessage())`.
- pkp-lib `OAI::listRecords()`: format each record's metadata in a
  `try`, and `continue` on the exception. When every record of a part is
  left out, read the next part, up to `OAI::MAX_READ_ON_PARTS` (10) more
  parts, so that an answer with no records is rare. How the list ends:
  - A new list none of whose records can be given answers
    `noRecordsMatch`, as an empty list does today.
  - A resumed list whose remaining records are all left out answers the
    empty closing `<resumptionToken … />`, as every completed list does.
  - A list that stopped reading on at the bound answers a resumption
    token for the next part.

  The last two answers hold no `<record>`. The OAI-PMH schema asks for at
  least one; the closing token is what the protocol requires to end a
  list, so the fix gives that precedence.
- pkp/oaiJats `OAIMetadataFormat_JATS::toXml()`, both refusals (the
  `$oaiDao` line and the `OAIDAO` import go too):

```diff
-                $oaiDao->oai->error('cannotDisseminateFormat', 'Cannot disseminate format (unauthenticated access to JATS XML not allowed)');
-                exit();
+                throw new CannotDisseminateFormatException('Cannot disseminate format (unauthenticated access to JATS XML not allowed)');
```

Tried on OJS `main`: step 7 listed articles 1 and 17 and left out article
5. GetRecord still refused article 5 with the same message, `oai_dc`
still listed all three, and `rvaca` signed in still got all three JATS
records. The end of a resumed list and the bound were checked in the code
only: the dataset's journal has three records, which fit in one answer.

`completeListSize` and `cursor` are left as they are. They still count
the records that were left out, so `completeListSize` is larger than the
number of records a harvester receives, by the number of restricted
articles. OAI-PMH makes both attributes optional.

**Alternatives**:

- Return an empty string from `toXml()` for a refused record: the list
  would carry a record with empty `<metadata>`, which OAI-PMH does not
  allow.
- Leave the restricted articles out in OJS's `OAIDAO` query: the rule
  depends on the request (a subscribed IP range, a signed-in editor),
  which the query does not see, and the rule would then live in two
  places.

**What goes with it**:

- Whether the check should also let through articles marked "Open
  Access" in a subscription issue, as the article page does, is a
  product question for the team; the fix neither adds nor removes it.
- ListIdentifiers would still name the restricted articles. For it to
  leave them out, the access check has to move out of `toXml()` into a
  method of its own, and ListIdentifiers has to load each record's
  article and issue, which it does not do today. A follow-up, if the team
  wants it.
- No stored data changes.
- Backport: the pkp-lib part applies to `stable-3_5_0` as written; the
  plugin's `stable-3_5_0` needs the same two refusals changed by hand
  (the lines around them differ). On 3.4 and 3.3 the plugin comes from
  the Plugin Gallery (pkp/oaiJats `stable-3_4_0`, `stable-3_3_0`, with
  the same `exit()`), so a new plugin release there throws a pkp-lib
  class those versions lack: it needs a pkp-lib patch release with the
  exception and the `OAI.php` / `OAI.inc.php` change, and the plugin
  release has to require it.
- A unit test in pkp-lib: `listRecords()` with a format that throws for
  one record lists the others, and ends a resumed list with the empty
  token.

Medium: two repositories (pkp-lib's OAI class and the oaiJats plugin) and
a new exception class, with a unit test.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-jats-list-emptied-by-restricted-article/walk.js)
  takes the Steps in a browser on PKP's default test dataset (pkp/datasets
  38ab955, 2026-09-30, PostgreSQL), OJS, then the reads that follow
  Observed; with the fix in, those reads must not change. Run from
  pkp-e2e on a freshly loaded dataset: `PROBE_FEATURE=<feature>
  PROBE_AGENT=<id> node bin/probe.js ojs
  shared/playwright/checks/issues/oai-jats-list-emptied-by-restricted-article/walk.js`;
  3.5 the same with `PKP_E2E_LINE=stable-3_5_0` in front. The fix was
  not tried on 3.5.
- Tips walked or read:
  - main: OJS bade233f73, pkp-lib 2e377d27fc, pkp/oaiJats 627c48842a
    (also the tip of its `main`).
  - stable-3_5_0: OJS 92b9a16b48, pkp-lib a9c76aed62, pkp/oaiJats
    35d1f06867. `toXml()` has the same `error()` and `exit()` for both
    refusals.
  - stable-3_4_0 (code): OJS 9571d8fde7, pkp-lib df13621c2d. The app has
    no JATS format of its own; pkp/oaiJats `stable-3_4_0` (f3fe83bdaf)
    has the same refusal and `exit()`, and `OAI.php` calls
    `formatMetadata()` while building the list.
  - stable-3_3_0 (code): OJS 9fdb9bcf9a, pkp-lib d446601ebe; pkp/oaiJats
    `stable-3_3_0` (719e69667b) the same in
    `OAIMetadataFormat_JATS.inc.php`, and `OAI.inc.php` builds the list
    the same way.
- The article marked "Open Access" in a subscription issue: not in this
  walk; the spec's own run on 2026-09-26
  ([U19 note q5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#fn-q5),
  item 5) saw it refused, and the code read above agrees.
- "Off until a manager turns it on": the plugin's `getEnabled()` reads
  its own `enabled` setting, which no install step writes; the dataset,
  built from a fresh install, has the box unticked.
- Which services harvest OJS journals in JATS today is not known here.
  `pkp/oaiJats#22` names one (Érudit) that did, in 2021.
- Unverified: the end of a resumed list, the read-on bound and the
  two-XML-galley case were not walked.
