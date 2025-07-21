import { test, expect } from '@playwright/test';
import { mockWeatherData } from './fixtures/mock-weather-data.js';

test.describe('RideReady App', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the weather API
    await page.route('**/api.open-meteo.com/v1/forecast*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWeatherData)
      });
    });
    
    // Mock geolocation
    await page.addInitScript(() => {
      const mockGeolocation = {
        getCurrentPosition: (success) => {
          setTimeout(() => {
            success({
              coords: {
                latitude: -37.8136,
                longitude: 144.9631
              }
            });
          }, 100);
        }
      };
      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeolocation
      });
    });
    
    await page.goto('/');
  });

  test('should load the main page with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('POC Ride Ready - 7 Day Forecast');
  });

  test('should have location input fields', async ({ page }) => {
    const cityInput = page.locator('input[placeholder*="Enter city name"]');
    const latInput = page.locator('input[placeholder="Latitude"]');
    const lonInput = page.locator('input[placeholder="Longitude"]');

    await expect(cityInput).toBeVisible();
    await expect(latInput).toBeVisible();
    await expect(lonInput).toBeVisible();
  });

  test('should have riding criteria controls', async ({ page }) => {
    await expect(page.getByText('Max Precipitation')).toBeVisible();
    await expect(page.getByText('Max Wind Speed')).toBeVisible();
    await expect(page.getByText('Min Temperature')).toBeVisible();
    await expect(page.getByText('Max Temperature')).toBeVisible();

    // Check that sliders are present
    const sliders = page.locator('input[type="range"]');
    await expect(sliders).toHaveCount(4);
  });

  test('should have refresh weather button', async ({ page }) => {
    const refreshButton = page.locator('button', { hasText: /Refresh Weather Data|Fetching Weather/ });
    await expect(refreshButton).toBeVisible();
  });

  test('should update criteria values when sliders are moved', async ({ page }) => {
    const precipSlider = page.locator('input[type="range"]').first();
    const precipLabel = page.getByText(/Max Precipitation: \d+/);
    
    // Get initial value
    const initialText = await precipLabel.textContent();
    const initialValue = parseFloat(initialText.match(/[\d.]+/)[0]);
    
    // Move slider
    await precipSlider.fill('5.5');
    
    // Check that label updated
    await expect(precipLabel).toContainText('Max Precipitation: 5.5 mm');
  });

  test('should fetch weather data and show grid when coordinates are available', async ({ page }) => {
    // Wait for mocked geolocation and API call
    await page.waitForTimeout(1000);
    
    // Check if weather grid appears
    const gridContainer = page.locator('text=Green blocks indicate suitable riding conditions');
    await expect(gridContainer).toBeVisible({ timeout: 5000 });
    
    // Look for day column header
    await expect(page.getByText('Day', { exact: true })).toBeVisible();
  });

  test('should have frozen day column that does not scroll', async ({ page }) => {
    // Wait for mocked weather data to load
    await page.waitForTimeout(1000);
    
    const dayColumn = page.locator('div:has-text("Day")').first();
    await expect(dayColumn).toBeVisible();
    
    // Check that the scrollable section exists
    const scrollableSection = page.locator('.overflow-x-auto');
    await expect(scrollableSection).toBeVisible();
    
    // Get the day column position
    const dayColumnBox = await dayColumn.boundingBox();
    
    // Scroll horizontally in the scrollable section
    await scrollableSection.evaluate(el => el.scrollLeft = 200);
    
    // Day column should still be in the same position
    const dayColumnBoxAfterScroll = await dayColumn.boundingBox();
    expect(dayColumnBoxAfterScroll.x).toBe(dayColumnBox.x);
  });

  test('should show weather cells with temperature and wind data', async ({ page }) => {
    // Wait for mocked weather data to load
    await page.waitForTimeout(1000);
    
    // Look for temperature displays in cells
    const tempCells = page.locator('div:has-text("°C")');
    await expect(tempCells.first()).toBeVisible({ timeout: 5000 });
    
    // Look for wind speed displays
    const windCells = page.locator('div:has-text("km/h")');
    await expect(windCells.first()).toBeVisible();
    
    // Verify specific mock data appears (using first() to avoid multiple matches)
    await expect(page.locator('text=9°C').first()).toBeVisible(); // From mock data
    await expect(page.locator('text=12.5km/h').first()).toBeVisible(); // From mock data
  });
});