FROM node:lts-buster as builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
  ffmpeg imagemagick build-essential libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev webp && \
  rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:lts-buster

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/src/temp

VOLUME [ "/app/session", "/app/logs" ]

CMD ["node", "dist/main.js"]
