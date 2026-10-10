"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const store_1 = require("./store");
(0, node_test_1.default)("haversineDistanceMeters calculates accurate distance between Cairo points", () => {
    // New Cairo (30.0263, 31.4913) to Maadi (29.9602, 31.2568)
    const dist = (0, store_1.haversineDistanceMeters)(30.0263, 31.4913, 29.9602, 31.2568);
    // Expected distance is approximately 23.8 km (23000m to 25000m)
    strict_1.default.ok(dist > 22000 && dist < 26000, `Distance should be ~24km, got ${dist}`);
});
(0, node_test_1.default)("isPointInBoundingBox accurately filters points inside/outside", () => {
    const sw = { lat: 30.0, lng: 31.0 };
    const ne = { lat: 30.1, lng: 31.5 };
    const insidePoint = { lat: 30.05, lng: 31.25 };
    const outsidePoint = { lat: 30.25, lng: 31.25 };
    strict_1.default.equal((0, store_1.isPointInBoundingBox)(insidePoint, sw, ne), true);
    strict_1.default.equal((0, store_1.isPointInBoundingBox)(outsidePoint, sw, ne), false);
});
(0, node_test_1.default)("isPointInPolygon tests polygon intersection via ray-casting", () => {
    const trianglePolygon = [
        { lat: 30.0, lng: 31.0 },
        { lat: 30.5, lng: 31.0 },
        { lat: 30.25, lng: 31.5 },
    ];
    const inside = { lat: 30.2, lng: 31.1 };
    const outside = { lat: 30.7, lng: 31.2 };
    strict_1.default.equal((0, store_1.isPointInPolygon)(inside, trianglePolygon), true);
    strict_1.default.equal((0, store_1.isPointInPolygon)(outside, trianglePolygon), false);
});
(0, node_test_1.default)("calculateApproximateCoordinates creates a consistent offset without mutating raw point", () => {
    const exactLat = 30.0245;
    const exactLng = 31.4880;
    const id = "prop-test-01";
    const approx = (0, store_1.calculateApproximateCoordinates)(exactLat, exactLng, id);
    strict_1.default.notEqual(approx.lat, exactLat);
    strict_1.default.notEqual(approx.lng, exactLng);
    // Offset should be between 300m and 600m
    const offsetDistance = (0, store_1.haversineDistanceMeters)(exactLat, exactLng, approx.lat, approx.lng);
    strict_1.default.ok(offsetDistance >= 300 && offsetDistance <= 600, `Offset distance should be 300m-600m, got ${offsetDistance}`);
});
