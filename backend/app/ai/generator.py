import torch
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
import logging
import os
from typing import Dict, List, Optional
import time
from pathlib import Path

logger = logging.getLogger(__name__)


class RealMLGenerator:

    def __init__(self, model_path: str = "./real_trained_model"):
        self.model_path = Path(model_path)
        self.generator = None
        self.tokenizer = None
        self.model = None
        self.is_ready = False
        self.model_type = "none"
        self.load_model()

    def load_model(self):
        """Загружает обученную ML модель с улучшенной логикой"""
        try:
            if self.model_path.exists() and any(self.model_path.iterdir()):
                logger.info("🔄 Загружаем обученную ML модель...")

                self.tokenizer = AutoTokenizer.from_pretrained(
                    str(self.model_path),
                    local_files_only=True
                )

                if self.tokenizer.pad_token is None:
                    self.tokenizer.pad_token = self.tokenizer.eos_token

                self.model = AutoModelForCausalLM.from_pretrained(
                    str(self.model_path),
                    local_files_only=True,
                    torch_dtype=torch.float32
                )

                self.generator = pipeline(
                    "text-generation",
                    model=self.model,
                    tokenizer=self.tokenizer,
                    device=0 if torch.cuda.is_available() else -1,  # Автоопределение GPU
                    torch_dtype=torch.float32,
                    max_length=500
                )

                self.is_ready = True
                self.model_type = "fine_tuned"
                logger.info("✅ Fine-tuned ML модель успешно загружена!")

            else:
                logger.warning("❌ Обученная модель не найдена, используем базовую")
                self._load_base_model()

        except Exception as e:
            logger.error(f"❌ Ошибка загрузки fine-tuned модели: {e}")
            self._load_base_model()

    def _load_base_model(self):
        """Загружает базовую модель с улучшенной обработкой"""
        try:
            logger.info("🔄 Загружаем базовую ML модель...")

            # Используем более подходящую модель для генерации кода
            base_model = "sberbank-ai/rugpt3small_based_on_gpt2"

            self.generator = pipeline(
                "text-generation",
                model=base_model,
                device=0 if torch.cuda.is_available() else -1,
                torch_dtype=torch.float32 if torch.cuda.is_available() else torch.float32
            )

            self.is_ready = True
            self.model_type = "base"
            logger.info("✅ Базовая ML модель загружена")

        except Exception as e:
            logger.error(f"❌ Ошибка загрузки базовой модели: {e}")
            self.generator = None
            self.is_ready = False

    def get_status(self) -> Dict:
        """Возвращает статус ML модели"""
        return {
            "status": "ready" if self.is_ready else "not_ready",
            "model_type": self.model_type,
            "device": "cuda" if torch.cuda.is_available() else "cpu",
            "has_model": self.generator is not None
        }

    def _create_enhanced_prompt(self, code: str, language: str) -> str:
        """Создает улучшенный промпт для генерации документации"""

        language_templates = {
            "python": "Напиши подробную документацию для этого Python кода:\n\n{code}\n\nДокументация:",
            "javascript": "Напиши документацию для этого JavaScript кода:\n\n{code}\n\nДокументация:",
            "java": "Напиши документацию для этого Java кода:\n\n{code}\n\nДокументация:",
            "cpp": "Напиши документацию для этого C++ кода:\n\n{code}\n\nДокументация:"
        }

        template = language_templates.get(language, "Напиши документацию для этого кода:\n\n{code}\n\nДокументация:")
        return template.format(code=code)

    def generate_documentation(self, code: str, context: Optional[Dict] = None) -> Dict:
        """Генерирует документацию с помощью реальной ML модели"""
        if not self.is_ready or self.generator is None:
            return self._fallback_generation(code, context)

        try:
            language = context.get('language', 'python') if context else 'python'

            # Очищаем код от лишних пробелов
            cleaned_code = '\n'.join([line for line in code.split('\n') if line.strip()])

            # Создаем улучшенный промпт
            prompt = self._create_enhanced_prompt(cleaned_code, language)

            logger.info(f"🤖 ML модель ({self.model_type}) генерирует документацию...")
            start_time = time.time()

            # Генерируем текст с улучшенными параметрами
            result = self.generator(
                prompt,
                max_length=400,
                min_length=50,
                num_return_sequences=1,
                temperature=0.8,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.1,
                pad_token_id=self.generator.tokenizer.eos_token_id,
                eos_token_id=self.generator.tokenizer.eos_token_id,
                early_stopping=True
            )

            generation_time = time.time() - start_time

            generated_text = result[0]['generated_text']
            documentation = generated_text[len(prompt):].strip()

            # Улучшенная проверка качества генерации
            if self._is_low_quality_generation(documentation):
                logger.warning("⚠️ Низкое качество генерации, используем fallback")
                documentation = self._enhanced_fallback_generation(cleaned_code, language)

            return {
                "summary": f"ML-сгенерированная документация ({self.model_type})",
                "documentation": f"# Документация\n\n{documentation}",
                "functions": self._extract_functions(cleaned_code),
                "model": self.model_type,
                "confidence": self._calculate_confidence(documentation),
                "generation_time": round(generation_time, 2),
                "language": language
            }

        except Exception as e:
            logger.error(f"❌ Ошибка ML генерации: {e}")
            return self._fallback_generation(code, context)

    def _is_low_quality_generation(self, documentation: str) -> bool:
        """Проверяет качество сгенерированной документации"""
        if not documentation:
            return True

        # Проверяем слишком короткую документацию
        if len(documentation.split()) < 5:
            return True

        # Проверяем повторяющиеся фразы
        words = documentation.lower().split()
        if len(set(words)) / len(words) < 0.5:  # Много повторений
            return True

        return False

    def _calculate_confidence(self, documentation: str) -> float:
        """Рассчитывает уверенность в качестве генерации"""
        if not documentation:
            return 0.0

        words = documentation.split()
        unique_ratio = len(set(words)) / len(words)
        length_score = min(len(words) / 50, 1.0)  # Нормализуем по длине

        confidence = (unique_ratio * 0.6 + length_score * 0.4)

        # Корректируем в зависимости от типа модели
        if self.model_type == "fine_tuned":
            confidence *= 1.1

        return min(confidence, 0.95)

    def _extract_functions(self, code: str) -> List[str]:
        """Извлекает функции из кода с поддержкой разных языков"""
        functions = []

        for line in code.split('\n'):
            line = line.strip()

            # Python
            if line.startswith('def '):
                func_name = line[4:].split('(')[0].strip()
                if func_name:
                    functions.append(f"def {func_name}()")

            # JavaScript/TypeScript
            elif 'function' in line and ('(' in line or '=>' in line):
                if line.startswith('function'):
                    func_name = line[8:].split('(')[0].strip()
                    functions.append(f"function {func_name}()")
                elif '=>' in line:
                    # Стрелочные функции
                    func_part = line.split('=>')[0].strip()
                    if '=' in func_part:
                        func_name = func_part.split('=')[0].strip()
                        functions.append(f"{func_name} = () =>")

            # Java/C++
            elif any(line.startswith(keyword) for keyword in
                     ['public', 'private', 'protected']) and '(' in line and ')' in line:
                # Упрощенное извлечение для Java/C++ методов
                parts = line.split('(')[0].split()
                if len(parts) >= 2:
                    func_name = parts[-1]
                    functions.append(f"{func_name}()")

        return functions

    def _enhanced_fallback_generation(self, code: str, language: str) -> str:
        """Улучшенная резервная генерация"""
        functions = self._extract_functions(code)
        lines_of_code = len([line for line in code.split('\n') if line.strip()])

        return f"""
## Автоматически сгенерированная документация

### Общая информация
- **Язык программирования**: {language}
- **Количество строк**: {lines_of_code}
- **Обнаруженные функции**: {len(functions)}

### Структура кода
{chr(10).join(f"- {func}" for func in functions) if functions else "- Функции не обнаружены"}

### Описание
Это автоматически сгенерированная документация. Для улучшения качества рекомендуется:
1. Запустить обучение модели: `python scripts/train_real_model.py`
2. Проверить корректность исходного кода
3. Добавить аннотации типов и комментарии в код
"""

    def _fallback_generation(self, code: str, context: Optional[Dict] = None) -> Dict:
        """Резервная генерация если ML модель не работает"""
        language = context.get('language', 'python') if context else 'python'

        return {
            "summary": "Базовая документация (ML модель недоступна)",
            "documentation": self._enhanced_fallback_generation(code, language),
            "functions": self._extract_functions(code),
            "model": "fallback",
            "confidence": 0.0,
            "generation_time": 0.0,
            "language": language
        }

ml_generator = RealMLGenerator()