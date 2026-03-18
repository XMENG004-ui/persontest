# 前端项目结构与状态机草案

## 1. 技术选型

| 层 | 方案 | 理由 |
| --- | --- | --- |
| 框架 | **Next.js 15 / React 18（App Router）** 或轻量 **Vite + React** | 需要 SEO 友好 + 方便部署；支持静态导出和动态 API。 |
| 样式 | Tailwind CSS + 自定义主题 token | 与现有 Stitch 代码一致，便于复用色板。 |
| 状态管理 | Zustand 或 React Context + Reducer | 题目进度/答案/结果数据较轻，不必引入重量级方案。 |
| 数据 | 静态 JSON（question-bank、copy、archetypes）+ 轻量 API Route（生成报告/记录结果） | 满足离线缓存与后续扩展。 |
| 表单/动画 | Headless UI + Framer Motion（可选） | 提升交互体验。 |

## 2. 目录结构建议

```
latent-dark-index/
├─ app/
│  ├─ layout.tsx
│  ├─ page.tsx                // Landing
│  ├─ test/
│  │  ├─ page.tsx             // Version picker + checklist
│  │  ├─ question/[version]/page.tsx
│  │  └─ result/[session]/page.tsx
│  ├─ api/
│  │  └─ result/route.ts      // 可选，生成结果或记录统计
├─ components/
│  ├─ layout/
│  ├─ hero/
│  ├─ question/
│  └─ result/
├─ data/                      // 已创建
├─ lib/
│  ├─ scoring.ts              // 评分逻辑
│  ├─ archetype.ts            // 原型匹配
│  └─ storage.ts              // localStorage helpers
├─ store/
│  └─ useTestStore.ts         // Zustand store
├─ styles/
│  └─ globals.css
└─ public/
   └─ share/ (示例长图、OG 图)
```

> 如采用 Vite，则 `src/` 结构一致，`pages/` 可改为 `routes/`。

## 3. 状态机（高层）

```
state Landing
  on START -> VersionSelect
state VersionSelect
  on SELECT(version) -> Checklist
state Checklist
  on ACCEPT -> QuestionFlow
state QuestionFlow
  context: { version, answers[], currentIndex }
  on ANSWER -> update answers + next question
  on PREV -> currentIndex - 1
  on COMPLETE -> Submit
state Submit (Loading)
  invoke scoring() -> Result
state Result
  context: { resultSnapshot }
  on RETAKE -> VersionSelect
  on SHARE -> ShareLayer
state ShareLayer
  on CLOSE -> Result
```

### Store 结构

```ts
interface TestState {
  sessionId: string;
  stage: 'landing' | 'version' | 'checklist' | 'question' | 'submit' | 'result';
  version: 'base' | 'deep' | null;
  currentIndex: number;
  answers: Record<string, number>;
  result: ResultPayload | null;
  consentAccepted: boolean;
  actions: {
    setStage(stage);
    selectVersion(version);
    acceptConsent();
    answerQuestion(questionId, value);
    goPrev();
    goNext();
    submit();
    setResult(payload);
    reset(keepSession?: boolean);
  };
}
```

- `sessionId` 创建于 landing，存入 `localStorage`，用于找回结果。  
- `answers` 结构 `{ "C01": 4, ... }`，版本切换时清空。  
- `result` 结构：`{ totalScore, grade, dimensions: [], archetype, highlights, cautions }`。

## 4. 数据加载与缓存

| 数据 | 加载方式 | 频率 | 备注 |
| --- | --- | --- | --- |
| 题库 (`base.json` / `deep.json`) | `fetch('/data/question-bank/{version}.json')` 或静态 import | 进入 VersionSelect 时预取 | 可使用 SWR/React Query 缓存。 |
| 文案 (`copy/*.json`) | 构建时静态 import | 全局共享 | 可按场景拆分对象。 |
| Summaries / Archetypes | 构建时静态 import | 结果页使用 | 传入 scoring 函数。 |
| 结果快照 | localStorage | 提交后写入、结果页读取 | key: `ldi-result-${sessionId}`。 |

## 5. 关键函数流程

1. **`answerQuestion`**：更新答案 -> 如果 `currentIndex + 1 === total` 则可显示“提交”。  
2. **`submit`**：
   - 校验题目是否作答完毕；
   - 调用 `scoreAnswers({ answers, version })`；
   - 得到 `dimensions[]`（含 level）→ `matchArchetype(dimensions)`；
   - 生成 `highlights/cautions`（根据高/低维度模板）；
   - 写入 `result` + `localStorage`；
   - 切换 stage = `result`。
3. **`scoreAnswers`**（见 Task 5 将详述）：把反向题处理后求均值 × 20。  
4. **`restoreSession`**：App 初始化时读取 localStorage，若有未完成的 `answers` 则提示“继续上次进度”。

## 6. 错误与异常处理

- **未勾选免责声明**：阻止进入题目，提示“请先同意使用条款”。  
- **刷新/关闭页面**：在 `beforeunload` 监听提示“答案已保存，可稍后继续”。  
- **网络加载失败**：题库 fetch 失败时提供重试按钮 + 客服入口。  
- **结果生成异常**：fallback 提示“结果生成失败，请稍后重试或联系店主”，并保留 `answers` 以便重新提交。

## 7. 开发里程碑

1. 初始化框架（Next/Vite）+ Tailwind + 主题 token。  
2. 接入 data JSON，完成 VersionSelect + Checklist + 状态机基础。  
3. 实现 QuestionFlow（含进度/状态存储/键盘操作）。  
4. 接入 scoring + Result UI。  
5. 打磨分享长图、复购 Banner、追踪埋点。  
6. 本地测试（移动/PC）→ 部署脚本。

---

以上为 Task #4 交付，如需改换技术栈或目录层级可再调整。