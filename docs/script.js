// 刷題系統 JavaScript 版本

class ExamSystem {
    constructor() {
        this.questions = {};
        this.didNotFinish = [];
        this.wrongQuestions = [];
        this.currentExam = null;
        this.currentQuestions = [];
        this.currentIndex = 0;
    }

    // 載入資料從 localStorage 或檔案
    loadData(type) {
        const key = `${this.currentExam}_${type}`;
        const data = localStorage.getItem(key);
        if (data) {
            try {
                return JSON.parse(data);
            } catch {
                // 如果不是 JSON，可能是舊格式的文字
                return data;
            }
        }
        return type === 'questions' ? {} : [];
    }

    // 儲存資料到 localStorage
    saveData(type, data) {
        const key = `${this.currentExam}_${type}`;
        if (typeof data === 'object') {
            localStorage.setItem(key, JSON.stringify(data));
        } else {
            localStorage.setItem(key, data);
        }
    }

    // 處理原始資料轉換為問題格式 (類似 _useful_data_to_right_data 和 _right_data_to_question)
    processRawData(rawText) {
        // 移除無用行
        const lines = rawText.split('\n');
        const usefulLines = lines.filter(line => 
            line.trim() && 
            !line.includes('of 49') && 
            !line.includes('of 64') && 
            !line.includes('電腦軟體應用')
        );

        // 合併被分割的問題
        const rightData = [];
        let currentQuestion = '';

        for (const line of usefulLines) {
            const cleanLine = line.replace(/\x0c/g, '');
            if (cleanLine.match(/^\d+\./)) {
                if (currentQuestion) {
                    rightData.push(currentQuestion.trim());
                }
                currentQuestion = cleanLine;
            } else {
                currentQuestion += '。\n' + cleanLine;
            }
        }
        if (currentQuestion) {
            rightData.push(currentQuestion.trim());
        }

        // 轉換為問題格式
        const questions = {};
        let mainQ = 0;
        let lastNumber = -1;

        for (const questionText of rightData) {
            const match = questionText.match(/^(\d+)\.\s*\(([^)]+)\)\s*(.+?)\s*①(.+)$/s);
            if (match) {
                const number = parseInt(match[1]);
                const answerStr = match[2];
                const q1 = match[3].trim();
                const q2 = '①' + match[4];

                const answer = this.getCorrectAnswer(answerStr);

                if (lastNumber === -1 || number < lastNumber) {
                    mainQ++;
                }
                lastNumber = number;

                questions[mainQ * 1000 + number] = [q1, q2, answer];
            }
        }

        return questions;
    }

    // 取得正確答案
    getCorrectAnswer(string) {
        const answers = new Set();
        for (const char of string) {
            if ('1234'.includes(char)) {
                answers.add(char);
            }
        }
        return Array.from(answers);
    }

    // 分割選項
    splitOptions(optionsText) {
        const options = [];
        let current = '';
        let optionNum = 1;

        for (const char of optionsText) {
            if (char === '①' || char === '②' || char === '③' || char === '④') {
                if (current) options.push(current);
                current = char;
                optionNum++;
            } else {
                current += char;
            }
        }
        if (current) options.push(current);

        return options;
    }

    // 開始新測驗
    startNewQuiz(lesson) {
        this.questions = this.loadData('questions');
        if (Object.keys(this.questions).length === 0) {
            alert('沒有題目資料，請先初始化或上傳資料');
            return;
        }

        let questionNumbers = [];
        if (lesson === 'all') {
            questionNumbers = Object.keys(this.questions).map(Number);
        } else if (lesson.includes('-')) {
            const [start, end] = lesson.split('-').map(Number);
            questionNumbers = Object.keys(this.questions)
                .map(Number)
                .filter(num => num >= start && num <= end);
        } else {
            questionNumbers = Object.keys(this.questions)
                .map(Number)
                .filter(num => Math.floor(num / 1000) == lesson);
        }

        this.currentQuestions = questionNumbers;
        this.currentIndex = 0;
        this.didNotFinish = [];
        this.saveData('didNotFinish', this.didNotFinish);
        this.showQuestion();
    }

    // 繼續測驗
    continueQuiz() {
        this.questions = this.loadData('questions');
        this.didNotFinish = this.loadData('didNotFinish');
        this.currentQuestions = [...this.didNotFinish];
        this.currentIndex = 0;
        if (this.currentQuestions.length === 0) {
            alert('沒有未完成的題目');
            return;
        }
        this.showQuestion();
    }

    // 顯示問題
    showQuestion() {
        if (this.currentIndex >= this.currentQuestions.length) {
            alert('測驗完成！');
            this.saveData('didNotFinish', []);
            return;
        }

        const qNum = this.currentQuestions[this.currentIndex];
        const question = this.questions[qNum];
        const options = this.splitOptions(question[1]);

        const questionHtml = `
            <h3>題號: ${qNum}</h3>
            <p>${question[0]}</p>
            <div>${options.join('<br>')}</div>
        `;

        document.getElementById('question-display').innerHTML = questionHtml;
        document.getElementById('quiz-area').classList.remove('hidden');
        document.getElementById('answer-input').focus();
    }

    // 提交答案
    submitAnswer() {
        const userAnswer = document.getElementById('answer-input').value.trim();
        const qNum = this.currentQuestions[this.currentIndex];
        const correctAnswer = this.questions[qNum][2];

        if (userAnswer.toLowerCase() === 'stop') {
            this.stopQuiz();
            return;
        }

        const userSet = new Set(userAnswer.split(''));
        const correctSet = new Set(correctAnswer);

        if (this.setsEqual(userSet, correctSet)) {
            alert('正確！');
        } else {
            alert(`錯誤。正確答案是: ${correctAnswer.join('')}`);
            this.wrongQuestions.push(qNum);
            this.saveData('wrongQuestions', this.wrongQuestions);
        }

        this.currentIndex++;
        this.didNotFinish = this.currentQuestions.slice(this.currentIndex);
        this.saveData('didNotFinish', this.didNotFinish);
        document.getElementById('answer-input').value = '';
        this.showQuestion();
    }

    // 停止測驗
    stopQuiz() {
        this.saveData('didNotFinish', this.currentQuestions.slice(this.currentIndex));
        document.getElementById('quiz-area').classList.add('hidden');
        alert('測驗已停止');
    }

    // 搜尋題目
    searchQuestions(keyword, useTwoPointer = false) {
        const results = [];
        for (const [num, question] of Object.entries(this.questions)) {
            const questionText = question[0];
            let found = false;
            if (useTwoPointer) {
                found = this.twoPointerSearch(keyword, questionText);
            } else {
                found = questionText.includes(keyword);
            }
            if (found) {
                results.push(`${num}: ${questionText}`);
            }
        }
        return results;
    }

    // 兩指標搜尋
    twoPointerSearch(pattern, text) {
        let i = 0;
        for (const char of text) {
            if (i < pattern.length && char === pattern[i]) {
                i++;
            }
        }
        return i === pattern.length;
    }

    // 查詢答案
    getAnswer(questionNum) {
        const question = this.questions[questionNum];
        if (question) {
            return question[2].join('');
        }
        return '題目不存在';
    }

    // 訂正錯題
    fixWrongQuestions() {
        this.wrongQuestions = this.loadData('wrongQuestions');
        if (this.wrongQuestions.length === 0) {
            alert('沒有錯題');
            return;
        }

        // 這裡可以實作訂正介面
        alert('訂正功能待實作');
    }

    // 初始化資料
    initializeData(rawData) {
        const questions = this.processRawData(rawData);
        this.questions = questions;
        this.saveData('questions', questions);
        alert('資料初始化完成');
    }

    // 集合比較
    setsEqual(set1, set2) {
        if (set1.size !== set2.size) return false;
        for (const item of set1) {
            if (!set2.has(item)) return false;
        }
        return true;
    }

    // 上傳檔案
    uploadFiles(files) {
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                let parsedContent;
                
                if (file.name.includes('imformation')) {
                    // 問題資料，嘗試解析為 dict
                    try {
                        parsedContent = JSON.parse(content);
                    } catch {
                        // 如果失敗，可能是 Python dict 格式
                        parsedContent = this.parsePythonDict(content);
                    }
                } else if (file.name.includes('did_not_finish') || file.name.includes('wrong_question_number')) {
                    // 列表資料
                    try {
                        parsedContent = JSON.parse(content);
                    } catch {
                        parsedContent = content.split('\n').filter(line => line.trim());
                    }
                } else {
                    // 其他文字檔案
                    parsedContent = content;
                }
                
                const fileName = file.name.replace('.txt', '').replace(/\d+$/, '');
                this.saveData(fileName, parsedContent);
                alert(`${file.name} 上傳完成`);
            };
            reader.readAsText(file);
        }
    }

    // 下載檔案
    downloadData(type) {
        const data = this.loadData(type);
        let content;
        let filename;
        
        if (typeof data === 'object') {
            content = JSON.stringify(data, null, 2);
            filename = `${this.currentExam}_${type}.json`;
        } else {
            content = data;
            filename = `${this.currentExam}_${type}.txt`;
        }
        
        const blob = new Blob([content], {type: 'text/plain'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 解析 Python dict 格式
    parsePythonDict(content) {
        // 簡化版本，假設是簡單的 dict 格式
        try {
            // 移除 Python 語法，轉為 JSON
            let jsonStr = content.replace(/'/g, '"');
            return JSON.parse(jsonStr);
        } catch {
            console.error('無法解析 Python dict 格式');
            return {};
        }
    }
}

// 全域變數
let examSystem = new ExamSystem();

// UI 函數
function selectExam(examType) {
    examSystem.currentExam = examType;
    document.querySelector('.exam-selector').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function startNewQuiz() {
    const lesson = prompt('請輸入想要的題組 (all 或 1-1000 等):');
    if (lesson) {
        examSystem.startNewQuiz(lesson);
    }
}

function continueQuiz() {
    examSystem.continueQuiz();
}

function searchQuestions() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('search-area').classList.remove('hidden');
}

function performSearch() {
    const keyword = document.getElementById('search-input').value;
    const useTwoPointer = confirm('是否使用兩指標搜尋？');
    const results = examSystem.searchQuestions(keyword, useTwoPointer);
    document.getElementById('search-results').innerHTML = results.join('<br>');
}

function searchAnswers() {
    const questionNum = prompt('請輸入題號:');
    if (questionNum) {
        const answer = examSystem.getAnswer(parseInt(questionNum));
        alert(`答案: ${answer}`);
    }
}

function fixWrongQuestions() {
    examSystem.fixWrongQuestions();
}

function initializeData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const rawData = event.target.result;
                examSystem.initializeData(rawData);
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function uploadProcessedData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                try {
                    const questions = JSON.parse(content);
                    examSystem.questions = questions;
                    examSystem.saveData('questions', questions);
                    alert('已處理資料上傳完成');
                } catch {
                    alert('檔案格式錯誤');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function uploadFiles() {
    const files = document.getElementById('file-input').files;
    examSystem.uploadFiles(files);
    document.getElementById('file-upload').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
}

function downloadData() {
    const type = prompt('請輸入要下載的資料類型 (questions, didNotFinish, wrongQuestions):');
    if (type) {
        examSystem.downloadData(type);
    }
}

function submitAnswer() {
    examSystem.submitAnswer();
}

function stopQuiz() {
    examSystem.stopQuiz();
}