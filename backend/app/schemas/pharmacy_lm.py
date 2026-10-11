from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    context: str = Field(..., min_length=1, max_length=200,
                         description="Preceding pharmaceutical text, e.g. 'take twice'")
    top_k: int = Field(5, ge=1, le=20)


class WordProb(BaseModel):
    word: str
    probability: float


class PredictResponse(BaseModel):
    model: str
    context_tokens: list[str]
    predictions: list[WordProb]
    vocab_size: int


class CompareResponse(BaseModel):
    context_tokens: list[str]
    bigram: list[WordProb]
    trigram: list[WordProb]
    agreement: bool


class CorpusStats(BaseModel):
    sentences: int
    total_tokens: int
    vocab_size: int
    vocabulary: list[str]
    sample_sentences: list[str]
