# PDA 扫码助手 - React Native

## 功能特性
- 📷 摄像头实时扫码（支持二维码、条形码所有格式）
- 📋 批量扫码记录列表（按时间倒序）
- 🔍 搜索过滤扫码记录
- 📊 统计面板（总数/不重复数/码类型）
- 📋 单条复制扫码结果
- 🗑️ 单条删除 / 一键清空
- 📤 导出全部记录（系统分享）
- 🔦 手电筒控制
- 防重复扫码（1.5秒冷却 + 震动反馈）

## 技术栈
- React Native 0.73
- react-native-vision-camera（相机 + 帧处理器）
- vision-camera-code-scanner（条码识别）
- @react-navigation/stack（页面导航）
- @react-native-clipboard/clipboard（剪贴板）
- react-native-reanimated（动画/worklet）

## 快速开始

### 环境要求
- Node.js >= 18
- JDK 17
- Android Studio + Android SDK
- React Native CLI

### 安装依赖
```bash
cd ScannerApp
npm install
```

### Android 额外配置

1. **相机权限**（已在 AndroidManifest.xml 中预置）

2. **Reanimated 插件**（已在 babel.config.js 中配置）

3. 运行项目：
```bash
npm run android
```

### iOS 额外配置
在 `ios/ScannerApp/Info.plist` 中添加：
```xml
<key>NSCameraUsageDescription</key>
<string>需要使用摄像头进行扫码</string>
```
然后：
```bash
cd ios && pod install
npm run ios
```

## 项目结构
```
src/
├── App.tsx                  # 根组件 + 导航
├── context/
│   └── ScanContext.tsx      # 全局扫码记录状态
├── screens/
│   ├── HomeScreen.tsx       # 首页（记录列表）
│   └── ScannerScreen.tsx    # 扫码页面
└── types/
    └── index.ts             # 类型定义
```
