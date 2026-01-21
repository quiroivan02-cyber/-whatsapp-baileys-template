FROM node:20-alpine

# Instalar git (requerido por Baileys)
RUN apk add --no-cache git

WORKDIR /app

# Copiar package.json
COPY package.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código
COPY . .

# Crear directorio para sesiones
RUN mkdir -p /app/sessions

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV PORT=3000
ENV NODE_ENV=production

# Iniciar aplicación
CMD ["node", "index.js"]
