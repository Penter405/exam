# gui_system.py
import sys

class GUI:
    def __init__(self, backend='pyqt'):
        self.backend = backend.lower()
        self._input_callbacks = []

        if self.backend == 'pyqt':
            self._init_pyqt()
        elif self.backend == 'tkinter':
            self._init_tkinter()
        else:
            raise ValueError("Unsupported backend. Use 'pyqt' or 'tkinter'.")

        # 覆寫 input/print
        self._override_io()

    # --------------------------
    # PyQt6 系統
    # --------------------------
    def _init_pyqt(self):
        from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QTextEdit, QLineEdit

        self.app = QApplication.instance() or QApplication(sys.argv)
        self.window = QWidget()
        self.window.setWindowTitle("GUI System - PyQt")

        layout = QVBoxLayout()
        self.output_space = QTextEdit()
        self.output_space.setReadOnly(True)
        self.input_space = QLineEdit()
        self.summit_button = QPushButton("Submit")

        layout.addWidget(self.output_space)
        layout.addWidget(self.input_space)
        layout.addWidget(self.summit_button)
        self.window.setLayout(layout)

        self.summit_button.clicked.connect(self._handle_submit)

        self.window.show()

    # --------------------------
    # Tkinter 系統
    # --------------------------
    def _init_tkinter(self):
        import tkinter as tk

        self.root = tk.Tk()
        self.root.title("GUI System - Tkinter")

        self.output_space = tk.Text(self.root, height=20, width=50)
        self.output_space.configure(state='disabled')
        self.output_space.pack()

        self.input_space = tk.Entry(self.root, width=50)
        self.input_space.pack()

        self.summit_button = tk.Button(self.root, text="Submit", command=self._handle_submit)
        self.summit_button.pack()

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
            if gui.backend == 'pyqt':
                gui.summit_button.setStyleSheet("background-color: yellow")
            else:
                gui.summit_button.configure(bg="yellow")

            result_container = {'value': None, 'ready': False}
            gui._input_callbacks.append(lambda val: result_container.update({'value': val, 'ready': True}))

            # 等待輸入完成
            while not result_container['ready']:
                if gui.backend == 'pyqt':
                    gui.app.processEvents()
                else:
                    gui.root.update()
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
        value = self.input_space.text() if self.backend == 'pyqt' else self.input_space.get()
        self._append_output(f"User input: {value}")

        if self.backend == 'pyqt':
            self.input_space.clear()
            self.summit_button.setStyleSheet("")
        else:
            self.input_space.delete(0, 'end')
            self.summit_button.configure(bg="SystemButtonFace")

        # 執行 callback
        for cb in self._input_callbacks:
            cb(value)
        self._input_callbacks.clear()

    # --------------------------
    # 將文字輸出到 output_space
    # --------------------------
    def _append_output(self, text):
        if self.backend == 'pyqt':
            self.output_space.append(text)
        else:
            self.output_space.configure(state='normal')
            self.output_space.insert('end', text + "\n")
            self.output_space.configure(state='disabled')
            self.output_space.see('end')

    # --------------------------
    # 啟動事件循環
    # --------------------------
    def run(self):
        if self.backend == 'pyqt':
            sys.exit(self.app.exec())
        else:
            self.root.mainloop()
