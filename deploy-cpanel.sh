#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${HOME}/apps/makers-bazar/frontend"
NODE_ENV_FILE="${HOME}/nodevenv/apps/makers-bazar/frontend/22/bin/activate"

cd "${APP_ROOT}"
git pull --ff-only origin main

if [[ -f "${NODE_ENV_FILE}" ]]; then
  # CloudLinux exposes the Node.js version selected in cPanel through this venv.
  set +u
  source "${NODE_ENV_FILE}"
  set -u
fi

npm install
npm run build
mkdir -p tmp
touch tmp/restart.txt

curl --fail --silent --show-error --head https://themakersbazar.com >/dev/null
printf 'Frontend deployment completed.\n'
