#!/bin/bash

set -e

echo "==============================================="
echo "Inicializando entorno Dev Container"
echo "==============================================="

echo ""
echo "[1/6] Ajustando permisos..."
sudo chown -R node:node /workspace

echo ""
echo "[2/6 Instalando dependencias backend..."]
cd /workspace/backend
npm install --legacy-peer-deps

echo""
echo "[3/6] Instalando dependencias frontend..."
cd /workspace/frontend
npm install --legacy-peer-deps

echo ""
echo "[4/6] Generando Prisma Client..."
cd /workspace/backend
npx prisma generate

echo ""
echo "[5/6] Ejecutando migrations..."
npx prisma migrate deploy

echo ""
echo "[6/6] Entorno preparado correctamente"

echo ""
echo "==============================================="
echo "Dev Container Listo..."
echo "==============================================="
