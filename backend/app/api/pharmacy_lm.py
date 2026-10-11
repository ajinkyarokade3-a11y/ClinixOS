from fastapi import APIRouter, HTTPException
from app.schemas.pharmacy_lm import (
    CompareResponse, CorpusStats, PredictRequest, PredictResponse, WordProb,
)
from app.services.pharmacy_corpus import corpus_stats, tokenize
from app.services.pharmacy_lm import get_bigram, get_trigram

router = APIRouter(prefix="/api/pharmacy-lm", tags=["Pharmacy Language Models"])


@router.get("/corpus", response_model=CorpusStats)
def get_corpus() -> CorpusStats:
    return CorpusStats(**corpus_stats())


@router.post("/predict/bigram", response_model=PredictResponse)
def predict_bigram(data: PredictRequest) -> PredictResponse:
    tokens = tokenize(data.context)
    if not tokens:
        raise HTTPException(status_code=400, detail="No valid tokens found in context")
    model = get_bigram()
    preds = model.predict(tokens, top_k=data.top_k)
    return PredictResponse(model="micro-bigram", context_tokens=tokens,
                           predictions=[WordProb(**p) for p in preds],
                           vocab_size=model.vocab_size)


@router.post("/predict/trigram", response_model=PredictResponse)
def predict_trigram(data: PredictRequest) -> PredictResponse:
    tokens = tokenize(data.context)
    if not tokens:
        raise HTTPException(status_code=400, detail="No valid tokens found in context")
    model = get_trigram()
    preds = model.predict(tokens, top_k=data.top_k)
    return PredictResponse(model="small-trigram", context_tokens=tokens,
                           predictions=[WordProb(**p) for p in preds],
                           vocab_size=model.vocab_size)


@router.post("/predict/compare", response_model=CompareResponse)
def compare_models(data: PredictRequest) -> CompareResponse:
    tokens = tokenize(data.context)
    if not tokens:
        raise HTTPException(status_code=400, detail="No valid tokens found in context")
    bigram_preds = get_bigram().predict(tokens, top_k=data.top_k)
    trigram_preds = get_trigram().predict(tokens, top_k=data.top_k)
    agreement = bool(bigram_preds and trigram_preds
                     and bigram_preds[0]["word"] == trigram_preds[0]["word"])
    return CompareResponse(
        context_tokens=tokens,
        bigram=[WordProb(**p) for p in bigram_preds],
        trigram=[WordProb(**p) for p in trigram_preds],
        agreement=agreement,
    )
