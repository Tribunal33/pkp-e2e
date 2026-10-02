# Issues queue

The specs the issues session works next (MAINTENANCE "The issues
session"), top first. The order puts the likely-severe first: the count
of 🐞 entries with a crash word, then those marked user-visible, then all
🐞 entries, as the registers stood when the queue was made. A spec leaves
the queue when every 🐞 entry has an outcome; a spec left mid-way names
its open entries in the Note. A spec gains a row again when a new 🐞
entry lands in it (MAINTENANCE "The issues session").

A session takes a row by marking its Note "**Taken: issues session,
<VM or workstation> s<n>, <date>**" and pushing before any other work
(MAINTENANCE issues session step 4); a row so marked is not free. The
VM marks also count the VM's issues sessions: at most two run at once,
and the hourly routine starts one only when none is running
(MAINTENANCE "The issues session").

| Spec | 🐞 | crash | user-visible | Note |
|---|---|---|---|---|
| [U54](../specs/U54-roles-configuration.md) | 14 | 2 | 6 | **Taken: issues session, workstation s0, 2026-10-02**; A1, A5 done (docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md); A3 done (docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md); A11 done (docs/issues/U54-A11-own-role-ok-removes-settings-access.md); A13 done (docs/issues/U54-A13-roles-list-order-moves-and-pages-repeat.md); OPS1 done (docs/issues/U54-OPS1-ops-open-access-sign-in-box-not-kept.md) |
| [U37](../specs/U37-tasks-and-discussions.md) | 21 | 2 | 5 | **Taken: issues session, VM s1, 2026-10-02**; A1: open report docs/reports/2026-09-04-omp-ops-discussion-save-missing-notification-class.md |
| [U44](../specs/U44-identifiers.md) | 18 | 2 | 5 |  |
| [U53](../specs/U53-users-management.md) | 16 | 2 | 5 | OPS1 done with U57 A8 (pkp-e2e#360) |
| [U47](../specs/U47-media-files.md) | 8 | 2 | 4 | OMP1 done with U69 A9 (pkp-e2e#282) |
| [U36](../specs/U36-submission-files.md) | 17 | 2 | 2 | A23, A24: open report docs/reports/2026-09-27-pkp-lib-13288.md |
| [U17](../specs/U17-sections.md) | 16 | 2 | 2 |  |
| [U59](../specs/U59-hosted-journals.md) | 9 | 2 | 2 |  |
| [U62](../specs/U62-plugins-management.md) | 8 | 2 | 2 |  |
| [U18](../specs/U18-web-feeds.md) | 6 | 2 | 2 |  |
| [U71](../specs/U71-internal-review-stage.md) | 6 | 2 | 2 |  |
| [U24](../specs/U24-workflow-screen-and-stage-access.md) | 6 | 2 | 0 |  |
| [U49](../specs/U49-publish-schedule-and-versions.md) | 9 | 1 | 8 | OJS3 done with U69 A3 (pkp-e2e#285) |
| [U48](../specs/U48-jats-and-body-text.md) | 17 | 1 | 7 |  |
| [U28](../specs/U28-reviewers-review.md) | 14 | 1 | 5 |  |
| [U06](../specs/U06-user-invitations.md) | 9 | 1 | 5 |  |
| [U16](../specs/U16-categories.md) | 22 | 1 | 4 | A16 joined pkp-e2e#4 by the housekeeping fold (2026-10-01); the report's "Tracked in" line does not list it yet; the report calls the window's box "Title" where the screen says "Name", and its Reach names "Applied Science" where reach.js uses "Social Sciences" on OPS |
| [U64](../specs/U64-usage-statistics.md) | 13 | 1 | 4 | OMP3 done with U69 A9 (pkp-e2e#282) |
| [U46](../specs/U46-galleys.md) | 9 | 1 | 4 |  |
| [U08](../specs/U08-navigation-menus-and-site-chrome.md) | 21 | 1 | 3 | OPS2 done with U51 OPS1 (pkp-e2e#380) |
| [U65](../specs/U65-editorial-statistics.md) | 18 | 1 | 3 |  |
| [U20](../specs/U20-search-engine-metadata-and-analytics.md) | 14 | 1 | 2 | OPS1 done with U13 OPS2, OPS3 (docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md); OMP6 done with U69 A9 (pkp-e2e#282) |
| [U75](../specs/U75-preprint-relations.md) | 8 | 1 | 2 |  |
| [U39](../specs/U39-submission-and-publisher-libraries.md) | 8 | 1 | 1 |  |
| [U27](../specs/U27-reviewer-assignment-and-management.md) | 24 | 0 | 6 |  |
| [U74](../specs/U74-onix-metadata-export.md) | 16 | 0 | 6 | A16 done with U63 A12 (pkp-e2e#258) |
| [U15](../specs/U15-search.md) | 13 | 0 | 6 |  |
| [U04](../specs/U04-orcid-integration.md) | 8 | 0 | 6 |  |
| [U70](../specs/U70-catalog-management.md) | 14 | 0 | 5 |  |
| [U41](../specs/U41-contributors-and-affiliations.md) | 12 | 0 | 5 | A22 joined pkp-e2e#4 by the housekeeping fold (2026-10-01); the report's "Tracked in" line does not list it yet |
| [U12](../specs/U12-announcements.md) | 11 | 0 | 5 | A11 written with U66 A2 ([pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4), the pilot) |
| [U10](../specs/U10-appearance-and-theming.md) | 13 | 0 | 4 | A4 done with U09 A15 ([pkp-e2e#370](https://github.com/jardakotesovec/pkp-e2e/issues/370)) |
| [U03](../specs/U03-user-profile.md) | 12 | 0 | 4 |  |
| [U07](../specs/U07-journal-identity-and-about-pages.md) | 9 | 0 | 4 | OPS3 done with U57 A8 (pkp-e2e#360); OPS4 done with U57 A8 (pkp-e2e#360) |
| [U73](../specs/U73-publication-formats-proof-terms.md) | 18 | 0 | 3 |  |
| [U40](../specs/U40-publication-metadata.md) | 8 | 0 | 3 | A1 done with U21 A20 ([pkp-e2e#323](https://github.com/jardakotesovec/pkp-e2e/issues/323)) |
| [U30](../specs/U30-author-response-to-reviews.md) | 7 | 0 | 3 |  |
| [U58](../specs/U58-submission-intake-configuration.md) | 10 | 0 | 2 |  |
| [U01](../specs/U01-login-and-sessions.md) | 9 | 0 | 2 |  |
| [U02](../specs/U02-registration-and-account-validation.md) | 8 | 0 | 2 |  |
| [U31](../specs/U31-reviewer-suggestions.md) | 8 | 0 | 2 |  |
| [U68](../specs/U68-catalog-browse.md) | 8 | 0 | 2 |  |
| [U05](../specs/U05-notifications-center-and-email-preferences.md) | 7 | 0 | 2 |  |
| [U72](../specs/U72-chapters-work-type.md) | 7 | 0 | 2 |  |
| [U34](../specs/U34-editorial-decision-recording.md) | 5 | 0 | 2 |  |
| [U26](../specs/U26-review-stage-and-rounds.md) | 4 | 0 | 2 |  |
| [U42](../specs/U42-citations-and-references.md) | 16 | 0 | 1 |  |
| [U56](../specs/U56-emails-management.md) | 9 | 0 | 1 |  |
| [U60](../specs/U60-site-settings.md) | 9 | 0 | 1 |  |
| [U38](../specs/U38-submission-activity-log-and-notes.md) | 8 | 0 | 1 |  |
| [U11](../specs/U11-highlights.md) | 5 | 0 | 1 | A4 written with U66 A2 ([pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4), the pilot) |
| [U43](../specs/U43-funding.md) | 4 | 0 | 1 |  |
| [U22](../specs/U22-my-submissions.md) | 2 | 0 | 1 |  |
| [U14](../specs/U14-reader-comments-and-moderation.md) | 5 | 0 | 0 |  |
| [U23](../specs/U23-submissions-dashboard.md) | 5 | 0 | 0 |  |
| [U29](../specs/U29-review-setup-and-review-forms.md) | 5 | 0 | 0 | A11 joined pkp-e2e#4 by the housekeeping fold (2026-10-01); the report's "Tracked in" line does not list it yet |
| [U32](../specs/U32-copyediting-stage.md) | 5 | 0 | 0 | A9 done with U35 A5 (pkp-e2e#343) |
| [U55](../specs/U55-notify-users.md) | 4 | 0 | 0 |  |
| [U33](../specs/U33-production-stage.md) | 3 | 0 | 0 |  |
| [U67](../specs/U67-archiving-preservation.md) | 3 | 0 | 0 |  |
| [U63](../specs/U63-import-export.md) | 1 | 0 | 0 | A23: open report docs/reports/2026-10-01-pkp-lib-13414.md (the rest of U63 written up by the issues session, workstation s0, 2026-10-01) |
