const crypto = require('crypto');

try {
  // Generate a key, get raw private key
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  let raw = privateKey.export({ format: 'der', type: 'pkcs8' }).slice(16); // The 32 bytes seed

  // Let's wrap it back
  const header = Buffer.from('302e020100300506032b657004220420', 'hex');
  const wrapped = Buffer.concat([header, raw]);
  
  const pk = crypto.createPrivateKey({ key: wrapped, format: 'der', type: 'pkcs8' });
  console.log("Wrapped successfully!");
} catch(e) {
  console.error("Failed to wrap:", e.message);
}
