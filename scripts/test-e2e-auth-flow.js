const assert = require("assert");
const path = require("path");
const fs = require("fs");

// Ensure globalThis.WebSocket doesn't crash on Node 20
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class DummyWebSocket {};
}

const {
  storeOtp,
  verifyOtpCode,
  createVerificationToken,
  hashPassword,
  verifyPassword,
  generateNumericOtp,
} = require("../.tests_dist/auth/security.js");
const { dbStore } = require("../.tests_dist/db/store.js");

async function runEndToEndTests() {
  console.log("==========================================================");
  console.log("   AQARPULSE AUTHENTICATION & PASSWORD RESET E2E TEST     ");
  console.log("==========================================================\n");

  const timestamp = Date.now();
  const testEmail = `test.user.${timestamp}@gmail.com`;
  const initialPassword = "InitialPassword123#";
  const newPassword = "BrandNewPassword2026!";
  const testPhone = `+2010${Math.floor(10000000 + Math.random() * 90000000)}`;

  // -------------------------------------------------------------------------
  // TEST 1: Password Hashing & Verification
  // -------------------------------------------------------------------------
  console.log("▶ TEST 1: Cryptographic Scrypt Password Hashing");
  const { hash, salt } = hashPassword(initialPassword);
  assert.ok(hash && salt, "Hash and salt must be non-empty");
  assert.equal(verifyPassword(initialPassword, hash, salt), true, "Correct password must verify");
  assert.equal(verifyPassword("WrongPassword!", hash, salt), false, "Wrong password must fail");
  console.log("  ✔ Scrypt hashing and timing-safe verification verified.\n");

  // -------------------------------------------------------------------------
  // TEST 2: Registration Simulation with Hashed Password
  // -------------------------------------------------------------------------
  console.log("▶ TEST 2: User Registration & Persistence");
  const registeredUser = dbStore.createUser({
    name: "مستخدم التجربة الشاملة",
    email: testEmail,
    phone: testPhone,
    role: "buyer",
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    passwordHash: hash,
    passwordSalt: salt,
  });

  assert.ok(registeredUser.id, "User ID must be assigned");
  assert.equal(registeredUser.email, testEmail);
  assert.equal(registeredUser.passwordHash, hash);
  console.log(`  ✔ User created successfully: ID=${registeredUser.id}, Email=${registeredUser.email}\n`);

  // -------------------------------------------------------------------------
  // TEST 3: Logout and Re-login with Correct Password
  // -------------------------------------------------------------------------
  console.log("▶ TEST 3: Logout & Re-login with Registered Password");
  const foundUser = dbStore.findUserByEmail(testEmail);
  assert.ok(foundUser, "User must be found by email");
  const loginPassOk = verifyPassword(initialPassword, foundUser.passwordHash, foundUser.passwordSalt);
  assert.equal(loginPassOk, true, "Re-login with correct password must succeed 100%");
  console.log("  ✔ Re-login succeeded with original password.\n");

  // -------------------------------------------------------------------------
  // TEST 4: Re-login with WRONG Password Must Fail
  // -------------------------------------------------------------------------
  console.log("▶ TEST 4: Re-login with Wrong Password");
  const loginPassWrong = verifyPassword("IncorrectPass999", foundUser.passwordHash, foundUser.passwordSalt);
  assert.equal(loginPassWrong, false, "Re-login with incorrect password must be blocked");
  console.log("  ✔ Wrong password was rejected as expected.\n");

  // -------------------------------------------------------------------------
  // TEST 5: Forgot Password OTP Request
  // -------------------------------------------------------------------------
  console.log("▶ TEST 5: Forgot Password OTP Request & Disk Cache");
  const otpCode = generateNumericOtp();
  assert.equal(otpCode.length, 6, "OTP must be 6 digits");
  storeOtp(testEmail, otpCode, 10 * 60 * 1000);

  // Check that tokens file exists on disk
  const tokensPath = path.join(process.cwd(), ".data", "auth_tokens.json");
  assert.ok(fs.existsSync(tokensPath), "Tokens file must exist on disk");
  const tokensOnDisk = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
  assert.ok(tokensOnDisk.otps, "OTPs must be persisted in auth_tokens.json");
  console.log(`  ✔ OTP code ${otpCode} generated, stored in globalThis and synced to disk.\n`);

  // -------------------------------------------------------------------------
  // TEST 6: Invalid OTP Code Rejected
  // -------------------------------------------------------------------------
  console.log("▶ TEST 6: Invalid OTP Code Rejection");
  const badVerify = verifyOtpCode(testEmail, "000000");
  assert.equal(badVerify.valid, false, "Invalid OTP must fail");
  console.log("  ✔ Invalid OTP code was cleanly rejected.\n");

  // -------------------------------------------------------------------------
  // TEST 7: Valid OTP Code Verified & Password Reset
  // -------------------------------------------------------------------------
  console.log("▶ TEST 7: Valid OTP Verification & Password Reset");
  const goodVerify = verifyOtpCode(testEmail, otpCode);
  assert.equal(goodVerify.valid, true, "Valid OTP must succeed");

  // Update password in dbStore
  const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
  const updatedUser = dbStore.updateUserPassword(registeredUser.id, newHash, newSalt);
  assert.ok(updatedUser, "Updated user must be returned");
  assert.equal(updatedUser.passwordHash, newHash);
  console.log("  ✔ OTP verified, new password hashed and saved in database.\n");

  // -------------------------------------------------------------------------
  // TEST 8: Re-login with OLD Password (Must Fail)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 8: Login with OLD Password after Reset (Must Fail)");
  const userAfterReset = dbStore.findUserByEmail(testEmail);
  const oldPassCheck = verifyPassword(initialPassword, userAfterReset.passwordHash, userAfterReset.passwordSalt);
  assert.equal(oldPassCheck, false, "Old password must no longer work");
  console.log("  ✔ Old password rejected after reset.\n");

  // -------------------------------------------------------------------------
  // TEST 9: Re-login with NEW Password (Must Succeed)
  // -------------------------------------------------------------------------
  console.log("▶ TEST 9: Login with NEW Password after Reset (Must Succeed)");
  const newPassCheck = verifyPassword(newPassword, userAfterReset.passwordHash, userAfterReset.passwordSalt);
  assert.equal(newPassCheck, true, "New password must succeed");
  console.log("  ✔ New password verified successfully.\n");

  // -------------------------------------------------------------------------
  // TEST 10: Check Existing User darshme36@gmail.com
  // -------------------------------------------------------------------------
  console.log("▶ TEST 10: Existing User darshme36@gmail.com Setup Check");
  let darshUser = dbStore.findUserByEmail("darshme36@gmail.com");
  if (!darshUser) {
    // Ensure darshme36@gmail.com is imported with their known password hash
    const { hash: darshHash, salt: darshSalt } = hashPassword("24221568");
    darshUser = dbStore.ensureUser({
      id: "e7633f11-43d9-4d8f-847c-9688f4e899f7",
      name: "Mostafa",
      email: "darshme36@gmail.com",
      phone: "+201508819311",
      role: "seeker",
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      passwordHash: darshHash,
      passwordSalt: darshSalt,
      createdAt: new Date().toISOString(),
    });
  } else if (!darshUser.passwordHash) {
    const { hash: darshHash, salt: darshSalt } = hashPassword("24221568");
    dbStore.updateUserPassword(darshUser.id, darshHash, darshSalt);
  }

  const darshLoginCheck = verifyPassword("24221568", darshUser.passwordHash, darshUser.passwordSalt);
  assert.equal(darshLoginCheck, true, "darshme36@gmail.com password 24221568 must verify");
  console.log("  ✔ User darshme36@gmail.com is ready and authenticates with password 24221568.\n");

  console.log("==========================================================");
  console.log("   🎉 ALL 10 AUTHENTICATION & RESET TESTS PASSED 100%!    ");
  console.log("==========================================================");
}

runEndToEndTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
