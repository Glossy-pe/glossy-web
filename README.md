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


RESUMEN DEL PROYECTO GLOSSY

He realizado un proyecto para la empresa Glossy que abarca dos campos macro: mostrar productos y tener un carrito de compras, y el otro campo es la gestión de productos teniendo un inventario para la sección de administradores. 

El proyecto en realidad se compone de 4 aplicaciones principales:

1. El primer proyecto es un backend para la gestión, desarrollado con Java Spring Boot y Maven, que coordina toda la lógica de negocio, operaciones CRUD de productos y categorías, gestión de inventario, y validación de tokens OAuth2.

2. El segundo fue el frontend para mostrar productos, carrito, detalle de productos, banners y secciones especiales por campaña. Este proyecto está desarrollado con Angular y TailwindCSS. Además, también contiene sección de login para autenticarse y acceder a las funciones de administración para la gestión de productos: crear productos, editar, crear categorías, crear imágenes, etc.

3. El tercer proyecto fue el servidor de imágenes, desarrollado con Python FastAPI, el cual es un servidor que aloja imágenes similar a un S3, proporcionando upload y gestión de imágenes de productos con optimización y compresión.

4. El cuarto y último es un servidor de autenticación OAuth2 desarrollado con Java Spring Boot, es quien expone y da lugar para poder autenticar. El servidor web y backend lo consumen para permitir el acceso a la API y rutas web, o sea rutas públicas y privadas.

Cada proyecto está alojado en GitHub. Además, cada proyecto tiene un Dockerfile el cual por integración CI/CD se envía a un repositorio Docker Hub para desplegar y publicar la imagen. Luego se tiene un servidor que también a partir de un GitHub Runner self-hosted ejecuta el build y run de los contenedores usando un docker-compose.

El docker-compose está alojado en un 5to proyecto que solo contiene el docker-compose. El servidor puede hacer un git pull para poder traer los últimos cambios de ese archivo.

El servidor es un Ubuntu 24.04.03, aquí se despliegan las aplicaciones. Para la salida a internet se usa el dominio de Cloudflare .mimarca.pe para todos los servicios:
- glossy-web.mimarca.pe (Frontend Angular)
- glossy-backend-server.mimarca.pe (Backend Spring Boot)
- glossy-image-server.mimarca.pe (Image Server FastAPI)
- glossy-oauth2-server.mimarca.pe (OAuth2 Server Spring Boot)

Para esto se usó Cloudflare Tunnel, que proporciona SSL/TLS automático y protección DDoS.

Como base de datos también se tiene PostgreSQL en el servidor ejecutado como imagen Docker, con volúmenes persistentes para garantizar la integridad de los datos. Todas las aplicaciones backend se conectan a esta instancia centralizada.

El flujo completo funciona de la siguiente manera: el usuario inicia sesión en el Frontend Angular, que solicita un token al OAuth2 Server. El token es almacenado en el cliente y enviado en cada petición al Backend. El Backend valida el token con el OAuth2 Server antes de procesar cualquier operación administrativa. Las rutas públicas (catálogo de productos) no requieren autenticación. Cuando un administrador sube una imagen de producto desde el panel de administración, el Frontend la envía al Image Server FastAPI, que retorna una URL. Esta URL se almacena en la base de datos PostgreSQL asociada al producto y es servida públicamente a través del catálogo.