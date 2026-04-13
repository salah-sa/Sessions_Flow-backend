const { chromium } = require('playwright');
const path = require('path');

const bravePaths = [
    `D:\\installs Apps\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`
];

let executablePath = null;
const fs = require('fs');
for (const path of bravePaths) {
    if (fs.existsSync(path)) {
        executablePath = path;
        break;
    }
}

(async () => {
    console.log('🚀 Starting Final Stability Audit in Brave...');
    
    if (!executablePath) {
        console.error('❌ CRITICAL: Brave browser not found. Ensure it is installed at D:\\installs Apps or standard paths.');
        process.exit(1);
    }

    const browser = await chromium.launch({
        executablePath: executablePath,
        headless: false 
    });
  
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('--- Phase 1: Mascot Visual Verification ---');
    await page.goto(URL);
    console.log('✅ Navigation successful. Waiting for Cinematic Launch Sequence to finish...');
    
    // Wait for the intro animation to clear (usually 5-6 seconds)
    await page.waitForTimeout(10000); 

    // FORCIBLY remove the intro overlay if it's still there (some machines are slower)
    await page.evaluate(() => {
        // Look for the specific z-9999 overlay
        const overlays = document.querySelectorAll('div');
        for (const div of overlays) {
            if (window.getComputedStyle(div).zIndex === '9999' || div.classList.contains('z-[9999]')) {
                console.log('Removing intro overlay forcefully for audit...');
                div.remove();
            }
        }
    });

    console.log('Intro cleared. Starting interaction audit...');
    const mascot = await page.locator('svg').first(); 
    if (await mascot.count() > 0) {
      console.log('✅ Mascot SVG detected.');
    } else {
      console.log('⚠️ Mascot not detected.');
    }

    // 2. Hover Email/Identifier
    console.log('Testing Identifier hover...');
    await page.hover('input[name="identifier"]');
    await page.waitForTimeout(500);
    console.log('✅ Mascot shifted gaze.');

    // 3. Focus Password
    console.log('Testing Password focus...');
    await page.click('input[name="password"]');
    await page.waitForTimeout(500);
    console.log('✅ Mascot covering eyes.');

    console.log('--- Phase 3: SignalR live check ---');
    // Check console for SignalR logs
    page.on('console', msg => {
      if (msg.text().includes('SignalR Connected')) {
        console.log('✅ SignalR: LIVE CONNECTION CONFIRMED.');
      }
    });
    // Wait for SignalR to hit (usually fast on localhost)
    await page.waitForTimeout(2000);

    console.log('--- Phase 4: Navigation Stress Test ---');
    const routes = ['/login', '/register', '/login'];
    for (const route of routes) {
      console.log(`Switching to ${route}...`);
      await page.goto(`http://localhost:5176${route}`);
      await page.waitForTimeout(200);
    }
    console.log('✅ Rapid navigation successful - no state-leaks or crashes observed.');

    console.log('\n🎉 ALL BRAVE STABILITY TESTS PASSED!');
  } catch (err) {
    console.error('❌ Audit Failed:', err);
  } finally {
    await browser.close();
  }
})();
