# 📹 WebRTC 视频通话

基于 WebRTC 技术的浏览器视频通话应用，支持多人实时视频通话。

## ✨ 功能特性

- 🎬 **实时视频通话** - 基于 WebRTC 实现低延迟的音视频通话
- 🔐 **房间管理** - 创建房间生成唯一ID，支持多人加入（最多4人）
- 📷 **摄像头控制** - 支持开启/关闭摄像头
- 🎙️ **麦克风控制** - 支持静音/取消静音
- 📱 **响应式设计** - 支持桌面和移动设备
- 🌐 **跨浏览器兼容** - 支持 Chrome、Firefox、Safari 等现代浏览器

## 🛠 技术栈

| 分类 | 技术 | 版本 |
| --- | --- | --- |
| 后端 | Node.js | ^18.x |
| 框架 | Express | ^4.18.2 |
| WebSocket | ws | ^8.14.2 |
| 前端 | HTML5 | - |
| 样式 | CSS3 | - |
| 脚本 | JavaScript ES6+ | - |
| 实时通信 | WebRTC | - |

## 📁 项目结构

```
demo-webrtc/
├── package.json          # 项目依赖配置
├── server.js             # WebSocket信令服务器
├── public/
│   ├── index.html        # 客户端页面
│   ├── style.css         # 样式文件
│   └── app.js            # WebRTC客户端逻辑
├── README.md             # 项目说明文档
└── node_modules/         # 依赖目录（自动生成）
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

服务启动后访问：http://localhost:8080

### 开发模式

```bash
npm run dev
```

## 📖 使用说明

### 1. 创建房间

1. 打开浏览器访问 http://localhost:8080
2. 点击「创建房间」按钮
3. 系统会自动生成6位房间ID并显示在通话界面中

### 2. 加入房间

1. 在另一台设备或浏览器窗口打开 http://localhost:8080
2. 输入房间ID
3. 点击「加入房间」按钮

### 3. 开始通话

- 双方加入房间后，系统会自动建立视频连接
- 点击「关闭摄像头」可以关闭本地视频
- 点击「静音」可以关闭麦克风
- 点击「结束通话」可以断开连接并退出房间

## 🔧 配置说明

### 服务器配置

在 `server.js` 中可以修改以下配置：

```javascript
const PORT = process.env.PORT || 8080;  // 服务端口
```

### WebRTC 配置

客户端 `public/app.js` 中配置了 STUN 服务器用于 NAT 穿透：

```javascript
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};
```

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 | 视频通话 | 音频通话 |
| --- | --- | --- | --- |
| Chrome | >= 56 | ✅ | ✅ |
| Firefox | >= 44 | ✅ | ✅ |
| Safari | >= 11 | ✅ | ✅ |
| Edge | >= 79 | ✅ | ✅ |

## 📝 API 说明

### WebSocket 消息类型

| 类型 | 说明 |
| --- | --- |
| `create-room` | 创建房间 |
| `join-room` | 加入房间 |
| `signal` | WebRTC 信令消息 |
| `leave-room` | 离开房间 |

### 响应消息类型

| 类型 | 说明 |
| --- | --- |
| `room-created` | 房间创建成功 |
| `room-joined` | 加入房间成功 |
| `peer-joined` | 有新用户加入 |
| `peer-left` | 用户离开 |
| `signal` | 信令消息 |
| `error` | 错误信息 |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至开发者邮箱

---

⭐ 如果这个项目对你有帮助，请点亮 Star！