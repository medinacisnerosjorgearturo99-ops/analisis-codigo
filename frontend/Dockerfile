# Usar imagen ligera de Node.js
FROM node:20-alpine

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias (el asterisco es por si no existe el package-lock aún)
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Construir la aplicación para producción
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar
CMD ["npm", "run", "start"]