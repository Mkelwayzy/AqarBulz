const tls = require('tls');

function sendSmtpMail({ host, port, user, pass, to, subject, htmlBody }) {
  return new Promise((resolve, reject) => {
    let cleanPass = (pass || '').replace(/\s+/g, '');
    const socket = tls.connect({
      host: host || 'smtp.gmail.com',
      port: port || 465,
      timeout: 12000,
      rejectUnauthorized: true,
    });

    let step = 0;
    let buffer = '';
    const messageId = `<aqarpulse-${Date.now()}-${Math.random().toString(36).slice(2)}@gmail.com>`;

    const b64Subject = Buffer.from(subject, 'utf-8').toString('base64');
    const fromNameB64 = Buffer.from('منصة نبض العقار', 'utf-8').toString('base64');
    const b64Body = Buffer.from(htmlBody, 'utf-8').toString('base64');

    const mimeMessage = [
      `From: =?UTF-8?B?${fromNameB64}?= <${user}>`,
      `To: <${to}>`,
      `Subject: =?UTF-8?B?${b64Subject}?=`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      b64Body,
      `.`,
      ``
    ].join('\r\n');

    socket.on('error', (err) => {
      reject(new Error(`SMTP Connection Error: ${err.message}`));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP Connection timed out.'));
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\r\n');
      const lastLine = lines[lines.length - 2] || lines[lines.length - 1];

      // Wait until multi-line response completes (e.g. "250 " instead of "250-")
      if (!lastLine || (lastLine.length >= 4 && lastLine[3] === '-')) {
        return;
      }

      const code = parseInt(lastLine.slice(0, 3), 10);
      buffer = ''; // clear for next command

      if (step === 0) {
        // Expecting 220 greeting
        if (code === 220) {
          step = 1;
          socket.write('EHLO localhost\r\n');
        } else {
          socket.end();
          reject(new Error(`Unexpected greeting code: ${lastLine}`));
        }
      } else if (step === 1) {
        // Expecting 250 after EHLO
        if (code === 250) {
          step = 2;
          socket.write('AUTH LOGIN\r\n');
        } else {
          socket.end();
          reject(new Error(`EHLO failed: ${lastLine}`));
        }
      } else if (step === 2) {
        // Expecting 334 for Username
        if (code === 334) {
          step = 3;
          socket.write(Buffer.from(user).toString('base64') + '\r\n');
        } else {
          socket.end();
          reject(new Error(`AUTH LOGIN failed: ${lastLine}`));
        }
      } else if (step === 3) {
        // Expecting 334 for Password
        if (code === 334) {
          step = 4;
          socket.write(Buffer.from(cleanPass).toString('base64') + '\r\n');
        } else {
          socket.end();
          reject(new Error(`Username challenge failed: ${lastLine}`));
        }
      } else if (step === 4) {
        // Expecting 235 Authentication Succeeded
        if (code === 235) {
          step = 5;
          socket.write(`MAIL FROM:<${user}>\r\n`);
        } else {
          socket.end();
          reject(new Error(`Authentication failed (${lastLine}). Please check GMAIL_USER and GMAIL_APP_PASSWORD.`));
        }
      } else if (step === 5) {
        // Expecting 250 after MAIL FROM
        if (code === 250) {
          step = 6;
          socket.write(`RCPT TO:<${to}>\r\n`);
        } else {
          socket.end();
          reject(new Error(`MAIL FROM rejected: ${lastLine}`));
        }
      } else if (step === 6) {
        // Expecting 250 after RCPT TO
        if (code === 250) {
          step = 7;
          socket.write('DATA\r\n');
        } else {
          socket.end();
          reject(new Error(`RCPT TO rejected: ${lastLine}`));
        }
      } else if (step === 7) {
        // Expecting 354 after DATA
        if (code === 354) {
          step = 8;
          socket.write(mimeMessage);
        } else {
          socket.end();
          reject(new Error(`DATA start rejected: ${lastLine}`));
        }
      } else if (step === 8) {
        // Expecting 250 after message content
        if (code === 250) {
          step = 9;
          socket.write('QUIT\r\n');
          resolve({ success: true, messageId });
        } else {
          socket.end();
          reject(new Error(`Message content rejected: ${lastLine}`));
        }
      } else if (step === 9) {
        socket.end();
      }
    });
  });
}

// Test with dummy credentials to check handshake and error handling
sendSmtpMail({
  host: 'smtp.gmail.com',
  port: 465,
  user: 'test@example.com',
  pass: 'dummy-password',
  to: 'recipient@example.com',
  subject: 'اختبار رمز التحقق',
  htmlBody: '<h1>رمز التحقق: 123456</h1>'
}).then(res => {
  console.log('Result:', res);
}).catch(err => {
  console.log('Caught expected auth rejection smoothly:', err.message);
});
