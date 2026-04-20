# Ford - Sistema de Agendado de Citas

Sistema web para agendar citas en una agencia Ford. Permite a los clientes
explorar el catálogo de vehículos y reservar citas con vendedores disponibles.
Los vendedores gestionan su disponibilidad y los administradores supervisan
toda la operación.

## Stack Tecnológico

| Componente     | Tecnología                          |
| -------------- | ----------------------------------- |
| Backend        | Django 4.2 + Django REST Framework  |
| Frontend       | React 18 + Vite 6 + Tailwind CSS 3  |
| Autenticación  | SimpleJWT (access 8h / refresh 7d)  |
| BD Desarrollo  | SQLite                              |
| BD Producción  | PostgreSQL                          |
| Servidor WSGI  | Gunicorn                            |
| Archivos est.  | WhiteNoise                          |
| Deploy         | Railway                             |

## Requisitos Previos

- Python 3.10 o superior
- Node.js 18 o superior
- npm 9 o superior
- pip
- Git
- (Opcional) virtualenv o venv

## Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/ford.git
cd ford

# 2. Crear y activar entorno virtual (backend)
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 3. Instalar dependencias Python
pip install -r backend/requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (SECRET_KEY, DEBUG, etc.)

# 5. Aplicar migraciones
cd backend
python manage.py migrate

# 6. Crear superusuario
python manage.py createsuperuser
cd ..

# 7. Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### Inicio rápido (Windows)

```bat
dev.bat
```

Este script levanta backend (`http://localhost:8000`) y frontend (`http://localhost:5173`) en ventanas separadas de forma automática.

## Cómo Correr el Proyecto

```bash
# ── Backend ────────────────────────────────────
# Servidor de desarrollo Django
cd backend
python manage.py runserver

# Correr tests
python manage.py test

# Recolectar archivos estáticos (producción)
python manage.py collectstatic --noinput

# ── Frontend ───────────────────────────────────
# Servidor de desarrollo Vite
cd frontend
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Estructura del Proyecto

```
ford/
├── backend/                  ← Proyecto Django
│   ├── fordapp/              ← Configuración principal (settings, urls, wsgi)
│   ├── apps/
│   │   ├── accounts/         ← Usuarios, autenticación JWT y roles
│   │   ├── autos/            ← Catálogo de vehículos (modelos, fotos, specs)
│   │   ├── citas/            ← Sistema de agendado (crear, cancelar, confirmar)
│   │   └── vendedores/       ← Perfiles de vendedores y disponibilidad horaria
│   ├── templates/            ← Templates HTML residuales (admin, base)
│   ├── static/               ← Archivos estáticos globales
│   ├── media/                ← Archivos subidos por usuarios (fotos de autos)
│   ├── requirements.txt      ← Dependencias de Python
│   └── manage.py             ← CLI de Django
├── frontend/                 ← SPA React + Vite
│   ├── public/               ← Assets estáticos servidos en raíz (logo, favicons)
│   ├── src/
│   │   ├── components/       ← Navbar, Footer, VehiculoCard, MapaInteractivo
│   │   ├── pages/
│   │   │   └── public/       ← Home, Contact, Financing
│   │   ├── App.jsx           ← Router principal (react-router-dom v6)
│   │   └── main.jsx          ← Punto de entrada React
│   ├── package.json
│   ├── vite.config.js        ← Proxy /api → localhost:8000
│   └── tailwind.config.js
├── docs/                     ← Documentación técnica del proyecto
│   ├── ARCHITECTURE.md       ← Arquitectura del sistema
│   ├── MODELS.md             ← Descripción de modelos y relaciones
│   ├── ROLES.md              ← Roles, permisos y flujos de acceso
│   ├── API.md                ← Endpoints REST documentados
│   └── DEPLOYMENT.md         ← Guía de deploy en Railway
├── dev.bat                   ← Script de arranque en Windows
├── README.md                 ← Este archivo
├── CHANGELOG.md              ← Historial de cambios
├── .env                      ← Variables de entorno (no se sube a Git)
├── .env.example              ← Plantilla de variables de entorno
└── .gitignore
```

## Variables de Entorno

| Variable         | Descripción                                | Valor por defecto             |
| ---------------- | ------------------------------------------ | ----------------------------- |
| `SECRET_KEY`     | Clave secreta de Django                    | *(obligatoria en producción)* |
| `DEBUG`          | Modo debug (`True` / `False`)              | `False`                       |
| `ALLOWED_HOSTS`  | Hosts permitidos separados por coma        | `127.0.0.1,localhost`         |
| `DB_ENGINE`      | Motor de base de datos                     | `django.db.backends.sqlite3`  |
| `DB_NAME`        | Nombre de la base de datos                 | `db.sqlite3`                  |
| `DB_USER`        | Usuario de la base de datos                | *(vacío para SQLite)*         |
| `DB_PASSWORD`    | Contraseña de la base de datos             | *(vacío para SQLite)*         |
| `DB_HOST`        | Host de la base de datos                   | *(vacío para SQLite)*         |
| `DB_PORT`        | Puerto de la base de datos                 | *(vacío para SQLite)*         |

## Deploy en Railway

Consulta la guía completa en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Resumen rápido:

1. Crear proyecto en [Railway](https://railway.app)
2. Agregar servicio PostgreSQL
3. Conectar tu repositorio de GitHub
4. Configurar las variables de entorno en Railway:
   - `SECRET_KEY` → genera una clave segura
   - `DEBUG` → `False`
   - `ALLOWED_HOSTS` → `tu-dominio.railway.app`
   - `DB_ENGINE` → `django.db.backends.postgresql`
   - Copiar credenciales de PostgreSQL de Railway
5. Railway detectará el `requirements.txt` y hará el build automáticamente
6. Configurar el comando de inicio: `gunicorn fordapp.wsgi`

## Documentación

- [Arquitectura del Sistema](docs/ARCHITECTURE.md)
- [Modelos y Relaciones](docs/MODELS.md)
- [Roles y Permisos](docs/ROLES.md)
- [Rutas URL / API](docs/API.md)
- [Guía de Deploy](docs/DEPLOYMENT.md)

## Licencia

Proyecto privado — Todos los derechos reservados.
