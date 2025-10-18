# gui_system.py
import sys
from PyQt6.QtWidgets import (
    QApplication, QWidget, QTextEdit, QLineEdit, QPushButton,
    QHBoxLayout, QVBoxLayout, QSizePolicy, QSplitter
)
from PyQt6.QtCore import Qt

class GUI:
    def __init__(self, backend='pyqt'):
        self.backend = backend.lower()
        self._input_callbacks = []

        if self.backend != 'pyqt':
            raise ValueError("目前只實作 PyQt6 版本")

        self._init_pyqt()
        self._override_io()

    def _init_pyqt(self):
        self.app = QApplication.instance() or QApplication(sys.argv)
        self.window = QWidget()
        self.window.setWindowTitle("GUI System - PyQt")

        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(5, 5, 5, 5)
        main_layout.setSpacing(5)

        # 使用 QSplitter 垂直拆分 Output 與 Bottom Panel
        splitter = QSplitter(Qt.Orientation.Vertical)

        # --------------------------
        # Output Space
        # --------------------------
        self.output_space = QTextEdit()
        self.output_space.setReadOnly(True)
        self.output_space.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        splitter.addWidget(self.output_space)

        # --------------------------
        # Bottom Panel: Button + Input
        # --------------------------
        bottom_panel = QWidget()
        bottom_layout = QVBoxLayout()
        bottom_layout.setContentsMargins(0,0,0,0)
        bottom_layout.setSpacing(5)
        bottom_panel.setLayout(bottom_layout)

        # 5 固定按鈕，固定大小，靠右
        button_layout = QHBoxLayout()
        button_layout.addStretch()
        self.num_buttons = {}
        for num in ['1','2','3','4','0']:
            btn = QPushButton(num)
            btn.setFixedSize(50,50)
            btn.clicked.connect(lambda checked, val=num: self._button_input(val))
            self.num_buttons[num] = btn
            button_layout.addWidget(btn)
        bottom_layout.addLayout(button_layout)

        # Input Space + Submit（可伸縮高度，Submit 與 Input 上邊緣對齊）
        input_layout = QHBoxLayout()
        input_layout.setAlignment(Qt.AlignmentFlag.AlignTop)  # 對齊頂部
        self.input_space = QLineEdit()
        self.input_space.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.submit_button = QPushButton("Submit")
        self.submit_button.setFixedSize(80,30)  # 高度固定
        input_layout.addWidget(self.input_space)
        input_layout.addWidget(self.submit_button)
        bottom_layout.addLayout(input_layout)

        self.submit_button.clicked.connect(self._handle_submit)

        splitter.addWidget(bottom_panel)

        # 設定初始高度比例：Output 占大部分
        splitter.setSizes([500,150])

        main_layout.addWidget(splitter)
        self.window.setLayout(main_layout)
        self.window.show()

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
            for btn in gui.num_buttons.values():
                btn.setStyleSheet("background-color: lightblue")

            result_container = {'value': None, 'ready': False}
            gui._input_callbacks.append(lambda val: result_container.update({'value': val, 'ready': True}))

            while not result_container['ready']:
                gui.app.processEvents()

            for btn in gui.num_buttons.values():
                btn.setStyleSheet("")
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
    # 啟動事件循環
    # --------------------------
    def run(self):
        sys.exit(self.app.exec())
