import test from "node:test";
import assert from "node:assert/strict";
import { dbStore } from "./store";
import type { CmsHomepageSettings, CmsStaticPage, User } from "./types";

test("CMS settings and pages persist through the central settings table", async () => {
  const originalFetch = globalThis.fetch;
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rows = new Map<string, { payload: unknown }>();
  let failWrites = false;
  const defaultHomepage = dbStore.getCmsHomepageSettings();
  const defaultPages = dbStore.getCmsPages();
  rows.set("homepage", { payload: defaultHomepage });
  rows.set("pages", { payload: defaultPages });
  rows.set("media-assets", { payload: [] });

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://cms-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "cms-test-service-key";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = input instanceof Request ? input.url : String(input);
    const url = new URL(requestUrl);
    const method = init?.method || "GET";

    if (url.pathname.endsWith("/rest/v1/cms_settings") && method === "GET") {
      const key = url.searchParams.get("key")?.replace(/^eq\./, "") || "";
      const row = rows.get(key);
      return new Response(JSON.stringify(row || null), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname.endsWith("/rest/v1/cms_settings") && method === "POST") {
      if (failWrites) {
        return new Response(JSON.stringify({ message: "simulated database outage" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      const value = JSON.parse(String(init?.body)) as { key: string; payload: unknown };
      rows.set(value.key, { payload: value.payload });
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected CMS persistence request: ${method} ${url.pathname}`);
  }) as typeof fetch;

  try {
    const admin: User = {
      id: "cms-test-admin",
      name: "CMS test administrator",
      phone: "+201000000000",
      role: "admin",
      isVerified: true,
      createdAt: new Date().toISOString(),
    };

    const updatedHomepage = await dbStore.updateCmsHomepageSettingsAsync(
      { visualIdentity: { ...defaultHomepage.visualIdentity!, primaryColor: "#123456" } },
      admin
    );
    assert.equal(updatedHomepage.visualIdentity?.primaryColor, "#123456");
    assert.equal(
      (rows.get("homepage")?.payload as CmsHomepageSettings).visualIdentity?.primaryColor,
      "#123456"
    );
    assert.equal((await dbStore.getCmsHomepageSettingsAsync()).visualIdentity?.primaryColor, "#123456");

    failWrites = true;
    await assert.rejects(
      () => dbStore.updateCmsHomepageSettingsAsync({ heroTitleLine1: "تعديل غير محفوظ" }, admin),
      /CENTRAL_DB_ERROR/
    );
    assert.notEqual((await dbStore.getCmsHomepageSettingsAsync()).heroTitleLine1, "تعديل غير محفوظ");
    failWrites = false;

    const updatedPage = await dbStore.updateCmsPageAsync(
      "about",
      { titleAr: "صفحة تعريفية محفوظة" },
      admin
    );
    assert.equal(updatedPage.titleAr, "صفحة تعريفية محفوظة");
    const persistedPages = rows.get("pages")?.payload as CmsStaticPage[];
    assert.equal(persistedPages.find((page) => page.slug === "about")?.titleAr, "صفحة تعريفية محفوظة");
    assert.equal((await dbStore.getCmsPageAsync("about"))?.titleAr, "صفحة تعريفية محفوظة");

    const asset = await dbStore.addCmsMediaAssetAsync({
      url: "https://example.com/cms-logo.png",
      altText: "CMS test logo",
      fileName: "cms-logo.png",
      mimeType: "image/png",
      fileSizeBytes: 1024,
      uploadedBy: admin.name,
    });
    assert.equal((rows.get("media-assets")?.payload as Array<{ id: string }>)[0].id, asset.id);
    await dbStore.deleteCmsMediaAssetAsync(asset.id, admin);
    assert.deepEqual(rows.get("media-assets")?.payload, []);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
  }
});
