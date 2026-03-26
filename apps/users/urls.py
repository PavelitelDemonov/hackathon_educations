from django.urls import path
from apps.users import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

app_name = 'users'

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth_register'),
    path('profile/', views.ProfileView.as_view(), name ="profile"),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
   #path('protected/', views.ProtectedView.as_view(), name='protected_resource')

]