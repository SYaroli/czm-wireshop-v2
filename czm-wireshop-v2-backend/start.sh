#!/usr/bin/env bash
set -e

export NODE_ENV=production
DB_PATH="${DB_PATH:-/data/wireshop.db}"
mkdir -p "$(dirname "$DB_PATH")"

# Seed DB from repo copy if disk is empty
if [ ! -f "$DB_PATH" ] && [ -f "./data/wireshop.db" ]; then
  echo "Seeding DB to disk..."
  cp ./data/wireshop.db "$DB_PATH"
fi

echo "Using DB at $DB_PATH"
node server.js
