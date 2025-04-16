FROM node:lts-buster

WORKDIR /app

RUN apt-get update && apt-get install -y \
  ffmpeg imagemagick build-essential libcairo2-dev libpango1.0-dev \
  libjpeg-dev libgif-dev librsvg2-dev webp && \
  apt-get upgrade -y && \
  rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm install

COPY . .

VOLUME [ "/app/session", "/app/logs" ]

CMD ["npm", "run", "start:prod"]
