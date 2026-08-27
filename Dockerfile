FROM node:22-bookworm-slim

WORKDIR /app

# Manifests are copied first so the dependency layer stays cached across
# source-only rebuilds. better-sqlite3 ships prebuilt binaries inside its npm
# tarball, so nothing has to be compiled here. --ignore-scripts is what keeps
# it that way: npm ci otherwise falls back to `node-gyp rebuild` for any
# package with a binding.gyp, which would need python3 and g++ in the image.
# No dependency of this project has a real install script.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY server.js db.js ./
COPY public ./public

EXPOSE 8000

# Exec form: node stays PID 1 and gets SIGTERM straight from `docker stop`.
# The listening port comes from PORT (server.js defaults it to 8000).
CMD ["node", "server.js"]
