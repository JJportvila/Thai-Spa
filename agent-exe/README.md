# StretPOS Agent EXE

此目录用于生成商户电脑可独立运行的 `EXE` 代理程序。

## 功能

- 开机自动启动（可在本地 UI 点击设置）
- 本地 RTSP 抓帧代理（`127.0.0.1:9194`）
- 自动开启 Cloudflare tunnel（无 cloudflared 时回退 localtunnel）
- 自动 `register + heartbeat` 到平台 `/api/merchant-proxy`
- 本地配置网页（已从平台后台迁移为 EXE 内置 UI）  
  `http://127.0.0.1:9195`

## 依赖

- Windows
- Node.js LTS
- ffmpeg（加入 PATH）

## 构建 EXE

```powershell
cd E:\Github\Stret-POS\agent-exe
npm install
npm run build:win
```

生成文件：

`E:\Github\Stret-POS\agent-exe\dist\StretPOS-Agent.exe`

## 运行

1. 双击 `StretPOS-Agent.exe`
2. 打开 `http://127.0.0.1:9195`
3. 填写：
   - `AccountId`
   - `ApiBase`（例如 `https://essvu.com`）
   - `EnrollToken`（后台生成）
   - `RtspUrl`
4. 点击“保存并重启 Agent”
5. 点击“设置开机自启”
