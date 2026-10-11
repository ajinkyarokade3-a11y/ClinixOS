import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Play, Scale } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { Input } from "../components/ui/Input";
import { ApiError } from "../services/api";
import { pharmacyLmApi, type CompareResponse, type CorpusStats, type PredictResponse } from "../services/pharmacyLmApi";

type Mode = "bigram" | "trigram" | "compare";

const SAMPLES = ["take twice", "five hundred", "take", "dispense thirty", "refill after"];

export function PharmacyLM() {
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [context, setContext] = useState("take twice");
  const [mode, setMode] = useState<Mode>("compare");
  const [single, setSingle] = useState<PredictResponse | null>(null);
  const [compared, setCompared] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corpusSearch, setCorpusSearch] = useState("");

  useEffect(() => {
    pharmacyLmApi
      .corpus()
      .then((s) => setStats(s))
      .catch(() => setError("Failed to connect to backend. Is the FastAPI server running on port 8000?"))
      .finally(() => setLoading(false));
  }, []);

  const run = async (ctx?: string) => {
    const text = (ctx ?? context).trim();
    if (!text) return;
    setRunning(true);
    setError(null);
    try {
      if (mode === "compare") {
        const r = await pharmacyLmApi.compare(text);
        setCompared(r);
        setSingle(null);
      } else {
        const r = mode === "bigram" ? await pharmacyLmApi.bigram(text) : await pharmacyLmApi.trigram(text);
        setSingle(r);
        setCompared(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Prediction failed.");
    } finally {
      setRunning(false);
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );

  const chartData = (single?.predictions ?? []).map((p) => ({ word: p.word, prob: Math.round(p.probability * 10000) / 100 }));
  const vocabShown = (stats?.vocabulary ?? []).filter((w) => w.includes(corpusSearch.toLowerCase())).slice(0, 60);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pharmacy Language Models"
        subtitle="µLM bigram and SLM trigram next-word prediction for dispensary text — runs locally, no cloud data."
        actions={<Badge variant="info">Bigram + trigram models</Badge>}
      />

      {stats && (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Card className="p-4"><p className="text-xs text-slate-500">Corpus Sentences</p><p className="mt-1 text-2xl font-bold text-slate-800">{stats.sentences}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Total Tokens</p><p className="mt-1 text-2xl font-bold text-slate-800">{stats.total_tokens}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Vocabulary</p><p className="mt-1 text-2xl font-bold text-slate-800">{stats.vocab_size}</p></Card>
          <Card className="p-4"><p className="text-xs text-slate-500">Models</p><p className="mt-1 text-sm font-bold text-slate-800">µLM bigram · SLM trigram</p></Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Predict Next Word" subtitle="Type a pharmaceutical context" />
          <CardBody>
            <div className="space-y-4">
              <Input label="Context" value={context} onChange={(e) => setContext(e.target.value)} placeholder="take twice" />
              <div className="flex gap-2">
                {(["bigram", "trigram", "compare"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium ${mode === m ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"}`}
                  >
                    {m === "bigram" ? "µLM" : m === "trigram" ? "SLM" : "Compare"}
                  </button>
                ))}
              </div>
              <Button onClick={() => run()} disabled={running} className="w-full" icon={<Play size={16} />}>
                {running ? "Predicting..." : "Predict"}
              </Button>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">Try samples</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLES.map((s) => (
                    <button key={s} onClick={() => { setContext(s); run(s); }} className="rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-xs text-slate-600 hover:border-teal-400">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title={mode === "compare" ? "Model Comparison" : single ? `Prediction — ${single.model}` : "Prediction"}
            subtitle={compared ? `Context: ${compared.context_tokens.join(" ")} · top-1 agreement: ${compared.agreement ? "yes" : "no"}` : single ? `Context: ${single.context_tokens.join(" ")}` : "Run a prediction to see probabilities"}
          />
          <CardBody>
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}
            {!single && !compared && !error && <p className="py-10 text-center text-sm text-slate-400">Enter a context and run a prediction.</p>}
            {single && (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="word" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="prob" name="P %" radius={[0, 4, 4, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={i === 0 ? "#0d9488" : "#99c9c2"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <table className="mt-3 w-full">
                  <thead><tr className="border-b border-surface-border"><th className="table-header">Rank</th><th className="table-header">Word</th><th className="table-header">P(next | context)</th></tr></thead>
                  <tbody>
                    {single.predictions.map((p, i) => (
                      <tr key={p.word} className="border-b border-surface-border/50">
                        <td className="table-cell text-slate-400">{i + 1}</td>
                        <td className="table-cell font-mono font-medium">{p.word}</td>
                        <td className="table-cell font-mono">{(p.probability * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {compared && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { title: "µLM bigram — P(w|1 term)", data: compared.bigram },
                  { title: "SLM trigram — P(w|2 terms)", data: compared.trigram },
                ].map((panel) => (
                  <div key={panel.title} className="rounded-lg border border-surface-border p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600"><Scale size={12} />{panel.title}</p>
                    {panel.data.map((p, i) => (
                      <div key={p.word} className="flex items-center gap-2 py-1">
                        <span className="w-24 truncate font-mono text-xs font-medium text-slate-700">{i + 1}. {p.word}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, p.probability * 100 * 3)}%` }} />
                        </div>
                        <span className="w-16 text-right font-mono text-[11px] text-slate-500">{(p.probability * 100).toFixed(2)}%</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Corpus & Vocabulary"
          subtitle="Domain text the models were built from"
          action={
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BookOpen size={14} />
              <input type="text" placeholder="Filter vocabulary..." value={corpusSearch} onChange={(e) => setCorpusSearch(e.target.value)} className="input-field w-44" />
            </div>
          }
        />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {vocabShown.map((w) => (
              <button key={w} onClick={() => { setContext(w); run(w); }} title={`Predict after "${w}"`} className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 hover:bg-teal-100 hover:text-teal-700">
                {w}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
