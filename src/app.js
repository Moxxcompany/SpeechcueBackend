const express = require('express');
const cors = require('cors');
const db = require('./models');
const swaggerSetup = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/auth.routes');


const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

// Swagger Docs
swaggerSetup(app);

// 404 and error handler
app.use(notFound);
app.use(errorHandler);

// Sequelize Sync
db.sequelize.sync().then(() => console.log('🟢 DB Synced'));

module.exports = app;
