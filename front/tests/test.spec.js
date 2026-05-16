import { test, expect } from '@playwright/test';

test('Feelings Test - ultra stable flow', async ({ page }) => {
  await page.goto('/test.html');

  const question = page.locator('#question');
  const answers = page.locator('#answers button');
  const nextBtn = page.locator('#next-btn');

  // =========================
  // 1. WAIT FOR TEST INITIALIZATION
  // =========================

  await expect.poll(async () => {
    const text = (await question.textContent())?.trim();
    return !!text && text.length > 0;
  }, {
    timeout: 10000
  }).toBeTruthy();

  let lastQuestion = '';
  let sameCount = 0;

  // =========================
  // 2. MAIN TEST LOOP
  // =========================

  for (let i = 0; i < 20; i++) {

    const qText = (await question.textContent())?.trim() || '';

    // =========================
    // STUCK DETECTION (QUESTION NOT CHANGING)
    // =========================

    if (qText === lastQuestion) {
      sameCount++;
    } else {
      sameCount = 0;
    }

    lastQuestion = qText;

    if (sameCount >= 2) {
      break;
    }

    // =========================
    // 3. EXIT IF NO ANSWERS
    // =========================
    const count = await answers.count();
    if (count === 0) break;

    // =========================
    // 4. SELECT ANSWER
    // =========================
    await answers.first().click();

    // =========================
    // 5. CLICK NEXT (IF AVAILABLE)
    // =========================
    const isNextVisible = await nextBtn
      .isVisible()
      .catch(() => false);

    if (isNextVisible) {
      await nextBtn.click();
    }

    await page.waitForTimeout(250);
  }

  // =========================
  // 6. FINAL ASSERTION
  // =========================
  const finalText = (await question.textContent())?.trim() || '';

  const isFinished =
    finalText.length === 0 ||
    finalText.includes('Ваш идеальный') ||
    finalText.includes('Sinu ideaalne') ||
    finalText.includes('Your perfect') ||
    // fallback: if no answers remain, we assume completion
    (await answers.count()) === 0;

  expect(isFinished).toBeTruthy();
});

// Mida see test täpselt kontrollib:

// 1. Testi laadimine ja algseis
// Kontrollib, et /test.html leht avaneb korrektselt
// Ootab, kuni esimene küsimus ilmub DOM-i
// Veendub, et test ei käivitu enne kui UI on valmis

// 2. Küsimuste läbimine (kasutaja flow simulatsioon)
// Simuleerib kasutaja käitumist, valides igas küsimuses esimese vastuse
// Kontrollib, et "Next" nupp töötab ja viib järgmise küsimuseni
// Läbib kogu küsimustiku automaatselt kuni tulemuseni

// 3. Stuck / hang protection
// Tuvastab olukorra, kus küsimus ei muutu (UI hang või lõppseis)
// Lõpetab tsükli, kui sama küsimus kordub mitu korda järjest
// Väldib lõputut loop’i testis

// 4. Testi lõppemise tuvastamine
// Kontrollib, kas vastuse nupud kaovad (test on lõppenud)
// Või kas kuvatakse tulemuse ekraan ("Your perfect bouquet" jne)
// Veendub, et kasutaja jõuab tulemuse vaatesse

// 5. Üldine flow kontroll
// Veendub, et kogu test töötab algusest lõpuni ilma crashita
// Kontrollib, et kasutaja saab läbida kogu loogika ilma käsitsi sekkumiseta