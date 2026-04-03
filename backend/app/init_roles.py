import logging
from sqlalchemy.orm import Session
from .models.role import Role, Permission
from .models.models import User
from .auth.auth import get_password_hash

logger = logging.getLogger(__name__)

# Определение разрешений
PERMISSIONS = [
    {"name": "analysis:create", "resource": "analysis", "action": "create",
     "description": "Создание нового анализа"},
    {"name": "analysis:view:own", "resource": "analysis", "action": "view_own",
     "description": "Просмотр своих анализов"},
    {"name": "analysis:view:all", "resource": "analysis", "action": "view_all",
     "description": "Просмотр всех анализов (админ)"},
    {"name": "analysis:delete:own", "resource": "analysis", "action": "delete_own",
     "description": "Удаление своих анализов"},
    {"name": "analysis:delete:all", "resource": "analysis", "action": "delete_all",
     "description": "Удаление любых анализов (админ)"},
    {"name": "profile:view:own", "resource": "profile", "action": "view_own",
     "description": "Просмотр своего профиля"},
    {"name": "profile:update:own", "resource": "profile", "action": "update_own",
     "description": "Обновление своего профиля"},
    {"name": "profile:change_password", "resource": "profile", "action": "change_password",
     "description": "Изменение пароля"},
    {"name": "users:view:all", "resource": "users", "action": "view_all",
     "description": "Просмотр всех пользователей"},
    {"name": "users:manage", "resource": "users", "action": "manage",
     "description": "Управление пользователями"},
    {"name": "roles:manage", "resource": "roles", "action": "manage",
     "description": "Управление ролями"},
    {"name": "stats:view:own", "resource": "stats", "action": "view_own",
     "description": "Просмотр своей статистики"},
    {"name": "stats:view:all", "resource": "stats", "action": "view_all",
     "description": "Просмотр всей статистики"},
]

ROLES = {
    "admin": {
        "description": "Администратор с полным доступом",
        "permissions": [p["name"] for p in PERMISSIONS]
    },
    "user": {
        "description": "Обычный пользователь",
        "permissions": [
            "analysis:create",
            "analysis:view:own",
            "analysis:delete:own",
            "profile:view:own",
            "profile:update:own",
            "profile:change_password",
            "stats:view:own"
        ]
    },
    "guest": {
        "description": "Гость (неавторизованный пользователь)",
        "permissions": []
    }
}


def init_roles_and_permissions(db: Session):
    """Инициализирует роли и разрешения"""
    logger.info("Инициализация ролей и разрешений...")

    # Создаем разрешения
    permissions_dict = {}
    for perm_data in PERMISSIONS:
        perm = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not perm:
            perm = Permission(**perm_data)
            db.add(perm)
            logger.info(f"Создано разрешение: {perm_data['name']}")
        permissions_dict[perm_data["name"]] = perm

    db.flush()

    # Создаем роли
    roles_dict = {}
    for role_name, role_data in ROLES.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=role_data["description"])
            db.add(role)
            logger.info(f"Создана роль: {role_name}")

        # Обновляем разрешения роли
        role.permissions = []
        for perm_name in role_data["permissions"]:
            if perm_name in permissions_dict:
                role.permissions.append(permissions_dict[perm_name])

        roles_dict[role_name] = role

    db.commit()
    logger.info("Роли и разрешения успешно инициализированы")
    return roles_dict, permissions_dict


def ensure_admin_exists(db: Session):
    """Создает администратора, если его нет - ТОЛЬКО ОДНОГО"""
    admin_role = db.query(Role).filter(Role.name == 'admin').first()
    if not admin_role:
        logger.warning("Роль 'admin' не найдена, пропускаем создание админа")
        return

    # Проверяем, есть ли уже администратор
    admin_exists = db.query(User).join(User.roles).filter(Role.name == 'admin').first()

    if not admin_exists:
        # Создаем ТОЛЬКО ОДНОГО тестового администратора
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        db.add(admin_user)
        db.flush()

        admin_user.roles.append(admin_role)
        db.commit()

        logger.info("Создан тестовый администратор: admin / admin123")
    else:
        logger.info("Администратор уже существует")