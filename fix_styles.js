const fs = require('fs');

// 1. Fix login.html
let login = fs.readFileSync('login.html', 'utf8');
login = login.replace(
  'body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: var(--bg-color); margin: 0; padding: 20px; box-sizing: border-box; }',
  'body { background: var(--bg-color); margin: 0; padding: 0; box-sizing: border-box; }'
);
login = login.replace(
  '.auth-card input { width: 100%;',
  '.auth-card input:not([type="checkbox"]) { width: 100%;'
);

if (login.indexOf('<div class="auth-wrapper">') === -1) {
  login = login.replace('<div class="auth-card">', '<div class="auth-wrapper">\n  <div class="auth-card">');
  login = login.replace('</div>\n\n  <div id="toast-container"></div>', '  </div>\n</div>\n\n  <div id="toast-container"></div>');
}
fs.writeFileSync('login.html', login);

// 2. Fix style.css for retailer/customer register
let style = fs.readFileSync('style.css', 'utf8');
style = style.replace(
  '.auth-container input, .auth-container select {',
  '.auth-container input:not([type="checkbox"]), .auth-container select {'
);
fs.writeFileSync('style.css', style);

console.log('Fixed styles successfully.');
