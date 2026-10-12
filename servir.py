# Servidor local para probar la app en la PC: python servir.py  →  http://localhost:8765
# (Windows a veces anuncia los .js como text/plain y el navegador no los carga como módulos.)
import http.server, mimetypes, os, sys

mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('application/manifest+json', '.webmanifest')


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


os.chdir(os.path.dirname(os.path.abspath(__file__)))
puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(('127.0.0.1', puerto), SinCache).serve_forever()
