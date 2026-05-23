from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend stateless para extração de dados do YouTube voltado para pesquisas em Ciências Sociais.",
    version="1.0.0",
    debug=settings.DEBUG
)

# Configuração de CORS permissiva para testes de desenvolvimento local
origins = [
    "http://localhost:5500",   # Live Server VS Code
    "http://127.0.0.1:5500",
    "http://localhost:3000",
    "http://localhost:8000",   # Próprio FastAPI
    "*"                        # Permissivo temporário para testes locais iniciais
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar endpoints da API
app.include_router(api_router)

@app.get("/", tags=["Health"])
def health_check():
    """
    Endpoint simples de verificação do status do servidor.
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "mode": "stateless",
        "message": "QualiTube Backend está rodando localmente. Acesse /docs para a documentação Swagger."
    }

if __name__ == "__main__":
    import uvicorn
    # Executa o servidor local na porta 8000 apontando o módulo correto
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
