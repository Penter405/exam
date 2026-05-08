// ========== UI Enhancement Module ==========
// Numpad, History, Settings, Super Clear Mode

// --- State ---
let selectedNums = new Set();
let answerHistory = [];
let historyVisible = false;
let settingsVisible = false;
let spacingVisible = false;
let superClearMode = false;
let hideNumpad = false;

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

// ========== HISTORY PANEL ==========
function toggleHistoryPanel() {
    historyVisible = !historyVisible;
    const panel = document.getElementById('history-panel');
    const btn = document.getElementById('history-toggle-btn');
    panel.classList.toggle('show', historyVisible);
    btn.classList.toggle('active', historyVisible);
    if (historyVisible) renderHistory();
}

function addToHistory(questionNum, question, correct, correctAnswer, userAnswer) {
    answerHistory.push({ num: questionNum, q: question, correct, ans: correctAnswer, user: userAnswer });
    // Also save to localStorage for persistence
    try {
        const key = examSystem.currentExam + '_session_history';
        localStorage.setItem(key, JSON.stringify(answerHistory));
    } catch(e) {}
}

function renderHistory() {
    const el = document.getElementById('history-content');
    if (answerHistory.length === 0) {
        el.innerHTML = '<p style="text-align:center;color:#999;">尚無答題紀錄</p>';
        return;
    }
    el.innerHTML = answerHistory.slice().reverse().map(h =>
        `<div class="history-item ${h.correct ? 'correct' : 'wrong'}">
            <span class="q-num">題 ${h.num}</span>
            <span class="q-result">${h.correct ? '✅' : '❌'}</span>
            <div class="q-answer">正確答案: ${h.ans} | 你的答案: ${h.user || '(空)'}</div>
        </div>`
    ).join('');
}

// --- Touch drag for history handle ---
let handleStartY = 0;
function onHandleTouchStart(e) { handleStartY = e.touches[0].clientY; }
function onHandleTouchMove(e) { e.preventDefault(); }
function onHandleTouchEnd(e) {
    const dy = handleStartY - e.changedTouches[0].clientY;
    if (dy > 40 && !historyVisible) toggleHistoryPanel();
    else if (dy < -40 && historyVisible) toggleHistoryPanel();
}
function onHistoryHandleTouchStart(e) { handleStartY = e.touches[0].clientY; }
function onHistoryHandleTouchMove(e) { e.preventDefault(); }
function onHistoryHandleTouchEnd(e) {
    const dy = handleStartY - e.changedTouches[0].clientY;
    if (dy < -40 && historyVisible) toggleHistoryPanel();
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
    spacingVisible = true;
    document.getElementById('spacing-overlay').classList.add('show');
    const saved = localStorage.getItem('spacing_multiplier');
    if (saved) document.getElementById('spacing-slider').value = saved;
}

function closeSpacingSlider() {
    spacingVisible = false;
    document.getElementById('spacing-overlay').classList.remove('show');
}

// Spacing slider live update
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('spacing-slider');
    if (slider) {
        slider.addEventListener('input', e => {
            const v = e.target.value;
            document.documentElement.style.setProperty('--spacing-multiplier', v);
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
    const msg = `已緩存 ${keys.length} 項資料 (約 ${sizeKB} KB)\n\n要清除所有緩存嗎？`;
    if (confirm(msg)) {
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
    if (sp) document.documentElement.style.setProperty('--spacing-multiplier', sp);

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
