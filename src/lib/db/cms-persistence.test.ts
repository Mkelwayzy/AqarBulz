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
  let failReads = false;
  let missingCmsTable = false;
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
      if (missingCmsTable) {
        return new Response(JSON.stringify({
          code: "PGRST205",
          message: "Could not find the table 'public.cms_settings' in the schema cache",
        }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (failReads) {
        return new Response(JSON.stringify({ message: "simulated database outage" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
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
    assert.equal((await dbStore.getCmsHomepageSettingsForAdminAsync()).persistenceAvailable, true);

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

    const previousConsoleError = console.error;
    let renderingErrorLogged = false;
    console.error = (...args: unknown[]) => {
      if (String(args[0]).includes("Failed to load homepage settings for rendering")) {
        renderingErrorLogged = true;
      }
    };
    try {
      failReads = true;
      const fallbackSettings = await dbStore.getCmsHomepageSettingsForDisplayAsync();
      assert.equal(fallbackSettings.visualIdentity?.primaryColor, "#123456");
      const adminSettings = await dbStore.getCmsHomepageSettingsForAdminAsync();
      assert.equal(adminSettings.persistenceAvailable, false);
      assert.equal(adminSettings.settings.visualIdentity?.primaryColor, "#123456");
      assert.equal(renderingErrorLogged, true);

      failReads = false;
      missingCmsTable = true;
      const missingTableSettings = await dbStore.getCmsHomepageSettingsForAdminAsync();
      assert.equal(missingTableSettings.persistenceAvailable, false);
      assert.equal(missingTableSettings.settings.visualIdentity?.primaryColor, "#123456");
      assert.match(missingTableSettings.error ?? "", /public\.cms_settings/);
      assert.match(missingTableSettings.error ?? "", /20261019011848_repair_cms_settings_schema\.sql/);
    } finally {
      failReads = false;
      missingCmsTable = false;
      console.error = previousConsoleError;
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSupabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
    if (previousServiceKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
  }
});
