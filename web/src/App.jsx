import { useMemo, useState } from "react";
import baseQuestions from "../../data/question-bank/base.json";
import deepQuestions from "../../data/question-bank/deep.json";
import summaries from "../../data/dimension-copy/summaries.json";
import archetypes from "../../data/archetypes.json";
import reportTemplate from "../../data/report-template.json";
import disclaimers from "../../data/disclaimers.json";

const STAGES = {
  LANDING: "landing",
  VERSION: "version",
  CHECKLIST: "checklist",
  QUESTION: "question",
  RESULT: "result",
};

const OPTION_LABELS = ["非常不同意", "比较不同意", "不确定", "比较同意", "非常同意"];

const LEVEL_ORDER = [
  { max: 39, level: "low" },
  { max: 59, level: "medium" },
  { max: 79, level: "high" },
  { max: 100, level: "very_high" },
];

const dimensionLabels = baseQuestions.dimensions;

const highlightCopy = {
  control: "掌控力",
  emotional: "情绪策略",
  benefit: "利益演算",
  defense: "冷感防御",
  possessive: "占有欲",
  aggression: "边界反击",
};

function evaluateCondition(condition, ctx) {
  if (!condition) return false;
  const clauses = condition.split("&&").map((c) => c.trim());
  return clauses.every((clause) => {
    const match = clause.match(/(\w+)\s*([<>]=?)\s*(\d+)/);
    if (!match) return false;
    const [, key, op, value] = match;
    const rhs = Number(value);
    const lhs = ctx[key] ?? 0;
    if (op === ">=") return lhs >= rhs;
    if (op === ">") return lhs > rhs;
    if (op === "<=") return lhs <= rhs;
    if (op === "<") return lhs < rhs;
    return false;
  });
}

function levelFromScore(score) {
  return LEVEL_ORDER.find((item) => score <= item.max)?.level ?? "very_high";
}

function buildResult(version, answers) {
  const dataset = version === "base" ? baseQuestions : deepQuestions;
  const buckets = {};

  dataset.questions.forEach((question) => {
    const raw = answers[question.id];
    if (!raw) {
      throw new Error(`题目 ${question.id} 尚未作答`);
    }
    const normalized = question.reverse ? 6 - raw : raw;
    if (!buckets[question.dimension]) {
      buckets[question.dimension] = [];
    }
    buckets[question.dimension].push(normalized);
  });

  const dimensions = Object.entries(buckets).map(([key, values]) => {
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const score = Math.round(avg * 20);
    const level = levelFromScore(score);
    const copy = summaries[key].ranges[level];
    return {
      key,
      name: dimensionLabels[key],
      score,
      level,
      summary: copy.summary,
      tip: copy.tip,
    };
  });

  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  );
  const grade = levelFromScore(totalScore)
    .replace("medium", "mid")
    .replace("very_high", "very_high");

  const ctx = Object.fromEntries(dimensions.map((d) => [d.key, d.score]));
  const archetype =
    archetypes.find((arc) => evaluateCondition(arc.condition, ctx)) ?? null;

  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const highlights = sorted.slice(0, 2).map((d) => {
    return `${highlightCopy[d.key]} · ${d.summary}`;
  });
  const cautions = sorted
    .slice(-2)
    .map((d) => `${dimensionLabels[d.key]} · ${d.tip}`);

  return {
    version,
    totalScore,
    grade,
    dimensions,
    archetype,
    highlights,
    cautions,
  };
}

function StageShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-background text-text">
      <div className="mx-auto w-full max-w-md px-5 pb-24">
        <header className="py-6">
          <p className="text-xs uppercase tracking-[0.4em] text-primary mb-2">
            LATENT DARK INDEX
          </p>
          <h1 className="font-headline text-3xl leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-text-muted text-sm mt-2 leading-relaxed">
              {subtitle}
            </p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState(STAGES.LANDING);
  const [version, setVersion] = useState(null);
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const questionSet = useMemo(() => {
    if (!version) return [];
    return version === "base"
      ? baseQuestions.questions
      : deepQuestions.questions;
  }, [version]);

  const progress = version
    ? Math.round(((currentIndex + 1) / questionSet.length) * 100)
    : 0;

  const handleSelectVersion = (target) => {
    setVersion(target);
    setAnswers({});
    setCurrentIndex(0);
    setConsent(false);
    setStage(STAGES.CHECKLIST);
    setError("");
  };

  const beginTest = () => {
    if (!consent) {
      setError("请先勾选免责声明");
      return;
    }
    setStage(STAGES.QUESTION);
    setError("");
  };

  const selectOption = (score) => {
    const question = questionSet[currentIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: score }));
    if (currentIndex < questionSet.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex === 0) return;
    setCurrentIndex((prev) => prev - 1);
  };

  const submitAnswers = () => {
    try {
      const payload = buildResult(version, answers);
      setResult(payload);
      setStage(STAGES.RESULT);
    } catch (err) {
      setError(err.message);
    }
  };

  const resetAll = () => {
    setStage(STAGES.VERSION);
    setAnswers({});
    setCurrentIndex(0);
    setResult(null);
  };

  if (stage === STAGES.LANDING) {
    return (
      <StageShell
        title={"测一测你的潜在黑暗人格指数"}
        subtitle={
          "3-12 分钟 · 匿名作答 · 生成可保存报告，仅供娱乐与自我探索参考。"
        }
      >
        <div className="bg-surface-high rounded-2xl border border-outline/40 p-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            Ready to start
          </p>
          <p className="text-sm text-text-muted">
            首先选择一个测试版本，系统会根据题目数量自动匹配体验。
          </p>
          <button
            className="w-full rounded-lg bg-primary text-black py-3 tracking-[0.2em]"
            onClick={() => setStage(STAGES.VERSION)}
          >
            选择版本
          </button>
        </div>
      </StageShell>
    );
  }

  if (stage === STAGES.VERSION) {
    return (
      <StageShell title="选择体验深度">
        <div className="space-y-4">
          <VersionCard
            name="基础版"
            desc="30-40 题 · 3-5 分钟"
            detail="快速了解六维指数 + 建议"
            price="¥1.99"
            onSelect={() => handleSelectVersion("base")}
          />
          <VersionCard
            name="深度版"
            desc="90-110 题 · 8-12 分钟"
            detail="包含原型匹配 + 亮点/风险"
            price="¥2.99"
            recommended
            onSelect={() => handleSelectVersion("deep")}
          />
          <p className="text-xs text-text-muted leading-relaxed">
            {disclaimers.purchase}
          </p>
        </div>
      </StageShell>
    );
  }

  if (stage === STAGES.CHECKLIST) {
    return (
      <StageShell title="开始前准备">
        <div className="space-y-4">
          <ChecklistItem text="保持 3-12 分钟安静环境" />
          <ChecklistItem text="请根据日常反应作答，无需迎合标准" />
          <ChecklistItem text="完成后可重复查看报告" />
          <label className="flex items-start gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />
            <span>{disclaimers.results}</span>
          </label>
          {error && <p className="text-primary text-sm">{error}</p>}
          <button
            className="w-full rounded-lg bg-primary text-black py-3 tracking-[0.2em]"
            onClick={beginTest}
          >
            开始答题
          </button>
          <button
            className="w-full rounded-lg border border-outline/40 py-3 text-sm text-text-muted"
            onClick={() => setStage(STAGES.VERSION)}
          >
            返回选择版本
          </button>
        </div>
      </StageShell>
    );
  }

  if (stage === STAGES.QUESTION) {
    const question = questionSet[currentIndex];
    return (
      <StageShell
        title={`第 ${currentIndex + 1} / ${questionSet.length} 题`}
        subtitle={`剩余约 ${Math.max(
          1,
          Math.round(((questionSet.length - currentIndex - 1) * 0.3 + (version === "deep" ? 0.5 : 0.3)) * 10) / 10
        )} 分钟`}
      >
        <div className="bg-surface-high rounded-2xl border border-outline/40 p-6 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4 text-xs uppercase tracking-[0.3em] text-text-muted">
              <span>{dimensionLabels[question.dimension]}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 rounded-full bg-outline/40">
              <div
                className="h-1 rounded-full bg-primary"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
          <p className="text-xl font-headline leading-snug">{question.text}</p>
          <div className="space-y-3">
            {OPTION_LABELS.map((label, index) => {
              const score = index + 1;
              const selected = answers[question.id] === score;
              return (
                <button
                  key={label}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-outline/40 hover:border-primary"
                  }`}
                  onClick={() => selectOption(score)}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-text-muted pt-4">
            <button onClick={goPrev} disabled={currentIndex === 0} className={`px-3 py-2 rounded ${currentIndex === 0 ? "opacity-30" : "hover:text-primary"}`}>
              上一题
            </button>
            {currentIndex === questionSet.length - 1 ? (
              <button
                className="px-4 py-2 rounded bg-primary text-black"
                onClick={submitAnswers}
                disabled={Object.keys(answers).length !== questionSet.length}
              >
                提交并生成报告
              </button>
            ) : (
              <span>自动跳到下一题</span>
            )}
          </div>
          {error && <p className="text-primary text-sm">{error}</p>}
        </div>
      </StageShell>
    );
  }

  if (stage === STAGES.RESULT && result) {
    return (
      <StageShell
        title={`你的指数：${result.totalScore}`}
        subtitle={"基于题库计算，仅供娱乐与自我探索参考。"}
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-outline/40 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-text-muted mb-2">
              总结
            </p>
            <h2 className="text-3xl font-headline mb-2">
              {reportTemplate.header.gradeLabels[result.grade] || ""}
            </h2>
            <p className="text-sm text-text-muted">
              版本：{result.version === "base" ? "基础版" : "深度版"}
            </p>
          </div>
          <div className="rounded-2xl border border-outline/40 p-5 space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-text-muted">
              六维指数
            </p>
            {result.dimensions.map((d) => (
              <div key={d.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">{d.name}</p>
                  <p className="text-xs text-text-muted/80">{d.summary}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-headline">{d.score}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-primary">
                    {d.level}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {result.archetype && (
            <div className="rounded-2xl border border-outline/40 p-5 space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-text-muted">
                人格原型
              </p>
              <h3 className="text-xl font-headline">
                {result.archetype.name}
              </h3>
              <p className="text-sm text-text-muted">
                {result.archetype.description}
              </p>
              <p className="text-sm text-primary">{result.archetype.growth}</p>
            </div>
          )}
          <div className="rounded-2xl border border-outline/40 p-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-text-muted">
              亮点 & 风险
            </p>
            <ul className="list-disc list-inside text-sm text-text-muted">
              {result.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <ul className="list-disc list-inside text-sm text-text-muted">
              {result.cautions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <button
            className="w-full rounded-lg bg-primary text-black py-3 tracking-[0.2em]"
            onClick={resetAll}
          >
            再测一次或选择其他版本
          </button>
          <p className="text-xs text-text-muted text-center">
            {disclaimers.results}
          </p>
        </div>
      </StageShell>
    );
  }

  return null;
}

function VersionCard({ name, desc, detail, price, recommended, onSelect }) {
  return (
    <button
      className={`w-full text-left rounded-2xl border p-5 space-y-3 transition ${
        recommended
          ? "border-primary bg-primary/5"
          : "border-outline/40 hover:border-primary"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xl font-headline">{name}</p>
          <p className="text-sm text-text-muted">{desc}</p>
        </div>
        <div className="text-right">
          {recommended && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              推荐
            </span>
          )}
          <p className="text-primary font-semibold mt-2">{price}</p>
        </div>
      </div>
      <p className="text-sm text-text-muted">{detail}</p>
    </button>
  );
}

function ChecklistItem({ text }) {
  return (
    <div className="rounded-xl border border-outline/40 px-4 py-3 text-sm text-text-muted">
      {text}
    </div>
  );
}
