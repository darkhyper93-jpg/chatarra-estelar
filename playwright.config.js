/**
 * Configuración de las pruebas en navegador (Playwright).
 * Abre el juego en un navegador del tamaño de un celular y lo usa como
 * lo usaría una persona. Se corren con:  npm run test:e2e
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8091',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node scripts/serve.js',
    env: { PORT: '8091' },
    url: 'http://localhost:8091',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['Pixel 7'], viewport: { width: 375, height: 667 }, deviceScaleFactor: 2 } },
    // Motor de Safari (WebKit), el que usan todos los navegadores de iPhone.
    // Sólo en GitHub (CI): en esta compu no está instalado.
    ...(process.env.CI ? [{ name: 'safari', use: { ...devices['iPhone 13'] } }] : []),
  ],
});
