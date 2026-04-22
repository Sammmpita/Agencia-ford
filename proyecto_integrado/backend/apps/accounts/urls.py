from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CookieTokenObtainPairView,
    CookieTokenRefreshView,
    CreateEncargadoView,
    CreateVendedorView,
    LogoutView,
    MeView,
    PerfilClienteView,
    RegisterView,
    UserAdminViewSet,
)

app_name = 'accounts'

router = DefaultRouter()
router.register('users', UserAdminViewSet, basename='users')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CookieTokenObtainPairView.as_view(), name='login'),
    path('refresh/', CookieTokenRefreshView.as_view(), name='refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('mi-perfil-cliente/', PerfilClienteView.as_view(), name='mi-perfil-cliente'),
    path('crear-vendedor/',  CreateVendedorView.as_view(),  name='crear-vendedor'),
    path('crear-encargado/', CreateEncargadoView.as_view(), name='crear-encargado'),
    path('', include(router.urls)),
]
