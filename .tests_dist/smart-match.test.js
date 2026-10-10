"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const store_1 = require("./store");
(0, node_test_1.default)("Smart Match Engine scores properties accurately and enforces hard constraints", () => {
    // Query matches for sale apartments in New Cairo with budget 10M
    const matches = store_1.dbStore.findSmartMatchesForCriteria({
        transactionType: "sale",
        category: "apartment",
        preferredDistrictId: "dist-new-cairo",
        maxBudget: 10000000,
        minArea: 180,
        requiredBedrooms: 3,
    });
    strict_1.default.ok(matches.length > 0, "Should find matching properties");
    // Top match should have high score
    const topMatch = matches[0];
    strict_1.default.ok(topMatch.score >= 70, `Top match score should be >= 70, got ${topMatch.score}`);
    strict_1.default.ok(topMatch.matchedCriteria.length > 0, "Should have explainable matched criteria");
    // Verify explanation includes budget and location
    const criteriaText = topMatch.matchedCriteria.join(" ");
    strict_1.default.ok(criteriaText.includes("الميزانية") || criteriaText.includes("المنطقة"));
});
(0, node_test_1.default)("Smart Match Engine rejects properties violating hard constraints", () => {
    // Rental search should never return sale properties
    const matches = store_1.dbStore.findSmartMatchesForCriteria({
        transactionType: "rent",
        maxBudget: 100000,
    });
    for (const m of matches) {
        strict_1.default.equal(m.property.transactionType, "rent", "All returned matches must be rent");
    }
});
