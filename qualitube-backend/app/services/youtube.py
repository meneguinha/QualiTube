import math
from typing import Dict, Any, Optional, Tuple, List
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from app.schemas.responses import (
    PaginationMetadata,
    QuotaMetadata,
    CommentModel,
    VideoSearchModel,
    VideoDetailModel,
    ChannelDetailModel
)

class YouTubeAPIService:
    """
    Serviço stateless de integração com a YouTube Data API v3.
    """
    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("A chave da API do YouTube é obrigatória.")
        self.api_key = api_key
        # Inicializa o cliente da API do Google sob demanda para manter o serviço 100% stateless
        self.youtube = build("youtube", "v3", developerKey=self.api_key)

    def search_videos(
        self,
        query: str,
        max_results: int = 25,
        page_token: Optional[str] = None,
        published_after: Optional[str] = None,
        published_before: Optional[str] = None,
        channel_id: Optional[str] = None
    ) -> Tuple[List[VideoSearchModel], PaginationMetadata, QuotaMetadata]:
        """
        Busca vídeos usando search.list com filtros opcionais, e enriquece com visualizações via videos.list.
        Custo da cota da YouTube Data API v3: 100 (search.list) + 1 (videos.list) = 101 unidades.
        """
        operation_cost = 100
        
        # Parâmetros obrigatórios e opcionais
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(max_results, 50),  # Limite máximo por página da API é 50
            "pageToken": page_token
        }
        
        if published_after:
            params["publishedAfter"] = published_after
        if published_before:
            params["publishedBefore"] = published_before
        if channel_id:
            params["channelId"] = channel_id

        try:
            request = self.youtube.search().list(**params)
            response = request.execute()
            
            # Coleta os IDs de vídeo encontrados para buscar visualizações em lote
            video_ids = []
            items = response.get("items", [])
            for item in items:
                video_id = item.get("id", {}).get("videoId")
                if video_id:
                    video_ids.append(video_id)
            
            # Busca views de cada vídeo (custo de 1 unidade de cota)
            view_map = {}
            additional_cost = 0
            if video_ids:
                additional_cost = 1
                stats_request = self.youtube.videos().list(
                    part="statistics",
                    id=",".join(video_ids)
                )
                stats_response = stats_request.execute()
                for stat_item in stats_response.get("items", []):
                    v_id = stat_item.get("id")
                    views = stat_item.get("statistics", {}).get("viewCount", 0)
                    view_map[v_id] = int(views)
            
            cleaned_videos = []
            for item in items:
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId")
                if video_id:
                    cleaned_videos.append(
                        VideoSearchModel(
                            video_id=video_id,
                            title=snippet.get("title", ""),
                            description=snippet.get("description", ""),
                            published_at=snippet.get("publishedAt", ""),
                            thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                            channel_id=snippet.get("channelId", ""),
                            channel_title=snippet.get("channelTitle", ""),
                            view_count=view_map.get(video_id, 0)
                        )
                    )
            
            pagination = PaginationMetadata(
                next_page_token=response.get("nextPageToken"),
                prev_page_token=response.get("prevPageToken"),
                total_results=response.get("pageInfo", {}).get("totalResults")
            )
            
            quota = QuotaMetadata(
                operation_cost=operation_cost + additional_cost,
                cumulative_session_cost=operation_cost + additional_cost
            )
            
            return cleaned_videos, pagination, quota

        except HttpError as e:
            raise RuntimeError(f"Erro ao acessar a API do YouTube (search): {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Erro inesperado na busca de vídeos: {str(e)}") from e

    def get_comment_threads(
        self,
        video_id: str,
        page_token: Optional[str] = None,
        max_results: int = 100,
        text_format: str = "plainText"
    ) -> Tuple[List[CommentModel], PaginationMetadata, QuotaMetadata]:
        """
        Coleta comentários de um vídeo usando commentThreads.list.
        Custo da cota da YouTube Data API v3: 1 unidade por chamada.
        """
        operation_cost = 1
        
        try:
            request = self.youtube.commentThreads().list(
                part="snippet",
                videoId=video_id,
                maxResults=min(max_results, 100),  # Limite máximo por página da API é 100
                textFormat=text_format,
                pageToken=page_token
            )
            response = request.execute()
            
            cleaned_comments = []
            for item in response.get("items", []):
                snippet = item.get("snippet", {})
                top_level_comment = snippet.get("topLevelComment", {})
                comment_snippet = top_level_comment.get("snippet", {})
                
                cleaned_comments.append(
                    CommentModel(
                        comment_id=item.get("id", ""),
                        video_id=video_id,
                        author_name=comment_snippet.get("authorDisplayName", "Usuário do YouTube"),
                        author_channel_id=comment_snippet.get("authorChannelId", {}).get("value"),
                        author_channel_url=comment_snippet.get("authorChannelUrl"),
                        text=comment_snippet.get("textDisplay") or comment_snippet.get("textOriginal") or "",
                        like_count=comment_snippet.get("likeCount", 0),
                        published_at=comment_snippet.get("publishedAt", ""),
                        updated_at=comment_snippet.get("updatedAt", ""),
                        total_reply_count=snippet.get("totalReplyCount", 0)
                    )
                )
            
            pagination = PaginationMetadata(
                next_page_token=response.get("nextPageToken"),
                prev_page_token=response.get("prevPageToken"),
                total_results=response.get("pageInfo", {}).get("totalResults")
            )
            
            quota = QuotaMetadata(
                operation_cost=operation_cost,
                cumulative_session_cost=operation_cost # A ser acumulado no frontend
            )
            
            return cleaned_comments, pagination, quota

        except HttpError as e:
            raise RuntimeError(f"Erro ao acessar a API do YouTube (commentThreads): {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Erro inesperado na coleta de comentários: {str(e)}") from e

    def get_videos_details(
        self,
        video_ids: List[str]
    ) -> Tuple[List[VideoDetailModel], QuotaMetadata]:
        """
        Coleta detalhes e métricas de vídeos usando videos.list com batching obrigatório de 50 em 50.
        Custo da cota da YouTube Data API v3: 1 unidade por chamada de lote (máx 50 ids).
        """
        if not video_ids:
            return [], QuotaMetadata(operation_cost=0, cumulative_session_cost=0)

        # Batching: Agrupar IDs de 50 em 50
        batch_size = 50
        num_batches = math.ceil(len(video_ids) / batch_size)
        total_operation_cost = num_batches
        
        cleaned_details = []

        try:
            for i in range(0, len(video_ids), batch_size):
                batch_ids = video_ids[i:i + batch_size]
                ids_param = ",".join(batch_ids)
                
                request = self.youtube.videos().list(
                    part="snippet,statistics,contentDetails",
                    id=ids_param
                )
                response = request.execute()
                
                for item in response.get("items", []):
                    snippet = item.get("snippet", {})
                    stats = item.get("statistics", {})
                    content_details = item.get("contentDetails", {})
                    
                    cleaned_details.append(
                        VideoDetailModel(
                            video_id=item.get("id", ""),
                            title=snippet.get("title", ""),
                            description=snippet.get("description", ""),
                            published_at=snippet.get("publishedAt", ""),
                            thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                            channel_id=snippet.get("channelId", ""),
                            channel_title=snippet.get("channelTitle", ""),
                            view_count=int(stats.get("viewCount", 0)),
                            like_count=int(stats.get("likeCount", 0)),
                            comment_count=int(stats.get("commentCount", 0)),
                            duration=content_details.get("duration", "")
                        )
                    )

            quota = QuotaMetadata(
                operation_cost=total_operation_cost,
                cumulative_session_cost=total_operation_cost
            )
            
            return cleaned_details, quota

        except HttpError as e:
            raise RuntimeError(f"Erro ao acessar a API do YouTube (videos): {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Erro inesperado no detalhamento de vídeos: {str(e)}") from e

    def get_channel_details(
        self,
        query: str
    ) -> Tuple[ChannelDetailModel, QuotaMetadata]:
        """
        Busca metadados do canal usando channels.list.
        Dá suporte a:
        - Query contendo ID do canal (começa com UC)
        - Query contendo Handle (começa com @)
        - Query contendo nome de canal genérico (realiza busca prévia)
        
        Custo de cota:
        - 1 unidade se fornecido ID ou Handle direto.
        - 101 unidades se for necessário fazer busca textual prévia.
        """
        query_clean = query.strip()
        channel_id = None
        operation_cost = 0

        # Se for Handle exato
        if query_clean.startswith("@"):
            operation_cost += 1
            try:
                request = self.youtube.channels().list(
                    part="snippet,statistics,contentDetails",
                    forHandle=query_clean
                )
                response = request.execute()
                items = response.get("items", [])
                if items:
                    channel_id = items[0].get("id")
            except HttpError as e:
                raise RuntimeError(f"Erro ao acessar a API do YouTube (channels/handle): {e.reason}") from e

        # Se for ID de canal exato
        elif query_clean.startswith("UC") and len(query_clean) == 24:
            channel_id = query_clean
            operation_cost += 1
        
        # Busca textual genérica
        else:
            operation_cost += 100 # Custo do search.list
            try:
                search_request = self.youtube.search().list(
                    part="snippet",
                    q=query_clean,
                    type="channel",
                    maxResults=1
                )
                search_response = search_request.execute()
                search_items = search_response.get("items", [])
                if search_items:
                    channel_id = search_items[0].get("id", {}).get("channelId")
                
                # FALLBACK: Se a busca focada por tipo canal não retornar nada, faz busca geral e extrai canal do primeiro resultado
                if not channel_id:
                    search_request_fb = self.youtube.search().list(
                        part="snippet",
                        q=query_clean,
                        maxResults=1
                    )
                    search_response_fb = search_request_fb.execute()
                    search_items_fb = search_response_fb.get("items", [])
                    if search_items_fb:
                        fb_item = search_items_fb[0]
                        channel_id = fb_item.get("id", {}).get("channelId") or fb_item.get("snippet", {}).get("channelId")
                        operation_cost += 100 # Custo extra da chamada fallback
                
                if not channel_id:
                    raise ValueError(f"Nenhum canal encontrado para a busca: '{query_clean}'")
                
                operation_cost += 1 # Custo para detalhar o canal encontrado
            except HttpError as e:
                raise RuntimeError(f"Erro ao acessar a API do YouTube (search/channel): {e.reason}") from e

        if not channel_id:
            raise ValueError(f"Canal não localizado para os termos fornecidos: '{query_clean}'")

        # Buscar dados detalhados do canal por ID
        try:
            request = self.youtube.channels().list(
                part="snippet,statistics,contentDetails",
                id=channel_id
            )
            response = request.execute()
            items = response.get("items", [])
            
            if not items:
                raise ValueError(f"Estatísticas do canal não encontradas para o ID: {channel_id}")
                
            item = items[0]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            
            channel_details = ChannelDetailModel(
                channel_id=item.get("id", ""),
                title=snippet.get("title", ""),
                description=snippet.get("description", ""),
                published_at=snippet.get("publishedAt", ""),
                thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                subscriber_count=int(stats.get("subscriberCount", 0)),
                video_count=int(stats.get("videoCount", 0)),
                view_count=int(stats.get("viewCount", 0)),
                custom_url=snippet.get("customUrl"),
                country=snippet.get("country"),
                uploads_playlist_id=item.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
            )
            
            quota = QuotaMetadata(
                operation_cost=operation_cost,
                cumulative_session_cost=operation_cost
            )
            
            return channel_details, quota
            
        except HttpError as e:
            raise RuntimeError(f"Erro ao acessar a API do YouTube (channels/details): {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Erro inesperado ao buscar detalhes do canal: {str(e)}") from e

    def get_channel_videos(
        self,
        playlist_id: str,
        page_token: Optional[str] = None
    ) -> Tuple[List[VideoDetailModel], PaginationMetadata, QuotaMetadata]:
        """
        Lista e detalha vídeos de uma playlist de uploads de canal de forma paginada (50 por vez).
        Custo de cota:
        - 1 unidade para playlistItems.list
        - 1 unidade para videos.list (detalhes das visualizações)
        Custo total: 2 unidades de cota por página.
        """
        operation_cost = 2
        
        try:
            # 1. Obter itens da playlist (playlistItems.list)
            playlist_req = self.youtube.playlistItems().list(
                part="snippet",
                playlistId=playlist_id,
                maxResults=50,
                pageToken=page_token
            )
            playlist_res = playlist_req.execute()
            
            items = playlist_res.get("items", [])
            video_ids = []
            
            # Mapeia ID de vídeo e as informações básicas
            video_info_temp = {}
            for item in items:
                snippet = item.get("snippet", {})
                v_id = snippet.get("resourceId", {}).get("videoId")
                if v_id:
                    video_ids.append(v_id)
                    video_info_temp[v_id] = {
                        "title": snippet.get("title", ""),
                        "description": snippet.get("description", ""),
                        "published_at": snippet.get("publishedAt", ""),
                        "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                        "channel_id": snippet.get("channelId", ""),
                        "channel_title": snippet.get("channelTitle", "")
                    }

            cleaned_details = []
            
            # 2. Se houver vídeos, buscar as estatísticas (videos.list)
            if video_ids:
                ids_param = ",".join(video_ids)
                stats_req = self.youtube.videos().list(
                    part="statistics,contentDetails",
                    id=ids_param
                )
                stats_res = stats_req.execute()
                
                for item in stats_res.get("items", []):
                    v_id = item.get("id")
                    stats = item.get("statistics", {})
                    content_details = item.get("contentDetails", {})
                    info = video_info_temp.get(v_id, {})
                    
                    cleaned_details.append(
                        VideoDetailModel(
                            video_id=v_id,
                            title=info.get("title", ""),
                            description=info.get("description", ""),
                            published_at=info.get("published_at", ""),
                            thumbnail_url=info.get("thumbnail_url", ""),
                            channel_id=info.get("channel_id", ""),
                            channel_title=info.get("channel_title", ""),
                            view_count=int(stats.get("viewCount", 0)),
                            like_count=int(stats.get("likeCount", 0)),
                            comment_count=int(stats.get("commentCount", 0)),
                            duration=content_details.get("duration", "")
                        )
                    )
            
            pagination = PaginationMetadata(
                next_page_token=playlist_res.get("nextPageToken"),
                prev_page_token=playlist_res.get("prevPageToken"),
                total_results=playlist_res.get("pageInfo", {}).get("totalResults")
            )
            
            quota = QuotaMetadata(
                operation_cost=operation_cost,
                cumulative_session_cost=operation_cost
            )
            
            return cleaned_details, pagination, quota

        except HttpError as e:
            raise RuntimeError(f"Erro ao acessar a API do YouTube (playlistItems/videos): {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Erro inesperado ao buscar vídeos da playlist: {str(e)}") from e

    def get_channels_batch(
        self,
        channel_ids: List[str]
    ) -> Tuple[List[ChannelDetailModel], QuotaMetadata]:
        """
        Busca metadados de múltiplos canais por ID (UC...) de forma altamente otimizada.
        Agrupa até 50 IDs por chamada ao channels.list, custando apenas 1 unidade de cota por lote.

        Custo de cota: ⌈N/50⌉ unidades (onde N é o número de IDs válidos fornecidos).
        Exemplo: 100 canais = 2 unidades. 50 canais = 1 unidade.
        """
        # Filtra apenas IDs válidos (devem começar com UC e ter 24 chars)
        valid_ids = [cid.strip() for cid in channel_ids if cid.strip().startswith("UC") and len(cid.strip()) == 24]

        if not valid_ids:
            return [], QuotaMetadata(operation_cost=0, cumulative_session_cost=0)

        batch_size = 50
        num_batches = math.ceil(len(valid_ids) / batch_size)
        total_cost = num_batches
        all_channels: List[ChannelDetailModel] = []

        try:
            for i in range(0, len(valid_ids), batch_size):
                batch = valid_ids[i:i + batch_size]
                ids_param = ",".join(batch)

                request = self.youtube.channels().list(
                    part="snippet,statistics,contentDetails",
                    id=ids_param,
                    maxResults=batch_size
                )
                response = request.execute()

                for item in response.get("items", []):
                    snippet = item.get("snippet", {})
                    stats = item.get("statistics", {})

                    all_channels.append(
                        ChannelDetailModel(
                            channel_id=item.get("id", ""),
                            title=snippet.get("title", ""),
                            description=snippet.get("description", ""),
                            published_at=snippet.get("publishedAt", ""),
                            thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                            subscriber_count=int(stats.get("subscriberCount", 0)),
                            video_count=int(stats.get("videoCount", 0)),
                            view_count=int(stats.get("viewCount", 0)),
                            custom_url=snippet.get("customUrl"),
                            country=snippet.get("country"),
                            uploads_playlist_id=item.get("contentDetails", {}).get("relatedPlaylists", {}).get("uploads")
                        )
                    )

            quota = QuotaMetadata(
                operation_cost=total_cost,
                cumulative_session_cost=total_cost
            )

            return all_channels, quota

        except HttpError as e:
            raise RuntimeError(f"Erro ao acessar a API do YouTube (channels/batch): {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Erro inesperado ao buscar canais em lote: {str(e)}") from e
