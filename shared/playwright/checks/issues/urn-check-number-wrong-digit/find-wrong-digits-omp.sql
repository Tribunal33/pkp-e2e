-- Lists the stored URNs whose last digit is not the check digit of the rest of the URN, computed as
-- URNPubIdPlugin::_calculateCheckNo() computes it (whole URN, prefix included; characters outside the table skipped).
-- For installs that have had the URN plugin's "Check Number" on. Read-only. PostgreSQL, OMP on `main` (its table names; tried there with known URNs).
-- Docs: docs/issues/U44-A6-urn-check-number-wrong-digit.md. Run: psql -d <database> -f find-wrong-digits-omp.sql
WITH urns(kind, id, urn) AS (
  SELECT 'publication', publication_id, setting_value FROM publication_settings WHERE setting_name = 'pub-id::other::urn'
  UNION ALL SELECT 'chapter', chapter_id, setting_value FROM submission_chapter_settings WHERE setting_name = 'pub-id::other::urn'
  UNION ALL SELECT 'format', publication_format_id, setting_value FROM publication_format_settings WHERE setting_name = 'pub-id::other::urn'
  UNION ALL SELECT 'file', submission_file_id, setting_value FROM submission_file_settings WHERE setting_name = 'pub-id::other::urn'
),
codes(c, code) AS (VALUES
  ('9','41'),('8','9'),('7','8'),('6','7'),('5','6'),('4','5'),('3','4'),('2','3'),('1','2'),('0','1'),
  ('a','18'),('b','14'),('c','19'),('d','15'),('e','16'),('f','21'),('g','22'),('h','23'),('i','24'),('j','25'),
  ('k','42'),('l','26'),('m','27'),('n','13'),('o','28'),('p','29'),('q','31'),('r','12'),('s','32'),('t','33'),
  ('u','11'),('v','34'),('w','35'),('x','36'),('y','37'),('z','38'),('-','39'),(':','17'),('_','43'),('/','45'),
  ('.','47'),('+','49')),
conv AS (
  SELECT u.kind, u.id, u.urn, string_agg(codes.code, '' ORDER BY ch.k) AS n
  FROM urns u
  CROSS JOIN LATERAL regexp_split_to_table(lower(left(u.urn, -1)), '') WITH ORDINALITY AS ch(c, k)
  JOIN codes ON codes.c = ch.c
  GROUP BY u.kind, u.id, u.urn
),
checked AS (
  SELECT kind, id, urn,
    ((SELECT sum(substr(n, j, 1)::int * j) FROM generate_series(1, length(n)) j)
      / right(n, 1)::int) % 10 AS digit
  FROM conv
)
SELECT kind, id, urn, digit AS check_digit FROM checked
WHERE right(urn, 1) <> digit::text
ORDER BY kind, id;
