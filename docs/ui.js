// ========== UI Enhancement Module ==========
// Numpad, Last Question Record, Settings, Super Clear Mode

// --- State ---
let selectedNums = new Set();
let lastQuestionData = null; // stores the last answered question info
let lastQVisible = false;
let settingsVisible = false;
let hideNumpad = false;
let superClearMode = false;

// --- Init on load ---
window.addEventListener('DOMContentLoaded', () => {
    restoreSettings();
    updateCacheIndicator();
    // Prevent virtual keyboard on answer input
    const ai = document.getElementById('answer-input');
    if (ai) {
        ai.addEventListener('focus', e => { e.target.blur(); });
    }
});

// ========== NUMPAD ==========
function toggleNumpad(n) {
    const s = String(n);
    if (selectedNums.has(s)) selectedNums.delete(s);
    else selectedNums.add(s);
    updateNumpadUI();
}

function updateNumpadUI() {
    document.querySelectorAll('.numpad-btn').forEach(btn => {
        const num = btn.getAttribute('data-num');
        btn.classList.toggle('selected', selectedNums.has(num));
    });
    const ai = document.getElementById('answer-input');
    if (ai) ai.value = Array.from(selectedNums).sort().join('');
}

function clearNumpad() {
    selectedNums.clear();
    updateNumpadUI();
}

// ========== LAST QUESTION (Area A) ==========
function toggleLastQuestion() {
    lastQVisible = !lastQVisible;
    const area = document.getElementById('collapsible-area');
    const btn = document.getElementById('square-toggle-btn');
    if (lastQVisible) {
        area.classList.remove('hidden');
        btn.classList.add('active');
    } else {
        area.classList.add('hidden');
        btn.classList.remove('active');
    }
}

function setLastQuestionData(questionNum, questionText, options, correct, correctAnswer, userAnswer) {
    lastQuestionData = { num: questionNum, text: questionText, options, correct, ans: correctAnswer, user: userAnswer };
    renderLastQuestion();
    // Also save to session history in localStorage
    try {
        const key = examSystem.currentExam + '_session_history';
        let history = [];
        try { history = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
        history.push(lastQuestionData);
        localStorage.setItem(key, JSON.stringify(history));
    } catch(e) {}
}

function renderLastQuestion() {
    const el = document.getElementById('last-question-content');
    const area = document.getElementById('last-question-area');
    if (!lastQuestionData) {
        el.innerHTML = '<p style="text-align:center;color:#999;">尚無上題記錄</p>';
        area.className = area.className.replace(/correct-result|wrong-result/g, '').trim();
        return;
    }
    const d = lastQuestionData;
    area.classList.remove('correct-result', 'wrong-result');
    area.classList.add(d.correct ? 'correct-result' : 'wrong-result');

    let optionsHtml = '';
    if (d.options) {
        optionsHtml = d.options.map(o => `<div style="padding:2px 0;">${o}</div>`).join('');
    }

    el.innerHTML = `
        <div class="lq-title">題 ${d.num}</div>
        <div class="lq-result">${d.correct ? '✅ correct' : '❌ wrong'}</div>
        <div class="lq-detail">${d.text}</div>
        ${optionsHtml ? '<div style="margin-top:6px;">' + optionsHtml + '</div>' : ''}
        <div class="lq-detail" style="margin-top:6px;">正確答案: ${d.ans} | 你的答案: ${d.user || '(空)'}</div>
    `;
}

// Keep addToHistory as alias for backward compat with script.js
function addToHistory(questionNum, questionText, correct, correctAnswer, userAnswer) {
    // Get options from current question
    let options = null;
    try {
        const q = examSystem.questions[questionNum];
        if (q) options = examSystem.splitOptions(q[1]);
    } catch(e) {}
    setLastQuestionData(questionNum, questionText, options, correct, correctAnswer, userAnswer);
}

// --- Touch drag for handle ---
let handleStartY = 0;
function onHandleTouchStart(e) { handleStartY = e.touches[0].clientY; }
function onHandleTouchMove(e) { e.preventDefault(); }
function onHandleTouchEnd(e) {
    const dy = handleStartY - e.changedTouches[0].clientY;
    if (dy > 40 && !lastQVisible) toggleLastQuestion();
    else if (dy < -40 && lastQVisible) toggleLastQuestion();
}

// ========== SETTINGS ==========
function toggleSettings() {
    settingsVisible = !settingsVisible;
    document.getElementById('settings-popup').classList.toggle('show', settingsVisible);
    if (settingsVisible) updateDataInfo();
}

function openSpacingSlider() {
    settingsVisible = false;
    document.getElementById('settings-popup').classList.remove('show');
    document.getElementById('spacing-overlay').classList.add('show');
    const saved = localStorage.getItem('spacing_multiplier');
    if (saved) document.getElementById('spacing-slider').value = saved;
}

function closeSpacingSlider() {
    document.getElementById('spacing-overlay').classList.remove('show');
}

// Spacing slider live update
function applySpacing(v) {
    const container = document.getElementById('app-container');
    if (container) container.style.padding = (20 * v) + 'px';
    document.body.style.padding = (20 * v) + 'px';
    document.querySelectorAll('#question-display, #answer-display, #fix-question-display, #output').forEach(el => {
        el.style.padding = (15 * v) + 'px';
        el.style.marginBottom = (15 * v) + 'px';
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('spacing-slider');
    if (slider) {
        slider.addEventListener('input', e => {
            const v = e.target.value;
            applySpacing(v);
            localStorage.setItem('spacing_multiplier', v);
        });
    }
});

function toggleHideNumpad() {
    hideNumpad = !hideNumpad;
    document.getElementById('toggle-hide-numpad').classList.toggle('on', hideNumpad);
    const nr = document.getElementById('numpad-row');
    if (nr) nr.classList.toggle('hidden', hideNumpad);
    localStorage.setItem('hide_numpad', hideNumpad ? '1' : '0');
}

function toggleSuperClear() {
    superClearMode = !superClearMode;
    document.getElementById('toggle-super-clear').classList.toggle('on', superClearMode);
    document.getElementById('app-container').classList.toggle('super-clear-mode', superClearMode);
    localStorage.setItem('super_clear_mode', superClearMode ? '1' : '0');
    if (superClearMode) bindSuperClearOptions();
}

function bindSuperClearOptions() {
    if (!superClearMode) return;
    document.querySelectorAll('#question-display .option').forEach((opt, i) => {
        opt.style.cursor = 'pointer';
        opt.onclick = () => {
            const num = String(i + 1);
            if (selectedNums.has(num)) selectedNums.delete(num);
            else selectedNums.add(num);
            opt.classList.toggle('selected', selectedNums.has(num));
            updateNumpadUI();
        };
    });
}

function showDataManagement() {
    const examType = examSystem.currentExam;
    if (!examType) { alert('請先選擇考試類型'); return; }
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(examType + '_')) keys.push(k);
    }
    let totalSize = 0;
    keys.forEach(k => totalSize += (localStorage.getItem(k) || '').length);
    const sizeKB = (totalSize / 1024).toFixed(1);
    if (confirm(`已緩存 ${keys.length} 項資料 (約 ${sizeKB} KB)\n\n要清除所有緩存嗎？`)) {
        keys.forEach(k => localStorage.removeItem(k));
        alert('緩存已清除');
        updateCacheIndicator();
    }
}

function updateDataInfo() {
    const el = document.getElementById('data-info');
    if (!el) return;
    const exam = examSystem.currentExam;
    if (!exam) { el.textContent = '尚未選擇考試'; return; }
    let count = 0, size = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(exam + '_')) { count++; size += (localStorage.getItem(k)||'').length; }
    }
    el.textContent = `💾 已緩存 ${count} 項 (${(size/1024).toFixed(1)} KB)`;
}

function updateCacheIndicator() {
    const el = document.getElementById('cache-indicator');
    if (!el) return;
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) total += (localStorage.getItem(localStorage.key(i))||'').length;
    if (total > 0) {
        el.innerHTML = `<span class="dot"></span>資料已緩存於裝置 (${(total/1024).toFixed(1)} KB)`;
    } else {
        el.innerHTML = '';
    }
}

// ========== RESTORE SETTINGS ==========
function restoreSettings() {
    const sp = localStorage.getItem('spacing_multiplier');
    if (sp) applySpacing(sp);

    hideNumpad = localStorage.getItem('hide_numpad') === '1';
    if (hideNumpad) {
        document.getElementById('toggle-hide-numpad').classList.add('on');
        const nr = document.getElementById('numpad-row');
        if (nr) nr.classList.add('hidden');
    }

    superClearMode = localStorage.getItem('super_clear_mode') === '1';
    if (superClearMode) {
        document.getElementById('toggle-super-clear').classList.add('on');
        document.getElementById('app-container').classList.add('super-clear-mode');
    }
}

// Close settings popup when clicking outside
document.addEventListener('click', e => {
    const popup = document.getElementById('settings-popup');
    const btn = document.getElementById('settings-btn');
    if (settingsVisible && !popup.contains(e.target) && !btn.contains(e.target)) {
        settingsVisible = false;
        popup.classList.remove('show');
    }
});
