from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    path('modules/', views.ModuleListView.as_view(), name='module_list'),
    path('modules/<int:pk>/', views.ModuleDetailView.as_view(), name='module_detail'),
    path('modules/<int:module_id>/lessons/', views.LessonListView.as_view(), name='lesson_list'),
    path('lessons/<int:pk>/', views.LessonDetailView.as_view(), name='lesson_detail'),
    path('progress/', views.UserProgressListView.as_view(), name='progress_list'),
    path('progress/sync-slides/', views.ProgressSlidesBulkSyncView.as_view(), name='progress_sync_slides'),
    path('lessons/<int:lesson_id>/complete/',views.CompleteLessonView.as_view(), name='complete_lesson'),
    path('achievements/', views.AchievementListView.as_view(), name='achievement_list'),
    path('progress/<int:pk>/', views.UserProgressDetailView.as_view(), name='progress_detail'),

]
