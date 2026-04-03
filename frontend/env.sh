#!/bin/sh
# Скрипт для замены переменных окружения в статических файлах

echo "Replacing environment variables..."

# Создаем временную директорию
mkdir -p /tmp/env

# Копируем index.html для замены
cp /usr/share/nginx/html/index.html /tmp/env/index.html

# Заменяем переменные окружения
envsubst < /tmp/env/index.html > /usr/share/nginx/html/index.html

echo "Environment variables replaced successfully"