---
name: brave-ui-test
description: "Use Brave Browser for all UI testing and visual verification tasks."
risk: low
source: workspace
date_added: "2026-04-10"
---

# Brave UI Testing Skill

This skill ensures that all browser-based interactions and tests are performed using the **Brave Browser** instead of standard Chrome/Chromium, which is not installed in this environment.

## Usage Guidelines

When asked to "test the UI", "open a page", or "verify visual elements", follow these steps:

1. **Locate Brave**: Use the project's standard Brave paths:
   - `D:\installs Apps\BraveSoftware\Brave-Browser\Application\brave.exe` (Primary)
   - Standard program files paths as fallbacks.

2. **Run Playwright with Brave**:
   Always launch Playwright with the `executablePath` pointing to Brave.

   ```javascript
   const { chromium } = require('playwright');
   const browser = await chromium.launch({
     executablePath: 'D:\\installs Apps\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
     headless: true // or false if user wants to see it
   });
   ```

3. **Helper Scripts**:
   - Use `sessionflow-ui/verify_ui.cjs` for general stability audits.
   - Use `sessionflow-ui/verify_mascot_brave.cjs` for mascot and cinematic animation checks.

4. **Capturing Proof**:
   Always take screenshots of the rendered state to show the user that the test was successful in Brave.

## Internal Tools Note
My built-in `browser_subagent` tool uses a bundled Chromium. If it fails due to Chromium missing, **always** fall back to running a custom Playwright script via `run_command` that uses the Brave path above.
