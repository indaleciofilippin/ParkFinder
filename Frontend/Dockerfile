FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package.json package-lock.json* ./
RUN npm install

# Instalamos de forma explícita la dependencia requerida para túneles y evitar interacción en arranque
RUN npm install -g @expo/ngrok@^4.1.0

COPY . .

EXPOSE 8081

# Arrancamos con tunnel permitiendo pasar un NGROK_AUTHTOKEN opcional para evitar el bloqueo de sesión cerrada
CMD ["sh", "-c", "if [ -n \"$NGROK_AUTHTOKEN\" ]; then npx expo env:set NGROK_AUTHTOKEN \"$NGROK_AUTHTOKEN\"; fi && npx expo start --clear --tunnel"]