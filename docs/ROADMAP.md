# Roadmap — Agencia Ford Acapulco

> Última actualización: **2026-04-12**  
> Estado del proyecto por área. Cada ítem refleja el estado real del código en el repositorio.

---

## 📊 Resumen de Progreso

| Área | Completado | Pendiente |
|------|-----------|-----------|
| Seguridad | 7 ítems | 6 ítems |
| Backend | 26 ítems | 6 ítems |
| Frontend — Público | 12 ítems | — |
| Frontend — Panel Admin | 10 ítems | 1 ítem |
| Frontend — Panel Cliente | 6 ítems | — |
| Frontend — Catálogo | 5 ítems | 1 ítem |
| Frontend — Panel Vendedor | 7 ítems | — |
| UX / Mejoras | — | 4 ítems |
| Deploy | — | 1 ítem |

---

## 🔐 Seguridad

### ✅ Completado

| Ítem | Descripción |
|---|---|
| JWT con SimpleJWT | Access token 8h, refresh token 7d. Generados en `POST /api/accounts/login/` |
| Permisos por rol en API | `IsCliente`, `IsVendedor`, `IsAdmin`, `IsVendedorOrAdmin`, `IsOwnerOrAdmin` en `apps/accounts/permissions.py` |
| CORS restricto | Solo `localhost:5173` (dev) y dominio de producción permitidos via `django-cors-headers` |
| `PrivateRoute` en frontend | `src/components/PrivateRoute.jsx` intercepta rutas protegidas. Si no hay sesión → redirect a `/login` con `state.from` para retorno posterior |
| Token en localStorage | Keys `ford_access` y `ford_refresh`. Se restaura sesión automáticamente al montar via `GET /api/accounts/me/` |
| Contraseña nunca almacenada en contexto | `AuthContext` guarda solo el objeto `user` devuelto por `/me/`. Los tokens están en `localStorage`, no en estado de React |
| Validación en backend (no solo frontend) | Los ViewSets rechazan peticiones sin token o con permisos insuficientes con `403 Forbidden` |

### ⏳ Pendiente

| Ítem | Descripción | Prioridad |
|---|---|---|
| Rotación de refresh token | Activar `ROTATE_REFRESH_TOKENS = True` en SimpleJWT para invalidar el refresh anterior al rotarlo | Alta |
| Blacklist de tokens | Activar `BLACKLIST_AFTER_ROTATION` + app `rest_framework_simplejwt.token_blacklist` para logout real | Alta |
| HTTPS en producción | Forzar HTTPS con `SECURE_SSL_REDIRECT = True` y `SESSION_COOKIE_SECURE = True` en settings de producción | Alta |
| Rate limiting en login | Throttling de DRF en `TokenObtainPairView` para evitar fuerza bruta | Media |
| Almacenamiento de tokens en `httpOnly` cookies | Migrar de `localStorage` a cookies `httpOnly` para eliminar riesgo de XSS en tokens | Media |
| CSP headers | `django-csp` para restringir fuentes de scripts/estilos (protección XSS) | Baja |

---

## ⚙️ Backend

### ✅ Completado

#### Infraestructura

| Ítem | Archivo(s) clave |
|---|---|
| Setup Django 4.2 LTS + DRF | `backend/fordapp/settings.py`, `requirements.txt` |
| Base de datos dual (SQLite dev / PostgreSQL prod) | `python-decouple` + variable `DATABASE_URL` |
| drf-spectacular (OpenAPI 3 / Swagger UI / ReDoc) | `GET /api/docs/`, `/api/redoc/`, `/api/schema/` |
| WhiteNoise para archivos estáticos | `INSTALLED_APPS` + `MIDDLEWARE` en `settings.py` |
| Admin enriquecido (inlines, filtros, búsqueda) | `apps/*/admin.py` |
| `seed_admin` management command | `apps/accounts/management/commands/seed_admin.py` — crea `admin@ford.com / admin123` idempotente |

#### App `accounts`

| Ítem | Archivo(s) clave |
|---|---|
| Modelo `User` personalizado (email login + rol) | `apps/accounts/models.py` |
| Modelo `PerfilCliente` | `apps/accounts/models.py` |
| Signal `post_save` — auto-crea `PerfilCliente` al registrar cliente | `apps/accounts/signals.py` — idempotente con `get_or_create` |
| Registro de cliente vía API | `POST /api/accounts/register/` |
| Login JWT | `POST /api/accounts/login/` |
| Endpoint de perfil propio | `GET/PATCH /api/accounts/me/` |
| Endpoint de perfil cliente extendido | `GET/PATCH /api/accounts/mi-perfil-cliente/` — `PerfilClienteView` con permiso `IsCliente` |
| `PerfilClienteSerializer` | `apps/accounts/serializers.py` — campos `direccion`, `ciudad`, `notas` RO, `fecha_creacion` RO |
| Campo `perfil_cliente` en `UserSerializer` | `get_perfil_cliente()` devuelve dict si `rol=cliente`, `null` en caso contrario |
| `UserAdminViewSet` — gestión de usuarios | `GET/PATCH /api/accounts/users/<id>/` — solo admin |
| `CreateVendedorView` — alta de vendedores | `POST /api/accounts/crear-vendedor/` — solo admin |
| Migraciones iniciales aplicadas | `apps/accounts/migrations/0001_initial.py` |

#### App `autos`

| Ítem | Archivo(s) clave |
|---|---|
| Modelos `CategoriaVehiculo`, `Vehiculo`, `ImagenVehiculo` | `apps/autos/models.py` |
| `VehiculoViewSet` — catálogo público + CRUD admin | `GET /api/autos/vehiculos/`, `POST/PUT/DELETE` solo admin |
| `CategoriaViewSet` — listado público + CRUD admin | `GET /api/autos/categorias/` |
| `ImagenVehiculoViewSet` — ruta anidada multipart | `GET/POST /api/autos/vehiculos/<id>/imagenes/`, `DELETE .../imagenes/<img_id>/` |
| Router de imágenes cambiado a `SimpleRouter` | Evita conflicto 405 en `DELETE /api/autos/vehiculos/<id>/` |
| Serializers diferenciados (lectura nested / escritura IDs) | `apps/autos/serializers.py` |
| Subida de imágenes (`MultiPartParser + FormParser`) | Almacenadas en `MEDIA_ROOT/autos/%Y/%m/` |
| Migraciones aplicadas | `apps/autos/migrations/0001_initial.py` |

#### App `vendedores`

| Ítem | Archivo(s) clave |
|---|---|
| Modelos `Vendedor`, `DisponibilidadVendedor` | `apps/vendedores/models.py` |
| `VendedorPublicoViewSet` — listado público ReadOnly | `GET /api/vendedores/lista/` y `lista/<id>/` |
| `MiPerfilVendedorView` — perfil propio | `GET/PATCH /api/vendedores/mi-perfil/` |
| `EstadisticasVendedorView` — KPIs propios | `GET /api/vendedores/estadisticas/` — citas pendientes, hoy, completadas del mes, próximas |
| `DisponibilidadViewSet` — CRUD de bloques horarios | `GET/POST/PUT/DELETE /api/vendedores/disponibilidad/` |
| Validación de solapamiento de horarios | `DisponibilidadViewSet.perform_create()` |
| `HorasDisponiblesView` — slots públicos | `GET /api/vendedores/disponibilidad/horas-disponibles/?fecha=&vendedor=` — calcula slots libres cruzando bloques con citas existentes. Horario público recortado 1 hora antes del fin de turno del asesor. |
| Migraciones aplicadas | `apps/vendedores/migrations/0001_initial.py` |

#### App `citas`

| Ítem | Archivo(s) clave |
|---|---|
| Modelo `Cita` con estados y constraint unicidad | `apps/citas/models.py` |
| `CitaViewSet` — CRUD con permisos por rol | `apps/citas/views.py` |
| Filtrado automático por rol en `get_queryset()` | Cliente ve sus citas, vendedor las suyas, admin ve todas |
| `get_serializer_class()` según rol | `CitaClienteSerializer` para cliente, `CitaSerializer` completo para vendedor/admin |
| `CitaClienteSerializer` — serializer ligero | `vendedor_nombre` y `vehiculo_nombre` como `SerializerMethodField` |
| Acción `cancelar` | `PATCH /api/citas/<id>/cancelar/` — valida ownership y estado (`pendiente`/`confirmada`) |
| Auto-asignación de vendedor al crear cita | `CitaCreateSerializer.create()` — busca disponibilidad, excluye con cita simultánea, asigna el de menor carga |
| Migraciones aplicadas | `apps/citas/migrations/0001_initial.py` |

### ⏳ Pendiente

| Ítem | Descripción | Prioridad |
|---|---|---|
| Conectar KPIs del Dashboard admin | `src/pages/admin/Dashboard.jsx` usa datos mock — conectar a API real (`GET /api/citas/`, `/api/autos/vehiculos/`, `/api/vendedores/lista/`) | Alta |
| Tests unitarios completos | `apps/*/tests.py` actualmente vacíos. Cubrir ViewSets, serializers y permisos | Alta |
| Filtros avanzados en catálogo | `django-filter` en `VehiculoViewSet` — filtrar por categoría, precio, disponibilidad | Media |
| Notificaciones por email | Enviar email al cliente cuando la cita es confirmada o cancelada | Media |
| Estadísticas avanzadas en Dashboard admin | Gráficas: citas por mes, vendedor más activo | Baja |
| Soft delete en citas canceladas | Marcar como cancelada con timestamp en lugar de eliminar | Baja |

---

## 🖥️ Frontend

### ✅ Completado — Público

| Ítem | Ruta / Archivo |
|---|---|
| SPA React 18 + Vite 6 | `frontend/` — proxy `/api/*` → `localhost:8000` |
| Sistema de diseño "industrial Ford" | `rounded-none`, `bg-zinc-900`, `uppercase tracking-widest`, `font-black`. Sin librerías de componentes externas |
| `AuthContext` (JWT completo) | `src/context/AuthContext.jsx` — `login()`, `logout()`, `register()`, `getToken()`, restauración de sesión al montar |
| `PrivateRoute` | `src/components/PrivateRoute.jsx` — spinner de carga, redirect a `/login` con `state.from` |
| Navbar sticky con logo SVG inline | `src/components/Navbar.jsx` — menú mobile, estado activo, botones de panel por rol (cliente/vendedor/admin), condicional auth |
| Footer estático 4 columnas | `src/components/Footer.jsx` |
| `MapaInteractivo` (Leaflet + OSM) | `src/components/MapaInteractivo.jsx` — sin API key |
| `FloatingTestDrive` | `src/components/FloatingTestDrive.jsx` — botón expandible fijo bottom-right, solo en Home |
| Página `Home` | `src/pages/public/Home.jsx` — hero editorial, stats, catálogo preview, banner |
| Página `Contact` | `src/pages/public/Contact.jsx` — split formulario/mapa, directorio, horarios |
| Página `Financing` | `src/pages/public/Financing.jsx` — wizard 3 pasos con stepper editorial |
| Página `Login` | `src/pages/public/Login.jsx` — redirect post-login por rol (`admin → /admin`, `vendedor → /vendedor`, `cliente → /cliente`) |
| Página `Register` | `src/pages/public/Register.jsx` — auto-login post-registro |
| Página `TestDrive` | `src/pages/public/TestDrive.jsx` — fetch real de vehículos, POST cita JWT, datos pre-llenados desde `user`, botón "Ver mis citas" post-booking para clientes |
| Página `Citas` | `src/pages/public/Citas.jsx` — hero editorial, 2 tipos de cita (Test Drive / Consulta+Visita), formulario con vehículo obligatorio, opción "Solo visita", preselección vía `?vehiculo=`, horarios disponibles en tiempo real, FAQ |

### ✅ Completado — Panel Admin (`/admin`)

| Ítem | Archivo |
|---|---|
| `AdminLayout` | `src/layouts/AdminLayout.jsx` — sidebar `bg-zinc-900`, 4 NavLinks, link a Django Admin, footer email + logout. Guard `rol !== 'admin'` |
| `AdminRoute` wrapper en `App.jsx` | Composición `PrivateRoute` + `AdminLayout` para las 4 rutas |
| `StatusBadge` | `src/components/admin/StatusBadge.jsx` — modos `status`, `role`, `vehicle`. `rounded-none uppercase tracking-widest` |
| `SlideOver` | `src/components/admin/SlideOver.jsx` — panel lateral desde la derecha, overlay `backdrop-blur-sm`, transición `translate-x`, bloquea scroll |
| Dashboard admin | `src/pages/admin/Dashboard.jsx` — 4 KPIs `font-mono font-black` + tabla actividad reciente *(datos mock — pendiente conectar a API)* |
| Gestión de Vehículos | `src/pages/admin/ManageVehicles.jsx` — tabla 100% dinámica desde API, SlideOver alta/edición, dropzone fotos múltiples con preview local, eliminación de fotos vía `DELETE .../imagenes/<img_id>/`, modal de confirmación de eliminación propio |
| Gestión de Citas | `src/pages/admin/ManageAppointments.jsx` — KPIs vivos desde API, tabla real (`GET /api/citas/`), filtros por estado (chips) y por vendedor, transiciones de estado inline, SlideOver detalle completo con notas editables |
| Gestión de Usuarios | `src/pages/admin/ManageUsers.jsx` — tabla usuarios con badges de rol, toggle activar/desactivar, SlideOver alta vendedor |
| `seed_admin` command | `backend/apps/accounts/management/commands/seed_admin.py` — `admin@ford.com / admin123` idempotente |
| Rutas admin | `/admin`, `/admin/vehiculos`, `/admin/citas`, `/admin/usuarios` registradas en `App.jsx` |

### ✅ Completado — Panel Vendedor (`/vendedor`)

| Ítem | Archivo |
|---|---|
| `VendedorLayout` | `src/layouts/VendedorLayout.jsx` — sidebar `bg-zinc-900`, topbar, `ProfileAvatar` (foto de perfil o iniciales en `bg-zinc-800`). Guard `rol !== 'vendedor'` |
| `VendedorRoute` wrapper en `App.jsx` | Composición `PrivateRoute` + `VendedorLayout` |
| Dashboard vendedor | `src/pages/vendedor/Dashboard.jsx` — KPIs (pendientes, confirmadas, hoy, completadas mes) + próximas citas desde `GET /api/vendedores/estadisticas/` |
| Mis Citas (vendedor) | `src/pages/vendedor/MisCitas.jsx` — tabla con acciones Confirmar / Rechazar / Completar / No asistió + SlideOver con notas editables |
| Buscador de clientes en Mis Citas | `src/pages/vendedor/MisCitas.jsx` — input que filtra la tabla por nombre, email o teléfono del cliente en tiempo real |
| Mi Disponibilidad | `src/pages/vendedor/MiDisponibilidad.jsx` — CRUD de bloques `DisponibilidadVendedor` vía `GET/POST/PUT/DELETE /api/vendedores/disponibilidad/` |
| Mi Perfil (vendedor) | `src/pages/vendedor/MiPerfil.jsx` — editar especialidad, biografía, foto de perfil |
| Rutas `/vendedor/*` | `/vendedor`, `/vendedor/citas`, `/vendedor/disponibilidad`, `/vendedor/perfil` registradas en `App.jsx` |

### ✅ Completado — Panel Cliente (`/cliente`)

| Ítem | Archivo |
|---|---|
| `ClienteLayout` | `src/layouts/ClienteLayout.jsx` — sidebar `bg-zinc-900`, 3 NavLinks, avatar con iniciales. Guard `rol !== 'cliente'` |
| `ClienteRoute` wrapper en `App.jsx` | Composición `PrivateRoute` + `ClienteLayout` |
| Dashboard cliente | `src/pages/cliente/Dashboard.jsx` — 4 KPIs (pendientes, confirmadas, completadas, canceladas), próximas citas máx. 5, CTA "Agendar prueba de manejo" cuando vacío |
| Mis Citas (cliente) | `src/pages/cliente/MisCitas.jsx` — historial completo, chips de filtro por estado (6 opciones), botón "Cancelar" vía `PATCH /api/citas/<id>/cancelar/` |
| Mi Perfil (cliente) | `src/pages/cliente/MiPerfil.jsx` — sección datos personales (`PATCH /api/accounts/me/`) + sección dirección/ciudad (`PATCH /api/accounts/mi-perfil-cliente/`) |
| Rutas `/cliente/*` | `/cliente`, `/cliente/citas`, `/cliente/perfil` registradas en `App.jsx` |

### ✅ Completado — Catálogo Público (`/catalogo`)

| Ítem | Archivo |
|---|---|
| `VehiculoCard` con prop `onVerDetalles` | `src/components/VehiculoCard.jsx` — el botón "Ver detalles" invoca la prop |
| `VehiculoDetalle` (modal) | `src/components/VehiculoDetalle.jsx` — galería imagen principal + miniaturas clicables, badge de estado con color, specs completas (color, año, km, descripción). Cierre con `Escape` o clic en backdrop. Bloquea scroll |
| Catálogo conectado a API | `src/pages/public/Catalogo.jsx` — grid de vehículos reales desde `GET /api/autos/vehiculos/` |
| Filtros por categoría | `src/pages/public/Catalogo.jsx` — tabs de categorías que filtran el grid en tiempo real |
| Buscador de texto libre | `src/pages/public/Catalogo.jsx` — input combinado con filtro de categoría; busca por modelo, versión, marca y color |
| Botón "Agendar Cita" en modal | `src/components/VehiculoDetalle.jsx` — navega a `/citas?vehiculo={id}` y preselecciona el vehículo en el formulario |

### ⏳ Pendiente — Catálogo

| Ítem | Descripción | Endpoint API |
|---|---|---|
| Página de detalle dedicada | `/catalogo/:id` como ruta propia (alternativa o complemento al modal) | `GET /api/autos/vehiculos/<id>/` |

### ⏳ Pendiente — Dashboard Admin

| Ítem | Descripción | Endpoint API |
|---|---|---|
| Conectar KPIs del Dashboard admin | `Dashboard.jsx` usa mock data. Conectar contadores reales de citas, vehículos activos y vendedores | `GET /api/citas/`, `/api/autos/vehiculos/`, `/api/vendedores/lista/` |

### ⏳ Pendiente — Mejoras UX

| Ítem | Descripción | Prioridad |
|---|---|---|
| Toast de confirmación global | Componente toast reutilizable para feedback de acciones (cita agendada, perfil guardado, cancelación) | Media |
| Loader de página | Skeleton screens o spinner en transiciones de ruta | Baja |
| SEO básico | Meta tags dinámicos en Vite para título y descripción por página | Baja |
| Modo oscuro | Ya usa `bg-zinc-900` como base — extender a toda la UI pública | Baja |

---

## 🚀 Deploy

### ⏳ Pendiente

| Ítem | Descripción | Prioridad |
|---|---|---|
| Deployment en Railway | Guía completa en `docs/DEPLOYMENT.md` — falta ejecutar y verificar en producción | Alta |
