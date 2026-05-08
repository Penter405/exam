// 刷題系統 JavaScript 版本

class ExamSystem {
    constructor() {
        this.questions = {};
        this.didNotFinish = [];
        this.wrongQuestions = [];
        this.currentExam = null;
        this.currentQuestionPool = []; // remaining questions (random pick & remove)
        this.currentQuestionNum = null;
    }

    // --- 檔案對應 (match main.py lines 522-527) ---
    getFileMap(examType) {
        if (examType === '1') {
            return {
                data: 'data2.txt',
                didNotFinish: 'did_not_finish2.txt',
                questions: 'imformation2.txt',
                wrongQuestions: 'wrong_question_number2.txt',
                notes: 'note2.txt',
                bad: ['of 64', '電腦軟體應用 乙級 工作項目']
            };
        } else if (examType === '2') {
            return {
                data: 'data.txt',
                didNotFinish: 'did_not_finish.txt',
                questions: 'imformation.txt',
                wrongQuestions: 'wrong_question_number.txt',
                notes: 'note.txt',
                bad: ['of 49', '電腦軟體應用 丙級 工作項目']
            };
        }
        return null;
    }

    // --- localStorage 讀寫 ---
    saveData(type, data) {
        const key = `${this.currentExam}_${type}`;
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadLocal(type) {
        const key = `${this.currentExam}_${type}`;
        const raw = localStorage.getItem(key);
        if (raw) {
            try { return JSON.parse(raw); } catch { return raw; }
        }
        return null;
    }

    // --- 從 GitHub 讀取並快取 ---
    async loadData(type) {
        const local = this.loadLocal(type);
        if (local !== null) return local;

        try {
            const fileMap = this.getFileMap(this.currentExam);
            if (!fileMap || !fileMap[type]) return type === 'questions' ? {} : [];
            const url = `刷題系統/data/${fileMap[type]}`;
            const resp = await fetch(url);
            if (!resp.ok) return type === 'questions' ? {} : [];
            const content = await resp.text();

            if (type === 'questions') {
                const parsed = this.parsePythonDict(content);
                this.saveData(type, parsed);
                return parsed;
            } else if (type === 'didNotFinish' || type === 'wrongQuestions') {
                const list = content.split('\n').filter(l => l.trim() !== '').map(l => parseInt(l) || l);
                this.saveData(type, list);
                return list;
            }
            return content;
        } catch (e) {
            console.error(`載入 ${type} 失敗:`, e);
            return type === 'questions' ? {} : [];
        }
    }

    // --- 解析 Python dict (處理 set 格式的答案) ---
    parsePythonDict(content) {
        try {
            let s = content.trim();
            // 1. Replace Python sets {'1', '2'} with arrays ['1', '2']
            s = s.replace(/\{(\s*'[^']*'(?:\s*,\s*'[^']*')*\s*)\}/g, '[$1]');
            // 2. Replace single quotes with double quotes
            s = s.replace(/'/g, '"');
            // 3. Quote integer keys: 1001: -> "1001":
            s = s.replace(/(\{|,)\s*(\d+)\s*:/g, '$1 "$2":');
            return JSON.parse(s);
        } catch (e) {
            console.error('parsePythonDict 失敗:', e);
            // Fallback: manual regex parsing
            try {
                return this.parsePythonDictFallback(content);
            } catch {
                return {};
            }
        }
    }

    parsePythonDictFallback(content) {
        const result = {};
        // Match: 1001: ['question', 'options', {'1', '2'}]
        const regex = /(\d+):\s*\['((?:[^'\\]|\\.)*)','\s*'((?:[^'\\]|\\.)*)','\s*\{([^}]*)\}\]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const key = match[1];
            const q1 = match[2];
            const q2 = match[3];
            const answers = match[4].split(',').map(a => a.trim().replace(/'/g, ''));
            result[key] = [q1, q2, answers];
        }
        // If regex found nothing, try simpler split approach
        if (Object.keys(result).length === 0) {
            // Split by pattern "number: ["
            const parts = content.split(/(?:^\{|,\s*)(\d+):\s*\[/);
            for (let i = 1; i < parts.length; i += 2) {
                const key = parts[i];
                const val = parts[i + 1];
                if (!val) continue;
                try {
                    // Extract q1, q2, answer from the value part
                    const q1Match = val.match(/^'((?:[^'\\]|\\.)*)\s*',\s*'/);
                    const q2Match = val.match(/,\s*'(①.*)\s*',\s*\{/);
                    const ansMatch = val.match(/\{([^}]*)\}/);
                    if (q1Match && q2Match && ansMatch) {
                        const q1 = q1Match[1];
                        const q2 = q2Match[1];
                        const answers = ansMatch[1].split(',').map(a => a.trim().replace(/'/g, ''));
                        result[key] = [q1, q2, answers];
                    }
                } catch {}
            }
        }
        return result;
    }

    // --- 取得正確答案 (match main.py get_correct_answer) ---
    getCorrectAnswer(string) {
        const result = new Set();
        for (const ch of string) {
            const n = parseInt(ch);
            if (!isNaN(n)) {
                result.add(String(n));
            } else {
                break; // Python: except -> return result
            }
        }
        return Array.from(result);
    }

    // --- 分割選項 (match main.py split_q2) ---
    splitOptions(ob) {
        const parts = ob.split('②');
        const a1 = parts[0];
        const rest1 = '②' + parts[1];
        const parts2 = rest1.split('③');
        const a2 = parts2[0];
        const rest2 = '③' + parts2[1];
        const parts3 = rest2.split('④');
        const a3 = parts3[0];
        const a4 = '④' + parts3[1];
        return [a1, a2, a3, a4];
    }

    // --- 集合比較 (match main.py set(userinput)==rs.question[ob][2]) ---
    setsEqual(set1, set2) {
        if (set1.size !== set2.size) return false;
        for (const item of set1) {
            if (!set2.has(item)) return false;
        }
        return true;
    }

    // --- 新開始 (match main.py main() bot==1) ---
    async startNewQuiz(lesson) {
        this.questions = await this.loadData('questions');
        if (!this.questions || Object.keys(this.questions).length === 0) {
            showOutput('沒有題目資料，請先初始化或上傳資料');
            return;
        }

        let number = [];
        if (lesson === 'all') {
            // main.py: number=list(rs.question.keys())
            number = Object.keys(this.questions).map(Number);
        } else if (lesson.includes('-')) {
            // main.py: lesson=map(int,(lesson.split("-")))
            const parts = lesson.split('-').map(Number);
            const start = parts[0], end = parts[1];
            number = Object.keys(this.questions).map(Number)
                .filter(k => k >= start && k <= end);
        } else {
            // main.py: lesson=list(lesson) then check str(botbot)[0] in lesson
            // e.g. "34" -> ['3','4'], matches keys starting with '3' or '4'
            const digits = lesson.split('');
            number = Object.keys(this.questions).map(Number)
                .filter(k => digits.includes(String(k)[0]));
        }

        if (number.length === 0) {
            showOutput('找不到符合條件的題目');
            return;
        }

        this.currentQuestionPool = number;
        this.wrongQuestions = [];
        this.showNextQuestion();
    }

    // --- 接續之前題目 (match main.py main() bot==0) ---
    async continueQuiz() {
        this.questions = await this.loadData('questions');
        const dnf = await this.loadData('didNotFinish');
        if (!dnf || dnf.length === 0) {
            showOutput('error 你沒有歷史紀錄');
            return;
        }
        this.currentQuestionPool = [...dnf];
        this.wrongQuestions = [];
        this.showNextQuestion();
    }

    // --- 隨機選題並顯示 (match main.py: ob=random.choice(number); number.remove(ob)) ---
    showNextQuestion() {
        if (this.currentQuestionPool.length === 0) {
            this.finishQuiz();
            return;
        }

        // Random choice like main.py
        const idx = Math.floor(Math.random() * this.currentQuestionPool.length);
        const ob = this.currentQuestionPool[idx];
        this.currentQuestionPool.splice(idx, 1);
        this.currentQuestionNum = ob;

        const q = this.questions[ob];
        if (!q) {
            showOutput(`題目 ${ob} 不存在`);
            this.showNextQuestion();
            return;
        }

        let optionsHtml;
        try {
            const options = this.splitOptions(q[1]);
            optionsHtml = options.map(o => `<div class="option">${o}</div>`).join('');
        } catch {
            optionsHtml = `<div class="option">${q[1]}</div>`;
        }

        const html = `
            <h3>題號: ${ob}</h3>
            <p>${q[0]}</p>
            <div>${optionsHtml}</div>
            <p class="remaining">剩餘 ${this.currentQuestionPool.length} 題</p>
        `;

        // Preserve scroll position — innerHTML reflow can cause page jump
        const scrollY = window.scrollY;
        document.getElementById('question-display').innerHTML = html;
        window.scrollTo({ top: scrollY, behavior: 'instant' });

        document.getElementById('quiz-area').classList.remove('hidden');
        document.getElementById('main-menu').classList.add('hidden');
        document.getElementById('answer-input').value = '';
        // Clear numpad and rebind super clear
        if (typeof clearNumpad === 'function') clearNumpad();
        if (typeof bindSuperClearOptions === 'function') bindSuperClearOptions();
        // Reapply spacing after next frame — innerHTML reflow can wipe inline styles
        setTimeout(() => {
            if (typeof globalSpacing !== 'undefined') globalSpacing.restore();
        }, 0);
    }

    // --- 提交答案 (match main.py answer checking) ---
    submitAnswer() {
        const input = document.getElementById('answer-input').value.trim();
        const ob = this.currentQuestionNum;
        const q = this.questions[ob];

        if (input.toLowerCase() === 'stop') {
            this.stopQuiz();
            return;
        }

        // main.py: set(userinput)==(rs.question[ob][2])
        const userSet = new Set(input.split(''));
        const correctSet = new Set(q[2]);

        const isCorrect = this.setsEqual(userSet, correctSet);
        let resultMsg = '';
        if (isCorrect) {
            resultMsg = '✅ correct';
        } else {
            resultMsg = `❌ wrong\nthe answer is: ${Array.from(q[2]).join('')}`;
            this.wrongQuestions.push(String(ob));
        }
        resultMsg += `\nthe question is  ${ob}`;
        showOutput(resultMsg);

        // Track in history
        if (typeof addToHistory === 'function') {
            addToHistory(ob, q[0], isCorrect, Array.from(q[2]).join(''), input);
        }

        // Save progress
        this.saveData('didNotFinish', this.currentQuestionPool);

        this.showNextQuestion();
    }

    // --- 停止 (match main.py: break then save) ---
    stopQuiz() {
        // main.py saves wrongQuestions (append) and didNotFinish
        this.appendWrongQuestions();
        this.saveData('didNotFinish', this.currentQuestionPool);

        document.getElementById('quiz-area').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        showOutput(`測驗已停止\n錯題: ${this.wrongQuestions.join(', ') || '無'}\n未完成題數: ${this.currentQuestionPool.length}`);
    }

    finishQuiz() {
        this.appendWrongQuestions();
        this.saveData('didNotFinish', []);

        document.getElementById('quiz-area').classList.add('hidden');
        document.getElementById('main-menu').classList.remove('hidden');
        showOutput(`測驗完成！\n錯題: ${this.wrongQuestions.join(', ') || '無'}`);
    }

    // main.py appends wrong questions to file, not replaces
    appendWrongQuestions() {
        const existing = this.loadLocal('wrongQuestions') || [];
        const merged = existing.concat(this.wrongQuestions);
        this.saveData('wrongQuestions', merged);
    }

    // --- 查詢題目 (match main.py bot==2) ---
    async searchQuestions(keyword, useTwoPointer = false) {
        this.questions = await this.loadData('questions');
        const results = [];
        for (const [num, q] of Object.entries(this.questions)) {
            let found = false;
            if (useTwoPointer) {
                found = this.twoPointerSearch(keyword, q[0]);
            } else {
                found = q[0].includes(keyword);
            }
            if (found) {
                results.push(`${num}     ${q[0]}`);
            }
        }
        return results;
    }

    // --- 兩指標搜尋 (match main.py two_pointer_search) ---
    twoPointerSearch(a, b) {
        let indexA = 0;
        const outOfIndex = a.length;
        for (const ch of String(b)) {
            if (indexA >= outOfIndex) return true;
            if (a[indexA] === ch) indexA++;
        }
        return indexA >= outOfIndex;
    }

    // --- 依題目查詢答案 (match main.py bot==3) ---
    async getAnswer(questionNum) {
        this.questions = await this.loadData('questions');
        const q = this.questions[questionNum];
        if (q) {
            return q;
        }
        return null;
    }

    // --- 訂正錯題 (match main.py fix_question) ---
    async loadWrongForFix() {
        this.questions = await this.loadData('questions');
        const wq = await this.loadData('wrongQuestions');
        if (!wq || wq.length === 0) {
            showOutput('沒有錯題');
            return null;
        }
        // Clean like main.py: filter empty
        const cleaned = wq.filter(x => x !== '' && x !== '\n');
        return cleaned;
    }

    // --- 初始化資料 (match main.py initialize) ---
    processRawData(rawText, bad) {
        // main.py: _ignore_useless_and_get_useful_data
        const lines = rawText.split('\n');
        const usefulLines = lines.filter(line =>
            line !== '' && !line.includes(bad[0]) && !line.includes(bad[1])
        );

        // main.py: _useful_data_to_right_data (split by 。\n)
        const joined = usefulLines.join('\n').replace(/\x0c/g, '');
        const haha = joined.split('。\n');

        const rightData = [];
        for (const rs of haha) {
            if (rs.trim() === '') continue;
            let yesno = true;
            try { parseInt(rs[0]); if (isNaN(parseInt(rs[0]))) yesno = false; }
            catch { yesno = false; }

            if (!yesno && rightData.length > 0) {
                const last = rightData.pop();
                rightData.push(last + '。\n' + rs);
            } else {
                rightData.push(rs);
            }
        }

        // main.py: _right_data_to_question
        const questions = {};
        let lastNumber = -1;
        let mainQ = 0;

        for (let rs of rightData) {
            // Remove \n chars
            rs = rs.split('').filter(c => c !== '\n').join('');

            // Clean multiple spaces (match main.py logic)
            const todo = rs;
            let cleaned = [];
            let bad_count = 0;
            let may_use = false;
            for (const ch of todo) {
                if (ch === ' ') {
                    bad_count++;
                    may_use = true;
                } else {
                    bad_count = 0;
                }
                if (bad_count >= 2) may_use = false;
                if (bad_count === 0) {
                    if (may_use) {
                        cleaned.push(' ');
                        may_use = false;
                    }
                    cleaned.push(ch);
                }
            }
            rs = cleaned.join('');

            try {
                const parts = rs.split('. (');
                const number = parseInt(parts[0]);
                const rest = parts.slice(1).join('. (');
                const answer = this.getCorrectAnswer(rest);
                const afterAnswer = rest.substring(Array.from(answer).join('').length + 1);
                let q1 = afterAnswer.split('①')[0];
                if (q1[0] === ' ') q1 = q1.substring(1);
                const q2 = '①' + rs.split('①').slice(1).join('①');

                if (lastNumber === -1 || number < lastNumber) {
                    mainQ++;
                }
                lastNumber = number;

                questions[mainQ * 1000 + number] = [q1, q2, answer];
            } catch (e) {
                console.warn('解析題目失敗:', rs.substring(0, 50), e);
            }
        }
        return questions;
    }

    async initializeExamData() {
        const fileMap = this.getFileMap(this.currentExam);
        if (!fileMap) {
            showOutput('考試類型不存在');
            return;
        }
        try {
            // Load pre-processed questions from imformation.txt (Python dict format)
            // This matches main.py: rs.question=rs._load(information,"dict")
            const resp = await fetch(`刷題系統/data/${fileMap.questions}`);
            if (!resp.ok) throw new Error(`無法讀取 ${fileMap.questions}`);
            const content = await resp.text();
            const questions = this.parsePythonDict(content);
            if (!questions || Object.keys(questions).length === 0) {
                throw new Error('解析題目失敗，請確認檔案格式');
            }
            this.questions = questions;
            this.saveData('questions', questions);
            showOutput(`初始化完成，共 ${Object.keys(questions).length} 題`);
        } catch (e) {
            showOutput('初始化失敗: ' + e.message);
            console.error('初始化失敗:', e);
        }
    }

    // --- 上傳已處理資料 ---
    uploadProcessedFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            try {
                let questions;
                try {
                    questions = JSON.parse(content);
                } catch {
                    questions = this.parsePythonDict(content);
                }
                this.questions = questions;
                this.saveData('questions', questions);
                showOutput(`上傳完成，共 ${Object.keys(questions).length} 題`);
            } catch {
                showOutput('檔案格式錯誤');
            }
        };
        reader.readAsText(file);
    }

    // --- 下載資料 ---
    async downloadFile(type) {
        const data = await this.loadData(type);
        const content = JSON.stringify(data, null, 2);
        const filename = `${this.currentExam}_${type}.json`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// ====== 全域變數 ======
let examSystem = new ExamSystem();

// ====== 輸出訊息 ======
function showOutput(msg) {
    const el = document.getElementById('output-text');
    el.textContent = msg;
    document.getElementById('output').style.display = 'block';
}

function hideAllSections() {
    ['quiz-area', 'search-area', 'fix-area', 'answer-lookup-area'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ====== UI 函數 ======
function selectExam(examType) {
    examSystem.currentExam = examType;
    document.querySelector('.exam-selector').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    showOutput(`已選擇: ${examType === '1' ? '乙檢' : '丙檢'}`);
}

function backToExamSelect() {
    examSystem = new ExamSystem();
    hideAllSections();
    document.getElementById('main-menu').classList.add('hidden');
    document.querySelector('.exam-selector').classList.remove('hidden');
}

function backToMenu() {
    hideAllSections();
    document.getElementById('main-menu').classList.remove('hidden');
}

// --- 新開始 (main.py bot==1) ---
function startNewQuiz() {
    const lesson = prompt(
        '請輸入想要的題組(1或34等) ,如果輸入all ,則全部:\n' +
        "若你想要搜尋題組範圍，請輸入 '1001-1005' 以表示題組1的一到五題，以此類推"
    );
    if (lesson) {
        examSystem.startNewQuiz(lesson);
    }
}

// --- 接續之前題目 (main.py bot==0) ---
function continueQuiz() {
    examSystem.continueQuiz();
}

// --- 提交答案 ---
function submitAnswer() {
    examSystem.submitAnswer();
}

function stopQuiz() {
    examSystem.stopQuiz();
}

// --- 查詢題目 (main.py bot==2) ---
function searchQuestions() {
    hideAllSections();
    document.getElementById('search-area').classList.remove('hidden');
    document.getElementById('main-menu').classList.add('hidden');
}

async function performSearch() {
    const keyword = document.getElementById('search-input').value;
    if (!keyword) { showOutput('請輸入關鍵字'); return; }
    const useTwoPointer = confirm('是否使用高級搜尋(two pointer)？');
    const results = await examSystem.searchQuestions(keyword, useTwoPointer);
    if (results.length === 0) {
        document.getElementById('search-results').innerHTML = '<p>找不到結果</p>';
    } else {
        document.getElementById('search-results').innerHTML =
            results.map(r => `<div class="search-result-item">${r}</div>`).join('');
    }
    showOutput(`搜尋結果: ${results.length} 筆`);
}

// --- 依題目查詢答案 (main.py bot==3) ---
function searchAnswers() {
    hideAllSections();
    document.getElementById('answer-lookup-area').classList.remove('hidden');
    document.getElementById('main-menu').classList.add('hidden');
}

async function lookupAnswer() {
    const numStr = document.getElementById('answer-num-input').value.trim();
    const num = parseInt(numStr);
    if (!num || num === 0) {
        backToMenu();
        return;
    }
    const q = await examSystem.getAnswer(num);
    const display = document.getElementById('answer-display');
    if (q) {
        let optionsHtml;
        try {
            const options = examSystem.splitOptions(q[1]);
            optionsHtml = options.join('\n');
        } catch {
            optionsHtml = q[1];
        }
        display.innerHTML = `
            <h3>題號: ${num}</h3>
            <p><strong>題目:</strong> ${q[0]}</p>
            <pre>${optionsHtml}</pre>
            <p><strong>答案:</strong> ${Array.from(q[2]).join('')}</p>
        `;
    } else {
        display.innerHTML = '<p>題目不存在</p>';
    }
    document.getElementById('answer-num-input').value = '';
    document.getElementById('answer-num-input').focus();
}

// --- 訂正錯題 (main.py fix_question) ---
let fixList = [];
let fixIndex = 0;

async function fixWrongQuestions() {
    hideAllSections();
    const wq = await examSystem.loadWrongForFix();
    if (!wq) return;

    fixList = [...wq];
    fixIndex = 0;
    document.getElementById('fix-area').classList.remove('hidden');
    document.getElementById('main-menu').classList.add('hidden');
    showFixQuestion();
}

function showFixQuestion() {
    if (fixIndex >= fixList.length) {
        // All done, save remaining
        examSystem.saveData('wrongQuestions', []);
        document.getElementById('fix-area').classList.add('hidden');
        backToMenu();
        showOutput('所有錯題已訂正完成');
        return;
    }
    const pe = fixList[fixIndex];
    const q = examSystem.questions[parseInt(pe)];
    const display = document.getElementById('fix-question-display');
    if (!q) {
        display.innerHTML = `<p>題號 ${pe} 不存在</p>`;
    } else {
        let optionsHtml;
        try {
            const options = examSystem.splitOptions(q[1]);
            optionsHtml = options.join('\n');
        } catch {
            optionsHtml = q[1];
        }
        display.innerHTML = `
            <h3>題號 ${pe}</h3>
            <p>${q[0]}</p>
            <pre>${optionsHtml}</pre>
            <p><strong>答案:</strong> ${Array.from(q[2]).join('')}</p>
        `;
    }
    document.getElementById('fix-note-input').value = '';
    document.getElementById('fix-note-input').focus();
}

function submitFix() {
    const note = document.getElementById('fix-note-input').value;
    if (note.toLowerCase() === 'stop') {
        // Save remaining wrong questions
        const remaining = fixList.slice(fixIndex);
        examSystem.saveData('wrongQuestions', remaining);
        document.getElementById('fix-area').classList.add('hidden');
        backToMenu();
        showOutput('訂正已停止');
        return;
    }

    // Save note to localStorage
    const pe = fixList[fixIndex];
    const notesKey = `${examSystem.currentExam}_notes`;
    let notes = [];
    try { notes = JSON.parse(localStorage.getItem(notesKey) || '[]'); } catch {}
    const q = examSystem.questions[parseInt(pe)];
    notes.push({ questionNum: pe, question: q, note: note, time: new Date().toISOString() });
    localStorage.setItem(notesKey, JSON.stringify(notes));

    fixIndex++;
    showFixQuestion();
}

function stopFix() {
    const remaining = fixList.slice(fixIndex);
    examSystem.saveData('wrongQuestions', remaining);
    document.getElementById('fix-area').classList.add('hidden');
    backToMenu();
    showOutput('訂正已停止');
}

// --- 初始化資料 (main.py initialize) ---
function initializeData() {
    if (!examSystem.currentExam) {
        showOutput('請先選擇考試類型');
        return;
    }
    if (confirm('確定要初始化資料嗎？這會重新處理原始資料。')) {
        examSystem.initializeExamData();
    }
}

// --- 上傳已處理資料 ---
function uploadProcessedData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) examSystem.uploadProcessedFile(file);
    };
    input.click();
}

// --- 下載資料 ---
function downloadData() {
    const type = prompt('請輸入要下載的資料類型:\n1 = questions\n2 = didNotFinish\n3 = wrongQuestions\n4 = notes');
    const map = { '1': 'questions', '2': 'didNotFinish', '3': 'wrongQuestions', '4': 'notes' };
    const t = map[type];
    if (t) {
        examSystem.downloadFile(t);
    } else {
        showOutput('無效的選擇');
    }
}

// --- Enter 鍵提交 ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const quizArea = document.getElementById('quiz-area');
        const answerInput = document.getElementById('answer-input');
        const answerNumInput = document.getElementById('answer-num-input');
        const fixNote = document.getElementById('fix-note-input');

        if (quizArea && !quizArea.classList.contains('hidden') && document.activeElement === answerInput) {
            submitAnswer();
        } else if (answerNumInput && document.activeElement === answerNumInput) {
            lookupAnswer();
        } else if (fixNote && document.activeElement === fixNote) {
            submitFix();
        }
    }
});