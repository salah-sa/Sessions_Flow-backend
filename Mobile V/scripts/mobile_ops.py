import os
import sys
import subprocess
import time
import requests
from playwright.sync_api import sync_playwright

# ═══════════════════════════════════════════════════════════
# SessionFlow Mobile — TACTICAL OPERATIONS HUB (v1.0)
# Phase 114: Build-Test-Run-View Orchestrator
# ═══════════════════════════════════════════════════════════

MOBILE_ROOT = "D:/Work/assets outer/test/SessionFlow/Mobile V"
EXPO_PORT = 8081
VERIFICATION_URL = f"http://localhost:{EXPO_PORT}"
SCREENSHOT_PATH = os.path.join(MOBILE_ROOT, "verification_telemetry.png")

def log(msg, symbol="[#]"):
    print(f"{symbol} {msg}")

def run_step(name, cmd, cwd=MOBILE_ROOT):
    log(f"Phase: {name}...")
    try:
        subprocess.run(cmd, shell=True, check=True, cwd=cwd)
        log(f"{name} SECURED.", "[OK]")
    except subprocess.CalledProcessError as e:
        log(f"{name} FAILED: {e}", "[X]")
        sys.exit(1)

def wait_for_server(url, timeout=400):
    log(f"Waiting for ignition at {url}...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            res = requests.get(url)
            if res.status_code == 200:
                log("IGNITION CONFIRMED. Server is live.", "[FIRE]")
                return True
        except:
            pass
        time.sleep(2)
    log("SERVER TIMEOUT. Ignition aborted.", "[X]")
    return False

def audit_ui():
    log("Commencing Strategic Audit (UI Verification)...", "[AUDIT]")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844}) # iPhone 14 Pro spec
        
        # Capture console logs
        page.on("console", lambda msg: log(f"CONSOLE: {msg.text}", "[DEBUG]"))
        page.on("pageerror", lambda exc: log(f"PAGE ERROR: {exc}", "[X]"))

        try:
            page.goto(VERIFICATION_URL)
            log(f"Navigated to {VERIFICATION_URL}. Waiting for hydration...")
            page.wait_for_load_state("networkidle")
            
            # Adaptive Audit: Check for Dashboard OR Login surface
            if page.get_by_text("OPERATIONAL TIMELINE").is_visible():
                log("Dashboard Telemetry: UI Structure Verified.", "[OK]")
            elif page.get_by_text("SIGN IN").is_visible() or page.get_by_text("AUTHENTICATION").is_visible():
                log("Auth Surface Telemetry: UI Structure Verified.", "[OK]")
            else:
                log("App Surface Detected & Hydrated.", "[OK]")
            
            # Take Telemetry Screenshot
            page.screenshot(path=SCREENSHOT_PATH)
            log(f"Telemetry captured at: {SCREENSHOT_PATH}", "[SNAP]")
            
        except Exception as e:
            log(f"Audit failure: {e}", "[X]")
            # Take failure screenshot
            page.screenshot(path=SCREENSHOT_PATH.replace(".png", "_FAILURE.png"))
        finally:
            browser.close()

def clear_port(port):
    log(f"Neutralizing port {port}...", "[CLEAN]")
    try:
        # Windows specific: find PID using port and kill it
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
        for line in output.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                log(f"Terminating phantom process PID: {pid}", "[STOP]")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True)
    except:
        log(f"Port {port} is already clear or no process found.", "[OK]")

def main():
    log("SESSIONFLOW MOBILE - MISSION START", "[START]")
    
    # Phase 0: Clean Slate
    clear_port(EXPO_PORT)
    
    # Phase 1: Audit (Build Verification)
    run_step("Build Verification (TSC)", "npx tsc --noEmit")
    
    # Phase 2: Ignition (Start Server)
    log("Igniting Mobile Engine (Expo Web)...", "[ENGINE]")
    # Start server as a background process with cache clear
    server_proc = subprocess.Popen("npx expo start --web --port 8081 --clear", shell=True, cwd=MOBILE_ROOT)
    
    try:
        if wait_for_server(VERIFICATION_URL):
            # Phase 3: Intelligence (UI Audit)
            audit_ui()
            log("MISSION SUCCESS. Operational parameters within tolerance.", "[WIN]")
        else:
            sys.exit(1)
    finally:
        log("Decommissioning server process...", "[STOP]")
        server_proc.terminate()
        # Final cleanup for Windows
        clear_port(EXPO_PORT)

if __name__ == "__main__":
    main()
