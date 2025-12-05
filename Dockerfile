# Use node base image that supports building native modules
FROM node:20-bullseye

# Install build deps for native modules
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    python3 \
    git \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# copy package files first (cache npm install)
COPY package.json package-lock.json* ./

# install deps (will build raknet-native inside)
RUN npm install --production

# copy rest
COPY . .

EXPOSE 3000

CMD ["node", "bot.js"]
