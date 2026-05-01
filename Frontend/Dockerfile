FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 8081

# Cambiamos --tunnel por --lan
CMD ["npx", "expo", "start", "--lan"]