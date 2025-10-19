import sys
import os
from PyQt6.QtWidgets import QApplication, QWidget, QTextEdit, QLineEdit, QPushButton, QHBoxLayout, QVBoxLayout, QSizePolicy, QSplitter
from PyQt6.QtCore import Qt, QTimer

BASE_PATH = os.path.dirname(os.path.abspath(sys.argv[0]))
DATA_PATH = os.path.join(BASE_PATH, "data")
GUI_PATH = os.path.join(DATA_PATH, "gui.txt")

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"找不到 data 資料夾，請確認 {DATA_PATH} 是否存在")

class GUI:
    def __init__(self, backend='pyqt'):
        self.backend = backend.lower()
        self._input_callbacks = []

        if self.backend != 'pyqt':
            raise ValueError("目前只實作 PyQt6 版本")

        # -----------------------
        # 多層 input request 堆疊
        # -----------------------
        self._input_stack = []        # 儲存 input callback
        self._stack_counter = 0       # 未解決 request數量
        self._pending_output = []     # 尚未印出的訊息
        self._setting_request_active = False  # 避免按兩次 setting

        self.word_size = 24           # 預設文字大小
        self._button_layout_height = 50

        self._init_pyqt()
        self._override_io()

    # --------------------------
    # 初始化 PyQt GUI
    # --------------------------
    def _init_pyqt(self):
        self.app = QApplication.instance() or QApplication(sys.argv)
        self.window = QWidget()
        self.window.setWindowTitle("GUI System - PyQt")

        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(5, 5, 5, 5)
        main_layout.setSpacing(5)

        # Output space
        self.output_space = QTextEdit()
        self.output_space.setReadOnly(True)
        self.output_space.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.output_space.setStyleSheet(f"font-size: {self.word_size}px;")

        # Button layout
        button_layout = QHBoxLayout()
        button_layout.setContentsMargins(0, 0, 0, 0)
        button_layout.setSpacing(5)
        self.setting_button = QPushButton("⚙")
        self.setting_button.setFixedSize(50, 50)
        self.setting_button.clicked.connect(self._setting_clicked)
        button_layout.addWidget(self.setting_button)
        button_layout.addStretch()
        self.num_buttons = {}
        for num in ['1', '2', '3', '4', '0']:
            btn = QPushButton(num)
            btn.setFixedSize(50, 50)
            btn.clicked.connect(lambda checked, val=num: self._button_input(val))
            self.num_buttons[num] = btn
            button_layout.addWidget(btn)

        # Input + Submit layout
        input_h_layout = QHBoxLayout()
        self.input_space = QLineEdit()
        self.input_space.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.submit_button = QPushButton("Submit")
        self.submit_button.setFixedSize(80, 30)
        self.submit_button.clicked.connect(self._handle_submit)
        input_h_layout.addWidget(self.input_space)
        input_h_layout.addWidget(self.submit_button)
        input_h_layout.setAlignment(Qt.AlignmentFlag.AlignTop)

        # 將按鈕與輸入框垂直排列
        input_container_layout = QVBoxLayout()
        input_container_layout.addLayout(button_layout)
        input_container_layout.addLayout(input_h_layout)
        self.input_container = QWidget()
        self.input_container.setLayout(input_container_layout)

        # Splitter 包裹 output_space 與 input_container
        self.splitter = QSplitter(Qt.Orientation.Vertical)
        self.splitter.addWidget(self.output_space)
        self.splitter.addWidget(self.input_container)
        self.splitter.setStretchFactor(0, 5)
        self.splitter.setStretchFactor(1, 1)
        main_layout.addWidget(self.splitter, stretch=5)

        self.window.setLayout(main_layout)
        self._load_gui_geometry()
        self.window.show()

        # Submit 自動貼齊 "0" 按鈕底部 + 6
        def adjust_submit_position():
            zero_geom = self.num_buttons['0'].geometry()
            x = self.submit_button.x()
            y = zero_geom.y() + zero_geom.height() + 6
            self.submit_button.move(x, y)

        self._submit_timer = QTimer()
        self._submit_timer.timeout.connect(adjust_submit_position)
        self._submit_timer.start(100)

    # --------------------------
    # 複寫 input/print
    # --------------------------
    def _override_io(self):
        import builtins
        builtins._old_input = builtins.input
        builtins._old_print = builtins.print
        gui = self

        def gui_input(prompt=''):
            result_container = {'value': None, 'ready': False}
            gui._push_request(lambda val: result_container.update({'value': val, 'ready': True}), prompt)
            while not result_container['ready']:
                gui.app.processEvents()
            return result_container['value']

        def gui_print(*args, **kwargs):
            text = " ".join(str(a) for a in args)
            gui._append_output(text)

        builtins.input = gui_input
        builtins.print = gui_print

    # --------------------------
    # Push request 堆疊
    # --------------------------
    def _push_request(self, cb, prompt):
        if cb == "setting_skip" and self._setting_request_active:
            return
        self._input_stack.insert(0, cb)  # 頂層優先
        self._pending_output.insert(0, prompt)
        self._stack_counter += 1
        self._refresh_prompt(force=True)
        #self._append_output(f"[DEBUG] _stack_counter={self._stack_counter}") this row is for debug

    # --------------------------
    # Submit 處理
    # --------------------------
    def _handle_submit(self):
        val = self.input_space.text()
        self.input_space.clear()
        if val == "":
            return
        self._resolve_request(val)

    # --------------------------
    # Button 處理
    # --------------------------
    def _button_input(self, val):
        if val != "":
            self._resolve_request(val)

    # --------------------------
    # Resolve request
    # --------------------------
    def _resolve_request(self, val):
        if self._stack_counter == 0:
            return
        cb = self._input_stack.pop(0)
        self._pending_output.pop(0)
        self._stack_counter -= 1
        cb(val)
        #self._append_output(f"[DEBUG] _stack_counter={self._stack_counter}")  this row is for debug
        if self._stack_counter > 0:
            self._append_output(self._pending_output[0])

    # --------------------------
    # Refresh 顯示頂層 prompt
    # --------------------------
    def _refresh_prompt(self, force=False):
        if self._stack_counter > 0 and (force or self._pending_output):
            self._append_output(self._pending_output[0])

    # --------------------------
    # Setting 按鈕
    # --------------------------
    def _setting_clicked(self):
        if self._setting_request_active:
            return
        self._setting_request_active = True
        prompt1 = "請選擇功能 (1 or 2):\n1. save gui\n2. change word size"
        def setting_cb(val):
            if val == "1":
                self._save_gui_geometry()
                self._append_output(f"GUI 位置與大小已儲存到 {GUI_PATH}，word size={self.word_size}\n\n")
            elif val == "2":
                current_size = self.word_size
                prompt2 = f"請輸入 word size 現在是 {current_size} size"
                def size_cb(new_val):
                    try:
                        self.word_size = int(new_val)
                        self.output_space.setStyleSheet(f"font-size: {self.word_size}px;")
                        self._append_output(f"word size 已更改為 {self.word_size}\n\n")
                    except:
                        self._append_output("輸入錯誤，請輸入整數")
                self._push_request(size_cb, prompt2)
            self._setting_request_active = False
        self._push_request(setting_cb, prompt1)

    # --------------------------
    # Append output
    # --------------------------
    def _append_output(self, text):
        self.output_space.append(text)

    # --------------------------
    # 儲存 GUI 大小與位置
    # --------------------------
    def _save_gui_geometry(self):
        try:
            geo = self.window.geometry()
            # 記錄 splitter 的比例，而不是 output_space 的像素高度
            sizes = self.splitter.sizes()  # [output_h, input_h]
            output_ratio = sizes[0] / sum(sizes)
            with open(GUI_PATH, "w", encoding="utf-8") as f:
                f.write(f"{geo.x()},{geo.y()},{geo.width()},{geo.height()},{output_ratio},{self.word_size}")
        except Exception as e:
            self._append_output(f"儲存 GUI 位置失敗: {e}")


    # --------------------------
    # 讀取 GUI 大小與位置
    # --------------------------
    def _load_gui_geometry(self):
        if os.path.exists(GUI_PATH):
            try:
                with open(GUI_PATH, "r", encoding="utf-8") as f:
                    parts = f.read().split(",")
                    if len(parts) == 6:
                        x, y, w, h, output_ratio, word_size = parts
                        x, y, w, h = map(int, [x, y, w, h])
                        output_ratio = float(output_ratio)
                        self.word_size = int(word_size)
                    else:
                        x, y, w, h = map(int, parts)
                        output_ratio = 5/6
                    self.window.setGeometry(x, y, w, h)
                    total_height = self.splitter.height() or h
                    output_h = int(total_height * output_ratio)
                    self.splitter.setSizes([output_h, total_height - output_h])
                    self.output_space.setStyleSheet(f"font-size: {self.word_size}px;")
                    self._append_output("使用 gui.txt 初始化 GUI 大小與位置")
            except Exception:
                self._append_output("gui.txt 讀取失敗，使用預設大小")
        else:
            self._append_output("找不到 gui.txt，使用預設大小")
            self.window.setGeometry(100, 100, 800, 600)

    # --------------------------
    # Run GUI loop
    # --------------------------
    def run(self):
        self.app.exec()
