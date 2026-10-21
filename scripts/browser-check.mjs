import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
await mkdir("test-results", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(15000);
page.setDefaultNavigationTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const origin = "http://127.0.0.1:3000";
const visit = async (path) => {
  await page.goto(origin + path);
  await page.waitForLoadState("networkidle");
};
const noOverflow = async (label) =>
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    label + " overflows",
  );
try {
  await visit("/");
  await page
    .getByRole("heading", {
      name: "Small steps. Balanced books. A brighter future.",
    })
    .waitFor();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await noOverflow("Desktop landing");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  await noOverflow("Mobile landing");
  await page.getByLabel("Toggle navigation").click();
  assert.equal(
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .isVisible(),
    true,
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Features", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await visit("/demo/dashboard");
  await page
    .getByRole("heading", { name: "A little progress, Alex." })
    .waitFor();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await visit("/demo/lessons?lesson=l0");
  await page
    .getByRole("button", { name: "Complete preview lesson", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "A Assets = Liabilities + Equity",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Check my answer", exact: true })
    .click();
  await page.getByText("That’s it! A little win.", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("bookkeep-preview-v1")).xp.reduce(
        (n, e) => n + e.points,
        0,
      ),
    ),
    30,
  );
  await visit("/demo/lessons?lesson=l0");
  await page
    .getByRole("button", {
      name: "A Assets = Liabilities + Equity",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Check my answer", exact: true })
    .click();
  await page.getByText("That’s it! A little win.", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("bookkeep-preview-v1")).xp.reduce(
        (n, e) => n + e.points,
        0,
      ),
    ),
    30,
  );
  await visit("/demo/practice");
  await page.getByLabel("Debit account", { exact: true }).selectOption("Cash");
  await page
    .getByLabel("Credit account", { exact: true })
    .selectOption("Owner’s Capital");
  await page
    .getByRole("button", { name: "Check my entry", exact: true })
    .click();
  await page.getByText("Nicely balanced!", { exact: true }).waitFor();
  await visit("/demo/flashcards");
  await page
    .getByRole("button", { name: "Start reviewing", exact: true })
    .click();
  for (let i = 0; i < 6; i++) {
    await page
      .getByRole("button", {
        name: "Flashcard question. Activate to reveal the answer.",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "I knew it", exact: true }).click();
  }
  await page
    .getByRole("heading", { name: "That’s a little win.", exact: true })
    .waitFor();
  await visit("/demo/exam");
  await page
    .getByRole("button", { name: "Start my mock exam", exact: true })
    .click();
  const examId = await page.evaluate(
    () => JSON.parse(localStorage.getItem("bookkeep-preview-exam")).id,
  );
  await page.reload();
  await page.getByText("Question 1 of 10", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("bookkeep-preview-exam")).id,
    ),
    examId,
  );
  for (let i = 0; i < 10; i++) {
    const option = await page.evaluate(() => {
      const e = JSON.parse(localStorage.getItem("bookkeep-preview-exam"));
      return e.questions[e.index].correct_option;
    });
    await page.locator(".exam-question .option").nth(option).click();
    await page
      .getByRole("button", {
        name: i === 9 ? "Finish exam" : "Next question",
        exact: true,
      })
      .click();
    if (i < 9)
      await page
        .getByText(`Question ${i + 2} of 10`, { exact: true })
        .waitFor();
  }
  await page
    .getByRole("heading", {
      name: "A milestone worth celebrating.",
      exact: true,
    })
    .waitFor();
  assert.equal(await page.locator(".result-hero strong").textContent(), "100%");
  await page.screenshot({
    path: "test-results/exam-result.png",
    fullPage: true,
  });
  await visit("/demo/settings");
  await page.getByLabel("Theme", { exact: true }).selectOption("dark");
  await page
    .getByRole("button", { name: "Save my preferences", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Your settings are saved." })
    .waitFor();
  assert.equal(
    await page
      .locator("html")
      .evaluate((el) => el.classList.contains("theme-dark")),
    true,
  );
  await page.screenshot({
    path: "test-results/settings-dark.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "dashboard",
    "lessons",
    "practice",
    "flashcards",
    "exam",
    "achievements",
    "leaderboard",
    "settings",
  ]) {
    await visit("/demo/" + path);
    await noOverflow("Mobile " + path);
    if (path === "dashboard")
      await page.screenshot({
        path: "test-results/dashboard-mobile.png",
        fullPage: true,
      });
  }
  await visit("/login");
  await page.getByRole("heading", { name: "Good to see you again." }).waitFor();
  await noOverflow("Mobile login");
  await visit("/learn/dashboard");
  assert.equal(new URL(page.url()).pathname, "/login");
  await visit("/admin/overview");
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(
    (await page.request.get(origin + "/api/platform")).status(),
    401,
  );
  assert.equal(
    (
      await page.request.post(origin + "/api/platform", {
        headers: { Origin: "https://other.test" },
        data: { action: "start_exam" },
      })
    ).status(),
    403,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: landing desktop/mobile, lesson and repeat-XP protection, journal feedback, flashcard session, exam reload/score, dark theme, all mobile learner routes, route protection, and API origin checks.",
  );
} catch (error) {
  await page.screenshot({
    path: "test-results/browser-failure.png",
    fullPage: true,
  });
  console.error(
    "Failed at",
    page.url(),
    await page.locator("body").innerText(),
  );
  throw error;
} finally {
  await browser.close();
}
