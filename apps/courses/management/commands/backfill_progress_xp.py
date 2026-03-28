from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from apps.courses.progress_services import (
    backfill_all_students,
    backfill_user_progress_xp_and_achievements,
)


class Command(BaseCommand):
    help = (
        "Backfill slide progress, XP and achievements for existing users. "
        "By default processes all students."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--username",
            dest="username",
            help="Process only one user by username.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            dest="dry_run",
            help="Show what would be changed without writing to DB.",
        )

    def handle(self, *args, **options):
        username = (options.get("username") or "").strip()
        dry_run = bool(options.get("dry_run"))
        User = get_user_model()

        if username:
            user = User.objects.filter(username=username).first()
            if user is None:
                raise CommandError(f"User '{username}' not found.")

            if dry_run:
                summary = self._simulate_user(user)
            else:
                summary = backfill_user_progress_xp_and_achievements(user)

            self._print_summary(summary)
            return

        if dry_run:
            from apps.courses.models import UserProgress

            users_with_progress_ids = UserProgress.objects.values_list("user_id", flat=True).distinct()
            users = (
                User.objects.filter(Q(role="student") | Q(id__in=users_with_progress_ids))
                .distinct()
                .order_by("id")
            )
            summaries = [self._simulate_user(student) for student in users]
        else:
            summaries = backfill_all_students()

        self._print_totals(summaries)

    def _simulate_user(self, user):
        from apps.courses.models import UserProgress
        from apps.courses.progress_services import MODULE_XP, SLIDE_XP, lesson_slides_count, normalize_viewed_slide_indexes

        progress_rows = UserProgress.objects.filter(user=user).select_related("lesson")
        slides_completed = 0
        completed_module_ids = set()
        progress_rows_updated = 0

        for progress in progress_rows:
            lesson_total_slides = lesson_slides_count(progress.lesson)
            normalized = normalize_viewed_slide_indexes(progress.viewed_slide_indexes, lesson_total_slides)
            if progress.completed and len(normalized) < lesson_total_slides:
                normalized = list(range(lesson_total_slides))

            slides_completed += len(normalized)
            if progress.completed and progress.module_id:
                completed_module_ids.add(progress.module_id)

            if progress.viewed_slide_indexes != normalized or progress.slides_completed != len(normalized):
                progress_rows_updated += 1

        target_xp = slides_completed * SLIDE_XP + len(completed_module_ids) * MODULE_XP
        old_xp = int(user.experience or 0)
        xp_added = max(0, target_xp - old_xp)
        simulated_xp_after = old_xp + xp_added

        return {
            "user_id": user.id,
            "username": user.username,
            "progress_rows_updated": progress_rows_updated,
            "slides_completed": slides_completed,
            "completed_modules": len(completed_module_ids),
            "target_xp": target_xp,
            "xp_before": old_xp,
            "xp_added": xp_added,
            "xp_after": simulated_xp_after,
            "level_after": user.calculate_level() if xp_added == 0 else self._calc_level_for_user(user, simulated_xp_after),
            "achievements_unlocked": 0,
            "new_achievements": [],
        }

    def _calc_level_for_user(self, user, xp_value):
        original_xp = user.experience
        try:
            user.experience = max(0, int(xp_value or 0))
            return user.calculate_level()
        finally:
            user.experience = original_xp

    def _print_summary(self, summary):
        self.stdout.write(
            self.style.SUCCESS(
                f"[{summary['user_id']}] {summary['username']}: "
                f"slides={summary['slides_completed']}, "
                f"xp {summary['xp_before']} -> {summary['xp_after']} "
                f"(+{summary['xp_added']}), "
                f"achievements +{summary['achievements_unlocked']}"
            )
        )

    def _print_totals(self, summaries):
        users_total = len(summaries)
        rows_total = sum(item["progress_rows_updated"] for item in summaries)
        xp_added_total = sum(item["xp_added"] for item in summaries)
        unlocked_total = sum(item["achievements_unlocked"] for item in summaries)

        self.stdout.write(
            self.style.SUCCESS(
                f"Processed users: {users_total}; "
                f"progress rows updated: {rows_total}; "
                f"xp added total: {xp_added_total}; "
                f"achievements unlocked: {unlocked_total}"
            )
        )

        for item in summaries:
            self.stdout.write(
                f"- [{item['user_id']}] {item['username']}: "
                f"xp {item['xp_before']} -> {item['xp_after']} (+{item['xp_added']}), "
                f"slides={item['slides_completed']}, "
                f"achievements +{item['achievements_unlocked']}"
            )
