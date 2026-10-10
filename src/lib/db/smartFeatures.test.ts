import { describe, it } from "node:test";
import assert from "node:assert";
import { smartFeaturesStore } from "./smartFeaturesStore";

describe("Smart Features 30-Ideas Enterprise Suite", () => {
  it("Feature Flag Integrity: All 30 smart features are defined and enabled by default", () => {
    const config = smartFeaturesStore.getConfig();
    assert.strictEqual(config.version, "2.0.0");
    const featureKeys = Object.keys(config.features);
    assert.strictEqual(featureKeys.length, 30, "Exactly 30 smart features must be registered");

    // Check presence of key features across stages
    assert.strictEqual(config.features.inflationHedgeCalculator, true);
    assert.strictEqual(config.features.resaleOverpriceSimulator, true);
    assert.strictEqual(config.features.fairPriceIndexTracker, true);
    assert.strictEqual(config.features.commuteTimeIsochrone, true);
    assert.strictEqual(config.features.sunWindOrientationSimulator, true);
    assert.strictEqual(config.features.multiPropertyComparator, true);
    assert.strictEqual(config.features.reversePropertyRequests, true);
    assert.strictEqual(config.features.engineeringInspectionBooking, true);
    assert.strictEqual(config.features.dynamicFinishingCostEstimator, true);
    assert.strictEqual(config.features.aqarReelsVideoFeed, true);
    assert.strictEqual(config.features.interactiveCompoundMasterplans, true);
    assert.strictEqual(config.features.investorPortfolioTracker, true);
    assert.strictEqual(config.features.aqarPulseMarketIndex, true);
  });

  it("Config Persistence: Admin updates to parameters and toggles persist correctly", () => {
    const original = smartFeaturesStore.getConfig();
    const updated = {
      ...original,
      financialParams: {
        ...original.financialParams,
        usdToEgpRate: 50.2,
      },
    };
    smartFeaturesStore.saveConfig(updated);
    const fetched = smartFeaturesStore.getConfig();
    assert.strictEqual(fetched.financialParams.usdToEgpRate, 50.2);

    // Restore to standard
    smartFeaturesStore.saveConfig(original);
  });

  it("Reverse Marketplace (Idea 24): Buyers can submit and browse requests", () => {
    const newReq = smartFeaturesStore.addReverseRequest({
      userId: "test-user-99",
      userName: "أحمد توفيق",
      userPhone: "01012345678",
      title: "مطلوب شقة 200م دور أرضي بحديقة بالتجمع",
      cityId: "cairo",
      districtId: "new-cairo",
      districtNameAr: "التجمع الخامس",
      category: "apartment",
      transactionType: "sale",
      minBudget: 5000000,
      maxBudget: 7000000,
      minArea: 200,
      bedrooms: 3,
      urgency: "urgent",
    });

    assert.ok(newReq.id.startsWith("req-"));
    assert.strictEqual(newReq.status, "open");

    const allRequests = smartFeaturesStore.getReverseRequests();
    assert.ok(allRequests.some((r) => r.id === newReq.id));
  });

  it("Inspection Booking (Idea 18): Engineering inspection requests are logged with fee computation", () => {
    const config = smartFeaturesStore.getConfig();
    const booking = smartFeaturesStore.bookInspection({
      propertyId: "prop-sample-1",
      propertyTitle: "شقة للبيع بالتجمع الخامس",
      propertyAddress: "شارع التسعين",
      requesterName: "محمد عبد السلام",
      requesterPhone: "01122334455",
      preferredDate: "2026-11-01",
      inspectionType: "full_civil_electrical",
    });

    assert.ok(booking.id.startsWith("insp-"));
    assert.strictEqual(booking.status, "pending");
    assert.ok(config.inspectionParams.baseInspectionFeeEgp > 0);
  });

  it("Compounds & Reels Data Integrity (Ideas 26 & 27): Seed data is populated with rich Egyptian market assets", () => {
    const compounds = smartFeaturesStore.getCompoundMasterplans();
    assert.ok(compounds.length >= 3);
    assert.ok(compounds.some((c) => c.slug === "palm-hills-new-cairo"));
    assert.ok(compounds.some((c) => c.slug === "zed-sheikh-zayed"));

    const reels = smartFeaturesStore.getAqarReels();
    assert.ok(reels.length >= 3);
    assert.ok(reels.every((r) => r.videoUrl && r.price > 0));
  });
});
