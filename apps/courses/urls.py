from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    path('modules/', views.ModuleListView.as_view(), name='module_list'),
    path('modules/<int:pk>/', views.ModuleDetailView.as_view(), name='module_detail'),
    path('modules/<int:module_id>/lessons/', views.LessonListView.as_view(), name='lesson_list'),
    path('lessons/<int:pk>/', views.LessonDetailView.as_view(), name='lesson_detail'),
    path('lessons/<int:lesson_id>/steps/', views.LessonStepListView.as_view(), name='lesson_steps'),
    path('steps/<int:step_id>/submit/', views.SubmitLessonStepAttemptView.as_view(), name='step_submit'),
    path('progress/', views.UserProgressListView.as_view(), name='progress_list'),
    path('progress/sync-slides/', views.ProgressSlidesBulkSyncView.as_view(), name='progress_sync_slides'),
    path('lessons/<int:lesson_id>/complete/',views.CompleteLessonView.as_view(), name='complete_lesson'),
    path('achievements/', views.AchievementListView.as_view(), name='achievement_list'),
    path('achievements/pvz-cup/', views.UnlockPvzCupAchievementView.as_view(), name='achievement_pvz_cup'),
    path('progress/<int:pk>/', views.UserProgressDetailView.as_view(), name='progress_detail'),

]
