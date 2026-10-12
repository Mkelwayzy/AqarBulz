# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys.spec.ts >> Journey 8: An unverified broker cannot submit for review or use restricted broker features
- Location: e2e\journeys.spec.ts:294:5

# Error details

```
Error: expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
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
> 317 |   expect(createDraftRes.ok()).toBeTruthy();
      |                               ^ Error: expect(received).toBeTruthy()
  318 |   const draftData = await createDraftRes.json();
  319 |   const propId = draftData.property?.id || draftData.id;
  320 | 
  321 |   // 2. Unverified broker attempts to submit for review (MUST FAIL with 403)
  322 |   const submitReviewRes = await request.patch(`http://localhost:3000/api/properties/${propId}`, {
  323 |     headers: {
  324 |       Cookie: `${brokerCookie.name}=${brokerCookie.value}`,
  325 |       "Content-Type": "application/json",
  326 |     },
  327 |     data: { status: "pending_review" },
  328 |   });
  329 | 
  330 |   expect(submitReviewRes.status()).toBe(403);
  331 |   const errJson = await submitReviewRes.json();
  332 |   expect(errJson.error).toMatch(/حساب الوسيط غير معتمد|اعتماد ترخيص الوسيط/);
  333 | });
  334 | 
  335 | // ============================================================================
  336 | // JOURNEY 9: Administrator reviews listing and submits moderation decision
  337 | // ============================================================================
  338 | test("Journey 9: An administrator reviews an eligible listing, submits a moderation decision, and sees the updated state", async ({
  339 |   page,
  340 |   context,
  341 |   request,
  342 | }) => {
  343 |   const ownerCookie = createE2ESessionCookie(E2E_USERS.owner);
  344 |   const adminCookie = createE2ESessionCookie(E2E_USERS.admin);
  345 | 
  346 |   // 1. Owner creates and submits property
  347 |   const createRes = await request.post("http://localhost:3000/api/properties", {
  348 |     headers: {
  349 |       Cookie: `${ownerCookie.name}=${ownerCookie.value}`,
  350 |       "Content-Type": "application/json",
  351 |     },
  352 |     data: {
  353 |       title: "عقار للإشراف والموافقة الإدارية E2E",
  354 |       description: "عقار قيد التدقيق لاعتماده من المشرف",
  355 |       transactionType: "sale",
  356 |       category: "apartment",
  357 |       price: 4200000,
  358 |       areaSqM: 180,
  359 |       lat: 30.045,
  360 |       lng: 31.238,
  361 |       status: "pending_review",
  362 |     },
  363 |   });
  364 |   expect(createRes.ok()).toBeTruthy();
  365 |   const propId = (await createRes.json()).property.id;
  366 | 
  367 |   // 2. Admin opens moderation dashboard
  368 |   await context.addCookies([adminCookie]);
  369 |   await page.goto("/admin/properties?status=pending_review");
  370 | 
  371 |   // 3. Admin approves property via API / UI
  372 |   const approveRes = await request.patch("http://localhost:3000/api/admin/moderation", {
  373 |     headers: {
  374 |       Cookie: `${adminCookie.name}=${adminCookie.value}`,
  375 |       "Content-Type": "application/json",
  376 |     },
  377 |     data: {
  378 |       propertyId: propId,
  379 |       status: "published",
  380 |     },
  381 |   });
  382 |   expect(approveRes.ok()).toBeTruthy();
  383 | 
  384 |   // 4. Verify listing transitions to published
  385 |   await page.goto("/admin/properties?status=published");
  386 |   await expect(page.locator("text=عقار للإشراف والموافقة الإدارية E2E").first()).toBeVisible({ timeout: 10000 });
  387 | });
  388 | 
  389 | // ============================================================================
  390 | // JOURNEY 10: Buyer creates inquiry and participants access conversation
  391 | // ============================================================================
  392 | test("Journey 10: A buyer creates an inquiry and authorized participants can access the correct conversation", async ({
  393 |   request,
  394 | }) => {
  395 |   const ownerCookie = createE2ESessionCookie(E2E_USERS.owner);
  396 |   const buyerCookie = createE2ESessionCookie(E2E_USERS.buyer);
  397 | 
  398 |   // 1. Owner publishes property
  399 |   const createRes = await request.post("http://localhost:3000/api/properties", {
  400 |     headers: {
  401 |       Cookie: `${ownerCookie.name}=${ownerCookie.value}`,
  402 |       "Content-Type": "application/json",
  403 |     },
  404 |     data: {
  405 |       title: "شقة للاستفسار والمحادثة E2E",
  406 |       description: "شقة معروضة للبيع تقبل الاستفسارات المباشرة",
  407 |       transactionType: "sale",
  408 |       category: "apartment",
  409 |       price: 1900000,
  410 |       areaSqM: 110,
  411 |       lat: 30.044,
  412 |       lng: 31.235,
  413 |       status: "published",
  414 |     },
  415 |   });
  416 |   const prop = (await createRes.json()).property;
  417 | 
```