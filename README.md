# tpk-admin-3 Local Run Guide

## 1) Environment

Create `.env` in project root. Example values:

```
PORT=3000
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=/self-study
MONGODB_URI=<your-mongodb-uri>
MONGO_DB_NAME=tpk-admin-db-1
NEXT_PUBLIC_API_URL=<your-api-url>
JWT_SECRET=<your-jwt-secret>
SESSION_SECRET=<your-session-secret>
```

Do not commit real secrets.

## 2) Start MongoDB first

Your app will fail with `ECONNREFUSED 127.0.0.1:27017` if MongoDB is not running.

Use one of the following:

- Local service:
  - `sudo systemctl start mongod` (Linux with service install), or
  - `mongod --dbpath /path/to/mongo-data`

- Docker:
  - `docker run -d --name tpk-mongo -p 27017:27017 mongo:7`

## 3) Run app

Install once:

```
npm ci
```

Development:

```
npm run dev
```

Production build + start:

```
npm run build
npm run start
```

## 4) Notes about NODE_ENV

- Keep `NODE_ENV=development` in `.env` for local dev (`npm run dev`).
- `npm run start` forces production mode, so Next.js runtime warnings are avoided.

---

# NEET Biology Data Import Script

## Overview
This script imports NEET Biology data from `Neet.csv` into the database.

## Prerequisites
1. Make sure your `.env` file is configured with:
   - `MONGODB_URI` - MongoDB connection string
   - `MONGO_DB_NAME` - Database name (optional, uses default from URI if not provided)

2. The CSV file should be located at: `scripts/Neet.csv`

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run import:neet-biology
```

### Option 2: Direct Node.js execution
```bash
node scripts/import-neet-biology-data.js
```

## What the script does:
1. **Connects to MongoDB** using the connection string from `.env`
2. **Creates or gets NEET exam** - Creates exam "NEET" if it doesn't exist
3. **Creates or gets Biology subject** - Creates subject "Biology" if it doesn't exist
4. **Reads Neet.csv** and parses the data
5. **Imports hierarchically**:
   - **Units** - Creates units from CSV
   - **Chapters** - Creates chapters within units
   - **Topics** - Creates topics within chapters
   - **SubTopics** - Creates subtopics within topics

## Features:
- **Idempotent**: Can be run multiple times safely
- **Duplicate prevention**: Skips duplicate subtopics within the same topic
- **Order number management**: Automatically manages order numbers
- **Hierarchical tracking**: Maintains Unit → Chapter → Topic → SubTopic relationships
- **Progress logging**: Shows detailed progress during import

## Troubleshooting:
If you encounter module import errors, try:
1. Make sure `package.json` has `"type": "module"`
2. Or rename the script to `import-neet-biology-data.mjs`
3. Check that all required environment variables are set in `.env`
