# 🚀 Quick Start Guide - Context-Locked Bulk Import

## 📋 5-Minute Setup

### **Step 1: Navigate to Bulk Import**
```
Admin Panel → Sidebar → Bulk Import
```

### **Step 2: Select Mode**
Click the **🔒 Context-Locked** button

### **Step 3: Select Context**
1. **Exam Dropdown** → Select "NEET" (or your exam)
2. **Subject Dropdown** → Select "Physics" (or your subject)

### **Step 4: Download Template**
Click **"Download Template"** button
- File: `context_locked_exam_import_template.csv`

### **Step 5: Fill CSV**
Open the downloaded CSV and add your data:

```csv
unit,chapter,topic,subtopic,definition
Mechanics,Motion,Kinematics,Displacement,What is Displacement?
Mechanics,Motion,Kinematics,Velocity,What is Velocity?
Mechanics,Laws of Motion,Newton's Laws,First Law,Newton's First Law
Thermodynamics,Heat Transfer,Conduction,Thermal Conductivity,What is Thermal Conductivity?
```

**Rules:**
- ✅ All columns are required
- ✅ Use commas to separate values
- ✅ Wrap values with quotes if they contain commas
- ✅ Empty rows will be skipped
- ✅ Definition names should be unique within each SubTopic

### **Step 6: Upload CSV**
- Drag & drop the CSV file
- OR click the upload area to browse

### **Step 7: Review Preview**
Check the first 5 rows displayed in the preview table

### **Step 8: Import**
Click **"Start Import"** button

### **Step 9: Review Results**
See the detailed statistics:
- ✅ Units Inserted
- ✅ Chapters Inserted
- ✅ Topics Inserted
- ✅ SubTopics Inserted
- ✅ Definitions Inserted
- ⚠️ Rows Skipped (if any)

---

## 🎯 What Happens During Import?

```
For each row in your CSV:

1. Check if Unit exists → If not, create it
2. Check if Chapter exists → If not, create it
3. Check if Topic exists → If not, create it
4. Check if SubTopic exists → If not, create it
5. Create Definition (always new, but checks for duplicates)
6. Create DefinitionDetails with content
```

**Result:** Complete hierarchy created automatically! 🎉

---

## ✅ Example: Import 3 Definitions

### **Your CSV:**
```csv
unit,chapter,topic,subtopic,definition_title,definition_content
Unit 1,Motion,Kinematics,Displacement,Displacement,Shortest distance
Unit 1,Motion,Kinematics,Velocity,Velocity,Rate of change
Unit 1,Motion,Dynamics,Force,Force,Push or pull
```

### **What Gets Created:**
```
📦 Unit 1 (created once)
  └─ 📘 Motion (created once)
      ├─ 📖 Kinematics (created once)
      │   ├─ 📝 Displacement (created once)
      │   │   └─ ✏️ Definition: "Displacement" (created)
      │   └─ 📝 Velocity (created once)
      │       └─ ✏️ Definition: "Velocity" (created)
      └─ 📖 Dynamics (created once)
          └─ 📝 Force (created once)
              └─ ✏️ Definition: "Force" (created)
```

**Statistics:**
- Units: 1
- Chapters: 1
- Topics: 2
- SubTopics: 3
- Definitions: 3

---

## ⚠️ Common Errors & Solutions

### **Error: "Please select Exam and Subject"**
**Solution:** Make sure both Exam and Subject dropdowns are selected

### **Error: "Row X: Missing required fields"**
**Solution:** Check that row X has values in all columns

### **Error: "Row X: Duplicate definition"**
**Solution:** A definition with the same name already exists in that SubTopic. Either:
- Remove the duplicate row
- Change the definition name
- Delete the existing definition first

### **Error: "Subject does not belong to Exam"**
**Solution:** The selected Subject is not linked to the selected Exam. Choose a different Subject.

---

## 💡 Pro Tips

### **Tip 1: Reuse Existing Hierarchy**
If you already have "Unit 1 → Motion → Kinematics", you can add more definitions:
```csv
unit,chapter,topic,subtopic,definition_title,definition_content
Unit 1,Motion,Kinematics,Acceleration,Acceleration,Rate of change of velocity
```
System will find existing Unit/Chapter/Topic/SubTopic and just add the new definition!

### **Tip 2: Create Multiple Units at Once**
```csv
unit,chapter,topic,subtopic,definition_title,definition_content
Mechanics,Motion,Kinematics,Displacement,Displacement,Content 1
Thermodynamics,Heat,Conduction,Thermal,Thermal Conductivity,Content 2
Electromagnetism,Fields,Electric,Coulomb,Coulomb's Law,Content 3
```
Creates 3 complete hierarchies in one go!

### **Tip 3: Use Excel/Google Sheets**
- Create your data in Excel or Google Sheets
- Export as CSV
- Upload to the system

### **Tip 4: Test with Small Batch First**
- Start with 5-10 rows
- Verify results
- Then upload full dataset

---

## 🔍 Verification

After import, verify your data:

1. **Go to Definitions Management**
   - Filter by your Exam and Subject
   - Check if all definitions appear

2. **Check Hierarchy**
   - Navigate through Units → Chapters → Topics → SubTopics
   - Verify structure is correct

3. **Check Content**
   - Open a definition
   - Verify content is saved correctly

---

## 📞 Need Help?

**Check Documentation:**
- `BULK_IMPORT_DOCUMENTATION.md` - Full technical docs
- `IMPLEMENTATION_COMPLETE.md` - Implementation details

**Sample Data:**
- `sample_context_locked_import.csv` - Example CSV

**Common Issues:**
- CSV format incorrect → Use the downloaded template
- Duplicate errors → Check existing data first
- Missing fields → Ensure all columns have values

---

## 🎉 You're Ready!

Start importing your educational content in bulk! 🚀

**Remember:**
- ✅ Exam and Subject are LOCKED
- ✅ CSV creates Unit → Definition hierarchy
- ✅ Duplicates are prevented automatically
- ✅ Slugs are generated automatically
- ✅ Order numbers are calculated automatically

**Happy Importing!** 📚
