from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(512), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    replaced_by = Column(Integer, ForeignKey("refresh_tokens.id", ondelete="SET NULL"), nullable=True)
    user_agent = Column(String(255), nullable=True)
    ip_address = Column(String(45), nullable=True)
    is_revoked = Column(Boolean, default=False)

    # Отношения
    user = relationship("User", back_populates="refresh_tokens")
    replaced_by_token = relationship("RefreshToken", remote_side=[id], foreign_keys=[replaced_by])

    def is_valid(self) -> bool:
        """Проверяет, действителен ли токен"""
        return (
            not self.is_revoked
            and self.revoked_at is None
            and self.expires_at > datetime.utcnow()
        )

    def revoke(self):
        """Отзывает токен"""
        self.is_revoked = True
        self.revoked_at = datetime.utcnow()