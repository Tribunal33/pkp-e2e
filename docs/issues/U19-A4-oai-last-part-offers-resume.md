# In the browser view of OAI, a list's last part says "There are more results." and its "Resume" fails

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** [cdd5b10886](https://github.com/pkp/pkp-lib/commit/cdd5b108865517f8768e0d4d551116a280fc7c02), the commit that added the browser stylesheet (no pull request) · 2008-12-02 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U19 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a4)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

Opened in a web browser, an install's OAI address shows each response as a
readable page, built by one stylesheet shared by all three apps. A
journal manager, a support person or an indexing service's staff member
who pages through a long list there expects its last page to end the
list. It still shows "There are more results." and a "Resume" link, which
answers "The requested resumptionToken is invalid or has expired".

This happens on every list long enough to be split over several pages:
records, identifiers and sets, for a single journal, press or server and
for the whole install.

## Impact

- **Lost**: nothing. The last page holds the last records, and harvesters,
  which read the XML behind the page, are told correctly that the list
  has ended.
- **Who**: the people above, on any list longer than one page. By
  default a page holds 100 records or sets, or 500 identifiers.
- **Way round**: the "cursor" and "completeListSize" rows on the same
  page show that the last record was reached.

Low: the page misleads a person about whether the list has ended, and
nothing else.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), with its
  journal, press or server `publicknowledge` and its OAI interface on,
  as by default.
- The dataset's lists fit on one page (OJS 2 records, OMP 2, OPS 17; a
  page holds 100 by default), so the list is split by the install's own
  setting: in `config.inc.php`, under `[oai]`, set
  `oai_max_records = 1` ("Maximum number of records per request to
  serve via OAI"). No screen offers this setting. An install with more
  than 100 published items pages the same way with the default.
- A browser that applies the XSL stylesheet the response names (Chrome,
  Firefox and Safari still do). Without it the raw XML shows, and that is
  correct.

No sign-in is needed. The browser shows each response as a page headed
"OAI 2.0 Request Results".

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   It shows one record, then "There are more results." with
   "completeListSize" (OJS 2, OMP 2, OPS 17), "cursor" 0, and
   "resumptionToken:" followed by a token and a "Resume" link.
2. Press "Resume" until the page shows the list's last record, where
   "cursor" is one less than "completeListSize". [OJS and OMP: once;
   OPS: 16 times.]
3. On that last part, press "Resume".

**Expected.** The last part says the list is complete: no "There are
more results." and no "Resume", since its token is empty and there is
nothing to resume.

**Observed.** The last part ends as every part before it did, with an
empty token (OJS shown; OMP and OPS alike, OPS with "cursor" 16 of 17):

```
There are more results.

completeListSize	2
cursor	1
resumptionToken:	Resume
```

The XML response itself ends the list correctly:

```xml
<resumptionToken completeListSize="2" cursor="1" />
```

Step 3 opens `…/oai?verb=ListRecords&resumptionToken=` and shows:

```
OAI Error(s)
The request could not be completed due to the following error or errors.
Error Code	badResumptionToken
The requested resumptionToken is invalid or has expired
```

Control: every part before the last shows a token, and its "Resume"
opens the next part. "ListSets" (OJS 3 sets, OMP 6, OPS 2 at one per
page) ends the same way.

## Cause

The server follows OAI-PMH: a list that was resumed ends with an empty
`<resumptionToken completeListSize=… cursor=…/>`, and only a part with
more to come carries a token (`PKP\oai\OAI::listIdentifiers()`,
`::listRecords()` and `::listSets()` in
`lib/pkp/classes/oai/OAI.php`, the `elseif (isset($token))` branch).

The browser view is `lib/pkp/xml/oai2.xsl`, which `OAI::response()` links
as the response's stylesheet. Its template for `oai:resumptionToken`
(line 533) prints "There are more results." and the
"resumptionToken:" row with the "Resume" link for every token element,
without testing whether the token is empty. So it reads the empty token
that closes a list as a live one: on the last part it announces more
results and links `?verb=<verb>&resumptionToken=` with an empty value.

That request passes the argument check, because `OAI::paramExists()`
uses `isset()`, which is true for `''`. `OAI::resumptionToken()` is
abstract; the lookup is the app's own (`JournalOAI::resumptionToken()`, `PressOAI::` and `ServerOAI::`, each
calling `PKPOAIDAO::getToken('')`), which finds no row, so the request
answers `badResumptionToken`. That answer is right for an empty token.

The stylesheet is Christopher Gutteridge's EPrints XSLT, copied in when
the browser view was added in 2008 and refreshed from EPrints in 2024
(`pkp/pkp-lib#9766`, which kept the template's unconditional line).

Reach:

- ListRecords, ListIdentifiers and ListSets: the three response templates
  apply the one token template (checked on screen for ListRecords and
  ListSets; ListIdentifiers in the code, since its page size of 500 is
  hard-coded, `OAIConfig::$maxIdentifiers`, and the dataset has fewer).
- A journal's, press's or server's own address and the install-wide
  address `/index.php/index/oai` share the stylesheet and the server code
  (checked in the code; the install-wide ListSets pages the same way).

## Proposed fix

A proposal; the team decides. Test the token in the template, and say
the list has ended when it is empty
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-last-part-offers-resume/fix.diff)):

```diff
 <xsl:template match="oai:resumptionToken">
-  <p>There are more results.</p>
+  <xsl:choose>
+    <!-- An empty token ends a list that was resumed: nothing more to fetch -->
+    <xsl:when test="normalize-space(.) != ''"><p>There are more results.</p></xsl:when>
+    <xsl:otherwise><p>This is the end of the list.</p></xsl:otherwise>
+  </xsl:choose>
   <table class="values">
 …
-    <tr><td class="key">resumptionToken:</td><td class="value">…<a class="link" href="…">Resume</a></td></tr>
+    <xsl:if test="normalize-space(.) != ''">
+      <tr><td class="key">resumptionToken:</td><td class="value">…<a class="link" href="…">Resume</a></td></tr>
+    </xsl:if>
   </table>
```

The server's response is already right, so the fix stays in the stylesheet.
The "completeListSize" and "cursor" rows stay on the last part, since
they still say where the list stands. The stylesheet already tests the
token's attributes the same way (`<xsl:if test="@expirationDate">`), and
this template is the only place that prints "There are more results." or
the "Resume" link.

Tried on `main`, OJS, OMP and OPS: the last part of ListRecords and of
ListSets reads "This is the end of the list." with its "completeListSize"
and "cursor" and no "Resume"; every earlier part keeps "There are more
results." and a "Resume" that opens the next part, and a list that fits
on one page (ListIdentifiers) still shows no paging lines at all.

**Alternatives:**

- Leave the empty token element out of the server's response: breaks the
  protocol, which asks for it on the part that completes a resumed list,
  and changes what harvesters receive.
- Hide only the "Resume" link: the page would still say "There are more
  results." on the last part.

**What goes with it:**

- No stored data, API or plugin hook is involved. The template is the
  same on 3.5, 3.4 and 3.3, and the diff applies to each as written.
- The stylesheet is EPrints' own; the same change could be offered to
  EPrints, whose copy has the same template.
- Guard: the XSLT has no unit test; a pkp-e2e scenario on U19 can walk a
  paged list to its last page and read it.

Small: one template in one file, with a test.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-last-part-offers-resume/walk.js)
  takes the Steps in a browser on PKP's default test dataset (pkp/datasets
  38ab955, 2026-09-30, PostgreSQL), on the three apps;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-last-part-offers-resume/neighbour.js)
  walks ListSets to its end and opens ListIdentifiers.
  [serve.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js)
  restarts the test server with `oai_max_records = 1` (the
  precondition). Run from pkp-e2e: `PKP_E2E_DATASET=1 node
  shared/playwright/checks/issues/oai-last-part-offers-resume/serve.js on`,
  then `PROBE_FEATURE=issues-w08 PROBE_AGENT=w08 node bin/probe.js all
  shared/playwright/checks/issues/oai-last-part-offers-resume/walk.js`,
  then `serve.js off`; 3.5 the same with `PKP_E2E_LINE=stable-3_5_0` in
  front. Without the fix, neighbour.js saw ListSets end as ListRecords
  does in Observed.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on a fresh
  load of that branch's dataset: the last part read "There are more
  results." with an empty token and "Resume", which answered
  `badResumptionToken`, on all six.
- Tips walked or read:
  - main: OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7; pkp-lib
    2e377d27fc (OJS), 3dc90c81a6 (OMP, OPS).
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd; pkp-lib
    a9c76aed62.
  - stable-3_4_0 (code): OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b;
    pkp-lib df13621c2d. `xml/oai2.xsl` has the same template; each app
    has the OAI handler (`pages/oai`) and `OAI.php` writes the same empty
    token on the completing part and links the stylesheet.
  - stable-3_3_0 (code): OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161;
    pkp-lib d446601ebe. The same template (the 2024 refresh was
    backported); `OAI.inc.php` writes the same empty token and links the
    stylesheet.
- Introduced: `git blame` on the template's "There are more results."
  line gives 5939680212 (`pkp/pkp-lib#10602` for `pkp/pkp-lib#9766`,
  2024-11-13, jonasraoni), which refreshed the file from EPrints and kept
  the line as it was; at its parent the line dates from cdd5b10886
  ("#1442# Added XSL for OAI", 2008-12-02), which added the stylesheet,
  while `OAI.inc.php` at that commit already wrote the empty token. No
  pull request (it predates pkp's use of GitHub). EPrints' current
  `lib/static/oai2.xsl` (eprints/eprints3.4, last changed 2022-11-04)
  has the same template.
- Upstream search (2026-09-30): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library for "resumptionToken", "more results", "oai2.xsl",
  "oai stylesheet", "oai resume". `pkp/pkp-lib#7214` (a 3.3 miscount that
  gave the second part an empty token) and `pkp/pkp-lib#6962` (tokens
  never delivered) are other faults, both fixed.
- The browser logged, on every page of the view: "XSLTProcessor and XSLT
  Processing Instructions have been deprecated by all browsers. These
  features will be removed from this browser soon." The browser view
  itself depends on that feature; that is outside this report.
