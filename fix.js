const fs = require('fs');
const filePath = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const idsForGrp = this\.data\.timetables\.filter[\s\S]*?headHtml \+= `<\/tr>`;/;

const replacement = `const idsForGrp = this.data.timetables.filter(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end).map(r => r[0]).join(',');
      
      headHtml += \`<tr data-ids="\${idsForGrp}" data-grp="\${grp}">
        <td class="fixed-col label-cell"><span class="drag-handle"></span><input type="date" value="\${displayDate}" onchange="app.updatePivotRowDate(this, this.value)"></td>\`;
      
      if (isHoliday) {
        const holidayRow = this.data.timetables.find(r => r[1] === date && r[2] === '휴일');
        const holidayNote = holidayRow ? (holidayRow[8] || '') : '';
        headHtml += \`<td colspan="\${this.dynamicCols.timetable.length + 2}" class="timetable-cell" data-id="\${holidayRow?holidayRow[0]:''}" data-date="\${date}" contenteditable="true" onblur="app.onTimetableHolidayBlur(this)" style="text-align:center; background:rgba(255,255,255,0.05); color:var(--text-muted); font-style:italic;">\${holidayNote || '휴일/특이사항 입력'}</td>\`;
      } else {
        headHtml += \`<td class="fixed-col label-cell"><input type="time" value="\${start}" onchange="app.updatePivotRowTime(this, 'start', this.value)"></td>
        <td class="fixed-col label-cell"><input type="time" value="\${end}" onchange="app.updatePivotRowTime(this, 'end', this.value)"></td>\`;
        this.dynamicCols.timetable.forEach(cls => {
          const row = this.data.timetables.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end && r[5] === cls);
          let displayStr = row && (row[6] || row[7]) ? \`\${row[6]||''}\${row[7]?'('+row[7]+')':''}\` : '';
          displayStr = displayStr.trim();
          headHtml += \`<td class="timetable-cell" data-id="\${row?row[0]:''}" data-start="\${start}" data-end="\${end}" data-cls="\${cls}" data-date="\${date}" onclick="app.openTimetableEditor(this)" style="cursor:pointer;">\${displayStr}</td>\`;
        });
      }
      headHtml += \`</tr>\`;`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed truncation!');
} else {
  console.log('Regex not found.');
}
