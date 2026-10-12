# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys.spec.ts >> Journey 5: An owner creates a draft, reopens it, edits it, and verifies the persisted values
- Location: e2e\journeys.spec.ts:146:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[placeholder*="عنوان"], input[name="title"]').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - link "نبض العقار AqarPulse Egypt" [ref=e6] [cursor=pointer]:
          - /url: /
          - generic [ref=e11]:
            - generic [ref=e12]: نبض العقار
            - generic [ref=e13]: AqarPulse Egypt
        - navigation [ref=e14]:
          - link "الرئيسية" [ref=e15] [cursor=pointer]:
            - /url: /
          - button "العقارات" [ref=e21] [cursor=pointer]
          - link "عن منصة نبض العقار" [ref=e29] [cursor=pointer]:
            - /url: /about
          - link "اتصل بنا" [ref=e33] [cursor=pointer]:
            - /url: /contact
      - generic [ref=e37]:
        - link "العقارات المفضلة" [ref=e38] [cursor=pointer]:
          - /url: /account/favorites
        - generic [ref=e41]:
          - link "تسجيل الدخول" [ref=e42] [cursor=pointer]:
            - /url: /login
          - link "إنشاء حساب" [ref=e47] [cursor=pointer]:
            - /url: /register
        - button "أضف عقارك" [ref=e52] [cursor=pointer]
  - main [ref=e56]:
    - generic [ref=e58]:
      - generic [ref=e59]:
        - button "دخول المستخدمين" [ref=e60] [cursor=pointer]
        - button "بوابة الإدارة 🛡️" [ref=e65] [cursor=pointer]
      - generic [ref=e69]:
        - heading "تسجيل الدخول" [level=1] [ref=e74]
        - paragraph [ref=e75]: مرحباً بك مجدداً في منصة نبض العقار (AqarPulse)
      - generic [ref=e76]: يجب تسجيل الدخول لإضافة وإدارة عقارك على المنصة.
      - generic [ref=e78]:
        - generic [ref=e79]:
          - generic [ref=e80]: رقم الهاتف المحمول أو البريد الإلكتروني
          - textbox "01012345678 أو name@example.com" [ref=e81]
        - generic [ref=e82]:
          - generic [ref=e83]: كلمة المرور
          - generic [ref=e84]:
            - textbox "••••••••" [ref=e85]
            - button [ref=e86] [cursor=pointer]
          - link "نسيت كلمة المرور؟" [ref=e91] [cursor=pointer]:
            - /url: /forgot-password
        - button "دخول الحساب" [ref=e92] [cursor=pointer]
      - generic [ref=e98]:
        - text: ليس لديك حساب مسجل؟
        - link "إنشاء حساب جديد مجاناً" [ref=e99] [cursor=pointer]:
          - /url: /register
  - contentinfo [ref=e100]:
    - generic [ref=e101]:
      - generic [ref=e102]:
        - generic [ref=e103]:
          - generic [ref=e104]: نبض العقار
          - paragraph [ref=e110]: المنصة العقارية الذكية الأولى في مصر القائمة على الخرائط الجغرافية التفاعلية، لربط الملاك والوسطاء العقاريين المعتمدين بالباحثين عن أفضل الفرص السكنية والتجارية.
          - generic [ref=e111]: بيانات موثوقة ونظام حماية لخصوصية الموقع
        - generic [ref=e116]:
          - heading "أبرز المناطق في مصر" [level=4] [ref=e117]
          - list [ref=e118]:
            - listitem [ref=e119]:
              - link "القاهرة الجديدة - التجمع الخامس" [ref=e120] [cursor=pointer]:
                - /url: /explore?districtId=dist-new-cairo
            - listitem [ref=e121]:
              - link "مدينة الشيخ زايد وبيفرلي هيلز" [ref=e122] [cursor=pointer]:
                - /url: /explore?districtId=dist-sheikh-zayed
            - listitem [ref=e123]:
              - link "مدينة السادس من أكتوبر" [ref=e124] [cursor=pointer]:
                - /url: /explore?districtId=dist-6th-october
            - listitem [ref=e125]:
              - link "العاصمة الإدارية الجديدة" [ref=e126] [cursor=pointer]:
                - /url: /explore?districtId=dist-r7-new-capital
            - listitem [ref=e127]:
              - link "المعادي ودجلة" [ref=e128] [cursor=pointer]:
                - /url: /explore?districtId=dist-maadi
            - listitem [ref=e129]:
              - link "حي الزمالك وكورنيش النيل" [ref=e130] [cursor=pointer]:
                - /url: /explore?districtId=dist-zamalek
        - generic [ref=e131]:
          - heading "روابط سريعة" [level=4] [ref=e132]
          - list [ref=e133]:
            - listitem [ref=e134]:
              - link "استكشاف الخريطة التفاعلية" [ref=e135] [cursor=pointer]:
                - /url: /explore
            - listitem [ref=e136]:
              - link "عقارات وفيلات للبيع" [ref=e137] [cursor=pointer]:
                - /url: /properties?transactionType=sale
            - listitem [ref=e138]:
              - link "شقق ودوبلكس للإيجار" [ref=e139] [cursor=pointer]:
                - /url: /properties?transactionType=rent
            - listitem [ref=e140]:
              - link "محرك التوافق العقاري الذكي" [ref=e141] [cursor=pointer]:
                - /url: /smart-match
            - listitem [ref=e142]:
              - link "بوابة الملاك والوسطاء العقاريين" [ref=e143] [cursor=pointer]:
                - /url: /dashboard
            - listitem [ref=e144]:
              - link "لوحة إدارة ومراجعة الإعلانات" [ref=e145] [cursor=pointer]:
                - /url: /admin
        - generic [ref=e146]:
          - heading "سوق العقارات المصري" [level=4] [ref=e147]
          - paragraph [ref=e148]: جميع الأسعار المعروضة بالجنيه المصري (EGP). تخضع الإعلانات لسياسة مراجعة الجودة ومكافحة التكرار، ولا يُنشر أي إعلان دون التحقق من مطابقة المعايير الجغرافية والمواصفات.
          - generic [ref=e149]:
            - generic [ref=e150]: "امتثال تنظيمي:"
            - text: يُنصح بمراجعة القوانين واللوائح المنظمة للإعلانات العقارية الإلكترونية في جمهورية مصر العربية قبل إتمام التعاقدات المالية.
      - generic [ref=e151]:
        - generic [ref=e152]: © 2026 نبض العقار (AqarPulse). جميع الحقوق محفوظة.
        - generic [ref=e153]:
          - link "سياسة الخصوصية" [ref=e154] [cursor=pointer]:
            - /url: /privacy
          - generic [ref=e155]: •
          - link "شروط الاستخدام" [ref=e156] [cursor=pointer]:
            - /url: /terms
          - generic [ref=e157]: •
          - link "اتصل بنا" [ref=e158] [cursor=pointer]:
            - /url: /contact
  - alert [ref=e159]
```

# Test source

```ts
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
  135 |   const favCard = page.locator('article, div[class*="rounded-3xl"]').first();
  136 |   await expect(favCard).toBeVisible();
  137 | 
  138 |   // Reload and assert persistence
  139 |   await page.reload();
  140 |   await expect(page.locator("h1")).toContainText(/المفضلة/);
  141 | });
  142 | 
  143 | // ============================================================================
  144 | // JOURNEY 5: Owner creates a draft, reopens it, edits it, and verifies persisted values
  145 | // ============================================================================
  146 | test("Journey 5: An owner creates a draft, reopens it, edits it, and verifies the persisted values", async ({
  147 |   page,
  148 |   context,
  149 | }) => {
  150 |   const cookie = createE2ESessionCookie(E2E_USERS.owner);
  151 |   await context.addCookies([cookie]);
  152 | 
  153 |   await page.goto("/dashboard/properties/new");
  154 | 
  155 |   // Step 1: Basic Info
  156 |   const titleInput = page.locator('input[placeholder*="عنوان"], input[name="title"]').first();
> 157 |   await titleInput.fill("فيلا تجريبية للمسودة الذكية E2E");
      |                    ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  158 | 
  159 |   const descInput = page.locator('textarea[placeholder*="وصف"], textarea[name="description"]').first();
  160 |   await descInput.fill("تفاصيل الفيلا التجريبية للاختبار الشامل للتأكد من حفظ وتعديل المسودات");
  161 | 
  162 |   // Price & Area
  163 |   const priceInput = page.locator('input[type="number"]').first();
  164 |   await priceInput.fill("6500000");
  165 | 
  166 |   const areaInput = page.locator('input[type="number"]').nth(1);
  167 |   if (await areaInput.isVisible()) {
  168 |     await areaInput.fill("320");
  169 |   }
  170 | 
  171 |   // Click Save Draft button
  172 |   const saveDraftBtn = page.locator('button:has-text("حفظ كمسودة")').first();
  173 |   if (await saveDraftBtn.isVisible()) {
  174 |     await saveDraftBtn.click();
  175 |     await page.waitForURL("**/dashboard/properties**", { timeout: 15000 });
  176 |   }
  177 | 
  178 |   // Open Drafts tab
  179 |   const draftsTab = page.locator('button:has-text("المسودات")').first();
  180 |   if (await draftsTab.isVisible()) {
  181 |     await draftsTab.click();
  182 |   }
  183 | 
  184 |   // Verify draft property appears
  185 |   await expect(page.locator("text=فيلا تجريبية للمسودة الذكية E2E").first()).toBeVisible({ timeout: 10000 });
  186 | });
  187 | 
  188 | // ============================================================================
  189 | // JOURNEY 6: Authorized owner submits property for review and sees server-confirmed status
  190 | // ============================================================================
  191 | test("Journey 6: An authorized owner submits a property for review and sees the server-confirmed status", async ({
  192 |   page,
  193 |   context,
  194 |   request,
  195 | }) => {
  196 |   const cookie = createE2ESessionCookie(E2E_USERS.owner);
  197 |   await context.addCookies([cookie]);
  198 | 
  199 |   // Create a draft directly via API
  200 |   const createRes = await request.post("http://localhost:3000/api/properties", {
  201 |     headers: {
  202 |       Cookie: `${cookie.name}=${cookie.value}`,
  203 |       "Content-Type": "application/json",
  204 |     },
  205 |     data: {
  206 |       title: "شقة للتقديم والاعتماد E2E",
  207 |       description: "شقة تشطيب فاخر جاهزة للمراجعة والاعتماد",
  208 |       transactionType: "sale",
  209 |       category: "apartment",
  210 |       price: 2500000,
  211 |       areaSqM: 135,
  212 |       lat: 30.044,
  213 |       lng: 31.235,
  214 |       status: "draft",
  215 |     },
  216 |   });
  217 |   expect(createRes.ok()).toBeTruthy();
  218 |   const createdData = await createRes.json();
  219 |   const propId = createdData.property?.id || createdData.id;
  220 | 
  221 |   // Navigate to dashboard properties
  222 |   await page.goto("/dashboard/properties?status=draft");
  223 |   await expect(page.locator(`text=شقة للتقديم والاعتماد E2E`).first()).toBeVisible({ timeout: 10000 });
  224 | 
  225 |   // Submit for review via UI button or API
  226 |   const submitReviewRes = await request.patch(`http://localhost:3000/api/properties/${propId}`, {
  227 |     headers: {
  228 |       Cookie: `${cookie.name}=${cookie.value}`,
  229 |       "Content-Type": "application/json",
  230 |     },
  231 |     data: { status: "pending_review" },
  232 |   });
  233 |   expect(submitReviewRes.ok()).toBeTruthy();
  234 |   const submitData = await submitReviewRes.json();
  235 |   expect(submitData.property.status).toBe("pending_review");
  236 | 
  237 |   // Refresh page and check pending_review tab
  238 |   await page.goto("/dashboard/properties?status=pending_review");
  239 |   await expect(page.locator(`text=شقة للتقديم والاعتماد E2E`).first()).toBeVisible();
  240 |   await expect(page.locator("text=قيد المراجعة").first()).toBeVisible();
  241 | });
  242 | 
  243 | // ============================================================================
  244 | // JOURNEY 7: Unauthorized user cannot edit another user's property (IDOR/BOLA Guard)
  245 | // ============================================================================
  246 | test("Journey 7: An unauthorized user cannot edit another user's property", async ({
  247 |   request,
  248 | }) => {
  249 |   const ownerCookie = createE2ESessionCookie(E2E_USERS.owner);
  250 |   const attackerCookie = createE2ESessionCookie(E2E_USERS.attacker);
  251 | 
  252 |   // 1. Owner creates property
  253 |   const createRes = await request.post("http://localhost:3000/api/properties", {
  254 |     headers: {
  255 |       Cookie: `${ownerCookie.name}=${ownerCookie.value}`,
  256 |       "Content-Type": "application/json",
  257 |     },
```