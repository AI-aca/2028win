const fs = require('fs');
const path = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let code = fs.readFileSync(path, 'utf8');

// 1. setCellBgColor 수정
code = code.replace(/setCellBgColor: function\(color\) \{[\s\S]*?\},/, `setCellBgColor: function(color) {
    this.hideContextMenu();
    if (!this.ctxTargetCell) return;
    const td = this.ctxTargetCell;
    const cellKey = td.getAttribute('data-cell-key');
    if (cellKey) {
      const finalColor = color === 'transparent' ? '' : color;
      td.style.backgroundColor = finalColor;
      this.silentSave('saveUISettings', { key: cellKey, value: finalColor });
      this.uiSettings[cellKey] = finalColor;
    } else {
      app.showToast('배경색을 적용할 수 없는 셀입니다.', true);
    }
  },`);

// 2. renderFlatTable 수정
code = code.replace(/renderFlatTable: function\(type, dataArray, cols\) \{[\s\S]*?initResizers\(\);\n  \},/, `renderFlatTable: function(type, dataArray, cols) {
    const tbody = document.getElementById(\`tbody-\${type}\`);
    if (!tbody) return;
    const thead = tbody.previousElementSibling;
    if(thead && thead.querySelector('tr')) {
      let ths = '';
      cols.forEach((c, i) => {
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? (c.idx !== undefined ? c.idx : i+1) : i+1;
        const widthStr = (typeof c === 'object' && c.width) ? \`width:\${c.width};\` : '';
        const fixedClass = (typeof c === 'object' && c.fixed) ? 'fixed-col label-col-header' : '';
        const savedHeader = this.uiSettings['header_view-' + type + '_' + colIdx] || label;
        ths += \`<th class="\${fixedClass}" style="\${widthStr}"><div contenteditable="true" onblur="app.onHeaderBlur(this, 'view-' + type, \${colIdx})" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">\${savedHeader}</div></th>\`;
      });
      thead.querySelector('tr').innerHTML = ths;
    }

    let html = '';
    dataArray.forEach(row => {
      const id = row[0]; html += \`<tr data-id="\${id}">\`;
      for(let i=0; i<cols.length; i++) {
        const c = cols[i];
        const label = typeof c === 'object' ? c.label : c;
        const colIdx = typeof c === 'object' ? (c.idx !== undefined ? c.idx : i+1) : i+1;
        const isFixed = typeof c === 'object' && c.fixed;
        const cellClassStr = isFixed ? 'class="label-col"' : '';
        const val = row[colIdx] || '';
        const cellKey = \`bg_flat_\${type}_\${id}_\${colIdx}\`;
        const bgStyle = this.uiSettings[cellKey] ? \`background-color:\${this.uiSettings[cellKey]};\` : '';
        const styleAttr = \`style="text-align:center; \${bgStyle}"\`;
        
        if (label === '일자') {
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" \${cellClassStr} contenteditable="true" onblur="app.onFlatCellBlur('\${type}', this)" placeholder="날짜 선택" \${styleAttr}>\${val}</td>\`;
        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusTxt = isDone ? '🟢 완료' : '🟡 진행 중';
          const txtColor = isDone ? '#10b981' : '#f59e0b';
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" class="status-cell \${isFixed ? 'label-col' : ''}" \${styleAttr}><div style="color:\${txtColor}; font-weight:bold; cursor:pointer;" onclick="app.toggleStatus(this, '\${type}', \${colIdx})">\${statusTxt}</div></td>\`;
        } else {
          let extraEvents = \`onkeydown="app.onKeyDown(event, this)"\`;
          let displayVal = val;
          let placeholder = (label === '학생명' || label === '강사명') ? 'placeholder="이름 입력"' : '';
          
          if ((type === 'student' && (colIdx === 5 || colIdx === 6)) || (type === 'instructor' && colIdx === 4)) {
            extraEvents = \`onfocus="app.handlePhoneFocus(this)" onkeydown="app.handlePhoneKeydown(event, this)"\`;
            placeholder = 'placeholder="숫자 11자리 입력"';
          }
          html += \`<td \${cellClassStr} data-cell-key="\${cellKey}" contenteditable="true" data-col-idx="\${colIdx}" \${placeholder} onblur="app.onFlatCellBlur('\${type}', this)" style="\${bgStyle}" \${extraEvents}>\${displayVal}</td>\`;
        }
      }
      html += \`</tr>\`;
    });
    tbody.innerHTML = html;
    tbody.querySelectorAll('tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
  },`);

// 3. toggleStatus 수정
code = code.replace(/toggleStatus: function\(btn, type, colIdx\) \{[\s\S]*?\},/, `toggleStatus: function(btn, type, colIdx) {
    const isDone = btn.textContent.includes('완료');
    const newStatus = isDone ? '진행 중' : '완료';
    const statusTxt = !isDone ? '🟢 완료' : '🟡 진행 중';
    const txtColor = !isDone ? '#10b981' : '#f59e0b';
    
    btn.textContent = statusTxt;
    btn.style.color = txtColor;
    
    const rowEl = btn.closest('tr');
    const currentId = rowEl.getAttribute('data-id');
    const rowIndex = Array.from(rowEl.parentElement.children).indexOf(rowEl);
    
    let dataArray = this.data.preschedules;
    let keys = ['date', 'content', 'status', 'note'];
    
    const rowObj = dataArray[rowIndex];
    if (rowObj) {
      const prevValue = rowObj[colIdx];
      rowObj[colIdx] = newStatus;
      const payload = { id: currentId };
      for(let i=0; i<keys.length; i++) payload[keys[i]] = rowObj[i+1];
      
      this.apiPost('upsertPreSchedule', payload).then(res => {
        if(res.success && res.id) {
          rowObj[0] = res.id; 
          const tr = document.querySelector(\`tr[data-id="\${currentId}"]\`);
          if (tr) tr.setAttribute('data-id', res.id);
        } else {
          rowObj[colIdx] = prevValue;
          app.showToast('저장 실패: ' + (res.message || '오류 발생'), true);
          app.renderView(type);
        }
      });
    }
  },`);

// 4. renderCurriculumPivot 수정
code = code.replace(/renderCurriculumPivot: function\(type\) \{[\s\S]*?initResizers\(\);\n  \},/, `renderCurriculumPivot: function(type) {
    if (!type) type = 'curriculum';
    const dataArr = type === 'curriculum' ? this.data.curriculums : this.data.curriculums_science;
    const dynCols = type === 'curriculum' ? this.dynamicCols.curriculum : this.dynamicCols.curriculum_science;
    const table = document.querySelector(\`#view-\${type.replace('_','-')} .excel-table\`);
    
    let headHtml = \`<thead><tr>
      <th class="label-col-header fixed-col" style="width: 5%;">주차</th>
      <th class="label-col-header fixed-col" style="width: 5%;">회차</th>\`;
    dynCols.forEach(sub => { headHtml += \`<th data-colname="\${sub}" onclick="app.editTimetableClassName('\${sub}', '\${type}')" style="cursor:pointer;" title="클릭하여 과목명 수정">\${sub}</th>\`; });
    headHtml += \`<th style="width: 40px; min-width: 40px; max-width: 40px; cursor: pointer; text-align: center; color: #f43f5e;" title="주차 전체 삭제">삭제</th></tr></thead><tbody id="tbody-\${type}">\`;

    const rowGroups = Array.from(new Set(dataArr.map(r => r[1]).filter(Boolean)));
    rowGroups.sort((a,b) => {
      const ma=a.match(/\\d+/); const mb=b.match(/\\d+/);
      if(ma&&mb) return parseInt(ma[0]) - parseInt(mb[0]);
      return a.localeCompare(b);
    });

    rowGroups.forEach(grp => {
      headHtml += \`<tr data-grp="\${grp}">\`;
      const weekCellKey = \`bg_curr_week_\${type}_\${grp}\`;
      const sessCellKey = \`bg_curr_sess_\${type}_\${grp}\`;
      const weekBg = this.uiSettings[weekCellKey] ? \`background-color:\${this.uiSettings[weekCellKey]};\` : '';
      const sessBg = this.uiSettings[sessCellKey] ? \`background-color:\${this.uiSettings[sessCellKey]};\` : '';
      
      let sessionVal = this.uiSettings[\`curr_sess_val_\${type}_\${grp}\`] || '';
      
      headHtml += \`<td class="fixed-col label-col" data-cell-key="\${weekCellKey}" contenteditable="true" onblur="app.updatePivotRowWeek(this, this.innerText.trim(), '\${type}')" style="\${weekBg} text-align:center;"><span class="drag-handle"></span>\${grp}</td>\`;
      headHtml += \`<td class="fixed-col label-col" data-cell-key="\${sessCellKey}" contenteditable="true" onblur="app.silentSave('saveUISettings', { key: 'curr_sess_val_\${type}_\${grp}', value: this.innerText.trim() }); app.uiSettings['curr_sess_val_\${type}_\${grp}'] = this.innerText.trim();" style="\${sessBg} text-align:center;">\${sessionVal}</td>\`;
      
      dynCols.forEach(sub => {
        const row = dataArr.find(r => r[1] === grp && r[2] === sub);
        const cellId = row ? row[0] : '';
        const cellKeyData = cellId ? \`bg_curr_data_\${cellId}\` : \`bg_curr_empty_\${type}_\${grp}_\${sub}\`;
        const dataBg = this.uiSettings[cellKeyData] ? \`background-color:\${this.uiSettings[cellKeyData]};\` : '';
        headHtml += \`<td data-id="\${cellId}" data-week="\${grp}" data-sub="\${sub}" data-cell-key="\${cellKeyData}" contenteditable="true" onblur="app.saveCell(this, '\${type}')" style="\${dataBg} white-space:pre-wrap;">\${row ? row[3] : ''}</td>\`;
      });
      headHtml += \`<td class="fixed-col label-col" style="text-align: center; cursor: pointer; color: #f43f5e; font-size: 16px; user-select: none;" onclick="app.deleteRow('\${type}', '\${grp}')" title="이 주차 전체 삭제">×</td></tr>\`;
    });
    headHtml += \`</tbody>\`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, type));
    this.initResizers();
  },`);

// 5. renderTimetablePivot 수정
code = code.replace(/renderTimetablePivot: function\(\) \{[\s\S]*?initResizers\(\);\n  \},/, `renderTimetablePivot: function() {
    const table = document.querySelector('#view-timetable .excel-table');
    let headHtml = \`<thead><tr>
      <th class="label-col-header fixed-col" style="width:10%;">일자</th>
      <th class="label-col-header fixed-col" style="width:5%;">주차</th>
      <th class="label-col-header fixed-col" style="width:5%;">회차</th>
      <th class="label-col-header fixed-col" style="width:6%;">시작 시간</th>
      <th class="label-col-header fixed-col" style="width:6%;">종료 시간</th>\`;
    this.dynamicCols.timetable.forEach(cls => {
      headHtml += \`<th data-colname="\${cls}" onclick="app.editTimetableClassName('\${cls}')" style="cursor:pointer;" title="클릭하여 반 이름 수정">\${cls}</th>\`;
    });
    headHtml += \`</tr></thead><tbody id="tbody-timetable">\`;

    const rowGroups = Array.from(new Set(this.data.timetables.map(r => r[1] + '|' + r[2] + '|' + r[3] + '|' + r[4]).filter(t => t !== '|||')));

    rowGroups.forEach(grp => {
      const [date, type, start, end] = grp.split('|');
      const isHoliday = (type === '휴일');
      const isTmpDate = date.startsWith('tmp-');
      
      const idsForGrp = this.data.timetables.filter(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end).map(r => r[0]).join(',');
      
      headHtml += \`<tr data-ids="\${idsForGrp}" data-grp="\${grp}">\`;
      
      const cellKeyDate = \`bg_tt_date_\${grp}\`;
      const cellKeyWeek = \`bg_tt_week_\${grp}\`;
      const cellKeySess = \`bg_tt_sess_\${grp}\`;
      const cellKeyStart = \`bg_tt_start_\${grp}\`;
      const cellKeyEnd = \`bg_tt_end_\${grp}\`;
      
      const dateBg = this.uiSettings[cellKeyDate] ? \`background-color:\${this.uiSettings[cellKeyDate]};\` : '';
      const weekBg = this.uiSettings[cellKeyWeek] ? \`background-color:\${this.uiSettings[cellKeyWeek]};\` : '';
      const sessBg = this.uiSettings[cellKeySess] ? \`background-color:\${this.uiSettings[cellKeySess]};\` : '';
      const startBg = this.uiSettings[cellKeyStart] ? \`background-color:\${this.uiSettings[cellKeyStart]};\` : '';
      const endBg = this.uiSettings[cellKeyEnd] ? \`background-color:\${this.uiSettings[cellKeyEnd]};\` : '';
      
      const displayDate = isTmpDate ? '' : (this.uiSettings[\`tt_fmt_date_\${grp}\`] || date);
      const displayWeek = this.uiSettings[\`tt_val_week_\${date}\`] || '';
      const displaySess = this.uiSettings[\`tt_val_sess_\${date}\`] || '';
      const displayStart = this.uiSettings[\`tt_fmt_start_\${grp}\`] || start;
      const displayEnd = this.uiSettings[\`tt_fmt_end_\${grp}\`] || end;
      
      headHtml += \`<td class="fixed-col label-col" data-cell-key="\${cellKeyDate}" contenteditable="true" onblur="app.updatePivotRowDate(this, this.innerText.trim())" placeholder="날짜 선택" style="\${dateBg} text-align:center;"><span class="drag-handle"></span>\${displayDate}</td>\`;
      headHtml += \`<td class="fixed-col label-col" data-cell-key="\${cellKeyWeek}" contenteditable="true" onblur="app.silentSave('saveUISettings', { key: 'tt_val_week_\${date}', value: this.innerText.trim() }); app.uiSettings['tt_val_week_\${date}'] = this.innerText.trim();" style="\${weekBg} text-align:center;">\${displayWeek}</td>\`;
      headHtml += \`<td class="fixed-col label-col" data-cell-key="\${cellKeySess}" contenteditable="true" onblur="app.silentSave('saveUISettings', { key: 'tt_val_sess_\${date}', value: this.innerText.trim() }); app.uiSettings['tt_val_sess_\${date}'] = this.innerText.trim();" style="\${sessBg} text-align:center;">\${displaySess}</td>\`;

      if (isHoliday) {
        const holidayRow = this.data.timetables.find(r => r[1] === date && r[2] === '휴일');
        const holidayNote = holidayRow ? (holidayRow[8] || '') : '';
        const cellKeyHolData = holidayRow ? \`bg_tt_data_\${holidayRow[0]}\` : \`bg_tt_empty_\${grp}_holiday\`;
        const holDataBg = this.uiSettings[cellKeyHolData] ? \`background-color:\${this.uiSettings[cellKeyHolData]};\` : '';
        headHtml += \`<td colspan="2" class="fixed-col label-col" style="text-align:center; color:var(--text-muted); font-style:italic;">🏖️ 휴일</td>\`;
        headHtml += \`<td colspan="\${this.dynamicCols.timetable.length}" class="timetable-cell" data-cell-key="\${cellKeyHolData}" data-id="\${holidayRow?holidayRow[0]:''}" data-date="\${date}" contenteditable="true" onblur="app.onTimetableHolidayBlur(this)" style="\${holDataBg} text-align:center; background:rgba(255,255,255,0.05); color:var(--text-muted); font-style:italic;">\${holidayNote || '휴일/특이사항 입력'}</td>\`;
      } else {
        headHtml += \`<td class="fixed-col label-col" data-cell-key="\${cellKeyStart}" contenteditable="true" onblur="app.updatePivotRowTime(this, 'start', this.innerText.trim())" placeholder="00:00" style="\${startBg} text-align:center;">\${displayStart}</td>
        <td class="fixed-col label-col" data-cell-key="\${cellKeyEnd}" contenteditable="true" onblur="app.updatePivotRowTime(this, 'end', this.innerText.trim())" placeholder="00:00" style="\${endBg} text-align:center;">\${displayEnd}</td>\`;
        this.dynamicCols.timetable.forEach(cls => {
          const row = this.data.timetables.find(r => r[1] === date && r[2] === type && r[3] === start && r[4] === end && r[5] === cls);
          let displayStr = row && (row[6] || row[7]) ? \`\${row[6]||''}\${row[7]?'('+row[7]+')':''}\` : '';
          displayStr = displayStr.trim();
          const id = row ? row[0] : '';
          const cellKeyData = id ? \`bg_tt_data_\${id}\` : \`bg_tt_empty_\${grp}_\${cls}\`;
          const dataBg = this.uiSettings[cellKeyData] ? \`background-color:\${this.uiSettings[cellKeyData]};\` : '';
          headHtml += \`<td class="timetable-cell" data-id="\${id}" data-cell-key="\${cellKeyData}" data-start="\${start}" data-end="\${end}" data-cls="\${cls}" data-date="\${date}" onclick="app.openTimetableEditor(this)" style="cursor:pointer; \${dataBg}">\${displayStr}</td>\`;
        });
      }
      headHtml += \`</tr>\`;
    });
    headHtml += \`</tbody>\`; table.innerHTML = headHtml;
    table.querySelectorAll('tbody tr').forEach(tr => this.bindRowEvents(tr, 'timetable'));
    this.initResizers();
  },`);

// 6. updatePivotRowDate 수정 (UI 서식 저장 추가)
code = code.replace(/updatePivotRowDate: async function\(el, newDate\) \{[\s\S]*?\},/, `updatePivotRowDate: async function(el, newDate) {
    if(!newDate) return;
    const tr = el.closest('tr');
    const oldGrp = tr.getAttribute('data-grp');
    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    
    // 서식 저장 로직 추가 (DB 키인 newDate와 별개로)
    let richText = app.getCleanHTML(el);
    richText = richText.replace(/<span class="drag-handle">.*?<\\/span>/g, '').trim();
    const newGrp = [newDate, oldType, oldStart, oldEnd].join('|');
    app.silentSave('saveUISettings', { key: 'tt_fmt_date_' + newGrp, value: richText });
    app.uiSettings['tt_fmt_date_' + newGrp] = richText;
    
    if (oldDate === newDate) return;
    
    const payloadArray = [];
    const rowsToSave = [];
    const rollbackData = [];
    
    this.data.timetables.forEach(r => {
      if (r[1] === oldDate && r[2] === oldType && r[3] === oldStart && r[4] === oldEnd) {
        rollbackData.push({ row: r, oldDate: r[1] });
        r[1] = newDate;
        rowsToSave.push(r);
        payloadArray.push({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8] });
      }
    });

    tr.setAttribute('data-grp', newGrp);
    tr.querySelectorAll('.timetable-cell').forEach(c => c.setAttribute('data-date', newDate));
    const h = tr.querySelector('[placeholder="어떠한 휴일인가요? (비고 입력)"]');
    if(h) h.setAttribute('data-date', newDate);

    if (payloadArray.length > 0) {
      try {
        const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
        if (res && res.success) {
          if (res.returnedIds) rowsToSave.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
          const newIds = rowsToSave.map(r => r[0]).join(',');
          tr.setAttribute('data-ids', newIds);
        } else {
          rollbackData.forEach(rb => { rb.row[1] = rb.oldDate; });
          app.renderView('timetable');
        }
      } catch(e) {
        rollbackData.forEach(rb => { rb.row[1] = rb.oldDate; });
        app.renderView('timetable');
      }
    }
  },`);

// 7. updatePivotRowTime 수정 (UI 서식 저장 추가)
code = code.replace(/updatePivotRowTime: async function\(el, field, newVal\) \{[\s\S]*?\},/, `updatePivotRowTime: async function(el, field, newVal) {
    if(!newVal) return;
    const tr = el.closest('tr');
    const oldGrp = tr.getAttribute('data-grp');
    const [oldDate, oldType, oldStart, oldEnd] = oldGrp.split('|');
    const ids = tr.getAttribute('data-ids').split(',');
    
    const newStart = field === 'start' ? newVal : oldStart;
    const newEnd = field === 'end' ? newVal : oldEnd;
    const newGrp = [oldDate, oldType, newStart, newEnd].join('|');
    
    const richText = app.getCleanHTML(el);
    app.silentSave('saveUISettings', { key: 'tt_fmt_' + field + '_' + newGrp, value: richText });
    app.uiSettings['tt_fmt_' + field + '_' + newGrp] = richText;
    
    if ((field === 'start' && oldStart === newVal) || (field === 'end' && oldEnd === newVal)) return;
    
    const rowsToSave = [];
    const rollbackData = [];

    this.data.timetables.forEach(r => {
      if (ids.includes(String(r[0])) || ids.includes(String(r[9]))) {
        rollbackData.push({ row: r, oldStart: r[3], oldEnd: r[4] });
        r[3] = newStart; r[4] = newEnd;
        rowsToSave.push(r);
      }
    });

    if (rowsToSave.length === 0) return;

    tr.setAttribute('data-grp', newGrp);
    tr.querySelectorAll('.timetable-cell').forEach(c => {
      c.setAttribute('data-start', newStart);
      c.setAttribute('data-end', newEnd);
    });

    const payloadArray = rowsToSave.map(r => ({ id: r[0], date: r[1], type: r[2], start: r[3], end: r[4], className: r[5], subject: r[6], instructor: r[7], note: r[8], regtime: r[9] }));
    try {
      const res = await this.apiPost('upsertMultipleTimetables', { payloadArray });
      if (res && res.success) {
        if (res.returnedIds) rowsToSave.forEach(r => { if (res.returnedIds[r[0]]) r[0] = res.returnedIds[r[0]]; });
        const newIds = rowsToSave.map(r => r[0]).join(',');
        tr.setAttribute('data-ids', newIds);
      } else {
        app.showToast('저장 실패: ' + (res ? res.message : '알 수 없는 에러'), true);
        rollbackData.forEach(rb => { rb.row[3] = rb.oldStart; rb.row[4] = rb.oldEnd; });
        app.renderView('timetable');
      }
    } catch(e) {
      app.showToast('저장 중 예외 발생: ' + e.message, true);
      rollbackData.forEach(rb => { rb.row[3] = rb.oldStart; rb.row[4] = rb.oldEnd; });
      app.renderView('timetable');
    }
  },`);

// Remove toolbar block from selectionchange (let it show for everything)
code = code.replace(/if \(td && !td\.classList\.contains\('label-col'\)\) \{/g, `if (td) {`);

fs.writeFileSync(path, code, 'utf8');
console.log('Script updated successfully');
