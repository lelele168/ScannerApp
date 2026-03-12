#!/bin/bash

echo "=================================================="
echo "ScannerApp - 推送到 GitHub"
echo "=================================================="

# 检查 git 是否已配置用户信息
if ! git config user.name > /dev/null 2>&1; then
    echo "配置 Git 用户信息..."
    git config user.name "ScannerApp Developer"
    git config user.email "developer@scannerapp.com"
fi

echo ""
echo "当前 Git 状态："
git status

echo ""
echo "远程仓库配置："
git remote -v

if [ -z "$(git remote get-url origin 2>/dev/null)" ]; then
    echo ""
    echo "❌ 未设置远程仓库"
    echo ""
    echo "请手动执行以下步骤："
    echo "1. 在 GitHub 创建新仓库：https://github.com/YOUR_USERNAME/ScannerApp"
    echo "2. 然后运行："
    echo "   git remote add origin https://github.com/YOUR_USERNAME/ScannerApp.git"
    echo "   git push -u origin main"
    echo ""
    exit 1
fi

echo ""
echo "准备推送到 GitHub..."
echo "远程仓库: $(git remote get-url origin)"
echo "分支: main"

# 推送代码
echo ""
echo "推送代码到 GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 推送成功！"
    echo ""
    echo "下一步："
    echo "1. 打开 GitHub 仓库页面"
    echo "2. 点击 'Actions' 标签"
    echo "3. 等待编译完成"
    echo "4. 在 'Artifacts' 下载 APK"
    echo ""
    echo "预计编译时间：5-10 分钟"
else
    echo ""
    echo "❌ 推送失败，请检查网络和权限设置"
    exit 1
fi