# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journeys.spec.ts >> Journey 13: A failed database write never produces a false success message
- Location: e2e\journeys.spec.ts:556:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 401
```

# Test source

```ts
  479 |       message: "رسالة خاصة بين المشتري والمالك فقط",
  480 |       seekerName: E2E_USERS.buyer.name,
  481 |       seekerPhone: E2E_USERS.buyer.phone,
  482 |     },
  483 |   });
  484 |   const inqId = (await inqRes.json()).inquiry.id;
  485 | 
  486 |   // 2. Attacker attempts to read private conversation
  487 |   const attackRes = await request.get(`http://localhost:3000/api/inquiries/${inqId}/messages`, {
  488 |     headers: {
  489 |       Cookie: `${attackerCookie.name}=${attackerCookie.value}`,
  490 |     },
  491 |   });
  492 | 
  493 |   // Strict 403 Forbidden check
  494 |   expect(attackRes.status()).toBe(403);
  495 |   const errJson = await attackRes.json();
  496 |   expect(errJson.error).toMatch(/غير مصرح لك بالاطلاع على محادثة هذا الطلب|غير مصرح/);
  497 | });
  498 | 
  499 | // ============================================================================
  500 | // JOURNEY 12: Image upload verification
  501 | // ============================================================================
  502 | test("Journey 12: Uploading an image displays the actual saved file, and a failed upload shows a real error", async ({
  503 |   request,
  504 | }) => {
  505 |   const ownerCookie = createE2ESessionCookie(E2E_USERS.owner);
  506 | 
  507 |   // 1. Valid PNG upload with authentic magic bytes
  508 |   const validPngBuffer = Buffer.from([
  509 |     0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  510 |     0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  511 |     0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  512 |     0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  513 |     0x42, 0x60, 0x82,
  514 |   ]);
  515 | 
  516 |   const uploadRes = await request.post("http://localhost:3000/api/upload", {
  517 |     headers: { Cookie: `${ownerCookie.name}=${ownerCookie.value}` },
  518 |     multipart: {
  519 |       file: {
  520 |         name: "test_valid_image.png",
  521 |         mimeType: "image/png",
  522 |         buffer: validPngBuffer,
  523 |       },
  524 |     },
  525 |   });
  526 | 
  527 |   expect(uploadRes.ok()).toBeTruthy();
  528 |   const uploadJson = await uploadRes.json();
  529 |   expect(uploadJson.success).toBe(true);
  530 |   expect(uploadJson.url).toMatch(/^\/uploads\//);
  531 | 
  532 |   // Verify file is genuinely accessible via HTTP GET
  533 |   const fileFetchRes = await request.get(`http://localhost:3000${uploadJson.url}`);
  534 |   expect(fileFetchRes.ok()).toBeTruthy();
  535 | 
  536 |   // 2. Invalid text payload upload (MUST FAIL with 400)
  537 |   const invalidUploadRes = await request.post("http://localhost:3000/api/upload", {
  538 |     headers: { Cookie: `${ownerCookie.name}=${ownerCookie.value}` },
  539 |     multipart: {
  540 |       file: {
  541 |         name: "malicious_script.sh",
  542 |         mimeType: "text/plain",
  543 |         buffer: Buffer.from("echo 'attack'"),
  544 |       },
  545 |     },
  546 |   });
  547 | 
  548 |   expect(invalidUploadRes.status()).toBe(400);
  549 |   const invalidJson = await invalidUploadRes.json();
  550 |   expect(invalidJson.error).toMatch(/نوع الملف غير مدعوم|صيغة غير صالحة/);
  551 | });
  552 | 
  553 | // ============================================================================
  554 | // JOURNEY 13: Failed database write never produces false success
  555 | // ============================================================================
  556 | test("Journey 13: A failed database write never produces a false success message", async ({
  557 |   request,
  558 | }) => {
  559 |   const ownerCookie = createE2ESessionCookie(E2E_USERS.owner);
  560 | 
  561 |   // Attempt to write property with negative price and zero area
  562 |   const failRes = await request.post("http://localhost:3000/api/properties", {
  563 |     headers: {
  564 |       Cookie: `${ownerCookie.name}=${ownerCookie.value}`,
  565 |       "Content-Type": "application/json",
  566 |     },
  567 |     data: {
  568 |       title: "عقار غير صالح E2E",
  569 |       description: "وصف عقار ببيانات رقمية خاطئة",
  570 |       transactionType: "sale",
  571 |       category: "apartment",
  572 |       price: -50000, // Invalid negative price
  573 |       areaSqM: 0,     // Invalid zero area
  574 |       lat: 30.04,
  575 |       lng: 31.23,
  576 |     },
  577 |   });
  578 | 
> 579 |   expect(failRes.status()).toBe(400);
      |                            ^ Error: expect(received).toBe(expected) // Object.is equality
  580 |   const failJson = await failRes.json();
  581 |   expect(failJson.error).toBeTruthy();
  582 |   expect(failJson.success).toBeFalsy();
  583 | });
  584 | 
  585 | // ============================================================================
  586 | // JOURNEY 14: Logout invalidation & protected route guard
  587 | // ============================================================================
  588 | test("Journey 14: Logout invalidates the session and protected pages reject subsequent unauthenticated requests", async ({
  589 |   page,
  590 |   context,
  591 |   request,
  592 | }) => {
  593 |   const cookie = createE2ESessionCookie(E2E_USERS.owner);
  594 |   await context.addCookies([cookie]);
  595 | 
  596 |   // Navigate to dashboard
  597 |   await page.goto("/dashboard/properties");
  598 |   await expect(page.locator("h1, h2").first()).toBeVisible();
  599 | 
  600 |   // Call logout endpoint
  601 |   const logoutRes = await request.post("http://localhost:3000/api/auth/logout", {
  602 |     headers: { Cookie: `${cookie.name}=${cookie.value}` },
  603 |   });
  604 |   expect(logoutRes.ok()).toBeTruthy();
  605 | 
  606 |   // Clear cookie in browser context to mirror server invalidation
  607 |   await context.clearCookies();
  608 | 
  609 |   // Subsequent request to protected API endpoint MUST return 401
  610 |   const protectedApiRes = await request.get("http://localhost:3000/api/dashboard/properties");
  611 |   expect(protectedApiRes.status()).toBe(401);
  612 | 
  613 |   // Navigating to protected page redirects or prompts login
  614 |   await page.goto("/dashboard/properties");
  615 |   await page.waitForURL("**/login**");
  616 |   await expect(page.locator('button[type="submit"], button:has-text("دخول")').first()).toBeVisible();
  617 | });
  618 | 
```