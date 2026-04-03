from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(255), unique=True, index=True, nullable=False)  # UUID для S3
    filename = Column(String(255), nullable=False)  # Сохраненное имя в S3
    original_name = Column(String(255), nullable=False)  # Оригинальное имя файла
    file_size = Column(BigInteger, nullable=False)
    content_type = Column(String(100), nullable=False)
    analysis_id = Column(Integer, ForeignKey("analysis_history.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Отношения
    analysis = relationship("AnalysisHistory", back_populates="files")
    user = relationship("User", back_populates="files")