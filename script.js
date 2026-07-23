const app = {
  currentView: 'view-dashboard',
  currentCategory: null, // 대분류

  classStructure: {
    '수학': ['기하', '조합', '대수', '정수', '중등 교과수학', '고등 교과수학', '사고력 수학', '수학경시 및 대회', '기타(수학)'],
    '과학': ['물리학', '화학', '생명과학', '지구과학', '중등 교과과학', '고등 교과과학', '사고력 과학', '과학경시 및 대회', '기타(과학)']
  },

  // 로드된 데이터 저장소
  data: {
    classes: [],
    instructors: [],
    preschedules: [],
    curriculums: [],
    timetables: []
  },

  init: function() {
    this.bindEvents();
    this.bindModalEvents();
    this.fetchInitialData();
  },

  showLoading: function() { document.getElementById('loadingSpinner').classList.remove('hidden'); },
  hideLoading: function() { document.getElementById('loadingSpinner').classList.add('hidden'); },

  // 데이터 최초 1회 로딩
  fetchInitialData: function() {
    if (typeof google === 'undefined' || !google.script) {
      console.log("로컬 개발 환경입니다. GAS 연동이 없습니다.");
      return;
    }
    this.showLoading();
    google.script.run
      .withSuccessHandler((res) => {
        if (res.error) {
          alert("데이터 로딩 에러: " + res.error);
        } else {
          this.data.classes = res['설정_학급명'] || [];
          this.data.instructors = res['설정_강사정보'] || [];
          this.data.preschedules = res['사전준비일정'] || [];
          this.data.curriculums = res['수업진도계획'] || [];
          this.data.timetables = res['시간표'] || [];
          this.renderSettings();
          this.updateClassSelects();
        }
        this.hideLoading();
      })
      .withFailureHandler((err) => {
        alert("통신 실패: " + err);
        this.hideLoading();
      })
      .getInitialData();
  },

  bindEvents: function() {
    const groupHeaders = document.querySelectorAll('.nav-group-header');
    groupHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const group = e.currentTarget.parentElement;
        group.classList.toggle('open');
      });
    });

    const subItems = document.querySelectorAll('.sub-item');
    subItems.forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.sub-item, .single-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetViewId = e.currentTarget.getAttribute('data-target');
        const category = e.currentTarget.getAttribute('data-category');
        
        this.currentCategory = category;
        const viewEl = document.getElementById(targetViewId);
        if (viewEl) {
          const label = viewEl.querySelector('.current-category-label');
          if (label) label.innerText = `[${category}]`;
        }

        const titleText = e.currentTarget.parentElement.previousElementSibling.querySelector('.text').innerText;
        document.getElementById('pageTitle').innerText = `${category} - ${titleText}`;

        this.switchView(targetViewId);
        this.renderDataViews(); // 데이터 필터링 후 다시 그리기
      });
    });

    const singleItems = document.querySelectorAll('.single-item');
    singleItems.forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.sub-item, .single-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const targetViewId = e.currentTarget.getAttribute('data-target');
        document.getElementById('pageTitle').innerText = e.currentTarget.querySelector('.text').innerText;
        this.currentCategory = null;
        this.switchView(targetViewId);
      });
    });

    // 다중 필터 이벤트 바인딩 (변경될 때마다 다시 렌더링)
    document.querySelectorAll('.filter-mid, .filter-sub').forEach(el => {
      el.addEventListener('change', () => this.renderDataViews());
    });
    document.querySelectorAll('.filter-class').forEach(el => {
      el.addEventListener('input', () => this.renderDataViews());
    });
  },

  switchView: function(viewId) {
    const oldView = document.getElementById(this.currentView);
    if (oldView) {
      oldView.classList.remove('active');
      oldView.classList.add('hidden');
    }
    const newView = document.getElementById(viewId);
    if (newView) {
      newView.classList.remove('hidden');
      newView.classList.add('active');
    }
    this.currentView = viewId;
  },

  bindModalEvents: function() {
    const midSelect = document.getElementById('class-mid-cat');
    const subWrapSelect = document.getElementById('wrap-sub-select');
    const subWrapInput = document.getElementById('wrap-sub-input');
    const subSelectEl = document.getElementById('class-sub-cat-select');

    if (midSelect) {
      midSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '수학' || val === '과학') {
          subWrapSelect.classList.remove('hidden');
          subWrapInput.classList.add('hidden');
          const options = this.classStructure[val];
          subSelectEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        } else if (val === '기타') {
          subWrapSelect.classList.add('hidden');
          subWrapInput.classList.remove('hidden');
        } else {
          subWrapSelect.classList.remove('hidden');
          subWrapInput.classList.add('hidden');
          subSelectEl.innerHTML = '<option value="">-- 중분류를 먼저 선택하세요 --</option>';
        }
      });
    }
  },

  openModal: function(modalId) {
    document.getElementById('modal-container').classList.remove('hidden');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
    document.getElementById(modalId).classList.remove('hidden');
    
    // 모달 열 때 학급 선택 드롭다운 갱신
    if(modalId === 'preschedule-modal' || modalId === 'curriculum-modal' || modalId === 'timetable-modal') {
      this.updateClassSelects();
    }
  },

  closeModal: function() {
    document.getElementById('modal-container').classList.add('hidden');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
  },

  // 각종 모달의 <select> 목록을 현재 데이터 기준으로 갱신
  updateClassSelects: function() {
    // 1. 등록된 강사 목록을 시간표 모달에 갱신
    const instSelect = document.getElementById('time-instructor');
    if (instSelect) {
      let instHtml = '<option value="">-- 강사 선택 --</option>';
      this.data.instructors.forEach(row => { instHtml += `<option value="${row[1]}">${row[1]}</option>`; });
      instSelect.innerHTML = instHtml;
    }

    // 2. 등록된 학급 목록을 각 일정/진도/시간표 모달에 갱신
    // 현재 선택된 대분류(currentCategory)에 해당하는 학급만 표시
    let classHtml = '<option value="">-- 학급 선택 --</option>';
    if (this.currentCategory) {
      const filtered = this.data.classes.filter(row => row[1] === this.currentCategory);
      filtered.forEach(row => {
        // row: ID, 대분류, 중분류, 소분류, 학급명, 등록일
        const displayName = `[${row[2]}>${row[3]}] ${row[4]}`;
        const val = JSON.stringify({ mid: row[2], sub: row[3], name: row[4] });
        classHtml += `<option value='${val}'>${displayName}</option>`;
      });
    }

    document.getElementById('pre-class-select').innerHTML = classHtml;
    document.getElementById('curr-class-select').innerHTML = classHtml;
    document.getElementById('time-class-select').innerHTML = classHtml;
  },

  // ------------------------------------
  // 데이터 저장 요청 (google.script.run)
  // ------------------------------------
  saveClass: function() {
    const mainCat = document.getElementById('class-main-cat').value;
    const midCat = document.getElementById('class-mid-cat').value;
    
    if(!midCat) { alert("중분류를 선택하세요."); return; }

    let subCat = (midCat === '기타') ? document.getElementById('class-sub-cat-input').value.trim() : document.getElementById('class-sub-cat-select').value;
    const className = document.getElementById('class-name-input').value.trim();

    if(!subCat || !className) { alert("소분류와 학급분류(반 이름)를 모두 입력하세요."); return; }
    
    this.showLoading();
    if(typeof google !== 'undefined' && google.script) {
      google.script.run
      .withSuccessHandler((res) => {
        if(res.success) {
          alert("학급 등록 완료");
          this.closeModal();
          this.fetchInitialData(); // 리로딩
        } else { alert("오류: " + res.message); this.hideLoading(); }
      })
      .withFailureHandler((err) => {
        alert("백엔드 에러(권한 또는 오타): " + err);
        this.hideLoading();
      })
      .saveClassData(mainCat, midCat, subCat, className);
    } else {
      alert("[로컬 테스트] 학급 정보가 저장되는 척 합니다. 실제 구글 시트 저장은 배포된 웹앱에서만 작동합니다.");
      console.log("로컬 테스트: ", mainCat, midCat, subCat, className);
      this.closeModal();
      this.hideLoading();
    }
  },

  saveInstructor: function() {
    const name = document.getElementById('inst-name').value;
    const phone = document.getElementById('inst-phone').value;
    const email = document.getElementById('inst-email').value;
    if(!name || !email) { alert("이름과 지메일을 입력하세요."); return; }

    this.showLoading();
    if(typeof google !== 'undefined' && google.script) {
      google.script.run
      .withSuccessHandler((res) => {
        if(res.success) {
          const inviteLink = "https://chat.google.com/room/XXXXX";
          alert(`강사 등록 완료!\n아래 구글 챗방 초대 링크를 복사하여 전달해주세요:\n${inviteLink}`);
          this.closeModal();
          this.fetchInitialData();
        } else { alert("오류: " + res.message); this.hideLoading(); }
      })
      .withFailureHandler((err) => {
        alert("백엔드 에러: " + err);
        this.hideLoading();
      })
      .saveInstructorData(name, phone, email);
    } else {
      alert("[로컬 테스트] 강사 정보가 저장되는 척 합니다.");
      this.closeModal();
      this.hideLoading();
    }
  },

  savePreSchedule: function() {
    if(!this.currentCategory) { alert("대분류 선택 에러"); return; }
    const classVal = document.getElementById('pre-class-select').value;
    if(!classVal) { alert("대상 학급을 선택하세요."); return; }
    const cData = JSON.parse(classVal);
    const date = document.getElementById('pre-date').value;
    const content = document.getElementById('pre-content').value;
    const note = document.getElementById('pre-note').value;

    this.showLoading();
    if(typeof google !== 'undefined' && google.script) {
      google.script.run
      .withSuccessHandler((res)=>{
        this.closeModal(); this.fetchInitialData();
      })
      .withFailureHandler((err)=>{
        alert("백엔드 에러: " + err);
        this.hideLoading();
      })
      .savePreSchedule(this.currentCategory, cData.mid, cData.sub, cData.name, date, content, note);
    } else {
      alert("[로컬 테스트] 일정이 저장되는 척 합니다.");
      this.closeModal();
      this.hideLoading();
    }
  },

  saveCurriculum: function() {
    if(!this.currentCategory) { alert("대분류 선택 에러"); return; }
    const classVal = document.getElementById('curr-class-select').value;
    if(!classVal) { alert("대상 학급을 선택하세요."); return; }
    const cData = JSON.parse(classVal);
    const week = document.getElementById('curr-week').value;
    const content = document.getElementById('curr-content').value;

    this.showLoading();
    if(typeof google !== 'undefined' && google.script) {
      google.script.run
      .withSuccessHandler((res)=>{
        this.closeModal(); this.fetchInitialData();
      })
      .withFailureHandler((err)=>{
        alert("백엔드 에러: " + err);
        this.hideLoading();
      })
      .saveCurriculum(this.currentCategory, cData.mid, cData.sub, cData.name, week, content);
    } else {
      alert("[로컬 테스트] 진도계획이 저장되는 척 합니다.");
      this.closeModal();
      this.hideLoading();
    }
  },

  saveTimetable: function() {
    if(!this.currentCategory) { alert("대분류 선택 에러"); return; }
    const classVal = document.getElementById('time-class-select').value;
    if(!classVal) { alert("대상 학급을 선택하세요."); return; }
    const cData = JSON.parse(classVal);
    
    const day = document.getElementById('time-day').value;
    const start = document.getElementById('time-start').value;
    const end = document.getElementById('time-end').value;
    const instructor = document.getElementById('time-instructor').value;

    if(!start || !end || !instructor) { alert("모든 항목을 입력하세요."); return; }

    this.showLoading();
    if(typeof google !== 'undefined' && google.script) {
      google.script.run
      .withSuccessHandler((res)=>{
        this.closeModal(); this.fetchInitialData();
      })
      .withFailureHandler((err)=>{
        alert("백엔드 에러: " + err);
        this.hideLoading();
      })
      .saveTimetable(this.currentCategory, cData.mid, cData.sub, cData.name, day, start, end, instructor);
    } else {
      alert("[로컬 테스트] 시간표가 저장되는 척 합니다.");
      this.closeModal();
      this.hideLoading();
    }
  },

  // ------------------------------------
  // 데이터 렌더링
  // ------------------------------------
  renderSettings: function() {
    const classList = document.getElementById('class-list');
    if (this.data.classes.length === 0) {
      classList.innerHTML = '<li class="empty-msg">등록된 학급이 없습니다.</li>';
    } else {
      classList.innerHTML = this.data.classes.map(r => `<li>[${r[1]}] ${r[2]} > ${r[3]} > <strong>${r[4]}</strong></li>`).join('');
    }

    const instList = document.getElementById('instructor-list');
    if (this.data.instructors.length === 0) {
      instList.innerHTML = '<p class="empty-msg">등록된 강사 정보가 없습니다.</p>';
    } else {
      instList.innerHTML = this.data.instructors.map(r => `<div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);">${r[1]} (${r[3]}) - ${r[2]}</div>`).join('');
    }
  },

  renderDataViews: function() {
    if(!this.currentCategory) return;
    
    const getFilterValues = (viewId) => {
      const view = document.getElementById(viewId);
      const mid = view.querySelector('.filter-mid').value;
      const sub = view.querySelector('.filter-sub').value; // 추후 중분류에 따른 소분류 드롭다운 연동은 생략(텍스트로 구현가능)
      const cName = view.querySelector('.filter-class').value.toLowerCase();
      return { mid, sub, cName };
    };

    // 1. 시간표 렌더링
    const fTime = getFilterValues('view-timetable');
    const timeData = this.data.timetables.filter(r => {
      if (r[1] !== this.currentCategory) return false;
      if (fTime.mid && r[2] !== fTime.mid) return false;
      if (fTime.cName && !r[4].toLowerCase().includes(fTime.cName)) return false;
      return true;
    });
    const timeEl = document.getElementById('timetable-list');
    if(timeData.length === 0) timeEl.innerHTML = '<p class="empty-msg">데이터가 없습니다.</p>';
    else timeEl.innerHTML = timeData.map(r => `<div class="info-box mb-5"><strong>[${r[5]}] ${r[6]}~${r[7]}</strong> | ${r[4]} (${r[8]} 강사님)</div>`).join('');

    // 2. 진도계획 렌더링 (비슷한 로직)
    const fCurr = getFilterValues('view-curriculum');
    const currData = this.data.curriculums.filter(r => r[1] === this.currentCategory && (!fCurr.mid || r[2] === fCurr.mid) && (!fCurr.cName || r[4].toLowerCase().includes(fCurr.cName)));
    const currEl = document.getElementById('curriculum-list');
    if(currData.length === 0) currEl.innerHTML = '<p class="empty-msg">데이터가 없습니다.</p>';
    else currEl.innerHTML = currData.map(r => `<div class="info-box mb-5"><strong>${r[5]}</strong> | ${r[4]} - ${r[6]}</div>`).join('');

    // 3. 사전준비 렌더링
    const fPre = getFilterValues('view-preschedule');
    const preData = this.data.preschedules.filter(r => r[1] === this.currentCategory && (!fPre.mid || r[2] === fPre.mid) && (!fPre.cName || r[4].toLowerCase().includes(fPre.cName)));
    const preEl = document.getElementById('preschedule-list');
    if(preData.length === 0) preEl.innerHTML = '<p class="empty-msg">데이터가 없습니다.</p>';
    else preEl.innerHTML = preData.map(r => `<div class="info-box mb-5"><strong>${r[5]}</strong> | ${r[4]} - ${r[6]} (${r[7]})</div>`).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
