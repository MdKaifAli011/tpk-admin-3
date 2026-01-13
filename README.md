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
   - **Units** - Creates units from CSV (e.g., "Diversity in Living World", "Structural Organisation in Animals and Plants")
   - **Chapters** - Creates chapters within units (e.g., "The Living World", "Biological Classification")
   - **Topics** - Creates topics within chapters (e.g., "What is Living?", "Biodiversity")
   - **SubTopics** - Creates subtopics within topics (e.g., "Characteristics of living organisms", "Difference between living and non-living")

## Features:
- **Idempotent**: Can be run multiple times safely - will update existing records or create new ones
- **Duplicate prevention**: Skips duplicate subtopics within the same topic
- **Order number management**: Automatically manages order numbers for Units, Chapters, Topics, and SubTopics
- **Hierarchical tracking**: Maintains proper parent-child relationships (Unit → Chapter → Topic → SubTopic)
- **Progress logging**: Shows detailed progress during import

## CSV Format Expected:
The CSV should have the following columns:
- Column 1: Exam Number
- Column 2: Subject Name (Biology, Physics, Chemistry)
- Column 3: Unit Number
- Column 4: Unit Name
- Column 5: Chapter Number
- Column 6: Chapter Name
- Column 7: Topic Name
- Column 8: SubTopic Name/Description

## Notes:
- Currently imports **only Biology** subject (can be modified in the script)
- Empty rows are skipped
- The script handles missing values gracefully
- Order numbers are auto-incremented within their parent context

## Troubleshooting:
If you encounter module import errors, try:
1. Make sure `package.json` has `"type": "module"`
2. Or rename the script to `import-neet-biology-data.mjs`
3. Check that all required environment variables are set in `.env`



