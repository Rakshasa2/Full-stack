import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, TaskType
from datasets import load_dataset
import json
import os


class CodeDocTrainer:
    def __init__(self, model_name="ai-forever/rugpt3small_based_on_gpt2"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.setup_model()

    def setup_model(self):
        """Загружаем модель и токенизатор"""
        print("🔄 Загружаем модель и токенизатор...")

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.tokenizer.pad_token = self.tokenizer.eos_token

        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )

        # Настраиваем LoRA для эффективного обучения
        lora_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            inference_mode=False,
            r=8,
            lora_alpha=32,
            lora_dropout=0.1,
            target_modules=["q_proj", "v_proj"]
        )

        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()

    def prepare_dataset(self, file_path):
        """Подготавливаем датасет для обучения"""
        print("📚 Подготавливаем датасет...")

        def tokenize_function(examples):
            # Создаем промпты в формате: instruction + code + documentation
            prompts = []
            for i in range(len(examples['input'])):
                prompt = f"### Инструкция:\n{examples['instruction'][i]}\n\n### Код:\n{examples['input'][i]}\n\n### Документация:\n{examples['output'][i]}{self.tokenizer.eos_token}"
                prompts.append(prompt)

            # Токенизируем
            tokenized = self.tokenizer(
                prompts,
                truncation=True,
                padding=False,
                max_length=1024,
                return_tensors=None
            )

            # Для causal LM метки такие же как входные данные
            tokenized["labels"] = tokenized["input_ids"].copy()
            return tokenized

        # Загружаем датасет
        dataset = load_dataset('json', data_files=file_path, split='train')
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=dataset.column_names
        )

        return tokenized_dataset

    def train(self, dataset_path, output_dir="./trained_model"):
        """Запускаем обучение"""
        print("🚀 Начинаем обучение...")

        # Подготавливаем датасет
        train_dataset = self.prepare_dataset(dataset_path)

        # Настройки обучения
        training_args = TrainingArguments(
            output_dir=output_dir,
            overwrite_output_dir=True,
            num_train_epochs=3,
            per_device_train_batch_size=2,
            gradient_accumulation_steps=4,
            warmup_steps=100,
            logging_steps=10,
            save_steps=500,
            learning_rate=2e-4,
            fp16=True,
            optim="adamw_torch",
            report_to=None,  # Отключаем wandb/tensorboard
            save_total_limit=2,
            prediction_loss_only=True,
            remove_unused_columns=False
        )

        # Создаем trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            data_collator=DataCollatorForLanguageModeling(
                tokenizer=self.tokenizer,
                mlm=False
            )
        )

        # Запускаем обучение
        trainer.train()

        # Сохраняем модель
        trainer.save_model()
        self.tokenizer.save_pretrained(output_dir)

        print(f"✅ Обучение завершено! Модель сохранена в {output_dir}")


def main():
    # Создаем датасет если его нет
    if not os.path.exists("data/training_dataset.jsonl"):
        from prepare_training_data import prepare_dataset
        prepare_dataset()

    # Обучаем модель
    trainer = CodeDocTrainer()
    trainer.train("data/training_dataset.jsonl", output_dir="models/codedoc_model")


if __name__ == "__main__":
    main()