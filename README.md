# Comandos para build y deploy:

# Construir la imagen (desde la carpeta del proyecto Angular)
docker build -t glossy-frontend:local .


# Correr el contenedor
docker run -d -p 80:80 --name glossy-frontend glossy-frontend:local

# Ver logs
docker logs glossy-frontend

# Verificar que está corriendo
docker ps

# Probar en el navegador
curl http://localhost
# O abre: http://localhost en tu navegador

29568271
