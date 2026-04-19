# /frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalamos expo-cli de forma global
RUN npm install -g expo-cli

COPY package.json .
RUN npm install

COPY . .

# Puertos que usa Expo para el empaquetador y las herramientas de desarrollo
EXPOSE 8081 19000 19001 19002

# El comando permite que Expo escuche conexiones externas
CMD ["npx", "expo", "start", "--dev-client", "--tunnel"]