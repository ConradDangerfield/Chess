FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Write a minimal .env so load_dotenv doesn't fail — 
# actual values come from docker-compose environment vars
RUN echo "" > .env

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
