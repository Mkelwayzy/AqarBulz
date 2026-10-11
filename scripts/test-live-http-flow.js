const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testHttpFlow() {
  console.log('========================================================');
  console.log('      LIVE HTTP INTEGRATION TESTS ON LOCALHOST:3000     ');
  console.log('========================================================\n');

  const timestamp = Date.now();
  const testEmail = `darsh.live.${timestamp}@gmail.com`;
  const initialPassword = 'Password12345!';
  const newPassword = 'NewSecretPassword987#';
  const testPhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;

  // -------------------------------------------------------------------
  // 1. Send OTP via HTTP POST /api/auth/otp/send
  // -------------------------------------------------------------------
  console.log('▶ Step 1: Request OTP via HTTP POST /api/auth/otp/send');
  const sendOtpRes = await fetch(`${BASE_URL}/api/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      phone: testPhone,
      name: 'مصطفى التجريبي',
      formLoadedAt: Date.now() - 2000,
    }),
  });

  const sendOtpData = await sendOtpRes.json();
  console.log('  OTP Send Status:', sendOtpRes.status, sendOtpData);
  if (!sendOtpRes.ok || !sendOtpData.success) {
    throw new Error(`Failed to send OTP: ${sendOtpData.error}`);
  }

  // Read OTP stored in auth_tokens.json
  const tokensPath = path.join(process.cwd(), '.data', 'auth_tokens.json');
  const tokens1 = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  const regOtp = tokens1.otps[testEmail.toLowerCase()]?.code;
  if (!regOtp) throw new Error('Registration OTP was not found in auth_tokens.json!');
  console.log('  ✔ Received OTP code from persistent store:', regOtp);

  // -------------------------------------------------------------------
  // 2. Verify OTP via HTTP POST /api/auth/otp/verify
  // -------------------------------------------------------------------
  console.log('\n▶ Step 2: Verify OTP via HTTP POST /api/auth/otp/verify');
  const verifyRes = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      phone: testPhone,
      code: regOtp,
    }),
  });

  const verifyData = await verifyRes.json();
  console.log('  OTP Verify Status:', verifyRes.status, verifyData);
  if (!verifyRes.ok || !verifyData.success || !verifyData.verificationToken) {
    throw new Error(`Failed to verify OTP: ${verifyData.error}`);
  }
  const verificationToken = verifyData.verificationToken;
  console.log('  ✔ Verification token issued:', verificationToken);

  // -------------------------------------------------------------------
  // 3. Register Account via HTTP POST /api/auth/register
  // -------------------------------------------------------------------
  console.log('\n▶ Step 3: Register Account via HTTP POST /api/auth/register');
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'مصطفى للاختبار الحي',
      email: testEmail,
      phone: testPhone,
      password: initialPassword,
      role: 'seeker',
      verificationToken,
      formLoadedAt: Date.now() - 3000,
    }),
  });

  const regData = await regRes.json();
  console.log('  Register HTTP Status:', regRes.status);
  console.log('  Register Response Success:', regData.success);
  if (!regRes.ok || !regData.success) {
    throw new Error(`Registration failed: ${regData.error}`);
  }
  console.log('  ✔ Account created and authenticated successfully!');

  // -------------------------------------------------------------------
  // 4. Simulate Logout and Re-Login with Correct Password
  // -------------------------------------------------------------------
  console.log('\n▶ Step 4: Re-login with Correct Password (POST /api/auth/login)');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      password: initialPassword,
    }),
  });

  const loginData = await loginRes.json();
  console.log('  Login HTTP Status:', loginRes.status);
  console.log('  Login Response Success:', loginData.success);
  if (!loginRes.ok || !loginData.success) {
    throw new Error(`Re-login failed: ${loginData.error}`);
  }
  console.log('  ✔ Re-login succeeded with original password!');

  // -------------------------------------------------------------------
  // 5. Test Login with WRONG Password
  // -------------------------------------------------------------------
  console.log('\n▶ Step 5: Login with WRONG Password');
  const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      password: 'WrongPassword999!',
    }),
  });

  const wrongLoginData = await wrongLoginRes.json();
  console.log('  Wrong Login HTTP Status:', wrongLoginRes.status);
  console.log('  Wrong Login Error Message:', wrongLoginData.error);
  if (wrongLoginRes.status !== 401) {
    throw new Error(`Expected 401 but got ${wrongLoginRes.status}`);
  }
  console.log('  ✔ Wrong password correctly blocked with 401!');

  // -------------------------------------------------------------------
  // 6. Test Forgot Password Request (POST /api/auth/forgot-password)
  // -------------------------------------------------------------------
  console.log('\n▶ Step 6: Request Password Reset OTP (POST /api/auth/forgot-password)');
  const forgotRes = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail }),
  });

  const forgotData = await forgotRes.json();
  console.log('  Forgot Password HTTP Status:', forgotRes.status);
  console.log('  Forgot Password Response:', forgotData);
  if (!forgotRes.ok || !forgotData.success) {
    throw new Error(`Forgot password failed: ${forgotData.error}`);
  }

  // Read OTP stored in auth_tokens.json
  const tokens2 = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
  const otpRecord = tokens2.otps[testEmail.toLowerCase()];
  if (!otpRecord) throw new Error('OTP was not found in auth_tokens.json!');
  const resetOtp = otpRecord.code;
  console.log('  ✔ Password reset OTP retrieved from persistent store:', resetOtp);

  // -------------------------------------------------------------------
  // 7. Test Reset Password with Wrong OTP (Must Fail)
  // -------------------------------------------------------------------
  console.log('\n▶ Step 7: Test Reset Password with Invalid OTP Code');
  const badResetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: '000000',
      password: newPassword,
      confirmPassword: newPassword,
    }),
  });
  const badResetData = await badResetRes.json();
  console.log('  Bad OTP HTTP Status:', badResetRes.status);
  console.log('  Bad OTP Error Message:', badResetData.error);
  if (badResetRes.status !== 400) {
    throw new Error(`Expected 400 for bad OTP, got ${badResetRes.status}`);
  }
  console.log('  ✔ Invalid OTP correctly rejected!');

  // -------------------------------------------------------------------
  // 8. Test Reset Password with Valid OTP (POST /api/auth/reset-password)
  // -------------------------------------------------------------------
  console.log('\n▶ Step 8: Reset Password with Valid OTP (POST /api/auth/reset-password)');
  const resetRes = await fetch(`${BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      code: resetOtp,
      password: newPassword,
      confirmPassword: newPassword,
    }),
  });
  const resetData = await resetRes.json();
  console.log('  Reset Password HTTP Status:', resetRes.status);
  console.log('  Reset Password Response:', resetData);
  if (!resetRes.ok || !resetData.success) {
    throw new Error(`Reset password failed: ${resetData.error}`);
  }
  console.log('  ✔ Password reset succeeded and persisted in database!');

  // -------------------------------------------------------------------
  // 9. Test Login with OLD Password (Must Fail)
  // -------------------------------------------------------------------
  console.log('\n▶ Step 9: Login with OLD Password after Reset');
  const oldPassLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      password: initialPassword,
    }),
  });
  const oldPassLoginData = await oldPassLoginRes.json();
  console.log('  Old Password Login Status:', oldPassLoginRes.status);
  if (oldPassLoginRes.status !== 401) {
    throw new Error(`Expected 401 for old password, got ${oldPassLoginRes.status}`);
  }
  console.log('  ✔ Old password rejected!');

  // -------------------------------------------------------------------
  // 10. Test Login with NEW Password (Must Succeed)
  // -------------------------------------------------------------------
  console.log('\n▶ Step 10: Login with NEW Password after Reset');
  const newPassLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: testEmail,
      password: newPassword,
    }),
  });
  const newPassLoginData = await newPassLoginRes.json();
  console.log('  New Password Login Status:', newPassLoginRes.status);
  console.log('  New Password Login Success:', newPassLoginData.success);
  if (!newPassLoginRes.ok || !newPassLoginData.success) {
    throw new Error(`Login with new password failed: ${newPassLoginData.error}`);
  }
  console.log('  ✔ Login with new password succeeded perfectly!');

  // -------------------------------------------------------------------
  // 11. Test Login for Existing User darshme36@gmail.com with 24221568
  // -------------------------------------------------------------------
  console.log('\n▶ Step 11: Test Login with darshme36@gmail.com and password 24221568');
  const darshLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'darshme36@gmail.com',
      password: '24221568',
    }),
  });
  const darshLoginData = await darshLoginRes.json();
  console.log('  darshme36@gmail.com Login Status:', darshLoginRes.status);
  console.log('  darshme36@gmail.com Login Success:', darshLoginData.success);
  if (!darshLoginRes.ok || !darshLoginData.success) {
    throw new Error(`Login for darshme36@gmail.com failed: ${darshLoginData.error}`);
  }
  console.log('  ✔ User darshme36@gmail.com logged in successfully with password 24221568!');

  console.log('\n========================================================');
  console.log('  🎉 ALL 11 LIVE HTTP TESTS PASSED WITH 100% SUCCESS!  ');
  console.log('========================================================');
}

testHttpFlow().catch((err) => {
  console.error('\n❌ HTTP Flow Test Failed:', err);
  process.exit(1);
});
