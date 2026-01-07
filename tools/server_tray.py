"""
711BF Gaming Server Tray App
System tray application for managing game servers with toast notifications.
"""

import subprocess
import threading
import time
import os
import sys
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

# Third-party imports
try:
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw
except ImportError:
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pystray", "Pillow"])
    import pystray
    from pystray import MenuItem as item
    from PIL import Image, ImageDraw

try:
    from winotify import Notification, audio
    USE_WINOTIFY = True
except ImportError:
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "winotify"])
        from winotify import Notification, audio
        USE_WINOTIFY = True
    except:
        USE_WINOTIFY = False

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
SERVER_PATH = PROJECT_ROOT / "server"
CLIENT_PATH = PROJECT_ROOT / "prototype"
TRAEFIK_PATH = PROJECT_ROOT / "infrastructure" / "traefik"
TRAEFIK_EXE = TRAEFIK_PATH / "traefik.exe"
UV_PATH = Path.home() / ".local" / "bin" / "uv.exe"

CONTROL_PORT = 7711  # Control API port

class ControlHandler(BaseHTTPRequestHandler):
    """HTTP handler for remote control of the tray app."""
    manager = None  # Set by ServerManager

    def log_message(self, format, *args):
        pass  # Suppress logging

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        if self.path == '/status':
            status, color = self.manager.get_status()
            traefik_running = self.manager.is_process_running(self.manager.traefik_process)
            self.send_json({
                'status': status,
                'running': self.manager.running,
                'traefik_enabled': self.manager.traefik_enabled,
                'traefik_running': traefik_running
            })
        elif self.path == '/start':
            threading.Thread(target=self.manager.start_servers).start()
            self.send_json({'action': 'start', 'message': 'Starting servers...'})
        elif self.path == '/stop':
            threading.Thread(target=self.manager.stop_servers).start()
            self.send_json({'action': 'stop', 'message': 'Stopping servers...'})
        elif self.path == '/restart':
            threading.Thread(target=self.manager.restart_servers).start()
            self.send_json({'action': 'restart', 'message': 'Restarting servers...'})
        else:
            self.send_json({'error': 'Unknown endpoint', 'endpoints': ['/status', '/start', '/stop', '/restart']}, 404)


class ServerManager:
    def __init__(self):
        self.colyseus_process = None
        self.http_process = None
        self.traefik_process = None
        self.running = False
        self.traefik_enabled = True  # Start with Traefik by default
        self.icon = None
        self.control_server = None

    def notify(self, title, message, success=True):
        """Send a toast notification."""
        if USE_WINOTIFY:
            try:
                toast = Notification(
                    app_id="711BF Gaming",
                    title=title,
                    msg=message,
                    duration="short"
                )
                toast.set_audio(audio.Default, loop=False)
                toast.show()
            except Exception as e:
                print(f"Toast error: {e}")
        print(f"[{'OK' if success else 'ERROR'}] {title}: {message}")

    def create_icon_image(self, color="green"):
        """Create a koala emoji icon."""
        from PIL import ImageFont

        img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        try:
            font = ImageFont.truetype("seguiemj.ttf", 48)
            draw.text((8, 0), "🐨", font=font, embedded_color=True)
        except:
            # Fallback: draw a simple koala face
            draw.ellipse([8, 8, 56, 56], fill="#808080")  # Face
            draw.ellipse([2, 12, 22, 32], fill="#606060")  # Left ear
            draw.ellipse([42, 12, 62, 32], fill="#606060")  # Right ear
            draw.ellipse([22, 32, 42, 48], fill="#404040")  # Nose

        return img

    def update_icon(self, color):
        """Update the tray icon color."""
        if self.icon:
            self.icon.icon = self.create_icon_image(color)

    def is_process_running(self, process):
        """Check if a subprocess is still running."""
        if process is None:
            return False
        return process.poll() is None

    def get_status(self):
        """Get current server status."""
        colyseus_up = self.is_process_running(self.colyseus_process)
        http_up = self.is_process_running(self.http_process)

        if colyseus_up and http_up:
            return "running", "green"
        elif colyseus_up or http_up:
            return "partial", "yellow"
        else:
            return "stopped", "red"

    def kill_existing_processes(self, include_traefik=True):
        """Kill any existing server processes."""
        try:
            # Kill node processes (Colyseus)
            subprocess.run(
                ["powershell", "-Command", "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"],
                capture_output=True
            )
            # Kill Python http.server
            subprocess.run(
                ["powershell", "-Command", "Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like '*http.server*'} | Stop-Process -Force"],
                capture_output=True
            )
            # Kill Traefik
            if include_traefik:
                subprocess.run(
                    ["powershell", "-Command", "Get-Process traefik -ErrorAction SilentlyContinue | Stop-Process -Force"],
                    capture_output=True
                )
            time.sleep(1)
        except Exception as e:
            print(f"Error killing processes: {e}")

    def start_servers(self, _=None):
        """Start all game servers."""
        if self.running:
            self.notify("Already Running", "Servers are already running", success=False)
            return

        self.notify("Starting Servers", "Initializing game servers...")
        self.update_icon("yellow")

        # Kill any existing processes first
        self.kill_existing_processes()

        try:
            # Find Python executable (pythonw doesn't work well for servers)
            python_exe = Path(sys.executable).parent / "python.exe"
            if not python_exe.exists():
                python_exe = "python"

            # Start Colyseus server
            self.colyseus_process = subprocess.Popen(
                "npx tsx --watch src/index.ts",
                cwd=str(SERVER_PATH),
                creationflags=subprocess.CREATE_NO_WINDOW,
                shell=True
            )
            time.sleep(3)  # Give server more time to initialize

            # Start HTTP server for client
            self.http_process = subprocess.Popen(
                f'"{python_exe}" -m http.server 3000 --bind 0.0.0.0',
                cwd=str(CLIENT_PATH),
                creationflags=subprocess.CREATE_NO_WINDOW,
                shell=True
            )
            time.sleep(1)

            # Start Traefik if enabled and available
            if self.traefik_enabled and TRAEFIK_EXE.exists():
                self.traefik_process = subprocess.Popen(
                    f'"{TRAEFIK_EXE}" --configFile=traefik.yml',
                    cwd=str(TRAEFIK_PATH),
                    creationflags=subprocess.CREATE_NO_WINDOW,
                    shell=True
                )
                time.sleep(1)

            self.running = True
            self.update_icon("green")

            if self.traefik_enabled and TRAEFIK_EXE.exists():
                self.notify("Servers Started", "HTTPS: https://game.711bf.org\nLocal: http://localhost:3000")
            else:
                self.notify("Servers Started", "Game client: http://localhost:3000\nColyseus: ws://localhost:2567")

        except Exception as e:
            self.update_icon("red")
            self.notify("Start Failed", str(e), success=False)

    def stop_servers(self, _=None):
        """Stop all game servers."""
        if not self.running:
            self.notify("Already Stopped", "Servers are not running", success=False)
            return

        self.notify("Stopping Servers", "Shutting down game servers...")
        self.update_icon("yellow")

        try:
            if self.colyseus_process:
                self.colyseus_process.terminate()
                self.colyseus_process = None

            if self.http_process:
                self.http_process.terminate()
                self.http_process = None

            if self.traefik_process:
                self.traefik_process.terminate()
                self.traefik_process = None

            # Also kill any orphaned processes
            self.kill_existing_processes()

            self.running = False
            self.update_icon("red")
            self.notify("Servers Stopped", "All game servers have been stopped")

        except Exception as e:
            self.notify("Stop Failed", str(e), success=False)

    def restart_servers(self, _=None):
        """Restart all game servers."""
        self.notify("Restarting Servers", "Restarting game servers...")
        self.stop_servers()
        time.sleep(2)
        self.start_servers()

    def open_game(self, _=None):
        """Open the game in browser."""
        import webbrowser
        webbrowser.open("http://localhost:3000")

    def open_monitor(self, _=None):
        """Open Colyseus monitor in browser."""
        import webbrowser
        webbrowser.open("http://localhost:2568/colyseus")

    def open_traefik_dashboard(self, _=None):
        """Open Traefik dashboard in browser."""
        import webbrowser
        webbrowser.open("http://localhost:8080/dashboard/")

    def toggle_traefik(self, _=None):
        """Toggle Traefik on/off."""
        self.traefik_enabled = not self.traefik_enabled
        status = "enabled" if self.traefik_enabled else "disabled"
        self.notify("Traefik Toggle", f"Traefik is now {status}. Restart servers to apply.")

    def show_status(self, _=None):
        """Show current status notification."""
        status, _ = self.get_status()
        traefik_running = self.is_process_running(self.traefik_process)
        traefik_status = "running" if traefik_running else "stopped"

        if status == "running":
            if traefik_running:
                msg = "All servers running\n- HTTPS: https://game.711bf.org\n- WSS: wss://ws.game.711bf.org"
            else:
                msg = "Servers running (no Traefik)\n- Game: http://localhost:3000\n- WS: ws://localhost:2567"
        elif status == "partial":
            msg = f"Some servers running - consider restarting\nTraefik: {traefik_status}"
        else:
            msg = "All servers stopped"

        self.notify("Server Status", msg)

    def quit_app(self, _=None):
        """Quit the tray app."""
        self.stop_servers()
        self.notify("Goodbye", "711BF Gaming tray app closed")
        if self.icon:
            self.icon.stop()

    def create_menu(self):
        """Create the tray menu."""
        return pystray.Menu(
            item('Start Servers', self.start_servers),
            item('Stop Servers', self.stop_servers),
            item('Restart Servers', self.restart_servers),
            pystray.Menu.SEPARATOR,
            item('Open Game (HTTPS)', lambda _: self.open_https_game()),
            item('Open Game (Local)', self.open_game),
            item('Open Colyseus Monitor', self.open_monitor),
            item('Open Traefik Dashboard', self.open_traefik_dashboard),
            pystray.Menu.SEPARATOR,
            item('Traefik Enabled', self.toggle_traefik, checked=lambda _: self.traefik_enabled),
            item('Show Status', self.show_status),
            pystray.Menu.SEPARATOR,
            item('Quit', self.quit_app)
        )

    def open_https_game(self):
        """Open the game via HTTPS in browser."""
        import webbrowser
        webbrowser.open("https://game.711bf.org")

    def start_control_server(self):
        """Start the HTTP control server in a background thread."""
        ControlHandler.manager = self
        try:
            self.control_server = HTTPServer(('127.0.0.1', CONTROL_PORT), ControlHandler)
            self.control_server.serve_forever()
        except Exception as e:
            print(f"Control server error: {e}")

    def run(self):
        """Run the tray application."""
        # Start control server in background
        control_thread = threading.Thread(target=self.start_control_server, daemon=True)
        control_thread.start()

        self.icon = pystray.Icon(
            "711bf_gaming",
            self.create_icon_image("red"),
            "711BF Gaming Server",
            self.create_menu()
        )

        self.notify("711BF Gaming", f"Tray app started. Control API on port {CONTROL_PORT}")
        self.icon.run()


def main():
    manager = ServerManager()
    manager.run()


if __name__ == "__main__":
    main()
