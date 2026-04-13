import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'http://localhost:5174';
const OUTPUT_DIR = 'd:\\Work\\assets outer\\test\\SessionFlow\\sessionflow-ui\\screenshots';

const ROUTES = [
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/groups', name: 'groups' },
  { path: '/groups/1/sessions', name: 'group-sessions' },
  { path: '/sessions', name: 'sessions-list' },
  { path: '/sessions/1', name: 'session-detail' },
  { path: '/timetable', name: 'timetable' },
  { path: '/students', name: 'students' },
  { path: '/chat', name: 'chat' },
  { path: '/history', name: 'history' },
  { path: '/admin', name: 'admin' },
  { path: '/archive', name: 'archive' },
  { path: '/settings', name: 'settings' },
  { path: '/profile', name: 'profile' }
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  console.log('Taking unauthenticated screenshots...');
  // Capture unauthenticated routes first
  await page.goto(`${BASE_URL}/login`);
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'login.png') });
  
  await page.goto(`${BASE_URL}/register`);
  await delay(1000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'register.png') });

  console.log('Setting localStorage for authentication (Admin Role)...');
  await page.goto(`${BASE_URL}`); // Go to base to allow localStorage access for origin
  
  await page.evaluate(() => {
    const authState = {
      state: {
        user: { id: "1", name: "Admin User", email: "admin@sf.com", role: "Admin" },
        token: "dummy-token"
      },
      version: 0
    };
    localStorage.setItem('sf-auth-storage', JSON.stringify(authState));
    localStorage.setItem('sf_token', 'dummy-token');
  });

  console.log('Taking authenticated screenshots...');

  for (const route of ROUTES) {
    if (route.name === 'login' || route.name === 'register') continue;

    console.log(`Navigating to ${route.path}...`);
    await page.goto(`${BASE_URL}${route.path}`);
    await delay(1500); // give it time for GSAP animations or data loading
    
    const filepath = path.join(OUTPUT_DIR, `${route.name}.png`);
    await page.screenshot({ path: filepath });
    console.log(`Captured ${route.name}.png`);
  }

  await browser.close();
  console.log('Done captures!');
  process.exit(0);
})();
