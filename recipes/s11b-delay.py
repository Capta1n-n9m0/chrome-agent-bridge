"""Step 11b S4-helpers fixture (rows RD-5b, RD-DISARM, RD-CTL; docs/e2e-test-plan.md section 4.24).

Every GET/HEAD waits SECONDS, then answers `302 Found` to the same path and query on TARGET, with no body.
Threaded (one thread per connection, daemon threads; a held request never blocks another one, decisions.md #194).
Binds 127.0.0.1 only. Standard library only. Logs one line per request to stdout, when the request arrives:
`<UTC ISO> <METHOD> <path>` (the same form as s9-redirect.py, which stays unchanged); the first line says the port.

    python -I recipes/s11b-delay.py [port] [seconds] [target-origin]
    (defaults: 8086, 4, http://localhost:8085)
"""

import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 8086
DEFAULT_SECONDS = 4.0
DEFAULT_TARGET = "http://localhost:8085"
_LOG_LOCK = threading.Lock()


def log_line(text):
    with _LOG_LOCK:
        sys.stdout.write(text + "\n")
        sys.stdout.flush()


class Delay(BaseHTTPRequestHandler):
    target = DEFAULT_TARGET
    seconds = DEFAULT_SECONDS

    def _go(self):
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        log_line(f"{stamp} {self.command} {self.path}")
        time.sleep(self.seconds)
        try:
            self.send_response(302)
            self.send_header("Location", self.target + self.path)
            self.send_header("Content-Length", "0")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
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
    Delay.seconds = float(argv[2]) if len(argv) > 2 else DEFAULT_SECONDS
    Delay.target = (argv[3] if len(argv) > 3 else DEFAULT_TARGET).rstrip("/")
    server = Server(("127.0.0.1", port), Delay)
    bound = server.server_address[1]
    log_line(f"s11b delay on 127.0.0.1:{bound} -> {Delay.seconds:g} s, then 302 to {Delay.target}<same path> (threaded)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main(sys.argv)
