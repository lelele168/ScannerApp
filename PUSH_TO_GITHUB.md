# 推送到 GitHub 指南

## 第一步：创建 GitHub 仓库

1. 登录 GitHub (https://github.com)
2. 点击右上角的 "+" → "New repository"
3. 填写仓库名称：`ScannerApp`
4. 选择公开/私有（推荐公开，便于 Actions 运行）
5. 勾选 "Add a README file"
6. 点击 "Create repository"

## 第二步：设置远程仓库

在本地项目目录运行以下命令（替换 `YOUR_USERNAME` 为你的 GitHub 用户名）：

```bash
# 设置远程仓库
git remote add origin https://github.com/YOUR_USERNAME/ScannerApp.git

# 推送到 GitHub
git push -u origin main
```

## 第三步：验证编译

1. 推送完成后，打开 GitHub 仓库页面
2. 点击 "Actions" 标签
3. 查看 "Build Android APK" workflow 状态
4. 编译成功后，在 "Artifacts" 区域下载 APK

## 示例命令

```bash
# 如果你的 GitHub 用户名是 johnsmith
git remote add origin https://github.com/johnsmith/ScannerApp.git
git push -u origin main
```

## 注意事项

1. 确保选择 `main` 分支（而不是 `master`）
2. 如果 GitHub Actions 失败，查看错误日志并调整配置
3. 首次编译可能需要 5-10 分钟

## 备用配置

如果默认配置失败，可以尝试其他 build 配置：

```bash
# 使用简化版配置
mv .github/workflows/build-simple.yml .github/workflows/build.yml

# 或使用 React Native 专用配置
mv .github/workflows/build-rn.yml .github/workflows/build.yml
```