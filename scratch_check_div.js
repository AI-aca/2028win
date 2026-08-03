const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const openDivs = (html.match(/<div\b[^>]*>/g) || []).length;
const closeDivs = (html.match(/<\/div>/g) || []).length;
if (openDivs === closeDivs) {
    console.log(`[PASS] div tag matching perfect: ${openDivs}`);
    process.exit(0);
} else {
    console.error(`[FAIL] div mismatch: <div...> ${openDivs}개 != </div> ${closeDivs}개`);
    process.exit(1);
}
