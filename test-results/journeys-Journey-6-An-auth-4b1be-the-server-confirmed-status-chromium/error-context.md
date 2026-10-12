# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys.spec.ts >> Journey 6: An authorized owner submits a property for review and sees the server-confirmed status
- Location: e2e\journeys.spec.ts:191:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
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
  157 |   await titleInput.fill("فيلا تجريبية للمسودة الذكية E2E");
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
> 217 |   expect(createRes.ok()).toBeTruthy();
      |                          ^ Error: expect(received).toBeTruthy()
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
  258 |     data: {
  259 |       title: "عقار المالك المحمي ضد التعديل E2E",
  260 |       description: "عقار محمي لا يجوز لأي مستخدم آخر العبث ببياناته",
  261 |       transactionType: "sale",
  262 |       category: "apartment",
  263 |       price: 3200000,
  264 |       areaSqM: 150,
  265 |       lat: 30.05,
  266 |       lng: 31.25,
  267 |       status: "draft",
  268 |     },
  269 |   });
  270 |   expect(createRes.ok()).toBeTruthy();
  271 |   const createdData = await createRes.json();
  272 |   const propId = createdData.property?.id || createdData.id;
  273 | 
  274 |   // 2. Attacker attempts to edit owner's property
  275 |   const attackRes = await request.put(`http://localhost:3000/api/properties/${propId}`, {
  276 |     headers: {
  277 |       Cookie: `${attackerCookie.name}=${attackerCookie.value}`,
  278 |       "Content-Type": "application/json",
  279 |     },
  280 |     data: {
  281 |       title: "تم الاختراق وتغيير العنوان",
  282 |     },
  283 |   });
  284 | 
  285 |   // Strict 403 Forbidden check
  286 |   expect(attackRes.status()).toBe(403);
  287 |   const errJson = await attackRes.json();
  288 |   expect(errJson.error).toMatch(/غير مصرح لك بتعديل عقار يملكه مستخدم آخر|غير مصرح/);
  289 | });
  290 | 
  291 | // ============================================================================
  292 | // JOURNEY 8: Unverified broker cannot submit for review
  293 | // ============================================================================
  294 | test("Journey 8: An unverified broker cannot submit for review or use restricted broker features", async ({
  295 |   request,
  296 | }) => {
  297 |   const brokerCookie = createE2ESessionCookie(E2E_USERS.unverifiedBroker);
  298 | 
  299 |   // 1. Unverified broker creates a draft (allowed)
  300 |   const createDraftRes = await request.post("http://localhost:3000/api/properties", {
  301 |     headers: {
  302 |       Cookie: `${brokerCookie.name}=${brokerCookie.value}`,
  303 |       "Content-Type": "application/json",
  304 |     },
  305 |     data: {
  306 |       title: "عقار وسيط غير معتمد E2E",
  307 |       description: "محاولة نشر عقار بواسطة وسيط غير موثق",
  308 |       transactionType: "sale",
  309 |       category: "commercial_retail",
  310 |       price: 5000000,
  311 |       areaSqM: 120,
  312 |       lat: 30.06,
  313 |       lng: 31.28,
  314 |       status: "draft",
  315 |     },
  316 |   });
  317 |   expect(createDraftRes.ok()).toBeTruthy();
```