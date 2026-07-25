const fs = require('fs');
const path = "c:/Users/slrud/OneDrive/문서/[안티그래비티]/2028 영재학교반/script_v2.js";
let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// Task 2: Instructor
const target2 = `          const fw = isDone ? '600' : 'normal';
          html += \`<td data-col-idx="\${colIdx}" class="status-cell \${isFixed ? 'fixed-col label-col' : ''}" style="text-align:center; cursor:pointer; \${leftStr}" onclick="app.toggleStatus(this.querySelector('span'), '\${type}', \${colIdx})"><span style="font-weight:\${fw}; color:\${txtColor}; font-size:12px; user-select:none; transition:all 0.2s; padding:4px 8px; border-radius:4px;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.05)'" onmouseout="this.style.backgroundColor='transparent'">\${statusTxt}</span></td>\`;
        } else {
          let extraEvents = \`onkeydown="app.onKeyDown(event, this)"\`;`.replace(/\r\n/g, '\n');

const replace2 = `          const fw = isDone ? '600' : 'normal';
          html += \`<td data-col-idx="\${colIdx}" class="status-cell \${isFixed ? 'fixed-col label-col' : ''}" style="text-align:center; cursor:pointer; \${leftStr}" onclick="app.toggleStatus(this.querySelector('span'), '\${type}', \${colIdx})"><span style="font-weight:\${fw}; color:\${txtColor}; font-size:12px; user-select:none; transition:all 0.2s; padding:4px 8px; border-radius:4px;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.05)'" onmouseout="this.style.backgroundColor='transparent'">\${statusTxt}</span></td>\`;
        } else if (type === 'instructor' && colIdx === 2) {
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
          html += \`<td \${cellClassStr} data-col-idx="\${colIdx}"><select class="form-control instructor-subject-select" style="background-color:#1e293b; color:#f8fafc; outline:none; border:none; width:100%;" onchange="app.onFlatCellBlur('\${type}', this.closest('td'))">\${optsHtml}</select></td>\`;
        } else {
          let extraEvents = \`onkeydown="app.onKeyDown(event, this)"\`;`.replace(/\r\n/g, '\n');

// Task 3: Date
const target3 = `        if (label === '일자') {
          html += \`<td data-col-idx="\${colIdx}" \${cellClassStr} style="text-align:center; cursor:pointer; \${leftStr}" onclick="app.openDatePicker(this)" title="클릭하여 달력 선택" data-cell-key="tt_fmt_date_\${type}_\${id}">\${val || '날짜 선택'}</td>\`;
        } else if (label === '상태') {`.replace(/\r\n/g, '\n');

const replace3 = `        if (label === '일자') {
          html += \`<td data-col-idx="\${colIdx}" \${cellClassStr} style="\${leftStr}" data-cell-key="tt_fmt_date_\${type}_\${id}">
            <div style="display:flex; align-items:center; justify-content:center; gap:5px; width:100%;">
              <div contenteditable="true" onblur="app.onFlatCellBlur('\${type}', this)" style="outline:none; min-width:40px;">\${val || '날짜 선택'}</div>
              <span class="date-picker-icon" onclick="app.openDatePicker(this.closest('td'))" style="cursor:pointer;" title="달력 열기">📅</span>
            </div>
          </td>\`;
        } else if (label === '상태') {`.replace(/\r\n/g, '\n');

// Task 4: Timetable Height
const target4 = `      } else {
        headHtml += \`<td class="fixed-col label-col" style="left:22%;" data-cell-key="tt_fmt_st_\${grp}">
          <div style="display:flex; align-items:center; justify-content:center; gap:5px; width:100%;">
            <div contenteditable="true" onblur="app.updatePivotRowTime(this.closest('td'), 'start', this.innerText.trim())" style="outline:none; min-width:30px;">\${start || '00:00'}</div>
            <span onclick="app.openTimePicker(this.closest('td'), 'start')" style="cursor:pointer;" title="시간 선택">🕒</span>
          </div>
        </td>
        <td class="fixed-col label-col" style="left:30%;" data-cell-key="tt_fmt_et_\${grp}">
          <div style="display:flex; align-items:center; justify-content:center; gap:5px; width:100%;">
            <div contenteditable="true" onblur="app.updatePivotRowTime(this.closest('td'), 'end', this.innerText.trim())" style="outline:none; min-width:30px;">\${end || '00:00'}</div>
            <span onclick="app.openTimePicker(this.closest('td'), 'end')" style="cursor:pointer;" title="시간 선택">🕒</span>
          </div>
        </td>\`;`.replace(/\r\n/g, '\n');

const replace4 = `      } else {
        headHtml += \`<td class="fixed-col label-col" style="left:22%;" data-cell-key="tt_fmt_st_\${grp}">
          <div style="display:flex; align-items:center; justify-content:center; gap:2px; white-space:nowrap; width:100%;">
            <div contenteditable="true" onblur="app.updatePivotRowTime(this.closest('td'), 'start', this.innerText.trim())" style="outline:none; min-width:30px;">\${start || '00:00'}</div>
            <span onclick="app.openTimePicker(this.closest('td'), 'start')" style="cursor:pointer;" title="시간 선택">🕒</span>
          </div>
        </td>
        <td class="fixed-col label-col" style="left:30%;" data-cell-key="tt_fmt_et_\${grp}">
          <div style="display:flex; align-items:center; justify-content:center; gap:2px; white-space:nowrap; width:100%;">
            <div contenteditable="true" onblur="app.updatePivotRowTime(this.closest('td'), 'end', this.innerText.trim())" style="outline:none; min-width:30px;">\${end || '00:00'}</div>
            <span onclick="app.openTimePicker(this.closest('td'), 'end')" style="cursor:pointer;" title="시간 선택">🕒</span>
          </div>
        </td>\`;`.replace(/\r\n/g, '\n');

let c2 = false, c3 = false, c4 = false;
if (content.includes(target2)) { content = content.replace(target2, replace2); c2 = true; }
if (content.includes(target3)) { content = content.replace(target3, replace3); c3 = true; }
if (content.includes(target4)) { content = content.replace(target4, replace4); c4 = true; }

fs.writeFileSync(path, content, 'utf8');
console.log(`Results: Task2: ${c2}, Task3: ${c3}, Task4: ${c4}`);
