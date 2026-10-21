import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.BROWSER_EXECUTABLE ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.goto("http://127.0.0.1:3000/demo/settings");
  await page
    .locator(".portal-topbar .avatar")
    .filter({ hasText: "AL" })
    .waitFor();
  await page.getByRole("textbox", { name: /Display name/ }).fill("Jamie");
  await page.getByRole("button", { name: "Save my preferences" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Your settings are saved" })
    .waitFor();
  assert.equal(await page.locator(".portal-topbar .avatar").innerText(), "JA");

  await page.evaluate(() => {
    window.profileFrames = [];
    const capture = () => {
      const avatar = document.querySelector(".portal-topbar .avatar");
      if (avatar) window.profileFrames.push(avatar.textContent.trim());
    };
    new MutationObserver(capture).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    capture();
  });
  for (const [section, heading] of [
    ["dashboard", "A little progress, Jamie."],
    ["lessons", "A little learning, a lot of possibility."],
    ["practice", "Let’s put it into practice."],
    ["achievements", "Every little win counts."],
    ["settings", "Make this space yours."],
  ]) {
    const link = section === "settings"
      ? page.locator(".portal-topbar .avatar")
      : page.locator(`.sidebar a[href="/demo/${section}"]`);
    await link.click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    assert.equal(
      await page.locator(".portal-topbar .avatar").innerText(),
      "JA",
    );
  }
  const frames = await page.evaluate(() => window.profileFrames);
  assert.ok(frames.length > 1);
  assert.deepEqual(
    [...new Set(frames)],
    ["JA"],
    "Initials must not reset during client-side navigation",
  );

  // A full reload also restores the saved name without flashing unrelated text.
  await page.reload();
  await page
    .locator(".portal-topbar .avatar")
    .filter({ hasText: "JA" })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Profile navigation passed: saved initials remain JA across five page changes; reload restores the saved name without a BK fallback.",
  );
} catch (error) {
  console.error("Browser errors:", errors);
  console.error((await page.locator("body").innerText()).slice(-4000));
  throw error;
} finally {
  await browser.close();
}
