#!/bin/bash
# pkp-lib#7527 PR review (omp#2372 at efaed78423): on one PHP process with OPcache, the public
# category page answers 200 until a catalog and a book page were served, then 500 for good.
# Usage: category-order.sh <base url of a freshly started OMP server> (the seeded press).
B=${1:?base url}; P=$B/index.php/publicknowledge/en
book=$(curl -s "$P/catalog" | grep -oE 'catalog/book/[0-9]+' | head -1)
cat1=$(curl -s "$P/catalog" | grep -oE 'catalog/category/[a-z0-9-]+' | head -1)
[ -z "$cat1" ] && cat1=catalog/category/applied-science
code() { curl -s -o /dev/null -w '%{http_code}' "$1"; }
echo "category (after catalog only): $(code "$P/$cat1")"
echo "book $book: $(code "$P/$book")"
for i in 1 2 3; do echo "category after book, read $i: $(code "$P/$cat1")"; done
