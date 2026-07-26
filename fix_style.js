const fs = require('fs');
const css = fs.readFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/style.css', 'utf8');
const start = css.indexOf('.login-overlay');
const end = css.indexOf('#login-password');
const replacement = `.login-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--bg-dark);
  background-image: radial-gradient(circle at top right, rgba(6, 182, 212, 0.15), transparent 40%),
                    radial-gradient(circle at bottom left, rgba(16, 185, 129, 0.15), transparent 40%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(10px);
}

.login-card {
  background: var(--surface-light);
  border: 1px solid var(--border-glass);
  border-radius: 24px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-neon);
  text-align: center;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 10px;
  line-height: 1.3;
  background: linear-gradient(135deg, #06b6d4, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-subtitle {
  font-size: 16px;
  color: var(--text-gray);
  margin-bottom: 30px;
  font-weight: 600;
}

#login-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

`;
fs.writeFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/style.css', css.substring(0, start) + replacement + css.substring(end));
