from django.urls import path
from apps.users import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

app_name = 'users'

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='auth_register'),
    #path('token/', views.LoginView.as_view(), name='token_obtain_pair'),
    path('profile/', views.ProfileView.as_view(), name ="profile"),

    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('student/', views.StudentDashboard.as_view(), name='student_dashboard'),
    path('parent/child-progress/', views.ParentChildProgressView.as_view(), name='parent_child_progress'),
    path('teacher/', views.TeacherDashboard.as_view(), name='teacher_dashboard'),
    path('admin/', views.AdminDashboard.as_view(), name='admin_dashboard'),
    
   #path('protected/', views.ProtectedView.as_view(), name='protected_resource')

]
