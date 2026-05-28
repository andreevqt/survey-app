FROM node:20-alpine AS dev
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM dev AS build
RUN npm run build

FROM node:20-alpine AS prod
LABEL org.opencontainers.image.source="https://github.com/andreevqt/survey-app"
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
