import os
from pydantic_settings import BaseSettings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE_PATH = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "QualiTube API"
    DEBUG: bool = True
    
    # Caso o usuário queira configurar uma chave de API global no backend (opcional)
    # Por padrão, daremos preferência para a chave enviada pelo Frontend no header HTTP para stateless completo
    YOUTUBE_API_KEY: str = ""

    class Config:
        env_file = ENV_FILE_PATH

settings = Settings()
