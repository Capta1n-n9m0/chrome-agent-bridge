"""Step 9 S4 redirect fixture (rows SAFE-5b, SAFE-5c; docs/e2e-test-plan.md section 4.20).

Every GET/HEAD answers `302 Found` to the same path and query on http://localhost:8081 (the wave's blocked
fixture origin), with no body and no CORS headers. Port 8083, because 8082 is held by a Windows process on this
machine (S4 ledger). Binds 127.0.0.1 only. Standard library only. Logs one line per request to stdout:
`<UTC ISO> <METHOD> <path>` - fixture paths only (the runner counts hits; nothing else is logged).

    python -I recipes/s9-redirect.py [port] [target-origin]
    (defaults: 8083, http://localhost:8081)

Written 2026-10-24 by the S4 prep builder, before any run.
"""

import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

DEFAULT_PORT = 8083
DEFAULT_TARGET = "http://localhost:8081"


class Redirect(BaseHTTPRequestHandler):
    target = DEFAULT_TARGET

    def _go(self):
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        print(f"{stamp} {self.command} {self.path}", flush=True)
        self.send_response(302)
        self.send_header("Location", self.target + self.path)
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self):  # noqa: N802 (http.server naming)
        self._go()

    def do_HEAD(self):  # noqa: N802
        self._go()

    def log_message(self, format, *args):  # noqa: A002 - silence the default stderr log (stdout has ours)
        pass


def main(argv):
    port = int(argv[1]) if len(argv) > 1 else DEFAULT_PORT
    Redirect.target = (argv[2] if len(argv) > 2 else DEFAULT_TARGET).rstrip("/")
    server = HTTPServer(("127.0.0.1", port), Redirect)
    print(f"s9 redirect on 127.0.0.1:{port} -> 302 to {Redirect.target}<same path>", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main(sys.argv)
