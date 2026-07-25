const fs = require('fs');
const path = 'c:\\Users\\slrud\\OneDrive\\문서\\[안티그래비티]\\2028 영재학교반\\script.js';
let code = fs.readFileSync(path, 'utf8');

// 1. switchView에 preschedule '+ 내용 추가' 버튼 추가
code = code.replace(/if \(viewId === 'view-curriculum' \|\| viewId === 'view-curriculum-science'\) \{/,
`if (viewId === 'view-preschedule') {
        headerActions.innerHTML = \`<button class="btn btn-primary" onclick="app.addRow('preschedule')">+ 내용 추가</button>\`;
      } else if (viewId === 'view-curriculum' || viewId === 'view-curriculum-science') {`);

// 2. 시간 드롭다운 열기 로직 추가
const customLogic = `
  // --- 더블 클릭 모달 로직 ---
  openDatePicker: function(td) {
    if (!this.fp) {
      this.fp = flatpickr(td, {
        locale: "ko",
        theme: "dark",
        disableMobile: true,
        onChange: function(selectedDates, dateStr, instance) {
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const date = selectedDates[0];
          const yy = String(date.getFullYear()).slice(-2);
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          const day = days[date.getDay()];
          const formatted = \`\${yy}-\${mm}-\${dd} (\${day})\`;
          
          instance.element.innerHTML = formatted;
          app.updatePivotRowDate(instance.element, formatted);
        }
      });
    }
    this.fp.element = td;
    this.fp.open();
  },

  openTimePicker: function(td, field) {
    const dropdown = document.getElementById('time-dropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    const times = [];
    for(let h=10; h<=22; h++) {
      times.push(\`\${String(h).padStart(2,'0')}:00\`);
      if(h !== 22) times.push(\`\${String(h).padStart(2,'0')}:30\`);
    }
    
    times.forEach(t => {
      const div = document.createElement('div');
      div.innerText = t;
      div.onclick = () => {
        td.innerHTML = t;
        app.updatePivotRowTime(td, field, t);
        dropdown.classList.add('hidden');
      };
      dropdown.appendChild(div);
    });

    const rect = td.getBoundingClientRect();
    dropdown.style.left = \`\${rect.left}px\`;
    dropdown.style.top = \`\${rect.bottom + window.scrollY}px\`;
    dropdown.classList.remove('hidden');
    
    // 외부 클릭 시 닫기
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && e.target !== td) {
        dropdown.classList.add('hidden');
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => document.addEventListener('click', closeDropdown), 10);
  },
`;

code = code.replace(/initFlatpickr: function\(\) \{/, customLogic + '\n  initFlatpickr: function() {');

// 3. tbody 더블클릭 이벤트 (Event Delegation) 추가
code = code.replace(/document\.addEventListener\('selectionchange', \(\) => \{/, 
`document.addEventListener('dblclick', (e) => {
      const td = e.target.closest('td');
      if (!td) return;
      const key = td.getAttribute('data-cell-key') || '';
      if (key.includes('bg_tt_date_')) {
        app.openDatePicker(td);
      } else if (key.includes('bg_tt_start_')) {
        app.openTimePicker(td, 'start');
      } else if (key.includes('bg_tt_end_')) {
        app.openTimePicker(td, 'end');
      }
    });

    document.addEventListener('selectionchange', () => {`);

fs.writeFileSync(path, code, 'utf8');
console.log('Script updated for dblclick modals');
