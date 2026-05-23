from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Body
from pydantic import BaseModel
from app.services.youtube import YouTubeAPIService
from app.config import settings
from app.schemas.responses import (
    EnvelopeResponse,
    CommentModel,
    VideoSearchModel,
    VideoDetailModel,
    ChannelDetailModel,
    PaginationMetadata,
    QuotaMetadata
)

router = APIRouter(prefix="/api")

# Modelo para o POST de detalhamento de vídeos
class VideoDetailsRequest(BaseModel):
    video_ids: List[str]

# Modelo para o POST de canais em lote
class BatchChannelsRequest(BaseModel):
    channel_ids: List[str]

def get_youtube_service() -> YouTubeAPIService:
    """
    Função utilitária para instanciar o serviço usando a chave de API configurada no servidor.
    """
    api_key = settings.YOUTUBE_API_KEY.strip() if settings.YOUTUBE_API_KEY else ""

    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Chave de API do YouTube não configurada no servidor (YOUTUBE_API_KEY)."
        )
    try:
        return YouTubeAPIService(api_key=api_key)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/search", response_model=EnvelopeResponse[List[VideoSearchModel]])
def search_videos_endpoint(
    q: str = Query(..., description="Termos de busca (suporta operadores booleanos)"),
    max_results: int = Query(25, ge=1, le=50),
    page_token: Optional[str] = Query(None),
    published_after: Optional[str] = Query(None, description="Formato RFC 3339 (ex: 2026-01-01T00:00:00Z)"),
    published_before: Optional[str] = Query(None, description="Formato RFC 3339 (ex: 2026-12-31T23:59:59Z)"),
    channel_id: Optional[str] = Query(None)
):
    """
    Pesquisa vídeos com base em palavras-chave e filtros temporais/canal.
    Custo de cota: 100 unidades da API do YouTube.
    """
    service = get_youtube_service()
    try:
        videos, pagination, quota = service.search_videos(
            query=q,
            max_results=max_results,
            page_token=page_token,
            published_after=published_after,
            published_before=published_before,
            channel_id=channel_id
        )
        return EnvelopeResponse(data=videos, pagination=pagination, quota=quota)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/comments", response_model=EnvelopeResponse[List[CommentModel]])
def get_comments_endpoint(
    video_id: str = Query(..., description="ID do vídeo do qual coletar comentários"),
    page_token: Optional[str] = Query(None),
    max_results: int = Query(100, ge=1, le=100)
):
    """
    Coleta comentários de um vídeo de forma paginada.
    Custo de cota: 1 unidade da API do YouTube.
    """
    service = get_youtube_service()
    try:
        comments, pagination, quota = service.get_comment_threads(
            video_id=video_id,
            page_token=page_token,
            max_results=max_results
        )
        return EnvelopeResponse(data=comments, pagination=pagination, quota=quota)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.post("/videos/details", response_model=EnvelopeResponse[List[VideoDetailModel]])
def get_videos_details_endpoint(
    request: VideoDetailsRequest
):
    """
    Busca métricas avançadas de múltiplos vídeos (visualizações, curtidas, comentários)
    de forma otimizada em lotes de 50.
    Custo de cota: 1 unidade a cada 50 IDs de vídeo.
    """
    service = get_youtube_service()
    try:
        details, quota = service.get_videos_details(request.video_ids)
        pagination = PaginationMetadata(next_page_token=None, prev_page_token=None, total_results=len(details))
        return EnvelopeResponse(data=details, pagination=pagination, quota=quota)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/channel", response_model=EnvelopeResponse[ChannelDetailModel])
def get_channel_endpoint(
    q: str = Query(..., description="Nome do canal, Handle (com @) ou ID do canal (UC...)")
):
    """
    Busca metadados e estatísticas de um canal específico do YouTube.
    Custo de cota: 1 unidade se fornecer ID/Handle ou 101 unidades se for busca textual.
    """
    service = get_youtube_service()
    try:
        channel_details, quota = service.get_channel_details(q)
        pagination = PaginationMetadata(next_page_token=None, prev_page_token=None, total_results=1)
        return EnvelopeResponse(data=channel_details, pagination=pagination, quota=quota)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.get("/channel/videos", response_model=EnvelopeResponse[List[VideoDetailModel]])
def get_channel_videos_endpoint(
    playlist_id: str = Query(..., description="ID da playlist de uploads do canal (UU...)"),
    page_token: Optional[str] = Query(None)
):
    """
    Lista e detalha vídeos de um canal de forma paginada.
    Custo de cota: 2 unidades de cota por página.
    """
    service = get_youtube_service()
    try:
        videos, pagination, quota = service.get_channel_videos(
            playlist_id=playlist_id,
            page_token=page_token
        )
        return EnvelopeResponse(data=videos, pagination=pagination, quota=quota)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")

@router.post("/channels/batch", response_model=EnvelopeResponse[List[ChannelDetailModel]])
def get_channels_batch_endpoint(
    request: BatchChannelsRequest
):
    """
    Busca metadados de múltiplos canais por ID (UC...) de forma altamente otimizada.
    Agrupa até 50 IDs por chamada ao channels.list (custo: 1 unidade por lote de 50).
    """
    service = get_youtube_service()
    try:
        channels, quota = service.get_channels_batch(request.channel_ids)
        pagination = PaginationMetadata(next_page_token=None, prev_page_token=None, total_results=len(channels))
        return EnvelopeResponse(data=channels, pagination=pagination, quota=quota)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {str(e)}")
