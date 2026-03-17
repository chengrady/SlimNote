# 手动安装 Electron 教程

## 步骤 1：下载 Electron

下载链接：
https://github.com/electron/electron/releases/download/v28.3.3/electron-v28.3.3-win32-x64.zip

## 步骤 2：解压文件

1. 将下载的 zip 文件解压
2. 解压后你会看到以下文件：
   - electron.exe
   - chrome_100_percent.pak
   - chrome_200_percent.pak
   - d3dcompiler_47.dll
   - ffmpeg.dll
   - 等等...

## 步骤 3：复制到项目目录

将解压后的**所有文件**复制到：
```
d:\00 Code\SlimNote\node_modules\electron\dist\
```

## 步骤 4：验证安装

运行以下命令验证：
```bash
cd "d:\00 Code\SlimNote"
d:\nodejs18\npm.cmd exec electron -- --version
```

应该输出：v28.3.3

## 步骤 5：启动开发服务器

```bash
d:\nodejs18\npm.cmd run dev
```
