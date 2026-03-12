// Windows 版 Node.js TCP 接收器
// 安装依赖：npm install robotjs
// 运行：node wifi_receiver.js

const net = require('net');
const robot = require('robotjs');

const HOST = '0.0.0.0';
const PORT = 8888;

const server = net.createServer(socket => {
  console.log(`[连接] ${socket.remoteAddress}:${socket.remotePort}`);

  socket.on('data', data => {
    const text = data.toString('utf8').replace(/[\r\n]+$/, '');
    console.log(`[收到] ${text}`);
    // 模拟键盘输入到当前光标位置
    robot.typeString(text);
    // 可选：发送 Tab 键
    // robot.keyTap('tab');
  });

  socket.on('end', () => console.log('[断开]'));
  socket.on('error', err => console.error('[错误]', err.message));
});

server.listen(PORT, HOST, () => {
  console.log(`[监听] ${HOST}:${PORT} - 等待手机连接...`);
  console.log('提示：将手机和电脑连接同一WiFi，在App中填写本机IP地址');
});
