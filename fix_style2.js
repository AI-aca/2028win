const fs = require('fs');
let css = fs.readFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/style.css', 'utf8');
css = css.replace('.label-col {\n  background: rgba(255, 255, 255, 0.05) !important;\n}', '.label-col {\n  background: transparent !important;\n}');
fs.writeFileSync('c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/style.css', css);
