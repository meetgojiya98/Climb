import { expect, test } from "@playwright/test"

test("legacy route aliases canonicalize before auth redirect", async ({ page }) => {
  const response = await page.request.get("/app/controltower", { maxRedirects: 0 })
  expect(response.status()).toBe(308)
  const location = response.headers()["location"] || ""
  expect(location).toContain("/app/control-tower")

  const enterpriseAlias = await page.request.get("/app/expansion-lab", { maxRedirects: 0 })
  expect(enterpriseAlias.status()).toBe(308)
  const enterpriseLocation = enterpriseAlias.headers()["location"] || ""
  expect(enterpriseLocation).toContain("/app/enterprise-lab")
})

test("sign-in page renders primary auth controls", async ({ page }) => {
  await page.goto("/signin")
  await expect(page.getByRole("heading", { name: /sign in to climb/i })).toBeVisible()
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
})

test.describe("authenticated sidebar navigation", () => {
  test.skip(
    !process.env.E2E_USER_EMAIL || !process.env.E2E_USER_PASSWORD,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run authenticated navigation checks."
  )

  test("can navigate critical modules from sidebar", async ({ page }) => {
    await page.goto("/signin")

    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL || "")
    await page.getByLabel(/password/i).fill(process.env.E2E_USER_PASSWORD || "")
    await page.getByRole("button", { name: /^sign in$/i }).click()

    await expect(page).toHaveURL(/\/app\/dashboard/)

    const navAssertions: Array<{ link: RegExp; url: RegExp }> = [
      { link: /AI Studio/i, url: /\/app\/ai-studio/ },
      { link: /Control Tower/i, url: /\/app\/control-tower/ },
      { link: /Program Office/i, url: /\/app\/program-office/ },
      { link: /Forecast/i, url: /\/app\/forecast/ },
      { link: /Applications/i, url: /\/app\/applications/ },
    ]

    for (const item of navAssertions) {
      await page.getByRole("link", { name: item.link }).first().click()
      await expect(page).toHaveURL(item.url)
    }
  })
})
