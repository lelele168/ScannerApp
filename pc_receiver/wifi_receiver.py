/**
 * WiFi 传输说明（电脑端配置）
 *
 * 手机通过 TCP Socket 向电脑发送数据，电脑需运行一个简单的 TCP 监听服务，
 * 接收到数据后模拟键盘输入（写入当前光标位置）。
 *
 * ─── Python 版（推荐，跨平台）────────────────────────────────────────────────
 *
 * 安装依赖：pip install pyautogui
 *
 * 运行：python wifi_receiver.py
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import socket
import pyautogui
import threading

HOST = '0.0.0.0'
PORT = 8888          # 与 App 设置中的端口一致

def handle_client(conn, addr):
    print(f"[连接] {addr}")
    with conn:
        while True:
            data = conn.recv(1024)
            if not data:
                break
            text = data.decode('utf-8').rstrip('\n').rstrip('\r')
            print(f"[收到] {text}")
            pyautogui.typewrite(text, interval=0.02)
            # 如果需要 Enter 键：pyautogui.press('enter')

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((HOST, PORT))
    s.listen()
    print(f"[监听] {HOST}:{PORT} - 等待手机连接...")
    while True:
        conn, addr = s.accept()
        threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()
