from django.urls import path
from . import views

app_name = 'courses'

urlpatterns = [
    path('modules/', views.ModuleListView.as_view(), name='module_list'),
    path('modules/<int:pk>/', views.ModuleDetailView.as_view(), name='module_detail'),
    path('teacher/curriculum-tree/', views.TeacherCurriculumTreeView.as_view(), name='teacher_curriculum_tree'),
    path('teacher/modules/', views.TeacherModuleListCreateView.as_view(), name='teacher_module_list_create'),
    path('teacher/modules/<int:pk>/', views.TeacherModuleDetailView.as_view(), name='teacher_module_detail'),
    path('teacher/modules/<int:module_id>/lessons/', views.TeacherLessonListCreateView.as_view(), name='teacher_lesson_list_create'),
    path('teacher/lessons/<int:pk>/', views.TeacherLessonDetailView.as_view(), name='teacher_lesson_detail'),
    path('teacher/lessons/<int:lesson_id>/steps/', views.TeacherLessonStepListCreateView.as_view(), name='teacher_step_list_create'),
    path('teacher/steps/<int:pk>/', views.TeacherLessonStepDetailView.as_view(), name='teacher_step_detail'),
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
