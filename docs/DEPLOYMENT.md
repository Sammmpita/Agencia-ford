# Guía de Deploy en Railway

Guía paso a paso para desplegar el proyecto Ford en
[Railway](https://railway.app).

---

## Requisitos Previos

- Cuenta en [Railway](https://railway.app) (se puede crear con GitHub).
- Repositorio del proyecto subido a GitHub.
- El proyecto debe funcionar correctamente en local.

---

## Paso 1: Crear el Proyecto en Railway

1. Inicia sesión en [Railway](https://railway.app).
2. Click en **"New Project"**.
3. Selecciona **"Deploy from GitHub repo"**.
4. Autoriza Railway para acceder a tu repositorio si es la primera vez.
5. Selecciona el repositorio `ford`.
6. Railway detectará automáticamente que es un proyecto Python.

---

## Paso 2: Agregar PostgreSQL

1. Dentro de tu proyecto en Railway, click en **"+ New"** → **"Database"**.
2. Selecciona **"Add PostgreSQL"**.
3. Railway creará una instancia de PostgreSQL y la asociará al proyecto.
4. En la pestaña **"Variables"** del servicio PostgreSQL, encontrarás las
   credenciales de conexión:
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`
   - `DATABASE_URL` (connection string completo)

---

## Paso 3: Configurar Variables de Entorno

En tu servicio web (no en PostgreSQL), ve a la pestaña **"Variables"** y
agrega las siguientes variables:

| Variable         | Valor                                      |
| ---------------- | ------------------------------------------ |
| `SECRET_KEY`     | *(genera una clave segura — ver abajo)*    |
| `DEBUG`          | `False`                                    |
| `ALLOWED_HOSTS`  | `tu-proyecto.up.railway.app`               |
| `DB_ENGINE`      | `django.db.backends.postgresql`            |
| `DB_NAME`        | *(copiar `PGDATABASE` de PostgreSQL)*      |
| `DB_USER`        | *(copiar `PGUSER` de PostgreSQL)*          |
| `DB_PASSWORD`    | *(copiar `PGPASSWORD` de PostgreSQL)*      |
| `DB_HOST`        | *(copiar `PGHOST` de PostgreSQL)*          |
| `DB_PORT`        | *(copiar `PGPORT` de PostgreSQL)*          |

### Generar SECRET_KEY

Ejecuta este comando en tu terminal local:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copia el resultado y pégalo como valor de `SECRET_KEY` en Railway.

---

## Paso 4: Configurar Archivos de Deploy

### `Procfile` (crear en la raíz del proyecto)

```
web: gunicorn fordapp.wsgi --bind 0.0.0.0:$PORT
```

### `runtime.txt` (opcional — especificar versión de Python)

```
python-3.12.4
```

### `railway.json` (opcional — configuración avanzada)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn fordapp.wsgi --bind 0.0.0.0:$PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

> **Nota:** Si usas `railway.json`, no necesitas el `Procfile` por separado.
> El `startCommand` corre las migraciones y collectstatic antes de iniciar
> Gunicorn.

---

## Paso 5: Deploy

1. Haz push de tu código a la rama principal (normalmente `main`):

   ```bash
   git add .
   git commit -m "Preparar para deploy en Railway"
   git push origin main
   ```

2. Railway detectará el push y comenzará el build automáticamente.
3. Puedes ver el progreso en el dashboard de Railway → tu servicio → **"Deployments"**.
4. Una vez completado, Railway te dará una URL pública como:
   `https://tu-proyecto.up.railway.app`

---

## Paso 6: Crear Superusuario en Producción

Después del primer deploy exitoso, necesitas crear un superusuario.

1. En Railway, ve a tu servicio web.
2. Abre la pestaña **"Settings"**.
3. En la sección de terminal o usa el CLI de Railway:

   ```bash
   # Instalar CLI de Railway
   npm install -g @railway/cli

   # Login
   railway login

   # Vincular proyecto
   railway link

   # Ejecutar comando en producción
   railway run python manage.py createsuperuser
   ```

---

## Paso 7: Verificar el Deploy

1. Visita tu URL pública: `https://tu-proyecto.up.railway.app`
2. Verifica que la página de inicio carga correctamente.
3. Visita `/admin/` y verifica que puedes hacer login con el superusuario.
4. Verifica que los archivos estáticos (CSS, JS) cargan correctamente
   (servidos por WhiteNoise).

---

## Solución de Problemas Comunes

### Error: "DisallowedHost"

**Causa:** El dominio de Railway no está en `ALLOWED_HOSTS`.

**Solución:** Actualiza la variable `ALLOWED_HOSTS` en Railway con el dominio
correcto (ej: `tu-proyecto.up.railway.app`).

### Error: "Static files not found"

**Causa:** `collectstatic` no se ejecutó durante el deploy.

**Solución:** Asegúrate de que tu `startCommand` incluye
`python manage.py collectstatic --noinput` antes de `gunicorn`.

### Error: "OperationalError: could not connect to server"

**Causa:** Las variables de la base de datos no están configuradas o son
incorrectas.

**Solución:** Verifica que `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
y `DB_NAME` coinciden con las credenciales de PostgreSQL en Railway.

### Error: "ModuleNotFoundError"

**Causa:** Falta alguna dependencia en `requirements.txt`.

**Solución:** Verifica que todas las dependencias están listadas y haz
`pip freeze > requirements.txt` si es necesario.

---

## Checklist de Deploy

Antes de hacer deploy, asegúrate de cumplir con todos estos puntos:

**Backend**
- [ ] `DEBUG=False` en las variables de entorno de Railway
- [ ] `SECRET_KEY` generada y configurada (no usar la de desarrollo)
- [ ] `ALLOWED_HOSTS` configurado con el dominio de Railway
- [ ] PostgreSQL agregado como servicio en Railway
- [ ] Variables de BD (`DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
      `DB_HOST`, `DB_PORT`) configuradas correctamente
- [ ] `requirements.txt` actualizado con todas las dependencias
- [ ] `Procfile` o `railway.json` creado con el comando de inicio
- [ ] `whitenoise` en `MIDDLEWARE` de `settings.py`
- [ ] `STATIC_ROOT` configurado en `settings.py`
- [ ] Migraciones corren sin errores en local
- [ ] `collectstatic` corre sin errores en local
- [ ] Superusuario creado en producción después del primer deploy
- [ ] Archivos estáticos cargan correctamente en la URL pública
- [ ] Panel de admin accesible en `/admin/`
- [ ] No hay información sensible hardcodeada en el código

**Frontend**
- [ ] `npm run build` completa sin errores en local
- [ ] Carpeta `frontend/dist/` generada correctamente
- [ ] Variables de entorno de producción configuradas (si aplica)
- [ ] URL del backend actualizada en la configuración del proxy o variables de entorno

---

## Deploy del Frontend

El frontend es una SPA estática — el build de producción genera una carpeta
`frontend/dist/` con HTML, CSS y JS optimizados.

### Build Local

```bash
cd frontend
npm run build
# Genera: frontend/dist/
```

### Opciones de Despliegue

#### Opción A — Frontend en Railway (servicio separado)

Crea un segundo servicio en el mismo proyecto de Railway:

1. **"+ New"** → **"GitHub Repo"** → selecciona el mismo repo.
2. En **"Settings"** del nuevo servicio, configura:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Start Command:** `npx serve dist -s`
3. Configura la variable de entorno `VITE_API_URL` con la URL del backend:
   ```
   VITE_API_URL=https://tu-backend.up.railway.app
   ```

#### Opción B — Frontend en Vercel / Netlify (recomendado para SPAs)

```bash
# Vercel (desde la carpeta frontend/)
npx vercel --prod

# Netlify (desde la carpeta frontend/)
npx netlify deploy --prod --dir=dist
```

Configura la variable de entorno `VITE_API_URL` en el dashboard de la
plataforma elegida.

#### Opción C — Servir el frontend desde Django (monolito)

Para servir el `dist/` de React desde Django con WhiteNoise:

1. Copia o enlaza `frontend/dist/` a `backend/static/react/`.
2. En `settings.py`, agrega el directorio a `STATICFILES_DIRS`.
3. Configura una vista catch-all en `fordapp/urls.py` que sirva `index.html`
   para rutas no-API (necesario para React Router en modo historia).

```python
# fordapp/urls.py — catch-all para React Router
from django.views.generic import TemplateView

urlpatterns = [
    # ... tus urls existentes
    path('', TemplateView.as_view(template_name='index.html')),
]
```

> Esta opción reduce la infraestructura a un solo servicio pero acopla
> el ciclo de build del frontend al deploy del backend.

---

### Configurar URL del API en el Frontend

En desarrollo, Vite resuelve `/api/*` hacia `localhost:8000` vía el proxy
configurado en `vite.config.js`. En producción, actualiza el proxy o usa
una variable de entorno:

```js
// src/hooks/useApi.js (patrón recomendado)
const BASE_URL = import.meta.env.VITE_API_URL ?? ''
```

```
# .env.production
VITE_API_URL=https://tu-backend.up.railway.app
```

