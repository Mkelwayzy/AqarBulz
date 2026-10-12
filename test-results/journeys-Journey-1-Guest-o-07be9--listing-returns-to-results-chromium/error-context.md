# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys.spec.ts >> Journey 1: Guest opens homepage, navigates to property search, applies filters, opens listing, returns to results
- Location: e2e\journeys.spec.ts:11:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('a[href^="/properties/"]').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('a[href^="/properties/"]').first() with timeout 10000ms
  - waiting for locator('a[href^="/properties/"]').first()

```

```yaml
- banner:
  - link "نبض العقار AqarPulse Egypt":
    - /url: /
    - img
    - text: نبض العقار AqarPulse Egypt
  - navigation:
    - link "الرئيسية":
      - /url: /
      - img
      - text: الرئيسية
    - button "العقارات":
      - img
      - text: العقارات
      - img
    - link "عن منصة نبض العقار":
      - /url: /about
      - img
      - text: عن منصة نبض العقار
    - link "اتصل بنا":
      - /url: /contact
      - img
      - text: اتصل بنا
  - link "العقارات المفضلة":
    - /url: /account/favorites
    - img
  - link "تسجيل الدخول":
    - /url: /login
    - img
    - text: تسجيل الدخول
  - link "إنشاء حساب":
    - /url: /register
    - img
    - text: إنشاء حساب
  - button "أضف عقارك":
    - img
    - text: أضف عقارك
- main:
  - heading "دليل العقارات المتاحة في مصر" [level=1]
  - paragraph: إجمالي 0 عقار معتمد ومطابق للشروط الجغرافية
  - link "عرض البحث على الخريطة التفاعلية":
    - /url: /explore?transactionType=sale
    - img
    - text: عرض البحث على الخريطة التفاعلية
  - button "الكل"
  - button "للبيع"
  - button "للإيجار"
  - textbox "ابحث بالمنطقة، الحي، أو اسم العقار..."
  - img
  - combobox:
    - option "كافة المناطق والأحياء" [selected]
    - option "مدينة ميت غمر (المركز)"
    - option "دقادوس"
    - option "تفهنا الأشراف"
    - option "دماص"
    - option "صهرجت الكبرى"
    - option "أتميدة"
    - option "كوم النور"
    - option "بشلا"
    - option "دنديط"
    - option "أوليلة"
    - option "سنفا"
    - option "ميت يعيش"
    - option "ميت أبو خالد"
    - option "ميت الفرماوي"
    - option "ميت القرشي"
    - option "ميت محسن"
    - option "ميت العز"
    - option "ميت ناجي"
    - option "هلا"
    - option "سرنجا"
    - option "سنبو مقام"
    - option "سنتماي"
    - option "بشالوش"
    - option "البوها"
    - option "بهيدة"
    - option "جصفا"
    - option "كفر المقدام"
    - option "كفر سرنجا"
    - option "كفر الشهيد"
    - option "كفر الوزير"
    - option "كفر بهيدة"
    - option "كفر نعمان"
    - option "كفر النعيم"
    - option "كفر المحمدية"
    - option "كفر الشيخ هلال"
    - option "كفور البهايتة"
    - option "كفر أبو نبهان"
    - option "كفر إبراهيم يوسف"
    - option "كفر عطا الله سليمان"
    - option "كفر علي عبد الله"
    - option "القاهرة الجديدة - التجمع الخامس"
    - option "القاهرة الجديدة - التجمع الأول"
    - option "الشيخ زايد"
    - option "السادس من أكتوبر"
    - option "المعادي"
    - option "الزمالك"
    - option "مصر الجديدة"
    - option "الحي السكني السابع (R7)"
  - combobox:
    - option "جميع أنواع العقارات" [selected]
    - option "شقق"
    - option "بيوت"
    - option "فلل"
    - option "محلات تجارية"
    - option "مكاتب إدارية"
  - button "تصفية إضافية":
    - img
    - text: تصفية إضافية
  - button "إعادة ضبط الفلاتر":
    - img
  - img
  - heading "لم يتم العثور على عقارات مطابقة" [level=3]
  - paragraph: لم نجد عقارات تطابق معايير التصفية التي حددتها. يرجى تجربة تغيير نطاق السعر أو اختيار مناطق أخرى.
  - button "إعادة تعيين كافة الفلاتر"
- contentinfo:
  - img
  - text: نبض العقار
  - paragraph: المنصة العقارية الذكية الأولى في مصر القائمة على الخرائط الجغرافية التفاعلية، لربط الملاك والوسطاء العقاريين المعتمدين بالباحثين عن أفضل الفرص السكنية والتجارية.
  - img
  - text: بيانات موثوقة ونظام حماية لخصوصية الموقع
  - heading "أبرز المناطق في مصر" [level=4]
  - list:
    - listitem:
      - link "القاهرة الجديدة - التجمع الخامس":
        - /url: /explore?districtId=dist-new-cairo
    - listitem:
      - link "مدينة الشيخ زايد وبيفرلي هيلز":
        - /url: /explore?districtId=dist-sheikh-zayed
    - listitem:
      - link "مدينة السادس من أكتوبر":
        - /url: /explore?districtId=dist-6th-october
    - listitem:
      - link "العاصمة الإدارية الجديدة":
        - /url: /explore?districtId=dist-r7-new-capital
    - listitem:
      - link "المعادي ودجلة":
        - /url: /explore?districtId=dist-maadi
    - listitem:
      - link "حي الزمالك وكورنيش النيل":
        - /url: /explore?districtId=dist-zamalek
  - heading "روابط سريعة" [level=4]
  - list:
    - listitem:
      - link "استكشاف الخريطة التفاعلية":
        - /url: /explore
    - listitem:
      - link "عقارات وفيلات للبيع":
        - /url: /properties?transactionType=sale
    - listitem:
      - link "شقق ودوبلكس للإيجار":
        - /url: /properties?transactionType=rent
    - listitem:
      - link "محرك التوافق العقاري الذكي":
        - /url: /smart-match
    - listitem:
      - link "بوابة الملاك والوسطاء العقاريين":
        - /url: /dashboard
    - listitem:
      - link "لوحة إدارة ومراجعة الإعلانات":
        - /url: /admin
  - heading "سوق العقارات المصري" [level=4]
  - paragraph: جميع الأسعار المعروضة بالجنيه المصري (EGP). تخضع الإعلانات لسياسة مراجعة الجودة ومكافحة التكرار، ولا يُنشر أي إعلان دون التحقق من مطابقة المعايير الجغرافية والمواصفات.
  - text: "امتثال تنظيمي: يُنصح بمراجعة القوانين واللوائح المنظمة للإعلانات العقارية الإلكترونية في جمهورية مصر العربية قبل إتمام التعاقدات المالية. © 2026 نبض العقار (AqarPulse). جميع الحقوق محفوظة."
  - link "سياسة الخصوصية":
    - /url: /privacy
  - text: •
  - link "شروط الاستخدام":
    - /url: /terms
  - text: •
  - link "اتصل بنا":
    - /url: /contact
- alert
```

# Test source

```ts
  1   | import { test, expect, request } from "@playwright/test";
  2   | import { E2E_USERS, seedE2EUsers, createE2ESessionCookie } from "./helpers/seed-e2e";
  3   | 
  4   | test.beforeAll(async () => {
  5   |   seedE2EUsers();
  6   | });
  7   | 
  8   | // ============================================================================
  9   | // JOURNEY 1: Guest discovery & search navigation
  10  | // ============================================================================
  11  | test("Journey 1: Guest opens homepage, navigates to property search, applies filters, opens listing, returns to results", async ({
  12  |   page,
  13  | }) => {
  14  |   // 1. Open homepage
  15  |   await page.goto("/");
  16  |   await expect(page).toHaveTitle(/عقار نبض|AqarPulse|عقارات/i);
  17  | 
  18  |   // 2. Navigate to property catalog
  19  |   const catalogLink = page.locator('nav a[href="/properties"], a[href="/properties"]').first();
  20  |   await catalogLink.click();
  21  |   await page.waitForURL("**/properties");
  22  | 
  23  |   // 3. Verify catalog loaded
  24  |   await expect(page.locator("h1")).toContainText(/عقارات/);
  25  | 
  26  |   // 4. Apply filter (e.g., transactionType "للبيع")
  27  |   const saleFilter = page.locator('button:has-text("للبيع"), a:has-text("للبيع")').first();
  28  |   if (await saleFilter.isVisible()) {
  29  |     await saleFilter.click();
  30  |   }
  31  | 
  32  |   // 5. Open first property card
  33  |   const propertyCard = page.locator('a[href^="/properties/"]').first();
> 34  |   await expect(propertyCard).toBeVisible({ timeout: 10000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  35  |   const href = await propertyCard.getAttribute("href");
  36  |   expect(href).toBeTruthy();
  37  | 
  38  |   await propertyCard.click();
  39  |   await page.waitForURL(`**${href}`);
  40  | 
  41  |   // 6. Verify property details page
  42  |   await expect(page.locator("h1")).toBeVisible();
  43  |   await expect(page.locator("text=ج.م").first()).toBeVisible();
  44  | 
  45  |   // 7. Return to results
  46  |   await page.goBack();
  47  |   await page.waitForURL("**/properties**");
  48  |   await expect(page.locator("h1")).toContainText(/عقارات/);
  49  | });
  50  | 
  51  | // ============================================================================
  52  | // JOURNEY 2: Guest login and registration navigation (Desktop & Mobile)
  53  | // ============================================================================
  54  | test("Journey 2: Guest uses login and registration navigation on desktop and mobile", async ({
  55  |   page,
  56  | }) => {
  57  |   // Desktop navigation
  58  |   await page.setViewportSize({ width: 1280, height: 800 });
  59  |   await page.goto("/");
  60  | 
  61  |   const desktopLoginBtn = page.locator('a[href="/login"]:has-text("تسجيل الدخول")').first();
  62  |   await expect(desktopLoginBtn).toBeVisible();
  63  |   await desktopLoginBtn.click();
  64  |   await page.waitForURL("**/login");
  65  |   await expect(page.locator('button[type="submit"], button:has-text("دخول")').first()).toBeVisible();
  66  | 
  67  |   // Switch to register from login page
  68  |   const registerLink = page.locator('a[href*="/register"]').first();
  69  |   await expect(registerLink).toBeVisible();
  70  |   await registerLink.click();
  71  |   await page.waitForURL("**/register**");
  72  |   await expect(page.locator('button[type="submit"], button:has-text("تسجيل")').first()).toBeVisible();
  73  | 
  74  |   // Mobile navigation
  75  |   await page.setViewportSize({ width: 375, height: 667 });
  76  |   await page.goto("/");
  77  | 
  78  |   const mobileMenuBtn = page.locator('button[aria-label="فتح القائمة"], button[aria-label*="قائمة"]').first();
  79  |   if (await mobileMenuBtn.isVisible()) {
  80  |     await mobileMenuBtn.click();
  81  |     const mobileLoginBtn = page.locator('div[role="dialog"] a[href="/login"], nav a[href="/login"]').first();
  82  |     await expect(mobileLoginBtn).toBeVisible();
  83  |   }
  84  | });
  85  | 
  86  | // ============================================================================
  87  | // JOURNEY 3: Authentication persistence across page reload
  88  | // ============================================================================
  89  | test("Journey 3: A user logs in, refreshes the page, and retains the correct authenticated state", async ({
  90  |   page,
  91  |   context,
  92  | }) => {
  93  |   // Login via API and set session cookie
  94  |   const cookie = createE2ESessionCookie(E2E_USERS.owner);
  95  |   await context.addCookies([cookie]);
  96  | 
  97  |   // Navigate to dashboard
  98  |   await page.goto("/dashboard/properties");
  99  |   await expect(page.locator("h1, h2").first()).toContainText(/إدارة عقاراتي|عقاراتي/);
  100 | 
  101 |   // Reload page
  102 |   await page.reload();
  103 | 
  104 |   // Verify authenticated session is retained
  105 |   await expect(page.locator("h1, h2").first()).toContainText(/إدارة عقاراتي|عقاراتي/);
  106 |   // Guest login button should not be present in main nav
  107 |   await expect(page.locator('nav a[href="/login"]:has-text("تسجيل الدخول")')).not.toBeVisible();
  108 | });
  109 | 
  110 | // ============================================================================
  111 | // JOURNEY 4: Favorites persistence
  112 | // ============================================================================
  113 | test("Journey 4: A user saves a favorite, refreshes, and sees the persisted favorite", async ({
  114 |   page,
  115 |   context,
  116 | }) => {
  117 |   const cookie = createE2ESessionCookie(E2E_USERS.buyer);
  118 |   await context.addCookies([cookie]);
  119 | 
  120 |   await page.goto("/properties");
  121 | 
  122 |   // Click favorite button on first property
  123 |   const favoriteBtn = page.locator('button[aria-label*="المفضلة"], button[title*="المفضلة"]').first();
  124 |   await expect(favoriteBtn).toBeVisible({ timeout: 10000 });
  125 |   await favoriteBtn.click();
  126 | 
  127 |   // Wait a moment for network save
  128 |   await page.waitForTimeout(1000);
  129 | 
  130 |   // Navigate to favorites page
  131 |   await page.goto("/account/favorites");
  132 |   await expect(page.locator("h1")).toContainText(/المفضلة/);
  133 | 
  134 |   // Verify at least one favorited property card is displayed
```