"""Step 11b S4-helpers fixture (rows RD-REBUILD-NARROW, RD-DL-SOCKET; docs/e2e-test-plan.md section 4.24).

`/slow/<name>` waits SECONDS, then answers 200 with the file `<name>` found in DIR (then in DIR/dl, so `hello.txt`
comes from test-fixtures/dl); a name with a slash or a leading dot, a missing file and every other path answer 404
(after the same wait for `/slow/...`, at once otherwise). Threaded, binds 127.0.0.1 only, standard library only.
One log line per request to stdout, when the answer is sent: `<UTC ISO> <METHOD> <path> <status>`.

    python -I recipes/s11b-slow.py [port] [seconds] [dir]
    (defaults: 8087, 3, the repo's test-fixtures)
"""

import mimetypes
import os
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

DEFAULT_PORT = 8087
DEFAULT_SECONDS = 3.0
DEFAULT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-fixtures")
_LOG_LOCK = threading.Lock()


def log_line(text):
    with _LOG_LOCK:
        sys.stdout.write(text + "\n")
        sys.stdout.flush()


def find_file(root, name):
    if not name or "/" in name or "\\" in name or name.startswith("."):
        return None
    for folder in (root, os.path.join(root, "dl")):
        candidate = os.path.join(folder, name)
        if os.path.isfile(candidate):
            return candidate
    return None


class Slow(BaseHTTPRequestHandler):
    root = DEFAULT_DIR
    seconds = DEFAULT_SECONDS

    def _go(self):
        path = unquote(urlsplit(self.path).path)
        body = None
        ctype = "text/plain"
        if path.startswith("/slow/"):
            time.sleep(self.seconds)
            found = find_file(self.root, path[len("/slow/"):])
            if found:
                with open(found, "rb") as fh:
                    body = fh.read()
                ctype = mimetypes.guess_type(found)[0] or "application/octet-stream"
        status = 200 if body is not None else 404
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        log_line(f"{stamp} {self.command} {self.path} {status}")
        data = body if body is not None else b"not found"
        try:
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            if self.command == "GET":
                self.wfile.write(data)
        except OSError:
            pass  # the client gave up during the hold

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
    Slow.seconds = float(argv[2]) if len(argv) > 2 else DEFAULT_SECONDS
    Slow.root = argv[3] if len(argv) > 3 else DEFAULT_DIR
    server = Server(("127.0.0.1", port), Slow)
    bound = server.server_address[1]
    log_line(f"s11b slow on 127.0.0.1:{bound} -> /slow/<name> after {Slow.seconds:g} s (threaded)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main(sys.argv)
