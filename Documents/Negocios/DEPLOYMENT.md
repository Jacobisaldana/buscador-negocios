# 🚀 Guía de Despliegue en VPS con Docker y Portainer

## 📋 Prerrequisitos
- VPS con Docker instalado
- Portainer configurado
- API Key de Google Places válida

## 🛠️ Opción 1: Despliegue directo con Portainer

### Paso 1: Clonar repositorio en VPS
```bash
git clone https://github.com/Jacobisaldana/buscador-negocios.git
cd buscador-negocios
```

### Paso 2: Configurar variables de entorno
```bash
# Editar archivo .env.production con tu API Key
nano .env.production
```

### Paso 3: Construir y ejecutar con Docker Compose
```bash
# Construir la imagen
docker-compose build

# Ejecutar el contenedor
docker-compose up -d
```

## 🌐 Opción 2: Despliegue desde Portainer UI

### Paso 1: En Portainer, crear Stack
1. Ve a **Stacks** → **Add Stack**
2. Nombre: `buscador-negocios`
3. Pega el siguiente docker-compose.yml:

```yaml
version: '3.8'

services:
  buscador-negocios:
    image: node:18-alpine
    container_name: buscador-negocios-app
    working_dir: /app
    ports:
      - "3080:3000"
    environment:
      - REACT_APP_GOOGLE_PLACES_API_KEY=TU_API_KEY_AQUI
    command: >
      sh -c "
        git clone https://github.com/Jacobisaldana/buscador-negocios.git . &&
        npm install &&
        npm start
      "
    restart: unless-stopped
```

### Paso 2: Variables de entorno
En la sección **Environment variables** de Portainer:
- `REACT_APP_GOOGLE_PLACES_API_KEY`: Tu API Key real

### Paso 3: Deploy
Haz clic en **Deploy the stack**

## 🔧 Opción 3: Build personalizado (Recomendado)

### Dockerfile optimizado para producción ya incluido
El proyecto incluye:
- ✅ Dockerfile multi-stage (Node.js + Nginx)
- ✅ Configuración Nginx optimizada
- ✅ docker-compose.yml listo
- ✅ Variables de entorno configuradas

### Comandos para VPS:
```bash
# 1. Clonar repositorio
git clone https://github.com/Jacobisaldana/buscador-negocios.git
cd buscador-negocios

# 2. Configurar API Key
echo "REACT_APP_GOOGLE_PLACES_API_KEY=TU_API_KEY" > .env.production

# 3. Construir y ejecutar
docker-compose up -d --build
```

## 🌍 Acceso a la aplicación

Una vez desplegado, la aplicación estará disponible en:
- **URL:** `http://TU_IP_VPS:3080`
- **Puerto:** 3080 (configurable en docker-compose.yml)

## 🔒 Configuración SSL (Opcional)

Para HTTPS, agregar reverse proxy con Nginx o Traefik:

```yaml
# Ejemplo con Traefik labels
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.buscador.rule=Host(\`tudominio.com\`)"
  - "traefik.http.routers.buscador.tls.certresolver=letsencrypt"
```

## 📊 Monitoreo

Revisar logs en Portainer:
1. Ve a **Containers**
2. Selecciona `buscador-negocios-app`
3. Haz clic en **Logs**

## 🔄 Actualización

Para actualizar:
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

## ❗ Troubleshooting

### Error de API Key
- Verificar que la API Key esté en `.env.production`
- Confirmar que las APIs estén habilitadas en Google Cloud Console

### Error de puerto
- Cambiar puerto en `docker-compose.yml` si 3080 está ocupado
- Verificar firewall del VPS

### Error de memoria
- Aumentar memoria del VPS si es necesario
- El build requiere al menos 1GB RAM