#!/bin/sh
set -e

eval "$(node -e "
  const { publicKey, privateKey } = require('./.vapid-keys.json');
  console.log('export VAPID_PUBLIC_KEY=' + JSON.stringify(publicKey));
  console.log('export VAPID_PRIVATE_KEY=' + JSON.stringify(privateKey));
")"
export VAPID_SUBJECT="${VAPID_SUBJECT:-mailto:contact@budgetizerr.local}"

echo "Running database migrations..."
node node_modules/typeorm/cli.js migration:run -d backend/dist/data-source.js

echo "Starting backend..."
exec node backend/dist/main.js
