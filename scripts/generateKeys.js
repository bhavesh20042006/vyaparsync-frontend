const crypto = require('crypto');

// Generate Ed25519 signing key pair
const { privateKey: signingPrivate, publicKey: signingPublic } = 
  crypto.generateKeyPairSync('ed25519');

const privateKeyBase64 = signingPrivate
  .export({ type: 'pkcs8', format: 'der' })
  .toString('base64');

const publicKeyBase64 = signingPublic
  .export({ type: 'spki', format: 'der' })
  .toString('base64');

// Generate X25519 encryption key pair  
const { privateKey: encPrivate, publicKey: encPublic } = 
  crypto.generateKeyPairSync('x25519');

const encPublicBase64 = encPublic
  .export({ type: 'spki', format: 'der' })
  .toString('base64');

console.log('=== PASTE THESE INTO YOUR .env FILE ===');
console.log('ONDC_PRIVATE_KEY=' + privateKeyBase64);
console.log('ONDC_PUBLIC_KEY=' + publicKeyBase64);
console.log('ONDC_SIGNING_PUBLIC_KEY=' + publicKeyBase64);
console.log('ONDC_ENCRYPTION_PUBLIC_KEY=' + encPublicBase64);
