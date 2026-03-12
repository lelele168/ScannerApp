#!/bin/bash

echo "=================================================="
echo "ScannerApp - 完整 GitHub 上传流程"
echo "=================================================="

# 设置用户配置
echo "📝 设置 Git 用户配置..."
git config user.name "ScannerApp Developer"
git config user.email "2606910097@qq.com"

# 显示项目信息
echo ""
echo "📋 项目信息:"
echo "   应用名称: PDA扫码助手"
echo "   技术栈: React Native 0.72.11"
echo "   分支: main"
echo "   最后提交: $(git log --oneline -1)"

# 检查远程仓库
echo ""
echo "🔍 检查远程仓库配置..."
if [ -z "$(git remote get-url origin 2>/dev/null)" ]; then
    echo "❌ 未检测到远程仓库配置"
    echo ""
    echo "请在 GitHub 创建仓库后，运行以下命令:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/ScannerApp.git"
    echo "git push -u origin main"
    echo ""
    exit 1
fi

# 显示远程仓库信息
echo "✅ 远程仓库已配置:"
git remote -v

# 推送到 GitHub
echo ""
echo "🚀 开始推送到 GitHub..."
echo "目标仓库: $(git remote get-url origin)"
echo "分支: main"

# 推送代码
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 ✅ 推送成功！"
    echo ""
    echo "📱 接下来的步骤:"
    echo ""
    echo "1️⃣ 打开 GitHub 仓库页面"
    echo "2️⃣ 点击 'Actions' 标签"
    echo "3️⃣ 等待 'Build Android APK' 编译完成"
    echo "4️⃣ 在 'Artifacts' 区域下载 APK"
    echo ""
    echo "⏱️ 预计编译时间: 5-10 分钟"
    echo ""
    echo "🛠️ 如果编译失败，项目包含多种构建配置:"
    echo "   - build.yml (推荐)"
    echo "   - build-simple.yml (备用)"
    echo "   - build-rn.yml (React Native专用)"
    echo ""
    echo "📖 详细说明请查看 DEPLOYMENT.md"
    
else
    echo ""
    echo "❌ 推送失败，请检查:"
    echo "1. 网络连接"
    echo "2. GitHub 用户名和仓库权限"
    echo "3. 远程仓库配置是否正确"
    exit 1
fi