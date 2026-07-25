const fs = require('fs');
const path = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let code = fs.readFileSync(path, 'utf8');

function replaceBlock(search, replaceStr, errorMsg) {
  if (code.includes(search)) {
    code = code.replace(search, replaceStr);
  } else {
    console.error("FAIL: " + errorMsg);
  }
}

// 1. setCellBgColor
const oldSetCellBgColor = `  setCellBgColor: function(color) {
    this.hideContextMenu();
    if (!this.ctxTargetCell) return;
    
    // 첫 행(th)이거나 시간표의 시간/상태 등 시스템 필수 데이터 셀은 배경색 변경 차단
    if (this.ctxTargetCell.tagName.toLowerCase() === 'th') {
      app.showToast('제목 행은 배경색을 변경할 수 없습니다.', true);
      return;
    }
    
    const key = this.ctxTargetCell.getAttribute('data-cell-key');
    if (key) {
      const finalColor = color === 'transparent' ? '' : color;
      this.ctxTargetCell.style.backgroundColor = finalColor;
      this.silentSave('saveUISettings', { key: key, value: finalColor });
      this.uiSettings[key] = finalColor;
    } else {
      app.showToast('배경색을 적용할 수 없는 셀입니다.', true);
    }
  },`;

const newSetCellBgColor = `  setCellBgColor: function(color) {
    this.hideContextMenu();
    if (!this.ctxTargetCell) return;
    if (this.ctxTargetCell.tagName.toLowerCase() === 'th') {
      app.showToast('제목 행은 배경색을 변경할 수 없습니다.', true);
      return;
    }
    let key = this.ctxTargetCell.getAttribute('data-cell-key');
    if (!key) {
      // If it doesn't have a key, generate a random one and assign it, so ALL cells can be colored.
      key = 'bg_custom_' + Math.random().toString(36).substr(2, 9);
      this.ctxTargetCell.setAttribute('data-cell-key', key);
    }
    const finalColor = color === 'transparent' ? '' : color;
    this.ctxTargetCell.style.backgroundColor = finalColor;
    this.silentSave('saveUISettings', { key: key, value: finalColor });
    this.uiSettings[key] = finalColor;
  },`;
replaceBlock(oldSetCellBgColor, newSetCellBgColor, "setCellBgColor");


// 2. renderFlatTable status formatting and cell keys
// It's easier to find the old status rendering
const oldFlatStatus = `        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusClass = isDone ? 'status-done' : 'status-ongoing';
          const statusTxt = isDone ? '완료' : '진행 중';
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" class="status-cell \${isFixed ? 'label-col' : ''}" \${styleAttr}><span class="status-btn \${statusClass}" onclick="app.toggleStatus(this, '\${type}', \${colIdx})">\${statusTxt}</span></td>\`;
        } else {`;

const newFlatStatus = `        } else if (label === '상태') {
          const isDone = val === '완료';
          const statusTxt = isDone ? '🟢 완료' : '🟡 진행 중';
          const txtColor = isDone ? '#10b981' : '#f59e0b';
          html += \`<td data-col-idx="\${colIdx}" data-cell-key="\${cellKey}" class="status-cell \${isFixed ? 'label-col' : ''}" \${styleAttr}><div style="color:\${txtColor}; font-weight:bold; cursor:pointer;" onclick="app.toggleStatus(this, '\${type}', \${colIdx})">\${statusTxt}</div></td>\`;
        } else {`;
replaceBlock(oldFlatStatus, newFlatStatus, "renderFlatTable status");


// 3. toggleStatus
const oldToggleStatus = `  toggleStatus: function(btn, type, colIdx) {
    const isDone = btn.classList.contains('status-done');
    const newStatus = isDone ? '진행 중' : '완료';
    
    btn.className = \`status-btn \${!isDone ? 'status-done' : 'status-ongoing'}\`;
    btn.textContent = newStatus;
    
    const rowEl = btn.closest('tr');`;

const newToggleStatus = `  toggleStatus: function(btn, type, colIdx) {
    const isDone = btn.textContent.includes('완료');
    const newStatus = isDone ? '진행 중' : '완료';
    const statusTxt = !isDone ? '🟢 완료' : '🟡 진행 중';
    const txtColor = !isDone ? '#10b981' : '#f59e0b';
    
    btn.textContent = statusTxt;
    btn.style.color = txtColor;
    
    const rowEl = btn.closest('tr');`;
replaceBlock(oldToggleStatus, newToggleStatus, "toggleStatus");


// 4. renderCurriculumPivot header
const oldCurrHead = `    let weekHeader = this.uiSettings['header_' + viewId + '_0'] || '주차';
    let headHtml = \`<thead><tr><th class="label-col-header fixed-col" style="width:10%;"><div contenteditable="true" onblur="app.onHeaderBlur(this, '\${viewId}', 0)" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">\${weekHeader}</div></th>\`;`;
const newCurrHead = `    let weekHeader = this.uiSettings['header_' + viewId + '_0'] || '주차';
    let headHtml = \`<thead><tr><th class="label-col-header fixed-col" style="width:10%;"><div contenteditable="true" onblur="app.onHeaderBlur(this, '\${viewId}', 0)" style="display:inline-block; min-width:30px; min-height:20px; outline:none;">\${weekHeader}</div></th><th class="label-col-header fixed-col" style="width:5%;">회차</th>\`;`;
replaceBlock(oldCurrHead, newCurrHead, "renderCurriculumPivot header");


// 5. renderCurriculumPivot row
const oldCurrRow = `    weeks.forEach(week => {
      headHtml += \`<tr data-week="\${week}">
      <td class="label-col" style="font-weight:bold; text-align:center;" contenteditable="true" onblur="app.updatePivotRowLabel('\${type}', '\${week}', this.innerText.trim())">\${week}</td>\`;
      dynCols.forEach(sub => {`;
const newCurrRow = `    weeks.forEach(week => {
      const savedSess = this.uiSettings['curr_sess_' + type + '_' + week] || '';
      headHtml += \`<tr data-week="\${week}">
      <td class="label-col" style="font-weight:bold; text-align:center;" contenteditable="true" onblur="app.updatePivotRowLabel('\${type}', '\${week}', this.innerText.trim())">\${week}</td>
      <td class="label-col" style="font-weight:bold; text-align:center;" contenteditable="true" onblur="app.silentSave('saveUISettings', {key: 'curr_sess_' + '\${type}' + '_\${week}', value: this.innerText.trim()}); app.uiSettings['curr_sess_' + '\${type}' + '_\${week}'] = this.innerText.trim();">\${savedSess}</td>\`;
      dynCols.forEach(sub => {`;
replaceBlock(oldCurrRow, newCurrRow, "renderCurriculumPivot row");


fs.writeFileSync(path, code, 'utf8');
console.log('Script updated successfully (Part 1)');
