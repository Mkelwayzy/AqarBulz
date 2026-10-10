import test from "node:test";
import assert from "node:assert/strict";
import { dbStore } from "./store";

test("Duplicate Detection flags identical location and specs as potential duplicate", () => {
  // Take first property from DB as reference
  const firstProp = dbStore.getRawPropertyById("prop-001");
  assert.ok(firstProp, "Reference property should exist");

  // Attempt to submit a duplicate listing with same coordinates, price, and specs
  const duplicateCandidate = {
    title: "شقة للبيع بكمبوند ليك فيو التجمع الخامس بتشطيب الترا",
    category: firstProp.category,
    transactionType: firstProp.transactionType,
    price: firstProp.price,
    areaSqM: firstProp.areaSqM,
    bedrooms: firstProp.bedrooms,
    lat: firstProp.lat,
    lng: firstProp.lng,
  };

  const check = dbStore.checkPotentialDuplicates(duplicateCandidate);
  assert.equal(check.hasPotentialDuplicate, true, "Should flag potential duplicate");
  assert.ok(check.confidenceScore >= 60, `Confidence should be >= 60, got ${check.confidenceScore}`);
  assert.ok(check.matchedPropertyIds.includes(firstProp.id));
  assert.ok(check.reasons.length > 0);
});

test("Duplicate Detection allows distinct properties in different locations", () => {
  const distinctProperty = {
    title: "محل تجاري بوسط البلد",
    category: "commercial_retail" as const,
    transactionType: "rent" as const,
    price: 35000,
    areaSqM: 45,
    lat: 30.0444, // Downtown Cairo
    lng: 31.2357,
  };

  const check = dbStore.checkPotentialDuplicates(distinctProperty);
  assert.equal(check.hasPotentialDuplicate, false);
});
