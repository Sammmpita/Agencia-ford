# Roles, Permisos y Flujos de Acceso

Este documento define los roles del sistema, los permisos asociados a cada
uno, y los flujos de registro y acceso.

---

## Roles del Sistema

### Cliente

**Descripción:** Usuario final que visita la plataforma para explorar
vehículos y agendar citas con vendedores de la agencia Ford.

**Se registra:** Por su cuenta desde la página pública de registro.

**Capacidades:**
- Ver catálogo de vehículos
- Ver detalle de cada vehículo
- Agendar una nueva cita
- Ver sus citas (historial)
- Cancelar una cita pendiente
- Editar su perfil

### Vendedor

**Descripción:** Personal de la agencia que atiende citas con clientes.
Configura su horario de disponibilidad y gestiona las citas asignadas.

**Se registra:** Creado por un administrador desde el panel de admin.

**Capacidades:**
- Ver su calendario de citas
- Confirmar o rechazar citas pendientes
- Marcar citas como completadas
- Configurar sus horarios de disponibilidad
- Ver datos del cliente en cada cita
- Editar su perfil profesional

### Administrador

**Descripción:** Rol con acceso total al sistema. Gestiona usuarios,
vehículos, citas y configuración general.

**Se registra:** Creado vía `createsuperuser` o por otro admin.

**Capacidades:**
- Todo lo que puede hacer un vendedor
- CRUD completo de vehículos y categorías
- CRUD de usuarios (crear vendedores, desactivar cuentas)
- Ver todas las citas del sistema
- Acceso al Django Admin
- Ver reportes y estadísticas

---

## Tabla de Permisos por Vista

| Vista / Acción                    | Cliente | Vendedor | Admin |
| --------------------------------- | :-----: | :------: | :---: |
| Ver página de inicio              |   ✅    |    ✅    |  ✅   |
| Ver catálogo de vehículos         |   ✅    |    ✅    |  ✅   |
| Ver detalle de vehículo           |   ✅    |    ✅    |  ✅   |
| Crear vehículo                    |   ❌    |    ❌    |  ✅   |
| Editar vehículo                   |   ❌    |    ❌    |  ✅   |
| Eliminar vehículo                 |   ❌    |    ❌    |  ✅   |
| Agendar cita                      |   ✅    |    ❌    |  ✅   |
| Ver mis citas                     |   ✅    |    ✅    |  ✅   |
| Cancelar cita propia              |   ✅    |    ✅    |  ✅   |
| Confirmar / rechazar cita         |   ❌    |    ✅    |  ✅   |
| Completar cita                    |   ❌    |    ✅    |  ✅   |
| Ver todas las citas del sistema   |   ❌    |    ❌    |  ✅   |
| Configurar disponibilidad         |   ❌    |    ✅    |  ✅   |
| Gestionar usuarios                |   ❌    |    ❌    |  ✅   |
| Acceder a Django Admin            |   ❌    |    ❌    |  ✅   |
| Editar perfil propio              |   ✅    |    ✅    |  ✅   |
| Ver perfil de vendedores          |   ✅    |    ✅    |  ✅   |

---

## Flujo de Registro y Acceso

### Registro de Cliente

```
Visitante
    │
    ▼
Página de Registro (/accounts/register/)
    │
    ├── Ingresa: nombre, email, teléfono, contraseña
    │
    ▼
Se crea Usuario con rol='cliente'
Se crea PerfilCliente asociado automáticamente (signal)
    │
    ▼
Redirect → Login
    │
    ▼
Login (/accounts/login/)
    │
    ▼
Dashboard de Cliente
```

### Creación de Vendedor (por Admin)

```
Admin logueado
    │
    ▼
Django Admin → Usuarios → Crear nuevo usuario
    │
    ├── Asignar rol='vendedor'
    │
    ▼
Se crea Vendedor (perfil profesional) automáticamente (signal)
    │
    ▼
El vendedor recibe credenciales
    │
    ▼
Login → Dashboard de Vendedor
```

### Flujo de Login

```
Usuario (cualquier rol)
    │
    ▼
Página de Login (/accounts/login/)
    │
    ├── Ingresa: email + contraseña
    │
    ▼
Autenticación Django
    │
    ├── ❌ Credenciales inválidas → Error + retry
    │
    ├── ✅ Autenticado
    │   │
    │   ├── rol == 'cliente'   → Redirect a Dashboard Cliente
    │   ├── rol == 'vendedor'  → Redirect a Dashboard Vendedor
    │   └── rol == 'admin'     → Redirect a Dashboard Admin
    │
    ▼
Dashboard según rol
```

---

## Control de Acceso — Implementación

### Backend (Django REST Framework)

Los permisos se implementan como clases en `apps/accounts/permissions.py` y se
asignan por ViewSet:

```python
# apps/accounts/permissions.py
class IsCliente(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol == 'cliente'

class IsVendedorOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.rol in ('vendedor', 'admin')

class IsOwnerOrAdmin(BasePermission):
    """Permite a un usuario ver/editar únicamente su propio objeto."""
    def has_object_permission(self, request, view, obj):
        return request.user.rol == 'admin' or obj == request.user
```

| ViewSet | Acción | Permiso requerido |
|---|---|---|
| `CitaViewSet.create` | Crear cita | `IsCliente` |
| `CitaViewSet.retrieve` | Ver detalle de cita | `IsOwnerOrAdmin` |
| `CitaViewSet.partial_update` | Cambiar estado | `IsVendedorOrAdmin` |
| `VehiculoViewSet.list/retrieve` | Ver catálogo | Público (AllowAny) |
| `VehiculoViewSet.create/update/destroy` | CRUD catálogo | `IsAdmin` |
| `UserAdminViewSet` | Gestión de usuarios | `IsAdmin` |

### Frontend (React — AuthContext + PrivateRoute)

El control de acceso en el frontend se implementa en dos capas:

**Capa 1 — `AuthContext` (`src/context/AuthContext.jsx`)**

Mantiene el estado global `user`. Al montar la app ejecuta
`GET /api/accounts/me/` con el token en `localStorage` para restaurar la sesión.
Si no hay token o el token expiró, `user = null`.

```jsx
// src/context/AuthContext.jsx
const TOKEN_KEY = 'ford_access'
const REFRESH_KEY = 'ford_refresh'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Al montar: lee ford_access, llama /me/, setUser(data) o setUser(null)
  // login(email, password): POST /login → guarda tokens → fetchMe()
  // logout(): elimina tokens de localStorage, setUser(null)
  // register(data): POST /register → login automático
  // getToken(): retorna localStorage.getItem('ford_access')
}
```

**Capa 2 — `PrivateRoute` (`src/components/PrivateRoute.jsx`)**

Envuelve rutas que requieren sesión activa en `App.jsx`:

```jsx
// src/App.jsx
<Route
  path="/prueba-de-manejo"
  element={
    <PrivateRoute>
      <TestDrive />
    </PrivateRoute>
  }
/>
```

```jsx
// src/components/PrivateRoute.jsx
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />  // Espera restauración de sesión

  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return children
}
```

---

## Flujo de Acceso Frontend — Ruta Protegida

```
Visitante navega a /prueba-de-manejo
    │
    ▼
PrivateRoute evalúa AuthContext
    │
    ├── loading === true → Spinner (esperando /me/)
    │
    ├── user === null → Redirect a /login
    │       │
    │       ▼
    │   Página /login
    │       │
    │       ├── Login exitoso → token guardado → user cargado vía /me/
    │       │
    │       └── Redirect de vuelta a /prueba-de-manejo (state.from)
    │
    └── user !== null → Renderiza <TestDrive />
            │
            ▼
        Datos pre-llenados desde user (solo lectura)
        Selector vehículos cargado desde GET /api/autos/vehiculos/
        Formulario enviado como POST /api/citas/ con Bearer token
            │
            ▼
        Pantalla de confirmación → Cita creada
```

```python
# apps/accounts/mixins.py

from django.contrib.auth.mixins import LoginRequiredMixin
from django.core.exceptions import PermissionDenied

class VendedorRequiredMixin(LoginRequiredMixin):
    def dispatch(self, request, *args, **kwargs):
        if request.user.rol != 'vendedor':
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)
```
