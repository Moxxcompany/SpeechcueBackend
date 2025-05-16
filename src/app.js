import express from 'express';
import cors from 'cors';
import db from './models/index.js';
import swaggerSetup from './config/swagger.js';
import errorHandler from './middlewares/errorHandler.js';
import notFound from './middlewares/notFound.js';
import userRoutes from './routes/user.routes.js';
import authRoutes from './routes/auth.routes.js';
import twilioRoutes from './routes/twilio.routes.js';
import freepbxRoutes from './routes/freepbx.routes.js';
import ivrRoutes from './routes/ivr.routes.js';
import testRoutes from './routes/test.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import ttsInfoRoutes from './routes/ttsInfo.routes.js';
import ringGroupRoutes from './routes/ringgroup.routes.js';
import { startARIClient } from './ari/ariClient.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/twilio', twilioRoutes);
app.use('/api/freepbx', freepbxRoutes);
app.use('/api/ivrs', ivrRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/tts', ttsInfoRoutes);
app.use('/api/ringgroups', ringGroupRoutes)
app.use('/api', testRoutes);

// Swagger Docs
swaggerSetup(app);

// Start ARI client (connects to Asterisk)
startARIClient();

// 404 and error handler
app.use(notFound);
app.use(errorHandler);

// Sequelize Sync
db.sequelize.sync().then(() => console.log('🟢 DB Synced'));

export default app; 
