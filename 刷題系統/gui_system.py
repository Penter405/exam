import sys
import os
from PyQt6.QtWidgets import QApplication, QWidget, QTextEdit, QLineEdit, QPushButton, QHBoxLayout, QVBoxLayout, QSizePolicy, QSplitter
from PyQt6.QtCore import Qt, QTimer

# 基本路徑：上層資料夾的同層 data
tosplit = os.path.sep
BASE_PATH = os.path.abspath(__file__)
DATA_PATH = BASE_PATH.split(tosplit)
DATA_PATH.pop(-1)
DATA_PATH.append("data")
DATA_PATH = tosplit.join(DATA_PATH)
GUI_PATH = DATA_PATH.split(tosplit)
GUI_PATH.append("gui.txt")
GUI_PATH = tosplit.join(GUI_PATH)

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(f"找不到 data 資料夾，請確認 {DATA_PATH} 是否存在")


class GUI:
    def __init__(self, backend='pyqt'):
        self.backend = backend.lower()
        self._input_callbacks = []

        if self.backend != 'pyqt':
            raise ValueError("目前只實作 PyQt6 版本")

        # 固定按鈕高度
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

        # Button layout (5 buttons + setting button)
        button_layout = QHBoxLayout()
        button_layout.setContentsMargins(0, 0, 0, 0)
        button_layout.setSpacing(5)
        self.setting_button = QPushButton("⚙")
        self.setting_button.setFixedSize(50, 50)
        self.setting_button.clicked.connect(self._save_gui_geometry)
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
        input_h_layout.setAlignment(Qt.AlignmentFlag.AlignTop)  # <- 垂直靠上

        # 將按鈕與輸入框垂直排列
        input_container_layout = QVBoxLayout()
        input_container_layout.addLayout(button_layout)    # 按鈕在上
        input_container_layout.addLayout(input_h_layout)   # input + submit 在下

        self.input_container = QWidget()
        self.input_container.setLayout(input_container_layout)

        # QSplitter 包裹 output_space 與 input_container
        self.splitter = QSplitter(Qt.Orientation.Vertical)
        self.splitter.addWidget(self.output_space)
        self.splitter.addWidget(self.input_container)
        self.splitter.setStretchFactor(0, 5)
        self.splitter.setStretchFactor(1, 1)
        main_layout.addWidget(self.splitter, stretch=5)

        self.window.setLayout(main_layout)
        self._load_gui_geometry()
        self.window.show()

        # --------------------------
        # Submit 自動貼齊 "0" 按鈕底部 + 6
        # --------------------------
        def adjust_submit_position():
            zero_geom = self.num_buttons['0'].geometry()
            x = self.submit_button.x()  # 水平位置不變
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
            gui._append_output(prompt)
            result_container = {'value': None, 'ready': False}
            gui._input_callbacks.append(lambda val: result_container.update({'value': val, 'ready': True}))
            while not result_container['ready']:
                gui.app.processEvents()
            return result_container['value']

        def gui_print(*args, **kwargs):
            text = " ".join(str(a) for a in args)
            gui._append_output(text)

        builtins.input = gui_input
        builtins.print = gui_print

    # --------------------------
    # Submit 按鈕處理
    # --------------------------
    def _handle_submit(self):
        value = self.input_space.text()
        if value != "":
            self._append_output(f"User input: {value}")
            self.input_space.clear()
            for cb in self._input_callbacks:
                cb(value)
            self._input_callbacks.clear()

    # --------------------------
    # 數字按鈕處理
    # --------------------------
    def _button_input(self, val):
        self._append_output(f"User input: {val}")
        for cb in self._input_callbacks:
            cb(val)
        self._input_callbacks.clear()

    # --------------------------
    # 將文字輸出到 output_space
    # --------------------------
    def _append_output(self, text):
        self.output_space.append(text)

    # --------------------------
    # 儲存 GUI 大小與位置
    # --------------------------
    def _save_gui_geometry(self):
        try:
            geo = self.window.geometry()
            with open(GUI_PATH, "w", encoding="utf-8") as f:
                f.write(f"{geo.x()},{geo.y()},{geo.width()},{geo.height()}")
            self._append_output("GUI 位置與大小已儲存到 data/gui.txt")
        except Exception as e:
            self._append_output(f"儲存 GUI 位置失敗: {e}")

    # --------------------------
    # 讀取 GUI 大小與位置
    # --------------------------
    def _load_gui_geometry(self):
        if os.path.exists(GUI_PATH):
            try:
                with open(GUI_PATH, "r", encoding="utf-8") as f:
                    x, y, w, h = map(int, f.read().split(","))
                    self.window.setGeometry(x, y, w, h)
                    self._append_output("使用 gui.txt 初始化 GUI 大小與位置")
            except Exception:
                self._append_output("gui.txt 讀取失敗，使用預設大小")
        else:
            self._append_output("找不到 gui.txt，使用預設大小")
            self.window.setGeometry(100, 100, 800, 600)

    # --------------------------
    # 啟動事件循環
    # --------------------------
    def run(self):
        self.app.exec()
