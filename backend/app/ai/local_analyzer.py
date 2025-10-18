# backend/app/ai/local_analyzer.py
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
import aiofiles
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class LocalRepositoryAnalyzer:
    def __init__(self):
        self.supported_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.rs': 'rust',
            '.go': 'go',
            '.rb': 'ruby',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.html': 'html',
            '.css': 'css',
            '.sql': 'sql',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown'
        }

    def validate_path(self, local_path: str) -> Path:
        """Проверяет и нормализует путь"""
        try:
            path = Path(local_path).resolve()
            if not path.exists():
                raise HTTPException(status_code=400, detail=f"Путь не существует: {local_path}")
            return path
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Некорректный путь: {str(e)}")

    def discover_code_files(self, repo_path: Path,
                            include_patterns: Optional[List[str]] = None,
                            exclude_patterns: Optional[List[str]] = None,
                            max_file_size: int = 1024 * 1024) -> List[Path]:
        """Находит все файлы с кодом в локальной директории"""

        default_include = ["*" + ext for ext in self.supported_extensions.keys()]
        default_exclude = [
            "*/__pycache__/*", "*/node_modules/*", "*/target/*", "*/dist/*",
            "*/build/*", "*/.git/*", "*/venv/*", "*/env/*", "*/\.env*",
            "*/static/*", "*/media/*", "*/migrations/*"
        ]

        include_patterns = include_patterns or default_include
        exclude_patterns = exclude_patterns or default_exclude

        code_files = []

        try:
            logger.info(f"🔍 Поиск файлов в: {repo_path}")

            for pattern in include_patterns:
                for file_path in repo_path.rglob(pattern):
                    # Проверяем исключения
                    if any(file_path.match(exclude) for exclude in exclude_patterns):
                        continue

                    # Пропускаем директории
                    if not file_path.is_file():
                        continue

                    # Проверяем размер файла
                    try:
                        if file_path.stat().st_size > max_file_size:
                            logger.debug(f"Файл слишком большой, пропускаем: {file_path}")
                            continue
                    except OSError:
                        continue

                    # Проверяем расширение
                    if file_path.suffix.lower() in self.supported_extensions:
                        code_files.append(file_path)

            logger.info(f"📁 Найдено файлов с кодом: {len(code_files)}")
            return code_files

        except Exception as e:
            logger.error(f"❌ Ошибка при поиске файлов: {e}")
            return []

    def detect_language(self, file_path: Path) -> str:
        """Определяет язык программирования по расширению файла"""
        return self.supported_extensions.get(file_path.suffix.lower(), 'unknown')

    async def read_file_content(self, file_path: Path) -> str:
        """Асинхронно читает содержимое файла"""
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            return content
        except UnicodeDecodeError:
            try:
                async with aiofiles.open(file_path, 'r', encoding='latin-1') as f:
                    content = await f.read()
                return content
            except Exception as e:
                logger.error(f"❌ Ошибка чтения файла {file_path}: {e}")
                return ""
        except Exception as e:
            logger.error(f"❌ Ошибка чтения файла {file_path}: {e}")
            return ""

    def get_project_structure(self, repo_path: Path) -> Dict[str, Any]:
        """Возвращает структуру проекта"""
        structure = {}

        for item in repo_path.iterdir():
            if item.name in ['.git', '__pycache__', 'node_modules', 'venv', 'env']:
                continue

            if item.is_dir():
                structure[item.name] = self._get_dir_structure(item)
            else:
                structure[item.name] = 'file'

        return structure

    def _get_dir_structure(self, directory: Path) -> Dict[str, Any]:
        """Рекурсивно получает структуру директории"""
        structure = {}

        try:
            for item in directory.iterdir():
                if item.name.startswith('.'):
                    continue

                if item.is_dir():
                    structure[item.name] = self._get_dir_structure(item)
                else:
                    structure[item.name] = 'file'
        except PermissionError:
            structure['[permission_denied]'] = 'error'

        return structure


# Глобальный экземпляр анализатора
local_analyzer = LocalRepositoryAnalyzer()