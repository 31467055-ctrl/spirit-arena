FROM node:20-alpine
WORKDIR /app

# 复制后端代码
COPY server/package*.json ./
RUN npm install

COPY server/src/ ./src/

EXPOSE 3001
CMD ["node", "src/index.js"]
