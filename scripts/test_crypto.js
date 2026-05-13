const crypto = require('crypto');

try {
  const privateKeyDer = Buffer.from('some-invalid-key-here', 'base64');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  console.log("Success");
} catch(e) {
  console.log("Error 1:", e.message);
}

try {
  // A raw 32-byte string encoded to base64
  const rawKey = crypto.randomBytes(32).toString('base64');
  const privateKeyDer = Buffer.from(rawKey, 'base64');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  console.log("Success 2");
} catch(e) {
  console.log("Error 2:", e.message);
}

try {
  // the exact key I generated
  const myKey = "MC4CAQAwBQYDK2VwBCIEIKZ3sm0qaDOU5sB3iJ20h0+TmqiWZJgEk8yCtYeSR+V4";
  const privateKeyDer = Buffer.from(myKey, 'base64');
  const privateKey = crypto.createPrivateKey({ key: privateKeyDer, format: 'der', type: 'pkcs8' });
  console.log("Success 3 (Generated key works)");
} catch(e) {
  console.log("Error 3:", e.message);
}
