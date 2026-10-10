"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const store_1 = require("./store");
(0, node_test_1.default)("Duplicate Detection flags identical location and specs as potential duplicate", () => {
    // Take first property from DB as reference
    const firstProp = store_1.dbStore.getRawPropertyById("prop-001");
    strict_1.default.ok(firstProp, "Reference property should exist");
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
    const check = store_1.dbStore.checkPotentialDuplicates(duplicateCandidate);
    strict_1.default.equal(check.hasPotentialDuplicate, true, "Should flag potential duplicate");
    strict_1.default.ok(check.confidenceScore >= 60, `Confidence should be >= 60, got ${check.confidenceScore}`);
    strict_1.default.ok(check.matchedPropertyIds.includes(firstProp.id));
    strict_1.default.ok(check.reasons.length > 0);
});
(0, node_test_1.default)("Duplicate Detection allows distinct properties in different locations", () => {
    const distinctProperty = {
        title: "محل تجاري بوسط البلد",
        category: "commercial_retail",
        transactionType: "rent",
        price: 35000,
        areaSqM: 45,
        lat: 30.0444, // Downtown Cairo
        lng: 31.2357,
    };
    const check = store_1.dbStore.checkPotentialDuplicates(distinctProperty);
    strict_1.default.equal(check.hasPotentialDuplicate, false);
});
