from rest_framework import permissions

class HasRolePermission(permissions.BasePermission):
    allowed_roles = []
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles
    
class IsStudent(HasRolePermission):
    allowed_roles = ['student']

class IsTeacher(HasRolePermission):
    allowed_roles = ['teacher', 'admin']

class IsAdmin(HasRolePermission):
    allowed_roles = ['admin']