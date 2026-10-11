import { ApiError } from "./api";

const BASE_URL = "http://localhost:8000";

async function fetchLm<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(body.detail || `Request failed (${res.status})`, res.status);
  }
  return res.json();
}

export interface WordProb {
  word: string;
  probability: number;
}

export interface PredictResponse {
  model: string;
  context_tokens: string[];
  predictions: WordProb[];
  vocab_size: number;
}

export interface CompareResponse {
  context_tokens: string[];
  bigram: WordProb[];
  trigram: WordProb[];
  agreement: boolean;
}

export interface CorpusStats {
  sentences: number;
  total_tokens: number;
  vocab_size: number;
  vocabulary: string[];
  sample_sentences: string[];
}

export const pharmacyLmApi = {
  corpus: () => fetchLm<CorpusStats>("/api/pharmacy-lm/corpus"),
  bigram: (context: string, top_k = 5) =>
    fetchLm<PredictResponse>("/api/pharmacy-lm/predict/bigram", {
      method: "POST",
      body: JSON.stringify({ context, top_k }),
    }),
  trigram: (context: string, top_k = 5) =>
    fetchLm<PredictResponse>("/api/pharmacy-lm/predict/trigram", {
      method: "POST",
      body: JSON.stringify({ context, top_k }),
    }),
  compare: (context: string, top_k = 5) =>
    fetchLm<CompareResponse>("/api/pharmacy-lm/predict/compare", {
      method: "POST",
      body: JSON.stringify({ context, top_k }),
    }),
};
