import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import routes from './routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 启动
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`🧙 精灵决斗场 API 运行在 http://localhost:${PORT}`);
    console.log(`  健康检查: http://localhost:${PORT}/health`);
    console.log(`  精灵列表: http://localhost:${PORT}/api/pets`);
  });
}

start();
