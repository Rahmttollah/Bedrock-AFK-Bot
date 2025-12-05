FROM node:20-bullseye

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    python3 \
    git \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./

# Install deps (this will build native bits)
RUN npm install --production

COPY . .

ENV NODE_ENV=production
CMD ["node", "bot.js"]
