# ===============================
# Stage 1: Build
# ===============================
FROM node:22-alpine AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --legacy-peer-deps

# Copiar código fuente
COPY . .

# Build de producción
RUN npm run build -- --configuration production

# ===============================
# Stage 2: Production con Nginx
# ===============================
FROM nginx:alpine

# Copiar archivos build
COPY --from=build /app/dist/glossy-web/browser /usr/share/nginx/html

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]