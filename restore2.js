const fs = require('fs');
const path = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/\r\n/g, '\n');

const sIdx = code.indexOf(`  sortTable: function(type, colIdx, iconEl) {`);
const eIdxStr = `  initResizers: function() {`;
const eIdx = code.indexOf(eIdxStr);

if (sIdx !== -1 && eIdx !== -1) {
  const replacement = `  sortTable: function(type, colIdx, iconEl) {
    if (this.sortState[type] && this.sortState[type].colIdx === colIdx) {
      this.sortState[type].asc = !this.sortState[type].asc;
    } else {
      this.sortState[type] = { colIdx, asc: true };
    }
    const isAsc = this.sortState[type].asc;
    document.querySelectorAll(\`.sort-icon-\${type}\`).forEach(el => el.innerText = '↕');
    iconEl.innerText = isAsc ? '▲' : '▼';
    
    let dataArray;
    if (type === 'preschedule') dataArray = this.data.preschedules;
    else if (type === 'student') dataArray = this.data.students;
    else if (type === 'instructor') dataArray = this.data.instructors;
    else return;

    dataArray.sort((a, b) => {
      let v1 = a[colIdx+1] || ''; let v2 = b[colIdx+1] || '';
      if(typeof v1 === 'string') v1 = v1.toLowerCase();
      if(typeof v2 === 'string') v2 = v2.toLowerCase();
      if (v1 < v2) return isAsc ? 1 : -1;
      if (v1 > v2) return isAsc ? -1 : 1;
      return 0;
    });
    this.renderView(type);
  },

  renderFlatTable: function(type, dataArray, cols) {
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
        
        if (label === '일자') {
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" \${cellClassStr} contenteditable="true" onblur="app.onFlatCellBlur('\${type}', this)" placeholder="날짜 선택" style="text-align:center; \${bgStyle}">\${val}</td>\`;
        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusTxt = isDone ? '🟢 완료' : '🟡 진행 중';
          const txtColor = isDone ? '#10b981' : '#f59e0b';
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" class="status-cell \${isFixed ? 'label-col' : ''}" style="text-align:center; \${bgStyle}"><div style="color:\${txtColor}; font-weight:bold; cursor:pointer;" onclick="app.toggleStatus(this, '\${type}', \${colIdx})">\${statusTxt}</div></td>\`;
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
  },

  `;
  
  const before = code.substring(0, sIdx);
  const after = code.substring(eIdx + eIdxStr.length);
  code = before + replacement + eIdxStr + after;
  
  fs.writeFileSync(path, code, 'utf8');
  console.log("RESTORED 2 PROPERLY!");
} else {
  console.log("INDEX NOT FOUND", sIdx, eIdx);
}
