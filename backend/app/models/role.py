from sqlalchemy import Column, Integer, String, Boolean, Table, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

# Таблица связи многие-ко-многим: пользователи и роли
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id')),
    Column('role_id', Integer, ForeignKey('roles.id'))
)

# Таблица связи многие-ко-многим: роли и разрешения
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id')),
    Column('permission_id', Integer, ForeignKey('permissions.id'))
)


class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # 'admin', 'user', 'guest'
    description = Column(String)

    # Связи
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")


class Permission(Base):
    __tablename__ = 'permissions'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)  # 'create:analysis', 'delete:own:analysis'
    resource = Column(String)  # 'analysis', 'user', 'stats'
    action = Column(String)    # 'create', 'read', 'update', 'delete'
    description = Column(String)

    # Связи
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")