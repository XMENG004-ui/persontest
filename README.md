# Latent Dark Index H5

一套可部署到 Vercel 的 Vite + React 单页应用，包含：

- 题库 JSON（基础版 / 深度版）
- 文案与信息架构文档（`docs/`）
- 交互式前端（位于 `web/` 目录）

## 本地开发

```bash
cd web
npm install
npm run dev
```

## 构建与预览

```bash
cd web
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## 部署到 Vercel

仓库根目录已提供 `vercel.json`，指向 `web` 目录的静态构建：

1. 将仓库导入 Vercel 时，**不需要**改动默认项目设置。
2. 构建命令：`npm run build`（Vercel 会自动到 `web/` 执行）。
3. 输出目录：`web/dist`。

部署完成后即可得到线上链接。
