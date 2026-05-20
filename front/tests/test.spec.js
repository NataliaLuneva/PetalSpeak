import { test, expect } from '@playwright/test';

test('Feelings Test - guaranteed finish detection (stable)', async ({ page }) => {
    await page.goto('/test.html');

    const question = page.locator('#question');
    const answers = page.locator('#answers button');
    const nextBtn = page.locator('#next-btn');
    const result = page.locator('.result-single');

    const rand = (n) => Math.floor(Math.random() * n);

    // Wait initial UI
    await expect(question).toBeVisible({ timeout: 10000 });

    let lastQuestionText = '';
    let stuckCounter = 0;

    for (let i = 0; i < 60; i++) {

        // =========================
        // 1. STOP IF RESULT EXISTS
        // =========================
        if (await result.count() > 0) break;

        const answerCount = await answers.count();

        // =========================
        // 2. HANDLE BROKEN / FINISHED STATE
        // =========================
        if (answerCount === 0) {
            await page.waitForTimeout(300);

            if (await result.count() > 0) break;

            continue;
        }

        await expect(answers.first()).toBeVisible({ timeout: 7000 });

        // =========================
        // 3. RANDOM ANSWER SELECTION (ALL 4 OPTIONS USED)
        // =========================
        const count = await answers.count();
        await answers.nth(rand(count)).click();

        // optional next button (if UI uses it)
        if (await nextBtn.isVisible().catch(() => false)) {
            await nextBtn.click();
        }

        // =========================
        // 4. STABILITY CHECK (NO RELYING ON TEXT DIFF ONLY)
        // =========================
        await page.waitForTimeout(150);

        const newQ = (await question.textContent())?.trim() || '';

        if (newQ === lastQuestionText) {
            stuckCounter++;
        } else {
            stuckCounter = 0;
        }

        lastQuestionText = newQ;

        // if UI is stuck too long → exit loop safely
        if (stuckCounter >= 5) break;

        // =========================
        // 5. EARLY RESULT CHECK
        // =========================
        if (await result.count() > 0) break;
    }

    // =========================
    // FINAL BUFFER (CHROMIUM SAFETY)
    // =========================
    await page.waitForTimeout(500);

    // =========================
    // FINAL ASSERTION
    // =========================
    const resultCount = await result.count();

    if (resultCount === 0) {
        const q = await question.textContent();
        const a = await answers.count();

        throw new Error(
            `❌ No result reached.\nQuestion: ${q}\nAnswers left: ${a}`
        );
    }

    expect(resultCount).toBe(1);
});

// Mida test teeb:
// avab testilehe
// vastab küsimustele juhuslikult (kõik 4 vastusevarianti)
// liigub järgmise küsimuse juurde
// kontrollib, et UI ei jää kinni samale küsimusele
// tuvastab kui test on lõppenud
// ootab lõpptulemust .result-single

// Mida see tagab:
// test töötab stabiilselt ka Chromium brauseris
// küsimused ei jää “kinni” ega korda lõputult
// lõpptulemus jõuab alati ekraanile
// kogu kasutajavoog töötab automaatselt ja juhuslikult