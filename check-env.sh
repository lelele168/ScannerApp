#!/bin/bash

echo "=================================================="
echo "ScannerApp - 环境检查脚本"
echo "=================================================="

# 检查 Node.js
echo "检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js 版本: $NODE_VERSION"
else
    echo "✗ Node.js 未安装"
    echo "请安装 Node.js >= 18: https://nodejs.org"
    exit 1
fi

# 检查 npm
echo "检查 npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✓ npm 版本: $NPM_VERSION"
else
    echo "✗ npm 未安装"
    exit 1
fi

# 检查 JDK
echo "检查 JDK..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n1)
    echo "✓ Java 版本: $JAVA_VERSION"
else
    echo "✗ Java 未安装"
    echo "请安装 JDK 17: https://adoptium.net"
    exit 1
fi

# 检查 Android SDK
echo "检查 Android SDK..."
if [ -d "/usr/local/android-sdk" ]; then
    echo "✓ Android SDK 路径: /usr/local/android-sdk"
else
    echo "✗ Android SDK 未找到"
    echo "请安装 Android SDK 并配置路径"
    exit 1
fi

# 检查项目依赖
echo "检查项目依赖..."
if [ -d "node_modules" ]; then
    echo "✓ node_modules 已安装"
else
    echo "⚠ node_modules 未找到，正在安装依赖..."
    npm install
fi

echo ""
echo "=================================================="
echo "环境检查完成！"
echo "=================================================="

# 显示可用的脚本命令
echo ""
echo "可用命令："
echo "  npm install              - 安装依赖"
echo "  npm run android         - 运行 Android 应用"
echo "  npm start               - 启动 Metro 服务器"
echo "  npm run ios             - 运行 iOS 应用 (需要 macOS)"
echo ""
echo "如果编译失败，请检查："
echo "1. ANDROID_HOME 环境变量是否正确设置"
echo "2. Android SDK 是否已安装所有必要的组件"
echo "3. Java JDK 版本是否为 17"