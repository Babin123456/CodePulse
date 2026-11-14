@echo off
cd /d "%~dp0.."
docker compose version >nul 2>&1
if errorlevel 1 (
  echo Docker Compose v2 is required: https://docs.docker.com/compose/install/
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo Created .env from .env.example
)
docker compose -f docker-compose.dev.yml up --build %*
