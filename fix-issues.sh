#!/bin/bash

echo "=================================================="
echo "ScannerApp - 问题修复脚本"
echo "=================================================="

# 修复本地配置文件
echo "修复 local.properties..."
cat > android/local.properties << 'EOF'
## This file is for LOCAL development only.
## It is listed in .gitignore and should NOT be committed to git.
## GitHub Actions CI uses the ANDROID_HOME environment variable set by
## the android-actions/setup-android action automatically.
##
## Uncomment and modify the line below for your local machine:
## sdk.dir=/path/to/your/android-sdk
##
## Common Android SDK paths:
## Windows: C:\Users\YourUser\AppData\Local\Android\Sdk
## macOS: ~/Library/Android/sdk
## Linux: ~/Android/Sdk or /usr/local/android-sdk
##
## For this environment, we'll use the common default path:
sdk.dir=/usr/local/android-sdk
EOF

# 修复 package.json 版本兼容性
echo "修复 package.json 版本兼容性..."
npm install react@18.2.0 react-native@0.72.11 --save

# 创建必要的目录结构
echo "创建目录结构..."
mkdir -p android/platform-tools

# 检查 Gradle wrapper
if [ ! -f "android/gradlew" ]; then
    echo "下载 Gradle wrapper..."
    # 从 React Native 项目复制 gradlew
    npx react-native init TempApp > /dev/null 2>&1
    if [ -f "TempApp/android/gradlew" ]; then
        cp TempApp/android/gradlew android/gradlew
        cp TempApp/android/gradlew.bat android/gradlew.bat
        rm -rf TempApp
    else
        echo "⚠ 无法自动下载 gradlew，请手动从其他 RN 项目复制"
    fi
fi

# 清理缓存
echo "清理缓存..."
npm cache clean --force
rm -rf node_modules/.cache

echo ""
echo "=================================================="
echo "修复完成！"
echo "=================================================="
echo ""
echo "下一步："
echo "1. 运行 './check-env.sh' 检查环境"
echo "2. 运行 'npm install' 安装依赖"
echo "3. 运行 'npm run android' 尝试编译"
echo ""
echo "如果仍有问题，请查看错误信息并报告。"