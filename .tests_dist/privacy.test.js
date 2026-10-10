"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const store_1 = require("./store");
(0, node_test_1.default)("Privacy Redaction: Public caller never receives raw coordinates for approximate listings", () => {
    const dummyProp = {
        id: "test-prop-approx-01",
        slug: "test-prop-slug",
        title: "Test Villa",
        description: "Description",
        transactionType: "sale",
        category: "villa",
        price: 15000000,
        currency: "EGP",
        negotiable: false,
        areaSqM: 350,
        amenities: [],
        images: ["https://example.com/photo.jpg"],
        cityId: "city-cairo",
        districtId: "dist-new-cairo",
        addressDetails: "Secret Exact Address",
        lat: 30.012345,
        lng: 31.456789,
        locationPrivacy: "approximate",
        approximateLat: 30.015000,
        approximateLng: 31.459000,
        status: "published",
        featured: false,
        viewsCount: 1,
        inquiriesCount: 0,
        advertiserId: "usr-owner-01",
        advertiserType: "owner",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    const users = [
        {
            id: "usr-owner-01",
            name: "Owner One",
            email: "owner@example.com",
            phone: "+201000000000",
            role: "owner",
            isVerified: true,
            whatsappEnabled: true,
            createdAt: new Date().toISOString(),
        },
    ];
    // 1. Guest viewer (public call)
    const publicView = store_1.dbStore.toPublicProperty(dummyProp, users, undefined);
    strict_1.default.equal(publicView.isApproximateLocation, true);
    strict_1.default.equal(publicView.privacyRadiusMeters, 500);
    strict_1.default.equal(publicView.lat, dummyProp.approximateLat);
    strict_1.default.notEqual(publicView.lat, 30.012345, "Exact latitude must not be exposed");
    // 2. Owner viewing own listing
    const ownerUser = users[0];
    const ownerView = store_1.dbStore.toPublicProperty(dummyProp, users, ownerUser);
    strict_1.default.equal(ownerView.lat, 30.012345, "Owner is authorized to see exact coordinates");
    // 3. Admin viewing listing
    const adminUser = { ...ownerUser, id: "admin-id", role: "admin" };
    const adminView = store_1.dbStore.toPublicProperty(dummyProp, users, adminUser);
    strict_1.default.equal(adminView.lat, 30.012345, "Admin is authorized to see exact coordinates");
});
