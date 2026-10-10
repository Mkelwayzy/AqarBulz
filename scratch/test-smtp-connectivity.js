const tls = require('tls');

console.log('Testing TLS connection to smtp.gmail.com:465...');

const socket = tls.connect({
  host: 'smtp.gmail.com',
  port: 465,
  timeout: 5000,
  rejectUnauthorized: true,
}, () => {
  console.log('Connected to Gmail SMTP over TLS successfully!');
});

socket.on('data', (data) => {
  console.log('Server response:', data.toString().trim());
  socket.write('EHLO localhost\r\n');
  socket.once('data', (ehloData) => {
    console.log('EHLO response:', ehloData.toString().trim().split('\n')[0]);
    socket.write('QUIT\r\n');
    socket.end();
  });
});

socket.on('error', (err) => {
  console.error('Socket error:', err);
});

socket.on('close', () => {
  console.log('Socket closed cleanly.');
});
