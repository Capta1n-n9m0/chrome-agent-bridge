"""Step 11b S4-helpers fixture (rows RD-CTL, RD-BACK, RD-FWD; docs/e2e-test-plan.md section 4.24).

The first GET of a path+query answers `200` (a small HTML page, `Cache-Control: no-store`); every later GET of the
same path+query answers `302 Found` to the same path and query on TARGET. A history entry built from the 200 then
makes `back`/`forward` request the URL again and meet the 302. A HEAD answers what a GET would, without using up
the first GET. Threaded, binds 127.0.0.1 only, standard library only. One log line per request to stdout:
`<UTC ISO> <METHOD> <path> <status>` (status 200 or 302, so a counter can tell them apart per query tag).

    python -I recipes/s11b-flip.py [port] [target-origin]
    (defaults: 8091, http://localhost:8085)
"""

import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 8091
DEFAULT_TARGET = "http://localhost:8085"
PAGE = b"<!doctype html><meta charset=utf-8><title>flip</title><p id=flip>flip fixture: first request</p>"
_LOG_LOCK = threading.Lock()
_SEEN_LOCK = threading.Lock()
_SEEN = set()


def log_line(text):
    with _LOG_LOCK:
        sys.stdout.write(text + "\n")
        sys.stdout.flush()


class Flip(BaseHTTPRequestHandler):
    target = DEFAULT_TARGET

    def _go(self):
        with _SEEN_LOCK:
            first = self.path not in _SEEN
            if self.command == "GET":
                _SEEN.add(self.path)
        status = 200 if first else 302
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        log_line(f"{stamp} {self.command} {self.path} {status}")
        if first:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(PAGE)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if self.command == "GET":
                self.wfile.write(PAGE)
        else:
            self.send_response(302)
            self.send_header("Location", self.target + self.path)
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

    def do_GET(self):  # noqa: N802 (http.server naming)
        self._go()

    def do_HEAD(self):  # noqa: N802
        self._go()

    def log_message(self, format, *args):  # noqa: A002 - silence the default stderr log
        pass


class Server(ThreadingHTTPServer):
    daemon_threads = True


def main(argv):
    port = int(argv[1]) if len(argv) > 1 else DEFAULT_PORT
    Flip.target = (argv[2] if len(argv) > 2 else DEFAULT_TARGET).rstrip("/")
    server = Server(("127.0.0.1", port), Flip)
    bound = server.server_address[1]
    log_line(f"s11b flip on 127.0.0.1:{bound} -> 200 once per path, then 302 to {Flip.target}<same path> (threaded)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main(sys.argv)
