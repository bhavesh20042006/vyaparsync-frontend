const crypto = require('crypto');

try {
  const myKey = '"MC4CAQAwBQYDK2VwBCIEIKZ3sm0qaDOU5sB3iJ20h0+TmqiWZJgEk8yCtYeSR+V4"';
  const privateKeyDer = Buffer.from(myKey, 'base64');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  console.log("Success with quotes");
} catch(e) {
  console.log("Error with quotes:", e.message);
}

try {
  // A raw 64-byte key (seed + public key)
  const rawKey = crypto.randomBytes(64).toString('base64');
  const privateKeyDer = Buffer.from(rawKey, 'base64');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  console.log("Success 64 byte");
} catch(e) {
  console.log("Error 64 byte:", e.message);
}
