"""Step 11 S5 CSP fixture server (row UP-8; docs/e2e-test-plan.md section 4.23).

Serves a directory (default: test-fixtures) over HTTP on 127.0.0.1 and adds one header to every response:

    Content-Security-Policy: script-src 'self'

so a page's inline scripts and handlers are blocked and only same-origin script files run (test-fixtures/s11-upload.html
loads its reporter from s11-upload.js for exactly this). Threaded (one thread per connection, daemon threads), as
recipes/s9-redirect.py since Step 10 S1, so a connection a client leaves open cannot hold the next request. Binds
127.0.0.1 only. Standard library only. Logs one line per request to stdout: `<UTC ISO> <METHOD> <path>` - fixture
paths only. Port 8084 (the wave sheet's guard checks it free first: decisions.md #251); port 0 picks a free port and
the first line says which.

    python -I recipes/s11-csp.py [port] [directory]
    (defaults: 8084, test-fixtures next to the repo's recipes/)

Written 2026-10-25 by the Step 11 S5 prep builder, before any Run 16 row ran.
"""

import os
import sys
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 8084
CSP = "script-src 'self'"
_LOG_LOCK = threading.Lock()


def log_line(text):
    with _LOG_LOCK:
        sys.stdout.write(text + "\n")
        sys.stdout.flush()


class CspHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):  # noqa: A002 - silence the default stderr log (stdout has ours)
        pass

    def _stamp(self):
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    def do_GET(self):  # noqa: N802 (http.server naming)
        log_line(f"{self._stamp()} GET {self.path}")
        super().do_GET()

    def do_HEAD(self):  # noqa: N802
        log_line(f"{self._stamp()} HEAD {self.path}")
        super().do_HEAD()


class Server(ThreadingHTTPServer):
    daemon_threads = True  # a thread blocked on an idle connection never keeps the process alive


def main(argv):
    port = int(argv[1]) if len(argv) > 1 else DEFAULT_PORT
    here = os.path.dirname(os.path.abspath(__file__))
    directory = argv[2] if len(argv) > 2 else os.path.join(os.path.dirname(here), "test-fixtures")
    handler = partial(CspHandler, directory=directory)
    server = Server(("127.0.0.1", port), handler)
    log_line(f"s11 csp on 127.0.0.1:{server.server_address[1]} serving the fixtures with Content-Security-Policy: {CSP} (threaded)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main(sys.argv)
