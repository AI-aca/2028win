const fs = require('fs');

const path = "c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script_v2.js";
let content = fs.readFileSync(path, 'utf8');
let original = content;

function repl(search, replaceStr, name) {
  if(content.includes(search)) {
    content = content.replace(search, replaceStr);
    console.log(name + ' replaced.');
  } else {
    console.log(name + ' not found.');
  }
}

// 1. "구글 " 제거
repl("아직 구글 서버에 저장 중인", "아직 서버에 저장 중인", "1. 구글 서버 문구 수정");

// 2. renderFlatTable - instructor - Area/Subject Dropdown
// We use a regex to match it flexibly
const instTarget1 = /\} else if \(type === 'instructor' && colIdx === 2\) \{\s*html \+= \`<td \$\{cellClassStr\} data-col-idx="\$\{colIdx\}"><select class="form-control" style="background-color:#1e293b; color:#f8fafc; outline:none; border:none; width:100%;" onchange="app.onFlatCellBlur\('\$\{type\}', this.closest\('td'\)\)">\s*<option value="" \$\{!val \? 'selected' : ''\}><\/option>\s*<option value="수학" \$\{val === '수학' \? 'selected' : ''\}>수학<\/option>\s*<option value="과학" \$\{val === '과학' \? 'selected' : ''\}>과학<\/option>\s*<\/select><\/td>\`;\s*\} else if \(type === 'instructor' && colIdx === 3\) \{\s*let optsHtml = \`<option value="" \$\{!val \? 'selected' : ''\}><\/option>\`;\s*if \(this.managedSubjects && Array.isArray\(this.managedSubjects\)\) \{\s*this.managedSubjects.forEach\(s => \{\s*optsHtml \+= \`<option value="\$\{s.name\}" data-category="\$\{s.category\}" \$\{val === s.name \? 'selected' : ''\}>\$\{s.name\}<\/option>\`;\s*\}\);\s*\}\s*html \+= \`<td \$\{cellClassStr\} data-col-idx="\$\{colIdx\}"><select class="form-control" style="background-color:#1e293b; color:#f8fafc; outline:none; border:none; width:100%;" onchange="app.onFlatCellBlur\('\$\{type\}', this.closest\('td'\)\)">\$\{optsHtml\}<\/select><\/td>\`;/;

const instReplace1 = `} else if (type === 'instructor' && colIdx === 2) {
          html += \`<td \${cellClassStr} data-col-idx="\${colIdx}"><select class="form-control instructor-area-select" style="background-color:#1e293b; color:#f8fafc; outline:none; border:none; width:100%;" onchange="app.onFlatCellBlur('\${type}', this.closest('td'))">
            <option value="" \${!val ? 'selected' : ''}></option>
            <option value="수학" \${val === '수학' ? 'selected' : ''}>수학</option>
            <option value="과학" \${val === '과학' ? 'selected' : ''}>과학</option>
          </select></td>\`;
        } else if (type === 'instructor' && colIdx === 3) {
          const areaVal = row[2] || '';
          let optsHtml = \`<option value="" \${!val ? 'selected' : ''}></option>\`;
          if (this.managedSubjects && Array.isArray(this.managedSubjects)) {
            this.managedSubjects.forEach(s => {
              const show = !areaVal || s.category === areaVal;
              if (show) {
                optsHtml += \`<option value="\${s.name}" data-category="\${s.category}" \${val === s.name ? 'selected' : ''}>\${s.name}</option>\`;
              }
            });
          }
          html += \`<td \${cellClassStr} data-col-idx="\${colIdx}"><select class="form-control instructor-subject-select" style="background-color:#1e293b; color:#f8fafc; outline:none; border:none; width:100%;" onchange="app.onFlatCellBlur('\${type}', this.closest('td'))">\${optsHtml}</select></td>\`;`;
if(instTarget1.test(content)) {
  content = content.replace(instTarget1, instReplace1);
  console.log('2. instructor replaced.');
} else console.log('2. instructor not found.');

// 3. date calendar icon fix
const dateTarget = /<div contenteditable="true" onblur="app.onFlatCellBlur\('\$\{type\}', this\)" style="outline:none; min-width:40px;">\$\{val \|\| '날짜 선택'\}<\/div>\s*<span onclick="app.openDatePicker\(this.closest\('td'\)\)" style="cursor:pointer;" title="달력 열기">📅<\/span>/;
const dateReplace = `<div contenteditable="true" onblur="app.onFlatCellBlur('\${type}', this)" style="outline:none; min-width:40px; flex:1;">\${val || '날짜 선택'}</div>
              <span class="date-picker-icon" onclick="app.openDatePicker(this.closest('td'))" style="cursor:pointer; flex-shrink:0;" title="달력 열기">📅</span>`;
if(dateTarget.test(content)) { content = content.replace(dateTarget, dateReplace); console.log('3. date icon replaced.'); } else console.log('3. date not found.');

// 4. renderTimetablePivot row height
const ttTarget = /headHtml \+= \`<tr data-ids="\$\{idsForGrp\}" data-grp="\$\{grp\}">\s*<td class="fixed-col label-col" style="text-align:center; cursor:pointer;" onclick="app.openDatePicker\(this\)" title="클릭하여 달력 선택" data-cell-key="tt_fmt_date_\$\{grp\}"><span class="drag-handle"><\/span>\$\{displayDate\}<\/td>\`;\s*const firstRow = this.data.timetables.find\(r => r\[1\] === date && r\[2\] === type && r\[3\] === start && r\[4\] === end\);\s*const hoicha = firstRow \? \(firstRow\[8\] \|\| ''\) : '';\s*const weekVal = this.uiSettings\['tt_week_' \+ grp\] \|\| '';\s*headHtml \+= \`<td class="fixed-col label-col" style="text-align:center;" data-cell-key="tt_fmt_wk_\$\{grp\}">\s*<div style="display:flex; align-items:center; justify-content:center; gap:5px;">\s*<div contenteditable="true" style="outline:none; min-width:30px;" onblur="app.updatePivotRowLabel\('timetable', '\$\{grp\}', 'week', this.innerText.trim\(\)\)">\$\{weekVal\}<\/div>\s*<\/div>\s*<\/td>\`;\s*headHtml \+= \`<td class="fixed-col label-col" style="text-align:center;" data-cell-key="tt_fmt_hc_\$\{grp\}">\s*<div style="display:flex; align-items:center; justify-content:center; gap:5px;">\s*<div contenteditable="true" style="outline:none; min-width:30px;" onblur="app.updatePivotRowLabel\('timetable', '\$\{grp\}', 'hoicha', this.innerText.trim\(\)\)">\$\{hoicha\}<\/div>\s*<\/div>\s*<\/td>\`;\s*headHtml \+= \`<td class="fixed-col label-col" style="text-align:center; cursor:pointer;" onclick="app.openTimePicker\(this, 'start'\)" title="클릭하여 시작 시간 선택" data-cell-key="tt_fmt_start_\$\{grp\}">\$\{start\}<\/td>\`;\s*headHtml \+= \`<td class="fixed-col label-col" style="text-align:center; cursor:pointer;" onclick="app.openTimePicker\(this, 'end'\)" title="클릭하여 종료 시간 선택" data-cell-key="tt_fmt_end_\$\{grp\}">\$\{end\}<\/td>\`;/;

const ttReplace = `headHtml += \`<tr data-ids="\${idsForGrp}" data-grp="\${grp}">
        <td class="fixed-col label-col" style="text-align:center; cursor:pointer; white-space:nowrap;" onclick="app.openDatePicker(this)" title="클릭하여 달력 선택" data-cell-key="tt_fmt_date_\${grp}"><span class="drag-handle"></span>\${displayDate}</td>\`;
      
      const firstRow = this.data.timetables.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end);
      const hoicha = firstRow ? (firstRow[8] || '') : '';
      const weekVal = this.uiSettings['tt_week_' + grp] || '';
      
      headHtml += \`<td class="fixed-col label-col" style="text-align:center; white-space:nowrap;" data-cell-key="tt_fmt_wk_\${grp}">
        <div style="display:flex; align-items:center; justify-content:center;">
          <div contenteditable="true" style="outline:none; min-width:30px;" onblur="app.updatePivotRowLabel('timetable', '\${grp}', 'week', this.innerText.trim())">\${weekVal}</div>
        </div>
      </td>\`;
      
      headHtml += \`<td class="fixed-col label-col" style="text-align:center; white-space:nowrap;" data-cell-key="tt_fmt_hc_\${grp}">
        <div style="display:flex; align-items:center; justify-content:center;">
          <div contenteditable="true" style="outline:none; min-width:30px;" onblur="app.updatePivotRowLabel('timetable', '\${grp}', 'hoicha', this.innerText.trim())">\${hoicha}</div>
        </div>
      </td>\`;
      
      headHtml += \`<td class="fixed-col label-col" style="text-align:center; cursor:pointer; white-space:nowrap;" onclick="app.openTimePicker(this, 'start')" title="클릭하여 시작 시간 선택" data-cell-key="tt_fmt_start_\${grp}">\${start}</td>\`;
      headHtml += \`<td class="fixed-col label-col" style="text-align:center; cursor:pointer; white-space:nowrap;" onclick="app.openTimePicker(this, 'end')" title="클릭하여 종료 시간 선택" data-cell-key="tt_fmt_end_\${grp}">\${end}</td>\`;`;
if(ttTarget.test(content)) { content = content.replace(ttTarget, ttReplace); console.log('4. timetable replaced.'); } else console.log('4. timetable not found.');

// 5. renderCurriculumPivot grouping
const currTarget = /const grps = Array\.from\(new Set\(dataArr\.map\(r => r\[1\] \+ '\|' \+ \(r\[4\] \|\| ''\)\)\.filter\(g => g !== '\|'\)\)\);\s*grps\.forEach\(grp => \{\s*const \[week, hoicha\] = grp\.split\('\|'\);\s*headHtml \+= \`<tr data-week="\$\{week\}">\s*<td class="fixed-col label-col" data-cell-key="tt_fmt_curr_wk_\$\{grp\}" style="font-weight:bold; text-align:center; left:0;" contenteditable="true" onblur="app.updatePivotRowLabel\('\$\{type\}', '\$\{week\}', '\$\{hoicha\}', this.innerText.trim\(\)\)">\$\{week\}<\/td>\`;\s*const firstRow = dataArr\.find\(r => r\[1\] === week && \(r\[4\] \|\| ''\) === hoicha\);\s*headHtml \+= \`<td class="fixed-col label-col" data-cell-key="tt_fmt_curr_hc_\$\{grp\}" style="text-align:center; left:5%;" contenteditable="true" data-id="\$\{firstRow \? firstRow\[0\] : ''\}" data-week="\$\{week\}" data-sub="hoicha" onblur="app.onCurriculumHoichaBlur\(this, '\$\{type\}', '\$\{week\}', '\$\{hoicha\}'\)">\$\{hoicha\}<\/td>\`;\s*dynCols\.forEach\(sub => \{\s*const row = dataArr\.find\(r => r\[1\] === week && r\[2\] === sub\);\s*const content = row \? row\[3\] : '';\s*const id = row \? row\[0\] : '';/;

const currReplace = `const grps = Array.from(new Set(dataArr.map(r => r[1] + '|' + (r[4] || '') + '|' + r[0]).filter(g => !g.startsWith('|'))));
    const processedGrps = new Set();
    grps.forEach(grp => {
      const [week, hoicha, rowId] = grp.split('|');
      const logicalGrp = week + '|' + hoicha;
      if (processedGrps.has(logicalGrp)) return;
      processedGrps.add(logicalGrp);
      headHtml += \`<tr data-week="\${week}">
      <td class="fixed-col label-col" data-cell-key="tt_fmt_curr_wk_\${logicalGrp}" style="font-weight:bold; text-align:center; left:0;" contenteditable="true" onblur="app.updatePivotRowLabel('\${type}', '\${week}', '\${hoicha}', this.innerText.trim())">\${week}</td>\`;
      const firstRow = dataArr.find(r => r[1] === week && (r[4] || '') === hoicha);
      headHtml += \`<td class="fixed-col label-col" data-cell-key="tt_fmt_curr_hc_\${logicalGrp}" style="text-align:center; left:5%;" contenteditable="true" data-id="\${firstRow ? firstRow[0] : ''}" data-week="\${week}" data-sub="hoicha" onblur="app.onCurriculumHoichaBlur(this, '\${type}', '\${week}', '\${hoicha}')">\${hoicha}</td>\`;
      dynCols.forEach(sub => {
        const row = dataArr.find(r => r[1] === week && r[2] === sub && (r[4] || '') === hoicha);
        const content = row ? row[3] : '';
        const id = row ? row[0] : '';`;
if(currTarget.test(content)) { content = content.replace(currTarget, currReplace); console.log('5. curriculum replaced.'); } else console.log('5. curriculum not found.');


// 6. setCellBgColor
const bgTarget = /setCellBgColor: function\(color\) \{\s*this\.hideContextMenu\(\);\s*if \(\!this\.ctxTargetCell\) return;\s*const td = this\.ctxTargetCell;\s*const cellKey = td\.getAttribute\('data-cell-key'\);\s*if \(cellKey\) \{\s*const finalColor = color === 'transparent' \? '' : color;\s*td\.style\.backgroundColor = finalColor;\s*this\.silentSave\('saveUISettings', \{ key: cellKey, value: finalColor \}\);\s*this\.uiSettings\[cellKey\] = finalColor;\s*\} else \{\s*app\.showToast\('배경색을 적용할 수 없는 셀입니다\.', true\);\s*\}\s*\},/;

const bgReplace = `setCellBgColor: function(color) {
    this.hideContextMenu();
    if (!this.ctxTargetCell) return;
    const td = this.ctxTargetCell;
    const cellKey = td.getAttribute('data-cell-key');
    if (cellKey) {
      const finalColor = color === 'transparent' ? '' : color;
      if (finalColor === '') {
        td.style.removeProperty('background-color');
      } else {
        td.style.setProperty('background-color', finalColor, 'important');
      }
      this.silentSave('saveUISettings', { key: cellKey, value: finalColor });
      this.uiSettings[cellKey] = finalColor;
    } else {
      app.showToast('배경색을 적용할 수 없는 셀입니다.', true);
    }
  },`;
if(bgTarget.test(content)) { content = content.replace(bgTarget, bgReplace); console.log('6. bg color replaced.'); } else console.log('6. bg color not found.');

// 7. toolbar listeners
const tbTarget1 = /if \(tb && !tb\.contains\(e\.target\) && !e\.target\.closest\('td\[contenteditable="true"\]'\)\) this\.hideToolbar\(\);/g;
if(tbTarget1.test(content)) { content = content.replace(tbTarget1, `if (tb && !tb.contains(e.target) && !e.target.closest('[contenteditable="true"]')) this.hideToolbar();`); console.log('7. toolbar 1 replaced.'); } else console.log('7. toolbar 1 not found.');

const tbTarget2 = /const td = container\.nodeType === 3 \? container\.parentElement\.closest\('td\[contenteditable="true"\]'\) : container\.closest\('td\[contenteditable="true"\]'\);/g;
if(tbTarget2.test(content)) { content = content.replace(tbTarget2, `const td = container.nodeType === 3 ? container.parentElement.closest('[contenteditable="true"]') : container.closest('[contenteditable="true"]');`); console.log('8. toolbar 2 replaced.'); } else console.log('8. toolbar 2 not found.');

fs.writeFileSync(path, content, 'utf8');
console.log('All replacements attempted.');
