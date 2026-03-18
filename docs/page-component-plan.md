# 页面收敛与组件规划

## 1. 页面保留 / 合并 / 移除建议

| 页面/模块 | 处理方式 | 理由与调整 | 产出重点 |
| --- | --- | --- | --- |
| **封面页（Landing）** | 保留，精简 | 视觉氛围已符合“高质感 + 神秘”，保留主视觉 + CTA，去掉无用菜单按钮、底部导航；增加“耗时/匿名”卖点条。 | 首屏 CTA、三条卖点、客服入口、免责声明角标。 |
| **版本选择** | 保留，嵌入同一页面 | 现有卡片结构好，需改成卡片 + 开始按钮，不需要单独顶部导航；在卡片中加入价格、适用人群的小标签。 | 版本卡片组件（radio），提示文案、免责声明勾选入口。 |
| **设计系统预览页** | 归并入组件库文档 | 当前像 style guide，不面向终端用户，可提取 token/组件，用于设计说明，不在线上暴露。 | 迁移到 internal docs。 |
| **答题页** | 保留，语义化组件 | 单题布局合理，需加入步骤指示、剩余题数、保存提示；Likert 选项改用真实 button 状态 + 防抖逻辑。 | QuestionCard、LikertOption、ProgressBar、NavControls。 |
| **结果报告页（两个版本）** | 合并成单页 | 选取信息最饱满的一版作为主报告页；保留雷达图、指数卡片、维度卡、CTA；删除底栏导航。 | ResultHeader、RadarChart、DimensionCard、ArchetypeCard、HighlightList。
| **底部导航（Dashboard/Archive/Insights）** | 移除 | 本产品是单任务流程，底栏会造成“App”错觉，且容易分散注意力。 | 改成结果页内 CTA + 返回店铺链接。 |
| **Top App Bar 菜单** | 改为品牌 + 客服入口 | 多余的汉堡菜单无实际路由；改为 Logo + 客服/帮助按钮或直接隐藏。 | HeaderBar 组件。 |
| **背景装饰（渐变/玻璃态）** | 保留、参数化 | 作为主题风格存在，但需抽象成 Tailwind token，避免每页重复写样式。 | theme tokens + utility classes。 |
| **分享按钮/再测 CTA** | 保留并统一 | 结果页 CTA 可换成主按钮 + 次级按钮，文案贴近“保存报告”“查看更多测试”。 | CTAGroup 组件。 |

## 2. 组件库清单

| 组件 | 用途 | 关键属性 |
| --- | --- | --- |
| **HeaderBar** | 顶部品牌与状态提示（如题号、客服） | props: variant (landing/question/result), showBack, statusText |
| **HeroCard** | 首屏内容块 | props: title, subtitle, disclaimerTag, featureList, cta |
| **VersionCard** | 版本选择卡片 | props: name, questionCount, duration, priceTag, recommended, description |
| **CheckboxSheet** | 免责声明 / 注意事项列表 | props: checklistItems, confirmText |
| **ProgressBar** | 题目进度 | props: current, total |
| **QuestionCard** | 单题容器 | props: phaseTag, questionText, questionIndex |
| **LikertOptionGroup** | 5 级 Likert | props: options[], value, onSelect, reverse? (供可视化) |
| **NavControls** | 上一步/下一步按钮组 | props: canPrev, canNext, submitState |
| **ResultHeader** | 总分展示 | props: score, gradeLabel, archetype, intro |
| **RadarChart** | 六维可视化 | props: data[] |
| **DimensionCard** | 每维文案 | props: name, score, level, summary, tip |
| **ArchetypeCard** | 原型描述 | props: name, conditionText, description, growth |
| **HighlightList / RiskList** | 列表模块 | props: items[] |
| **ShareSheet** | 分享/保存弹层 | props: imageUrl, copyText, qrCode |
| **UpsellBanner** | 其他测试 / 回店铺 | props: title, description, cta |

所有组件共享主题 token（颜色、半径、字体、阴影），通过 Tailwind config 或 CSS 变量维护，方便以后换主题。

## 3. 文案层面需调整的组件

| 模块 | 当前问题 | 调整方向 |
| --- | --- | --- |
| Disclaimer Tag | 目前文案更偏概念艺术 | 改成“娱乐体验 / 不构成诊断 / 付费用户专享”等清晰措辞。 |
| 版本卡 CTA | 过于笼统（Choose & start） | 改为“¥1.99 立即测试”/“¥2.99 深度测”，强调价值。 |
| 问题提示 | 没有作答指南 | 在进度 bar 下增加“请选择最符合你常态的选项，不需要完美答案”。 |
| 提交按钮 | 仅“Next” | 深度版最后一题改为“提交并生成报告（约 3 秒）”。 |
| 结果页副标题 | 偏抽象 | 加入“根据 96 道题生成 · Latent Dark Index v1.0”之类的可信描述。 |

## 4. 资源复用策略

- **Layout Shell**：Landing / Question / Result 共用一个 `AppShell`，根据 `stage` 切换背景与 CTA 区域。  
- **Data-driven Props**：题库、文案、原型均来自 `/data` JSON，可通过 `fetch('/data/question-bank/base.json')` 或打包进前端。  
- **Tailwind 主题**：抽离颜色 `primary`, `tertiary`, `surface` 等，减少内联 style。  
- **Icon 与纹理**：Material Symbols 继续使用，但在打包时挑选需要的 icon，避免重复引入。  
- **动画/反馈**：按钮统一使用 `active:scale-95`、`pulse-glow` 边框效果，形成一致的“高级质感”。

---

以上为 Task #2 交付内容，后续文案清单将在任务 3 中细化。