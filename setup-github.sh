#!/bin/bash

echo "=================================================="
echo "ScannerApp - GitHub 仓库连接设置"
echo "=================================================="

# 检查 Git 配置
echo "检查 Git 配置..."
if ! git config user.name > /dev/null 2>&1; then
    echo "设置 Git 用户配置..."
    read -p "请输入你的 GitHub 用户名: " GIT_USERNAME
    read -p "请输入你的邮箱地址: " GIT_EMAIL
    
    git config user.name "$GIT_USERNAME"
    git config user.email "$GIT_EMAIL"
    echo "✅ Git 用户配置完成"
fi

echo ""
echo "当前 Git 状态："
git status

echo ""
echo "当前远程仓库配置："
git remote -v

echo ""
echo "=================================================="
echo "请按以下步骤操作："
echo "=================================================="
echo ""
echo "1. 在 GitHub 创建新仓库："
echo "   访问: https://github.com/new"
echo "   仓库名称: ScannerApp"
echo "   描述: PDA扫码助手 - React Native扫码应用"
echo "   选择 Public (GitHub Actions 需要)"
echo "   点击 Create repository"
echo ""
echo "2. 创建完成后，请告诉我你的 GitHub 用户名"
echo ""
echo "3. 然后我会帮你设置远程仓库并推送代码"
echo ""
echo "=================================================="