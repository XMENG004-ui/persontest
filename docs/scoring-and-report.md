# 评分逻辑与报告渲染流程

## 1. 计分公式

1. **Likert 映射**：`1=非常不同意` … `5=非常同意`。  
2. **反向题**：`score = 6 - rawScore`。  
3. **维度均值**：`dimensionScore = round(avg(dimensionAnswers) * 20)`，结果范围 20-100。  
4. **总指数**：六个维度得分取平均，四舍五入为整数。  
5. **等级标签**：
   - `0-39`: `low` → “阴影尚浅”  
   - `40-59`: `mid` → “自我保护型”  
   - `60-79`: `high` → “策略操盘者”  
   - `80-100`: `very_high` → “暗黑领主型”

## 2. 评分伪代码

```ts
import base from '@/data/question-bank/base.json';
import deep from '@/data/question-bank/deep.json';
import summaries from '@/data/dimension-copy/summaries.json';
import archetypes from '@/data/archetypes.json';

type Answers = Record<string, 1 | 2 | 3 | 4 | 5>;

type DimensionScore = {
  key: 'control' | 'emotional' | 'benefit' | 'defense' | 'possessive' | 'aggression';
  score: number;
  level: 'low' | 'medium' | 'high' | 'very_high';
  summary: string;
  tip: string;
};

type ResultPayload = {
  sessionId: string;
  version: 'base' | 'deep';
  totalScore: number;
  grade: 'low' | 'mid' | 'high' | 'very_high';
  dimensions: DimensionScore[];
  archetype: Archetype | null;
  highlights: string[];
  cautions: string[];
};

const LEVEL_MAP = [
  { max: 39, level: 'low' },
  { max: 59, level: 'medium' },
  { max: 79, level: 'high' },
  { max: 100, level: 'very_high' }
];

function scoreAnswers(version: 'base' | 'deep', answers: Answers): ResultPayload {
  const questionSet = version === 'base' ? base.questions : deep.questions;
  const dimensionBuckets = new Map();

  for (const q of questionSet) {
    const value = answers[q.id];
    if (!value) throw new Error(`Missing answer for ${q.id}`);
    const normalized = q.reverse ? 6 - value : value;
    if (!dimensionBuckets.has(q.dimension)) {
      dimensionBuckets.set(q.dimension, []);
    }
    dimensionBuckets.get(q.dimension).push(normalized);
  }

  const dimensions: DimensionScore[] = [];
  let total = 0;

  for (const [key, arr] of dimensionBuckets) {
    const avg = arr.reduce((sum, v) => sum + v, 0) / arr.length;
    const score = Math.round(avg * 20);
    total += score;
    const level = LEVEL_MAP.find(l => score <= l.max)?.level ?? 'very_high';
    const copy = summaries[key].ranges[level];
    dimensions.push({
      key,
      score,
      level,
      summary: copy.summary,
      tip: copy.tip
    });
  }

  const totalScore = Math.round(total / dimensions.length);
  const grade = totalScore <= 39 ? 'low' : totalScore <= 59 ? 'mid' : totalScore <= 79 ? 'high' : 'very_high';

  const archetype = matchArchetype(dimensions, archetypes);
  const { highlights, cautions } = buildNarratives(dimensions);

  return {
    sessionId: crypto.randomUUID(),
    version,
    totalScore,
    grade,
    dimensions,
    archetype,
    highlights,
    cautions
  };
}
```

### `matchArchetype`

```ts
function matchArchetype(dimensions, archetypeConfigs) {
  const ctx = Object.fromEntries(dimensions.map(d => [d.key, d.score]));
  for (const arc of archetypeConfigs) {
    if (evaluateCondition(arc.condition, ctx)) return arc;
  }
  return null;
}
```

`evaluateCondition` 可使用简单解析器（正则拆解 `control>=70`），或将条件写成函数。

### `buildNarratives`

```ts
function buildNarratives(dimensions) {
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const highlights = sorted.slice(0, 2).map(d => HIGHLIGHT_TEMPLATES[d.key][d.level]);
  const cautions = sorted.slice(-2).map(d => CAUTION_TEMPLATES[d.key][d.level]);
  return { highlights, cautions };
}
```

模板可写入 `data/dimension-copy/highlights.json`、`cautions.json`（后续任务中补齐）。

## 3. 报告渲染数据结构

```ts
interface ReportViewModel {
  meta: {
    score: number;
    gradeLabel: string;
    archetypeName?: string;
    archetypeTagline?: string;
  };
  radar: { label: string; value: number }[];
  dimensions: DimensionScore[];
  highlights: string[];
  cautions: string[];
  archetype?: {
    name: string;
    tagline: string;
    description: string;
    growth: string;
  };
}
```

- `gradeLabel` 由 `report-template.json` 的 `gradeLabels` 提供。  
- `radar` 直接从 `dimensions` 派生。  
- `archetype` 若不存在则显示“暂无主导策略，说明你在各维度较为平衡”。

## 4. 前端渲染流程

1. **Result Page loader**：从 `useTestStore` 读取 `result`；若无则尝试从 `localStorage` 恢复；仍无则重定向到 Landing。  
2. **Header**：显示分数、等级、原型名。  
3. **RadarChart**：读取 `result.dimensions`。  
4. **DimensionCard 列表**：映射 `dimensions` 渲染 summary + tip。  
5. **ArchetypeCard**：若 `result.archetype` 存在则展示；否则展示“平衡型”默认文案。  
6. **Highlights / Cautions**：展示 `result.highlights/cautions`。  
7. **ShareSheet**：构造长图（可用 html2canvas 或服务端截图）与复制文案（包含分数+原型+Tag）。

## 5. 示例输出（深度版）

```json
{
  "sessionId": "f6b6f4a0-5fd5-4a1a-9b59-67c44a6da99e",
  "version": "deep",
  "totalScore": 72,
  "grade": "high",
  "dimensions": [
    {"key":"control","score":82,"level":"high","summary":"你习惯用严密结构保障安全感。","tip":"练习分层授权，避免事事亲为。"},
    {"key":"emotional","score":76,"level":"high","summary":"你擅长读取并调度他人的情绪。","tip":"留出真诚窗口，防止信任被透支。"},
    {"key":"benefit","score":68,"level":"high","summary":"你以收益优先逻辑做决策。","tip":"偶尔允许自己出于情感行动。"},
    {"key":"defense","score":71,"level":"high","summary":"你能迅速抽离情绪保持理性。","tip":"在安全关系里放慢防御速度。"},
    {"key":"possessive","score":63,"level":"high","summary":"你需要明确的归属证明。","tip":"将隐性考题变成透明协商。"},
    {"key":"aggression","score":72,"level":"high","summary":"你会用强硬姿态守住界限。","tip":"把攻防逻辑写成清晰约定。"}
  ],
  "archetype": {
    "name": "高防御型控制者",
    "tagline": "以精密布局换取安全感",
    "description": "你擅长掌控关键变量，用规则来抵御风险。",
    "growth": "尝试在低风险情境交出部分控制。"
  },
  "highlights": [
    "混乱场景中的天然指挥官",
    "懂得用理性切割情绪干扰"
  ],
  "cautions": [
    "高压策略可能压缩信任空间",
    "频繁试探会耗损关系能量"
  ]
}
```

## 6. 报告验证 checklist

- ✅ 所有题目均有答案；  
- ✅ 维度题量一致（base=6，deep=16）；  
- ✅ 分数范围 20-100；  
- ✅ 反向题数量正确；  
- ✅ `archetype` 可为空；  
- ✅ 输出内包含免责声明文案。

---

本文件配合 `report-template.json` 使用，确保前端/后端在 scoring → 渲染阶段遵循一致协议。