import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Thread from "@/models/Thread";
import Reply from "@/models/Reply";
import Guest from "@/models/Guest";
import Exam from "@/models/Exam";
import Subject from "@/models/Subject";
import Unit from "@/models/Unit";
import Chapter from "@/models/Chapter";
import Topic from "@/models/Topic";
import SubTopic from "@/models/SubTopic";
import Definition from "@/models/Definition";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";
import { parseCSV, validateCSVData } from "@/utils/csvParser";

// Generate unique ID
function generateUniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Generate random guest name
function generateRandomGuestName() {
  const firstNames = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Avery", "Quinn", "Sage", "River", "Phoenix", "Blake", "Cameron", "Dakota", "Emery", "Finley", "Harper", "Hayden", "Indigo", "Jaden"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee"];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

// Generate random date within last week
// Each call generates a unique date to ensure threads have different timestamps
function generateRandomDateLastWeek(baseTime = null) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // If baseTime is provided, generate date after it
  if (baseTime) {
    const base = new Date(baseTime);
    const maxTime = now.getTime();
    const minTime = Math.max(base.getTime() + 1000, oneWeekAgo.getTime()); // At least 1 second after base
    
    if (minTime >= maxTime) {
      // If base is too recent, just use a random time in the last week
      const randomTime = oneWeekAgo.getTime() + Math.random() * (now.getTime() - oneWeekAgo.getTime());
      return new Date(randomTime);
    }
    
    const randomTime = minTime + Math.random() * (maxTime - minTime);
    return new Date(randomTime);
  }
  
  // Generate random time within the week
  const randomTime = oneWeekAgo.getTime() + Math.random() * (now.getTime() - oneWeekAgo.getTime());
  return new Date(randomTime);
}

// Find or create Guest
async function findOrCreateGuest(guestName) {
  let guest = await Guest.findOne({ name: guestName });
  if (!guest) {
    guest = await Guest.create({
      name: guestName,
      guestId: generateUniqueId(),
    });
  }
  return guest;
}

// Find hierarchy IDs by names
async function findHierarchyIds(row) {
  const hierarchy = {};
  
  if (row.exam) {
    const exam = await Exam.findOne({ name: row.exam.trim() });
    if (!exam) throw new Error(`Exam not found: ${row.exam}`);
    hierarchy.examId = exam._id;
  }
  
  if (row.subject && hierarchy.examId) {
    const subject = await Subject.findOne({ 
      name: row.subject.trim(), 
      examId: hierarchy.examId 
    });
    if (!subject) throw new Error(`Subject not found: ${row.subject}`);
    hierarchy.subjectId = subject._id;
  }
  
  if (row.unit && hierarchy.subjectId) {
    const unit = await Unit.findOne({ 
      name: row.unit.trim(), 
      subjectId: hierarchy.subjectId 
    });
    if (!unit) throw new Error(`Unit not found: ${row.unit}`);
    hierarchy.unitId = unit._id;
  }
  
  if (row.chapter && hierarchy.unitId) {
    const chapter = await Chapter.findOne({ 
      name: row.chapter.trim(), 
      unitId: hierarchy.unitId 
    });
    if (!chapter) throw new Error(`Chapter not found: ${row.chapter}`);
    hierarchy.chapterId = chapter._id;
  }
  
  if (row.topic && hierarchy.chapterId) {
    const topic = await Topic.findOne({ 
      name: row.topic.trim(), 
      chapterId: hierarchy.chapterId 
    });
    if (!topic) throw new Error(`Topic not found: ${row.topic}`);
    hierarchy.topicId = topic._id;
  }
  
  if (row.subtopic && hierarchy.topicId) {
    const subtopic = await SubTopic.findOne({ 
      name: row.subtopic.trim(), 
      topicId: hierarchy.topicId 
    });
    if (!subtopic) throw new Error(`SubTopic not found: ${row.subtopic}`);
    hierarchy.subTopicId = subtopic._id;
  }
  
  if (row.definition && hierarchy.subTopicId) {
    const definition = await Definition.findOne({ 
      name: row.definition.trim(), 
      subTopicId: hierarchy.subTopicId 
    });
    if (!definition) throw new Error(`Definition not found: ${row.definition}`);
    hierarchy.definitionId = definition._id;
  }
  
  return hierarchy;
}

export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: 403 });
    }

    await connectDB();
    const formData = await request.formData();
    const file = formData.get("file");
    const level = formData.get("level") || "exam";
    
    // Get selected IDs from form data
    const selectedIds = {};
    const idFields = ["examId", "subjectId", "unitId", "chapterId", "topicId", "subTopicId", "definitionId"];
    idFields.forEach(field => {
      const value = formData.get(field);
      if (value) selectedIds[field] = value;
    });

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const fileText = await file.text();
    let data;
    try {
      data = parseCSV(fileText);
    } catch (parseError) {
      console.error("CSV parsing error:", parseError);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to parse CSV file", 
          errors: [parseError.message || "Invalid CSV format. Please check the file and try again."] 
        },
        { status: 400 }
      );
    }

    // Check if data is empty
    if (!data || data.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "CSV file is empty or contains no data rows", 
          errors: ["The CSV file must contain at least one data row (excluding headers)"] 
        },
        { status: 400 }
      );
    }

    // Validate data structure
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid CSV format", 
          errors: ["CSV parsing returned invalid data structure. Expected array of objects."] 
        },
        { status: 400 }
      );
    }

    // Log parsed data structure for debugging (first row only)
    if (data.length > 0) {
      console.log("CSV Parsed Successfully:", {
        totalRows: data.length,
        firstRowKeys: Object.keys(data[0]),
        firstRowSample: {
          title: data[0].title?.substring(0, 50) || "NOT FOUND",
          content: data[0].content?.substring(0, 50) || "NOT FOUND",
        }
      });
    }

    // Normalize field names helper (handle case variations and underscores)
    const normalizeFieldName = (field) => {
      return field.toLowerCase().replace(/[^a-z0-9]/g, "");
    };

    // Build field mapping from first row (map normalized names to actual CSV headers)
    const fieldMapping = {};
    if (data.length > 0) {
      const firstRow = data[0];
      Object.keys(firstRow).forEach(actualField => {
        const normalized = normalizeFieldName(actualField);
        if (!fieldMapping[normalized]) {
          fieldMapping[normalized] = actualField;
        }
      });
    }

    // Helper to get field value with fallback
    const getField = (row, fieldName) => {
      const normalized = normalizeFieldName(fieldName);
      const actualField = fieldMapping[normalized];
      if (actualField && row[actualField] !== undefined) {
        return row[actualField];
      }
      // Try direct match as fallback
      return row[fieldName] || row[fieldName.toLowerCase()] || row[fieldName.toUpperCase()] || "";
    };

    // Check for required fields with flexible matching
    const requiredFields = ["title", "content"];
    const validationErrors = [];

    // Validate required fields exist
    requiredFields.forEach(requiredField => {
      const normalized = normalizeFieldName(requiredField);
      if (!fieldMapping[normalized]) {
        validationErrors.push(`Missing required column: "${requiredField}". Found columns: ${Object.keys(data[0] || {}).join(", ")}`);
      }
    });

    // Validate each row has required field values
    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 for header row and 0-index
      requiredFields.forEach(requiredField => {
        const normalized = normalizeFieldName(requiredField);
        const actualField = fieldMapping[normalized];
        if (actualField) {
          const value = row[actualField];
          // Check if value is null, undefined, or empty string (after trimming)
          const isEmpty = value === null || 
                         value === undefined || 
                         (typeof value === "string" && value.trim() === "") ||
                         (typeof value === "string" && value.trim() === '""') ||
                         (typeof value === "string" && value.trim() === "''");
          
          if (isEmpty) {
            validationErrors.push(`Row ${rowNum}: Missing or empty value for required field "${requiredField}" (found in column "${actualField}")`);
          }
        } else {
          // Field mapping exists but actual field not found in row
          validationErrors.push(`Row ${rowNum}: Required field "${requiredField}" not found in row data. Available fields: ${Object.keys(row).join(", ")}`);
        }
      });
    });

    if (validationErrors.length > 0) {
      // Log detailed error info for debugging
      console.error("CSV Validation Errors:", {
        totalErrors: validationErrors.length,
        errors: validationErrors,
        sampleRow: data[0] || null,
        headers: Object.keys(data[0] || {}),
        fieldMapping: fieldMapping,
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed", 
          errors: validationErrors,
          debug: {
            foundColumns: Object.keys(data[0] || {}),
            requiredColumns: requiredFields,
            totalRows: data.length,
          }
        },
        { status: 400 }
      );
    }


    const stats = {
      threadsCreated: 0,
      threadsUpdated: 0,
      repliesCreated: 0,
      repliesUpdated: 0,
      guestsCreated: 0,
      errors: [],
    };

    // Track last thread date to ensure each thread gets a unique, sequential date
    let lastThreadDate = null;

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 for header row and 0-index

      try {
        // Generate or use guest name (handle various field name variations)
        let guestName = getField(row, "guestname") || getField(row, "guest_name") || getField(row, "guest") || generateRandomGuestName();
        
        // Find or create guest and track if it was newly created
        const guestBefore = await Guest.findOne({ name: guestName });
        let guest = guestBefore;
        let isNewGuest = false;
        
        if (!guest) {
          guest = await Guest.create({
            name: guestName,
            guestId: generateUniqueId(),
          });
          isNewGuest = true;
          stats.guestsCreated++;
        } else if (!guest.guestId) {
          // Fix existing guest without guestId
          guest.guestId = generateUniqueId();
          await guest.save();
        }

        // Build hierarchy from selected IDs (ignore CSV hierarchy columns when level is set)
        // This ensures consistency - all threads imported at a level use the same hierarchy
        let hierarchy = {};
        
        if (level === "exam" && selectedIds.examId) {
          hierarchy = { examId: selectedIds.examId };
        } else if (level === "subject" && selectedIds.examId && selectedIds.subjectId) {
          hierarchy = { examId: selectedIds.examId, subjectId: selectedIds.subjectId };
        } else if (level === "unit" && selectedIds.examId && selectedIds.subjectId && selectedIds.unitId) {
          hierarchy = { examId: selectedIds.examId, subjectId: selectedIds.subjectId, unitId: selectedIds.unitId };
        } else if (level === "chapter" && selectedIds.examId && selectedIds.subjectId && selectedIds.unitId && selectedIds.chapterId) {
          hierarchy = { examId: selectedIds.examId, subjectId: selectedIds.subjectId, unitId: selectedIds.unitId, chapterId: selectedIds.chapterId };
        } else if (level === "topic" && selectedIds.examId && selectedIds.subjectId && selectedIds.unitId && selectedIds.chapterId && selectedIds.topicId) {
          hierarchy = { examId: selectedIds.examId, subjectId: selectedIds.subjectId, unitId: selectedIds.unitId, chapterId: selectedIds.chapterId, topicId: selectedIds.topicId };
        } else if (level === "subtopic" && selectedIds.examId && selectedIds.subjectId && selectedIds.unitId && selectedIds.chapterId && selectedIds.topicId && selectedIds.subTopicId) {
          hierarchy = { examId: selectedIds.examId, subjectId: selectedIds.subjectId, unitId: selectedIds.unitId, chapterId: selectedIds.chapterId, topicId: selectedIds.topicId, subTopicId: selectedIds.subTopicId };
        } else if (level === "definition" && selectedIds.examId && selectedIds.subjectId && selectedIds.unitId && selectedIds.chapterId && selectedIds.topicId && selectedIds.subTopicId && selectedIds.definitionId) {
          hierarchy = { examId: selectedIds.examId, subjectId: selectedIds.subjectId, unitId: selectedIds.unitId, chapterId: selectedIds.chapterId, topicId: selectedIds.topicId, subTopicId: selectedIds.subTopicId, definitionId: selectedIds.definitionId };
        } else {
          // Fallback: try to find hierarchy from CSV if selectedIds incomplete
          // This allows flexibility but selectedIds take precedence
          try {
            hierarchy = await findHierarchyIds(row);
          } catch (err) {
            throw new Error(`Missing required hierarchy selection. Please ensure all required levels are selected in the UI. ${err.message}`);
          }
        }
        
        // Validate hierarchy is not empty
        if (!hierarchy || Object.keys(hierarchy).length === 0) {
          throw new Error("No hierarchy information available. Please select the required levels in the UI.");
        }

        // Get field values using normalized field names
        const title = String(getField(row, "title") || "").trim();
        const content = String(getField(row, "content") || "").trim();
        
        // Validate required fields are not empty
        if (!title || title.length === 0) {
          throw new Error("Title is required and cannot be empty");
        }
        if (!content || content.length === 0) {
          throw new Error("Content is required and cannot be empty");
        }

        // Generate unique random date for thread (each thread gets a different date)
        let threadDate;
        const threadDateValue = getField(row, "thread_date");
        if (threadDateValue && String(threadDateValue).trim()) {
          try {
            // Extract date from string (handle cases where HTML might be mixed in)
            const dateStr = String(threadDateValue).trim();
            // Try to extract ISO date format (YYYY-MM-DDTHH:MM:SS)
            const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z)?)/);
            const cleanDateStr = dateMatch ? dateMatch[1] : dateStr;
            threadDate = new Date(cleanDateStr);
            // Validate date
            if (isNaN(threadDate.getTime())) {
              throw new Error(`Invalid thread_date format: ${dateStr}`);
            }
          } catch (err) {
            // If date parsing fails, generate random date instead of failing
            console.warn(`Row ${rowNum}: Invalid thread_date, using generated date. Error: ${err.message}`);
            threadDate = generateRandomDateLastWeek(lastThreadDate);
            lastThreadDate = threadDate;
          }
        } else {
          threadDate = generateRandomDateLastWeek(lastThreadDate);
          // Update last thread date for next iteration
          lastThreadDate = threadDate;
        }

        // Validate and process tags
        let tags = ["General"]; // Default
        const tagsValue = getField(row, "tags");
        if (tagsValue && String(tagsValue).trim()) {
          const tagArray = String(tagsValue).split(",").map(t => t.trim()).filter(t => t.length > 0);
          // Validate tags against allowed values
          const allowedTags = ["General", "Question", "Urgent", "Notes", "Exam"];
          tags = tagArray.filter(tag => allowedTags.includes(tag));
          if (tags.length === 0) {
            tags = ["General"]; // Fallback to default if all invalid
          }
        }

        // Find existing thread by title and exact hierarchy match
        // Use all hierarchy fields to ensure we match the exact same location
        const threadQuery = {
          title: title,
        };
        // Add all hierarchy fields that are set
        Object.keys(hierarchy).forEach(key => {
          if (hierarchy[key]) {
            threadQuery[key] = hierarchy[key];
          }
        });
        const existingThread = await Thread.findOne(threadQuery);

        // Prepare thread data
        const threadData = {
          title: title,
          content: content,
          author: null, // Guest has no author reference
          authorType: "Guest",
          guestName: guest.name,
          tags: tags,
          ...hierarchy,
          views: parseInt(getField(row, "views")) || 0,
          isApproved: getField(row, "is_approved") === "true" || getField(row, "isapproved") === "true" || false,
          isPinned: getField(row, "is_pinned") === "true" || getField(row, "ispinned") === "true" || false,
          isLocked: getField(row, "is_locked") === "true" || getField(row, "islocked") === "true" || false,
          isSolved: getField(row, "is_solved") === "true" || getField(row, "issolved") === "true" || false,
        };

        let thread;
        let isNewThread = false;

        if (existingThread) {
          // Update existing thread
          Object.assign(existingThread, threadData);
          existingThread.updatedAt = new Date();
          // Preserve original createdAt if thread_date not provided
          if (!threadDateValue || !String(threadDateValue).trim()) {
            // Keep original createdAt
            existingThread.createdAt = existingThread.createdAt || threadDate;
          } else {
            existingThread.createdAt = threadDate;
          }
          await existingThread.save();
          thread = existingThread;
          stats.threadsUpdated = (stats.threadsUpdated || 0) + 1;
        } else {
          // Create new thread
          thread = await Thread.create({
            ...threadData,
            createdAt: threadDate,
            updatedAt: threadDate,
          });
          isNewThread = true;
          stats.threadsCreated++;
        }

        // Update or create reply if provided
        const replyContent = getField(row, "reply_content");
        if (replyContent && String(replyContent).trim()) {
          // Generate unique date for reply (should be after thread date)
          let replyDate;
          const replyDateValue = getField(row, "reply_date");
          if (replyDateValue && String(replyDateValue).trim()) {
            try {
              // Extract date from string (handle cases where HTML might be mixed in)
              const dateStr = String(replyDateValue).trim();
              const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z)?)/);
              const cleanDateStr = dateMatch ? dateMatch[1] : dateStr;
              replyDate = new Date(cleanDateStr);
              if (isNaN(replyDate.getTime())) {
                throw new Error(`Invalid reply_date format: ${dateStr}`);
              }
            } catch (err) {
              console.warn(`Row ${rowNum}: Invalid reply_date, using generated date. Error: ${err.message}`);
              replyDate = generateRandomDateLastWeek(thread.createdAt);
            }
          } else {
            replyDate = generateRandomDateLastWeek(thread.createdAt);
          }

          const replyContentStr = String(replyContent).trim();
          // Find existing top-level reply for this thread
          const existingReply = await Reply.findOne({
            threadId: thread._id,
            parentReplyId: null,
            content: replyContentStr,
          });

          if (existingReply) {
            // Update existing reply
            existingReply.content = replyContentStr;
            existingReply.isApproved = getField(row, "reply_approved") === "true" || getField(row, "replyapproved") === "true" || false;
            existingReply.updatedAt = new Date();
            if (replyDateValue && String(replyDateValue).trim()) {
              existingReply.createdAt = replyDate;
            }
            await existingReply.save();
            stats.repliesUpdated = (stats.repliesUpdated || 0) + 1;
          } else {
            // Create new reply
            await Reply.create({
              threadId: thread._id,
              content: replyContentStr,
              author: null,
              authorType: "Guest",
              guestName: guest.name,
              parentReplyId: null, // Top-level reply
              isApproved: getField(row, "reply_approved") === "true" || getField(row, "replyapproved") === "true" || false,
              createdAt: replyDate,
              updatedAt: replyDate,
            });
            stats.repliesCreated++;
          }
        }

        // Update or create nested replies if provided (reply2, reply3, etc.)
        let replyIndex = 2;
        let lastReply = null;
        let nestedReplyContent = getField(row, `reply${replyIndex}_content`);
        while (nestedReplyContent && String(nestedReplyContent).trim()) {
          // Find parent reply: use last created/updated reply, or find first top-level reply
          // If no top-level reply exists yet, create it first (shouldn't happen but handle gracefully)
          let parentReply = lastReply;
          
          if (!parentReply) {
            // Find the first top-level reply (reply_content) or any top-level reply
            parentReply = await Reply.findOne({ 
              threadId: thread._id, 
              parentReplyId: null 
            }).sort({ createdAt: 1 }); // Get first reply, not last
          }
          
          if (!parentReply) {
            // No parent reply found - skip this nested reply with warning
            stats.errors.push(`Row ${rowNum}: Cannot create reply${replyIndex} - no parent reply found. Ensure reply_content is provided first.`);
            replyIndex++;
            continue;
          }
          
          if (parentReply) {
            // Generate unique date for nested reply (should be after parent reply)
            let nestedReplyDate;
            const nestedReplyDateValue = getField(row, `reply${replyIndex}_date`);
            if (nestedReplyDateValue && String(nestedReplyDateValue).trim()) {
              try {
                // Extract date from string (handle cases where HTML might be mixed in)
                const dateStr = String(nestedReplyDateValue).trim();
                const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z)?)/);
                const cleanDateStr = dateMatch ? dateMatch[1] : dateStr;
                nestedReplyDate = new Date(cleanDateStr);
                if (isNaN(nestedReplyDate.getTime())) {
                  throw new Error(`Invalid reply${replyIndex}_date format: ${dateStr}`);
                }
              } catch (err) {
                console.warn(`Row ${rowNum}: Invalid reply${replyIndex}_date, using generated date. Error: ${err.message}`);
                nestedReplyDate = generateRandomDateLastWeek(parentReply.createdAt);
              }
            } else {
              nestedReplyDate = generateRandomDateLastWeek(parentReply.createdAt);
            }

            const nestedReplyContentStr = String(nestedReplyContent).trim();
            // Find existing nested reply with same content and parent
            const existingNestedReply = await Reply.findOne({
              threadId: thread._id,
              parentReplyId: parentReply._id,
              content: nestedReplyContentStr,
            });

            if (existingNestedReply) {
              // Update existing nested reply
              existingNestedReply.content = nestedReplyContentStr;
              existingNestedReply.isApproved = getField(row, `reply${replyIndex}_approved`) === "true" || getField(row, `reply${replyIndex}approved`) === "true" || false;
              existingNestedReply.updatedAt = new Date();
              if (nestedReplyDateValue && String(nestedReplyDateValue).trim()) {
                existingNestedReply.createdAt = nestedReplyDate;
              }
              await existingNestedReply.save();
              lastReply = existingNestedReply;
              stats.repliesUpdated = (stats.repliesUpdated || 0) + 1;
            } else {
              // Create new nested reply
              const newReply = await Reply.create({
                threadId: thread._id,
                content: nestedReplyContentStr,
                author: null,
                authorType: "Guest",
                guestName: guest.name,
                parentReplyId: parentReply._id,
                isApproved: getField(row, `reply${replyIndex}_approved`) === "true" || getField(row, `reply${replyIndex}approved`) === "true" || false,
                createdAt: nestedReplyDate,
                updatedAt: nestedReplyDate,
              });
              lastReply = newReply;
              stats.repliesCreated++;
            }
          }
          replyIndex++;
          nestedReplyContent = getField(row, `reply${replyIndex}_content`);
        }

      } catch (error) {
        stats.errors.push(`Row ${rowNum}: ${error.message}`);
        console.error(`Error processing row ${rowNum}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Import completed",
      data: stats,
    });

  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Import failed" },
      { status: 500 }
    );
  }
}