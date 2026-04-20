# Changelog

Todos los cambios notables se documentan en este archivo.
Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) | Versionado: [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.2.0] - 2026-04-15

> Rediseño visual completo del sistema de diseño público: barra de información, iconografía, footer funcional, selector de fecha personalizado, mapa interactivo, nueva página Seminuevos.

**Agregado**

| Componente / Módulo | Descripción | Archivo |
|---|---|---|
| `DatePicker` | Componente de calendario personalizado que reemplaza el `<input type="date">` nativo. Soporte de fecha mínima, nombres en español, resaltado de hoy y día seleccionado, botones "Borrar"/"Hoy", cierre al hacer clic fuera. | `DatePicker.jsx` |
| `Seminuevos` | Nueva página en `/seminuevos` — estilo *coming soon*. Sección hero con CTA, grid de 4 garantías con íconos, banner de cotización. | `pages/public/Seminuevos.jsx` |
| Ruta `/seminuevos` | Registrada en el router principal. | `App.jsx` |
| `lucide-react` | Instalada como dependencia npm. Proporciona íconos SVG para Navbar, Footer, secciones y botón flotante. | `package.json` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `Navbar.jsx` | Se añade propiedad `icon` al arreglo `LINKS`. Todos los enlaces del menú (escritorio y móvil) muestran un ícono lucide junto a la etiqueta. Íconos: `Car`, `CalendarCheck`, `CreditCard`, `RotateCcw`, `MessageSquare`. |
| `Footer.jsx` | Reescritura completa. Ahora usa `<img src="/Ford_logo.png">` (real), enlaces de React Router funcionales, íconos lucide en encabezados de sección, componentes SVG inline para redes sociales (`IconFacebook`, `IconInstagram`, `IconYoutube`) y datos de contacto como `<a href="tel:">` / `<a href="mailto:">`. |
| `FloatingTestDrive.jsx` | Rediseñado de botón cuadrado negro a píldora circular `rounded-full` con color Ford `#003478` e ícono `KeyRound` de lucide-react. |
| `MapaInteractivo.jsx` | Reescrito completo. Eliminada dependencia de Leaflet/react-leaflet. Reemplazado por `<iframe>` embed de Google Maps (gratuito, sin API key). Agrega tarjeta flotante con dirección y enlace "Cómo llegar" a Google Maps. |
| `Home.jsx` | Barra de información superior cambiada a `bg-[#003478]` con íconos `MapPin` y `Phone`. Campo de fecha del formulario de cita reemplazado por `<DatePicker>`. |
| `Contact.jsx` | Barra de información superior cambiada a `bg-[#003478]` con íconos `MapPin` y `Phone`. |
| `Financing.jsx` | Barra de información superior cambiada a `bg-[#003478]` con íconos `MapPin` y `Phone`. |
| `Citas.jsx` | Sección "Cómo funciona" rediseñada como línea de tiempo horizontal con contenedores de íconos circulares, línea conectora, insignias numeradas y CTA. Grandes números decorativos de fondo eliminados. Campo de fecha reemplazado por `<DatePicker>`. |
| `TestDrive.jsx` | Campo de fecha reemplazado por `<DatePicker>`. |

**Corregido**

- `Footer.jsx`: importaciones de `Facebook`, `Instagram`, `Youtube` desde lucide-react causaban error en runtime — no existen en el paquete. Corregido con componentes SVG inline.
- `Seminuevos.jsx`: clases Tailwind con modificador de opacidad sobre colores arbitrarios (`text-[#003478]/4`, `bg-[#003478]/8`) no son generadas por JIT. Corregido usando `style={{ opacity: 0.04 }}` y `style={{ backgroundColor: 'rgba(0,52,120,0.08)' }}`.

---

## [1.1.0] - 2026-04-12

> Mejoras en el flujo de citas, buscadores en catálogo y panel de asesores, ajuste de horario público.

| Tipo | Cambio | Archivo |
|---|---|---|
| UX | Tipos de cita reducidos a 2: "Test Drive" y "Consulta / Visita" (visita integrada) | `Citas.jsx` |
| UX | Campo vehículo ahora es obligatorio para confirmar una cita | `Citas.jsx` |
| UX | Nueva opción "Solo visita" en el selector — permite agendar sin elegir modelo específico | `Citas.jsx` |
| Feature | Botón "Agendar Cita" en el modal de detalle del catálogo, navega a `/citas?vehiculo={id}` | `VehiculoDetalle.jsx` |
| Feature | Preselección automática de vehículo en `/citas` al llegar con `?vehiculo=` en la URL | `Citas.jsx` |
| Feature | Buscador de texto en `/catálogo` — filtra por modelo, versión, marca y color en tiempo real | `Catalogo.jsx` |
| Feature | Buscador de clientes en "Mis Citas" del panel de asesor — filtra por nombre, email y teléfono | `MisCitas.jsx` |
| Backend | Horario público recortado 1 hora antes del fin del turno del asesor | `vendedores/views.py` |

---

## [1.0.0] - 2026-04-09

> Modal de detalle de vehículo en el catálogo, gestión real de imágenes y corrección de rutas API.

**Agregado**

| Componente | Descripción | Archivo |
|---|---|---|
| `VehiculoDetalle` | Modal con galería + miniaturas clicables, badge de estado, specs completas, CTAs. Cierra con `Escape` o clic en backdrop. Bloquea scroll. | `VehiculoDetalle.jsx` |
| `ImagenVehiculoViewSet` | Ruta anidada `GET/POST .../imagenes/` y `DELETE .../imagenes/<id>/`. Permiso `IsAdmin`. | `autos/views.py` |
| Modal de confirmación | Reemplaza `window.confirm` por modal propio con diseño del sistema al eliminar vehículos. | `ManageVehicles.jsx` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `VehiculoCard.jsx` | Nueva prop `onVerDetalles`; el botón "Ver detalles" la invoca. |
| `Catalogo.jsx` | Gestiona estado `seleccionado` y renderiza `VehiculoDetalle` al hacer clic en una card. |
| `ManageVehicles.jsx` | Eliminados datos mock. Tabla y formulario 100% desde la API. Dropzone de fotos múltiples con preview. |
| `autos/urls.py` | Router anidado cambiado de `DefaultRouter` a `SimpleRouter` para evitar conflicto 405. |

**Corregido**

- `DELETE /api/autos/vehiculos/<id>/` retornaba 405 porque el router de imágenes interceptaba la URL primero. Corregido con `SimpleRouter` y reordenamiento de `urlpatterns`.

---

## [0.9.0] - 2026-04-09

> Panel de administración de citas conectado a la API real. Eliminados todos los datos mock.

**Modificado**

| Archivo | Cambio |
|---|---|
| `ManageAppointments.jsx` | Reescrito completo. Carga citas desde `GET /api/citas/` y vendedores desde `GET /api/vendedores/lista/`. KPIs vivos, filtros por estado y asesor dinámicos, transiciones de estado inline por fila, SlideOver de detalle con notas editables. |

---

## [0.8.0] - 2026-04-09

> Panel de cliente completo con 3 rutas protegidas: Dashboard, Mis Citas y Mi Perfil.

**Agregado**

| Componente / Módulo | Descripción | Archivo |
|---|---|---|
| `ClienteLayout` | Sidebar `bg-zinc-900`, 3 NavLinks, guard de rol, avatar con iniciales. | `ClienteLayout.jsx` |
| Dashboard cliente | 4 KPIs, próximas citas (máx. 5), estado vacío con CTA. Datos de `GET /api/citas/`. | `cliente/Dashboard.jsx` |
| Mis Citas (cliente) | Historial con filtros por estado (6 opciones), botón Cancelar vía `PATCH /api/citas/{id}/cancelar/`. | `cliente/MisCitas.jsx` |
| Mi Perfil (cliente) | Datos personales (`PATCH /api/accounts/me/`) y dirección (`PATCH /api/accounts/mi-perfil-cliente/`). | `cliente/MiPerfil.jsx` |
| Signal `PerfilCliente` | Auto-crea `PerfilCliente` al registrar un usuario con `rol=cliente`. Idempotente. | `accounts/signals.py` |
| `PerfilClienteView` | `GET/PATCH /api/accounts/mi-perfil-cliente/` con permiso `IsCliente`. | `accounts/views.py` |
| Acción `cancelar` | Valida ownership y estado antes de cancelar la cita. | `citas/views.py` |
| `CitaClienteSerializer` | Serializer ligero con `vendedor_nombre` y `vehiculo_nombre` para el panel del cliente. | `citas/serializers.py` |
| `ClienteRoute` | Composición `PrivateRoute` + `ClienteLayout` en `App.jsx`. | `App.jsx` |
| `ProfileAvatar` | Foto de perfil del vendedor o iniciales en `bg-zinc-800` — sidebar y topbar. | `VendedorLayout.jsx` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `Login.jsx` | Redirect post-login ahora incluye `cliente → /cliente`. |
| `Navbar.jsx` | Botones de panel por rol: "Mi Cuenta" (cliente), "Mi Panel" (vendedor), "Panel Admin" (admin). |
| `TestDrive.jsx` | Post-booking: si `rol === 'cliente'`, muestra botón "Ver mis citas" → `/cliente/citas`. |
| `accounts/apps.py` | `ready()` importa `signals.py` para registrar el signal de `PerfilCliente`. |
| `citas/views.py` | `get_serializer_class()` devuelve `CitaClienteSerializer` para usuarios con rol cliente. |

---

## [0.7.0] - 2026-04-07

> Panel de administración completo: 4 secciones, SlideOver/StatusBadge reutilizables, comando seed_admin.

**Agregado**

| Componente / Módulo | Descripción | Archivo |
|---|---|---|
| `AdminLayout` | Sidebar `bg-zinc-900`, 4 NavLinks, link a Django Admin, topbar, guard `rol !== 'admin'`. | `AdminLayout.jsx` |
| Dashboard admin | 4 KPIs `font-black font-mono` + tabla de actividad reciente (datos mock). | `admin/Dashboard.jsx` |
| `ManageVehicles` | Tabla de inventario, SlideOver de alta/edición con datos mock. | `admin/ManageVehicles.jsx` |
| `ManageAppointments` | Tabla de citas con filtros por estado/vendedor, confirmación y rechazo inline. | `admin/ManageAppointments.jsx` |
| `ManageUsers` | Tabla de usuarios con badges de rol, toggle activo/inactivo, SlideOver alta vendedor. | `admin/ManageUsers.jsx` |
| `StatusBadge` | Badges reutilizables para estados de cita, roles y estado de vehículo. `rounded-none uppercase`. | `admin/StatusBadge.jsx` |
| `SlideOver` | Panel lateral con overlay `backdrop-blur-sm`, transición `translate-x`, bloquea scroll. | `admin/SlideOver.jsx` |
| Comando `seed_admin` | Crea `admin@ford.com / admin123`. Idempotente. | `accounts/management/` |
| `AdminRoute` | Composición `PrivateRoute` + `AdminLayout` para las 4 rutas `/admin/*`. | `App.jsx` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `Navbar.jsx` | Enlace "PANEL ADMIN" condicional, visible solo cuando `rol === 'admin'`. |
| `App.jsx` | Rutas `/admin/*` registradas y envueltas en `AdminRoute`. |

---

## [0.6.0] - 2026-04-07

> Rutas protegidas con JWT y formulario de prueba de manejo conectado a la API real.

**Agregado**

| Componente / Módulo | Descripción | Archivo |
|---|---|---|
| `PrivateRoute` | Guard con spinner de carga; redirige a `/login` guardando `state.from`. | `PrivateRoute.jsx` |
| `TestDrive.jsx` | Vehículos reales desde API, datos pre-llenados del usuario, `POST /api/citas/` con JWT, confirmación visual post-booking. | `TestDrive.jsx` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `App.jsx` | Ruta `/prueba-de-manejo` protegida con `<PrivateRoute>`. |
| `docs/ARCHITECTURE.md` | Diagrama mermaid y estructura de archivos actualizados. |
| `docs/ROLES.md` | Sección "Control de Acceso" actualizada con implementación real. |

---

## [0.5.0] - 2026-04-07

> Sistema de autenticación JWT en el frontend: AuthContext, Login, Register y TestDrive inicial.

**Agregado**

| Componente / Módulo | Descripción | Archivo |
|---|---|---|
| `AuthContext` | Estado `user` restaurado desde `localStorage`. Funciones: `login`, `logout`, `register`, `getToken`. Claves: `ford_access`, `ford_refresh`. | `context/AuthContext.jsx` |
| Página `Login` | Dos columnas: editorial `bg-zinc-900` + formulario. Redirect inteligente con `state.from`. | `pages/public/Login.jsx` |
| Página `Register` | Dos columnas: value propositions + formulario completo. Auto-login tras registro exitoso. | `pages/public/Register.jsx` |
| `FloatingTestDrive` | Botón fijo expandible `bottom-8 right-8`. Montado solo en `Home.jsx`. | `FloatingTestDrive.jsx` |
| `TestDrive.jsx` inicial | Formulario 3 secciones con vehículos mock, fecha y selección de turno. | `TestDrive.jsx` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `App.jsx` | Envuelto en `<AuthProvider>`. Rutas: `/login`, `/registro`, `/prueba-de-manejo`. |
| `Navbar.jsx` | Usa `useAuth()` internamente: bienvenida + logout si hay sesión, links Login/Register si no. |
| `Home.jsx` | Monta `<FloatingTestDrive />`. Eliminada prop `usuario={null}`. |

---

## [0.4.0] - 2026-04-07

> Proyecto frontend SPA: React 18 + Vite 6 + Tailwind CSS 3, sistema de diseño industrial Ford y 3 páginas públicas.

**Agregado**

| Componente / Módulo | Descripción | Archivo |
|---|---|---|
| Proyecto frontend | React 18 + Vite 6 + Tailwind CSS 3. Proxy `/api` → `localhost:8000`. | `frontend/` |
| `Navbar` | Logo Ford SVG inline, links con underline reveal, menú hamburguesa responsive. | `Navbar.jsx` |
| `Footer` | 4 columnas: logo + descripción, Vehículos, Servicios, Contacto. | `Footer.jsx` |
| `VehiculoCard` | Imagen placeholder SVG, hover-reveal del botón "Ver detalles". | `VehiculoCard.jsx` |
| `MapaInteractivo` | Leaflet + OpenStreetMap sin API key. Coordenadas Ford Guerrero `[16.872132, -99.868984]`. | `MapaInteractivo.jsx` |
| Página `Home` | 8 secciones: hero editorial 90vh, stats, catálogo preview, formulario de cita, banner financiamiento. | `Home.jsx` |
| Página `Contact` | Split pantalla completa: formulario con scroll (izquierda) + mapa Leaflet (derecha). Horarios y directorio en grid. | `Contact.jsx` |
| Página `Financing` | Wizard de cotización en 3 pasos con stepper editorial `font-mono`. | `Financing.jsx` |
| `dev.bat` | Levanta backend Django y frontend Vite en terminales separadas. Auto-instala `node_modules`. | `dev.bat` |

**Modificado**

| Archivo | Cambio |
|---|---|
| `Navbar` | Migrado de `<a href>` a `<Link>` de React Router. |
| `Contact` | Eliminado hero, reemplazado por split formulario/mapa a pantalla completa. |
| `dev.bat` | Extendido para arrancar ambos servidores (antes solo backend). |
| `README.md` | Stack completo, Node.js como prerequisito e instrucciones del frontend. |

---

## [0.3.0] - 2026-04-06

> Conversión completa del backend a API REST con DRF, autenticación JWT y documentación OpenAPI.

**Agregado**

| Módulo | Descripción |
|---|---|
| Django REST Framework | API REST para las 4 apps. ViewSets con `DefaultRouter`. |
| JWT con SimpleJWT | Access token 8h, refresh 7 días. |
| django-cors-headers | Comunicación con frontend en `localhost:5173`. |
| drf-spectacular | Esquema OpenAPI 3.0. Swagger en `/api/docs/`, ReDoc en `/api/redoc/`. |
| Serializers | Para `accounts`, `autos`, `citas` y `vendedores`. |
| Permisos custom | `IsCliente`, `IsVendedor`, `IsAdmin`, `IsVendedorOrAdmin`, `IsOwnerOrAdmin`. |
| Asignación de vendedor | Balanceo de carga automático en `CitaCreateSerializer`. |
| Endpoint `me/` | Ver y editar perfil propio. |

**Modificado**

| Archivo | Cambio |
|---|---|
| Estructura del proyecto | Código Django movido a la carpeta `backend/`. |
| URLs | Toda la API bajo el prefijo `/api/`. |
| `docs/API.md` | Reescrito con endpoints REST. |
| `docs/ARCHITECTURE.md` | Actualizado con diagramas de arquitectura REST + JWT. |

---

## [0.2.0] - 2026-04-06

> Modelos de datos: usuarios con roles, vehículos, vendedores y citas.

**Agregado**

| Modelo | Descripción | App |
|---|---|---|
| `User` | `AbstractUser` con campo `rol` (cliente/vendedor/admin) y login por email. | `accounts` |
| `PerfilCliente` | Información extendida del cliente. | `accounts` |
| `CategoriaVehiculo`, `Vehiculo`, `ImagenVehiculo` | Catálogo de vehículos con imágenes múltiples. | `autos` |
| `Vendedor`, `DisponibilidadVendedor` | Perfil de asesor y bloques de disponibilidad horaria. Constraint `hora_fin > hora_inicio`. | `vendedores` |
| `Cita` | Estados de cita y constraint de unicidad `(vendedor, fecha_hora)`. | `citas` |
| Migraciones y admin | Migraciones iniciales aplicadas. Modelos registrados en `admin.py` con inlines y filtros. | todas las apps |
| `docs/MODELS.md` | Modelos reales, campos, tipos y diagrama ER en Mermaid. | — |

---

## [0.1.0] - 2026-04-06

> Inicialización del proyecto Django con estructura modular y documentación base.

**Agregado**

| Ítem | Descripción |
|---|---|
| Proyecto Django | Estructura modular con 4 apps: `accounts`, `autos`, `citas`, `vendedores`. |
| `settings.py` | python-decouple, WhiteNoise, SQLite (dev) / PostgreSQL (prod). |
| Carpetas | `templates/`, `static/`, `media/`, `docs/`. |
| `requirements.txt` | Dependencias del proyecto. |
| `.env` / `.env.example` | Variables de entorno. |
| Documentación base | `README.md`, `ARCHITECTURE.md`, `MODELS.md`, `ROLES.md`, `API.md`, `DEPLOYMENT.md`. |
