from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .permissions import IsAdmin, IsCliente
from .serializers import (
    CreateEncargadoSerializer,
    CreateVendedorSerializer,
    PerfilClienteSerializer,
    RegisterSerializer,
    UserAdminSerializer,
    UserSerializer,
)


# ---------------------------------------------------------------------------
# Throttle específico para el endpoint de login
# ---------------------------------------------------------------------------

class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


# ---------------------------------------------------------------------------
# Autenticación basada en cookies HttpOnly
# ---------------------------------------------------------------------------

def _set_refresh_cookie(response, refresh_token: str) -> None:
    """Escribe el refresh token en una cookie HttpOnly."""
    max_age = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(
        key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
        value=refresh_token,
        max_age=max_age,
        httponly=settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        secure=not settings.DEBUG,
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
        path='/api/accounts/',
    )


class CookieTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/accounts/login/
    Devuelve el access token en el body y guarda el refresh token
    en una cookie HttpOnly para evitar exposición via XSS.
    """
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop('refresh', None)
            if refresh_token:
                _set_refresh_cookie(response, refresh_token)
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/accounts/refresh/
    Lee el refresh token desde la cookie HttpOnly y devuelve un nuevo access token.
    """
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        raw_refresh = request.COOKIES.get(settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'])
        if not raw_refresh:
            return Response(
                {'detail': 'No se encontró token de refresco.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            token = RefreshToken(raw_refresh)
            access = str(token.access_token)
        except Exception:
            return Response(
                {'detail': 'Token de refresco inválido o expirado.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response({'access': access})

        # Rotar refresh token si está configurado
        if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS'):
            _set_refresh_cookie(response, str(token))

        return response


class LogoutView(APIView):
    """
    POST /api/accounts/logout/
    Elimina la cookie de refresh token, cerrando la sesión.
    """
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        response = Response({'detail': 'Sesión cerrada correctamente.'})
        response.delete_cookie(
            key=settings.SIMPLE_JWT['AUTH_COOKIE_REFRESH'],
            path='/api/accounts/',
        )
        return response

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/accounts/register/ — Registro público de nuevos clientes."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (AllowAny,)


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/accounts/me/ — Datos del usuario autenticado.
    PUT/PATCH              — Actualizar nombre, teléfono, etc.
    """

    serializer_class = UserSerializer
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user


class UserAdminViewSet(viewsets.ModelViewSet):
    """Solo admin: listar usuarios, cambiar roles, activar/desactivar."""

    queryset = User.objects.all().order_by('id')
    serializer_class = UserAdminSerializer
    permission_classes = (IsAdmin,)
    http_method_names = ('get', 'patch', 'head', 'options')


class CreateVendedorView(generics.CreateAPIView):
    """
    POST /api/accounts/crear-vendedor/
    Solo admin. Crea un usuario rol=vendedor y su perfil Vendedor en una sola petición.
    """

    serializer_class = CreateVendedorSerializer
    permission_classes = (IsAdmin,)


class CreateEncargadoView(generics.CreateAPIView):
    """
    POST /api/accounts/crear-encargado/
    Solo admin. Crea un usuario con rol=encargado de taller.
    """

    serializer_class = CreateEncargadoSerializer
    permission_classes = (IsAdmin,)


class PerfilClienteView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/accounts/mi-perfil-cliente/ — Datos extendidos del cliente.
    PATCH /api/accounts/mi-perfil-cliente/ — Actualizar dirección, ciudad.
    """

    serializer_class = PerfilClienteSerializer
    permission_classes = (IsCliente,)

    def get_object(self):
        from .models import PerfilCliente
        perfil, _ = PerfilCliente.objects.get_or_create(usuario=self.request.user)
        return perfil
