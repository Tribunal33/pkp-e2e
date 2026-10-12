#!/bin/sh
# Serve the review's app on :8080 and its local plugin gallery on :8081.
# Two servers, since the app fetches the gallery's plugins.xml and the
# package while answering a request of its own. The app server gets four
# workers for the same reason (a request the app makes to itself).
# Requests go to stdout (`podman logs app`); PHP errors to /sandbox/log.
set -e
php -S 0.0.0.0:8081 -t /sandbox/gallery &
export PHP_CLI_SERVER_WORKERS=4
exec php -S 0.0.0.0:8080 -t /sandbox/app
