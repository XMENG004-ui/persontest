# 部署与复用方案

## 1. 云端部署思路

| 环节 | 推荐方案 | 说明 |
| --- | --- | --- |
| 静态托管 | **Vercel / Cloudflare Pages** | 支持自定义域、SSL、全局 CDN，且可直接连接 Git 仓库自动部署。 |
| API/打分 | **Vercel Edge Function / Cloudflare Workers** (可选) | 如需服务器端记录订单或生成签名，可添加轻量 API；若纯前端计算则无需。 |
| 备用 | **Netlify** 或 **Render Static** | 作为中国大陆访问备份，可在需要时一键导出静态包。 |

### 部署流程

1. 将 `latent-dark-index` 初始化为 Git 仓库（建议托管在 GitHub/自建 Git）。  
2. 在 Vercel 创建项目 -> 连接仓库 -> 选择构建命令（Next：`pnpm install && pnpm build`；Vite：`pnpm build`） -> 输出目录（Next: `.next`, Vite: `dist`）。  
3. 配置环境变量（如客服联系方式、店铺链接等）。  
4. 触发首次部署；完成后绑定自定义域名（如 `dark.brandonlab.cn`）。  
5. 通过 Vercel Analytics 或自定义埋点监控 PV / 转化。  
6. 若需大版本前端预览，可使用 Preview Deployment 链接分享。

## 2. 环境变量与配置

| 变量 | 示例值 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_STORE_URL` | `https://www.xiaohongshu.com/store/...` | 结果页“回店铺”链接。 |
| `NEXT_PUBLIC_SUPPORT_HANDLE` | `@Brandon暗人格` | 客服入口展示。 |
| `NEXT_PUBLIC_SHARE_HASHTAG` | `#潜在黑暗人格测试#` | 分享文案默认标签。 |
| `NEXT_PUBLIC_RELEASE_TAG` | `v1.0.0` | 结果页脚显示版本号。 |
| （可选）`RESULT_WEBHOOK_URL` | `https://hooks.example.com/ldi` | 若要记录作答结果，用于后端存储。 |

> 所有 “NEXT_PUBLIC_” 前缀会被注入客户端，敏感信息不要以该方式存储。

## 3. 复用（新测试）策略

1. **数据层抽象**：所有题目/文案/原型都放在 `/data` 与 `/copy` 下；要做新测试只需新增：
   - `data/question-bank/<newtest>-base.json`
   - `data/question-bank/<newtest>-deep.json`
   - `data/<newtest>-archetypes.json`
   - `copy/<newtest>.json`
2. **主题配置**：在 `tailwind.config.js` 中为每个测试定义一个主题对象，前端根据 URL 参数或配置选择主题配色（如 `?theme=dark-index`）。
3. **路由扩展**：`/test/[slug]/` 路由读取 `slug`，动态加载对应数据文件；默认 slug=`dark-index`。  
4. **商品映射**：在小红书商品后台为每个测试配置“说明”内含 slug，例如“链接：xxxx?test=love-possessive”。  
5. **部署**：同一仓库、多测试共用部署，只需在配置 JSON 中添加新条目即可上线，无需重新搭建项目。  
6. **版本控制**：通过 `config/tests.json` 维护测试列表：

```json
{
  "dark-index": {
    "name": "潜在黑暗人格",
    "base": "/data/question-bank/base.json",
    "deep": "/data/question-bank/deep.json",
    "copy": "/copy/dark-index.json",
    "theme": "dark"
  },
  "love-possessive": {
    "name": "爱情占有欲",
    "base": "/data/question-bank/love-base.json",
    "deep": "/data/question-bank/love-deep.json",
    "copy": "/copy/love.json",
    "theme": "rose"
  }
}
```

前端在加载时根据 `slug` 获取配置，完成题库/文案切换。

## 4. 本地测试策略

- `pnpm dev` 启动本地环境后，使用 **Chrome DevTools → Lighthouse** 测试移动端性能；确保 LCP < 2.5s。  
- 使用 `pnpm test`（如加入 Vitest/Playwright）跑单元/端到端测试：
  - scoring 函数单测（反向题、缺失题目、不同版本）。  
  - question flow e2e（选择版本→答题→提交→查看结果）。
- 在 iOS Safari / Android 微信内置浏览器做兼容性检查，确保长按保存报告正常。

## 5. 版本发布流程

1. `main` 分支保持线上版本；`dev` 分支开发。  
2. 新特性合并前在 Vercel Preview 验证。  
3. 发布前更新 `CHANGELOG.md`（列出题库/文案/视觉变更）。  
4. 打 tag（如 `git tag v1.0.0`），推送后 Vercel 自动部署。  
5. 通知店主更新小红书商品中的截图/文案，并附上最新链接。

## 6. 回滚方案

- Vercel 支持一键回滚到任意历史部署。  
- 同时保留上一版本静态包（`pnpm build && pnpm export`），以备迁移到其他 CDN。  
- 若评分逻辑更新导致争议，可在 `config/tests.json` 增加 `version` 字段，把旧版逻辑保留一段时间。

---

以上文件作为 Task #6 交付，后续进入实作时可直接照此流程操作。