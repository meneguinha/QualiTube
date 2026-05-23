# Usar uma imagem oficial do Python como base
FROM python:3.10-slim

# Definir variáveis de ambiente para evitar buffer em logs e compilação de pyc
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Definir o diretório de trabalho no container
WORKDIR /code

# Instalar dependências necessárias
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copiar todo o código fonte da app
COPY ./app /code/app

# O Hugging Face Spaces exige que a aplicação rode na porta 7860
EXPOSE 7860

# Comando para rodar a aplicação usando Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
