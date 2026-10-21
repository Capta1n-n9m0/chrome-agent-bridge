"""Cross-origin redirect fixture for E2E row DL-2 (docs/e2e-test-plan.md, section 4.13).

Answers `GET /page` with a tiny HTML page (200), and every other GET/HEAD with `302 Found` to a URL
on another origin, with no CORS headers. A tab on `http://127.0.0.1:<port>/page` can therefore
`fetch('/page')` (same origin: 200) but not `fetch('/dl2')`: that first hop is same-origin too, and
only the cross-origin redirect without `Access-Control-Allow-Origin` makes the page's fetch fail
(`TypeError: Failed to fetch`) - the Blackboard -> signed-S3 shape. The extension's service-worker
fetch behind `browser_download` follows the same redirect.

Usage (from the repo root, next to `python -m http.server 8080 --directory test-fixtures`):

    python test-fixtures/redirect_server.py 8081 http://localhost:8080/dl/hello.txt

Binds 127.0.0.1 only. Standard library only. Stop with Ctrl-C.
"""

import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

DEFAULT_PORT = 8081
DEFAULT_TARGET = "http://localhost:8080/dl/hello.txt"


PAGE = (
    b"<!doctype html><html><head><meta charset=\"utf-8\"><title>DL-2 redirect page</title></head>"
    b"<body><p>DL-2: same-origin page of the redirect fixture.</p></body></html>"
)


class RedirectHandler(BaseHTTPRequestHandler):
    target = DEFAULT_TARGET

    def _is_page(self):
        return self.path.split("?", 1)[0] == "/page"

    def _page(self, with_body):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(PAGE)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if with_body:
            self.wfile.write(PAGE)

    def _redirect(self):
        self.send_response(302)
        self.send_header("Location", self.target)
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def do_GET(self):  # noqa: N802 (http.server naming)
        if self._is_page():
            self._page(True)
        else:
            self._redirect()

    def do_HEAD(self):  # noqa: N802
        if self._is_page():
            self._page(False)
        else:
            self._redirect()


def main(argv):
    port = int(argv[1]) if len(argv) > 1 else DEFAULT_PORT
    RedirectHandler.target = argv[2] if len(argv) > 2 else DEFAULT_TARGET
    server = HTTPServer(("127.0.0.1", port), RedirectHandler)
    print(f"redirect fixture on 127.0.0.1:{port} -> 302 to {RedirectHandler.target}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main(sys.argv)
