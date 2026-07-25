const fs = require('fs');
const css = `

/* Time Dropdown */
.time-dropdown {
  position: absolute; /* changed to absolute so it scrolls with the page, though we used client rect with scrollY so fixed could work too if positioned right, wait, absolute is better with page scroll */
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  backdrop-filter: blur(10px);
  padding: 4px 0;
}
.time-dropdown div {
  padding: 10px 20px;
  cursor: pointer;
  color: #f1f5f9;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.time-dropdown div:hover {
  background: var(--primary);
  color: #fff;
}
`;
fs.appendFileSync('c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\style.css', css, 'utf8');
