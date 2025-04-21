# 📞 SpeechCue Backend

Node.js + Express backend for managing phone numbers and account flows.  
Built with PostgreSQL and Sequelize ORM and supports Swagger UI for API documentation.

---

## 🛠 Tech Stack

- Node.js + Express
- PostgreSQL + Sequelize
- Swagger UI
- Winston Logger
- CORS
- YAMLJS

---

## 📦 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file based on `.env.example` and set your environment variables:

```env
PORT=8888
DATABASE_URL=your_postgres_url
```

### 3. Start the development server

```bash
npm run dev
```

### 4. Start the server in production

```bash
npm start
```

---

## 📘 API Documentation

Once the server is running, Swagger UI is available at:

```
http://localhost:8888/api-docs
```

---

## 📂 Folder Structure

```
src/
├── config/         # Database, Logger, Swagger, Twilio config
├── controllers/    # Route handlers
├── routes/         # API routing
├── services/       # Business logic
├── models/         # Sequelize models
├── middlewares/    # Error handling, auth, etc.
├── docs/           # Swagger YAML file
└── utils/          # Utility functions
```

---