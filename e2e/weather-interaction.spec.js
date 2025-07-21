import { test, expect } from "@playwright/test";
import { mockWeatherData, mockWeatherDataRainy } from './fixtures/mock-weather-data.js';

test.describe("Weather Interaction", () => {
  test.beforeEach(async ({ page }) => {
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
    
    await page.goto("/");
  });

  test("should update coordinates and refresh weather data", async ({
    page,
  }) => {
    // Mock API for Sydney coordinates with different data
    await page.route('**/api.open-meteo.com/v1/forecast*', route => {
      const url = route.request().url();
      if (url.includes('-33.8688') && url.includes('151.2093')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...mockWeatherData,
            latitude: -33.8688,
            longitude: 151.2093,
            timezone: "Australia/Sydney"
          })
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockWeatherData)
        });
      }
    });
    
    // Update latitude and longitude to a known location (Sydney)
    await page.fill('input[placeholder="Latitude"]', "-33.8688");
    await page.fill('input[placeholder="Longitude"]', "151.2093");

    // Click refresh button
    await page.click('button:has-text("Refresh Weather Data")');

    // Should show loading state briefly
    await expect(page.locator("text=Loading weather data")).toBeVisible({
      timeout: 3000,
    });

    // Should eventually show weather grid
    await expect(
      page.locator("text=Green blocks indicate suitable riding conditions")
    ).toBeVisible({ timeout: 5000 });
  });

  test("should change riding criteria and affect cell colors", async ({
    page,
  }) => {
    // Mock the weather API for this test
    await page.route('**/api.open-meteo.com/v1/forecast*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWeatherData)
      });
    });
    
    // Wait for mocked weather data to load
    await page.waitForTimeout(1000);

    // Set very restrictive temperature range (no cells should be green)
    await page.fill('input[min="-10"][max="40"]', "30"); // min temp
    await page.fill('input[min="-10"][max="50"]', "31"); // max temp (very narrow range)

    // Wait a moment for re-calculation
    await page.waitForTimeout(500);

    // Most cells should now be red (unsuitable) due to restrictive criteria
    const redCells = page.locator(".bg-red-50");
    await expect(redCells.first()).toBeVisible();

    // Now set very permissive criteria
    await page.fill('input[min="-10"][max="40"]', "-5"); // min temp
    await page.fill('input[min="-10"][max="50"]', "45"); // max temp
    await page.fill('input[min="0"][max="50"]', "50"); // max wind speed
    await page.fill('input[min="0"][max="10"]', "10"); // max precipitation

    // Wait a moment for re-calculation
    await page.waitForTimeout(500);

    // Should have more green cells now
    const greenCells = page.locator(".bg-green-100");
    await expect(greenCells.first()).toBeVisible();
  });

  test("should show tooltip on weather cell hover", async ({ page }) => {
    // Mock the weather API
    await page.route('**/api.open-meteo.com/v1/forecast*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockWeatherData)
      });
    });
    
    // Wait for mocked weather data to load
    await page.waitForTimeout(1000);
    
    // Find a weather cell with data - the cell that has the title attribute
    const weatherCell = page.locator('div[title*="°C"]').first();
    await expect(weatherCell).toBeVisible({ timeout: 5000 });
    
    // Hover over the cell
    await weatherCell.hover();
    
    // Check that title attribute exists (tooltip)
    const title = await weatherCell.getAttribute('title');
    expect(title).toBeTruthy();
    expect(title).toMatch(/\d+\.?\d*°C.*\d+\.?\d*km\/h.*\d+\.?\d*mm/);
  });

  test("should handle error states gracefully", async ({ page }) => {
    // Mock API error response
    await page.route('**/api.open-meteo.com/v1/forecast*', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid coordinates' })
      });
    });
    
    // Set invalid coordinates
    await page.fill('input[placeholder="Latitude"]', "invalid");
    await page.fill('input[placeholder="Longitude"]', "invalid");

    // Try to refresh
    await page.click('button:has-text("Refresh Weather Data")');

    // Should show an error message
    await expect(page.locator('text=Failed to fetch weather data')).toBeVisible({ timeout: 3000 });

    // Page should still be responsive
    await expect(page.locator("h1")).toBeVisible();
  });
});
