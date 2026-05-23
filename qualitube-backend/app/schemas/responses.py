from typing import List, Optional, Generic, TypeVar, Any
from pydantic import BaseModel

T = TypeVar('T')

class QuotaMetadata(BaseModel):
    operation_cost: int            # Custo desta chamada específica da API (ex: 1 para videos.list, 1 para commentThreads.list)
    cumulative_session_cost: int   # Custo acumulado enviado pelo frontend + custo desta chamada

class PaginationMetadata(BaseModel):
    next_page_token: Optional[str] = None
    prev_page_token: Optional[str] = None
    total_results: Optional[int] = None

class EnvelopeResponse(BaseModel, Generic[T]):
    data: T
    pagination: PaginationMetadata
    quota: QuotaMetadata

# Schema detalhado para comentários
class CommentModel(BaseModel):
    comment_id: str
    video_id: str
    author_name: str
    author_channel_id: Optional[str] = None
    author_channel_url: Optional[str] = None
    text: str
    like_count: int
    published_at: str
    updated_at: str
    total_reply_count: int

# Schema detalhado para amostragem/busca de vídeos
class VideoSearchModel(BaseModel):
    video_id: str
    title: str
    description: str
    published_at: str
    thumbnail_url: str
    channel_id: str
    channel_title: str
    view_count: Optional[int] = 0

# Schema detalhado para métricas profundas de vídeos (videos.list)
class VideoDetailModel(BaseModel):
    video_id: str
    title: str
    description: str
    published_at: str
    thumbnail_url: str
    channel_id: str
    channel_title: str
    view_count: int
    like_count: int
    comment_count: int
    duration: str

# Schema detalhado para informações do Canal (channels.list)
class ChannelDetailModel(BaseModel):
    channel_id: str
    title: str
    description: str
    published_at: str
    thumbnail_url: str
    subscriber_count: int
    video_count: int
    view_count: int
    custom_url: Optional[str] = None
    country: Optional[str] = None
    uploads_playlist_id: Optional[str] = None
