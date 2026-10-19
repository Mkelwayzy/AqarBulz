import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_VISUAL_IDENTITY, getBrandThemeStyle } from "./brand-theme";

test("default brand identity uses the supplied Dar Al Aqar logo", () => {
  assert.equal(DEFAULT_VISUAL_IDENTITY.siteName, "دار العقار");
  assert.equal(DEFAULT_VISUAL_IDENTITY.logoImageUrl, "/branding/dar-al-aqar.png");
  assert.equal(DEFAULT_VISUAL_IDENTITY.logoType, "image");
  assert.equal(DEFAULT_VISUAL_IDENTITY.headerBackground, "white");
});

test("brand theme applies configured colors, font, heading weight, and radius", () => {
  const style = getBrandThemeStyle({
    ...DEFAULT_VISUAL_IDENTITY,
    primaryColor: "#123456",
    primaryHoverColor: "#654321",
    secondaryColor: "#abcdef",
    accentColor: "#fedcba",
    fontFamily: "tajawal",
    headingWeight: "extrabold",
    borderRadius: "rounded",
  });

  assert.equal(Reflect.get(style, "--brand-700"), "18 52 86");
  assert.equal(Reflect.get(style, "--brand-800"), "101 67 33");
  assert.equal(Reflect.get(style, "--brand-secondary"), "171 205 239");
  assert.equal(Reflect.get(style, "--brand-accent"), "254 220 186");
  assert.equal(Reflect.get(style, "--brand-heading-weight"), "800");
  assert.equal(Reflect.get(style, "--font-cairo"), "'Tajawal', sans-serif");
  assert.equal(Reflect.get(style, "--radius-xl"), "22px");
});
