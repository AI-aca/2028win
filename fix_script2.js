const fs = require('fs');
const path = 'c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script.js';
let code = fs.readFileSync(path, 'utf8');

const regex = /headHtml\s*\+=\s*`(<tr data-grp="\$\{grp\}">)(<td class="label-col" style="text-align:center;"><input type="text" class="date-picker-input")/g;

let count = 0;
const newCode = code.replace(regex, (match, p1, p2) => {
    count++;
    return `const idsForGrp = this.data.timetables.filter(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end).map(r => r[0]).join(',');\n      headHtml += \`<tr data-grp="\${grp}" data-ids="\${idsForGrp}">\${p2}`;
});

if (count > 0) {
    fs.writeFileSync(path, newCode, 'utf8');
    console.log(`Replaced ${count} occurrences.`);
} else {
    console.log("No matches found.");
}
