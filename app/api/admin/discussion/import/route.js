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
    const data = parseCSV(fileText);

    // Validate required fields
    const requiredFields = ["title", "content"];
    const validation = validateCSVData(data, requiredFields);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors: validation.errors },
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
        // Generate or use guest name
        let guestName = row.guestname || row.guest_name || generateRandomGuestName();
        const guest = await findOrCreateGuest(guestName);
        if (!guest.guestId) {
          guest.guestId = generateUniqueId();
          await guest.save();
        }
        if (stats.guestsCreated === 0 || !await Guest.findById(guest._id)) {
          stats.guestsCreated++;
        }

        // Find hierarchy IDs from CSV, but override with selected IDs for the level
        let hierarchy = await findHierarchyIds(row);
        
        // Override with selected IDs based on level
        // If level is "exam", only use selected examId
        // If level is "subject", use selected examId and subjectId, etc.
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
        }

        // Generate unique random date for thread (each thread gets a different date)
        let threadDate = row.thread_date 
          ? new Date(row.thread_date) 
          : generateRandomDateLastWeek(lastThreadDate);
        
        // Update last thread date for next iteration
        if (!row.thread_date) {
          lastThreadDate = threadDate;
        }

        // Find existing thread by title and hierarchy (update if exists, create if not)
        const threadData = {
          title: row.title.trim(),
          content: row.content.trim(),
          author: null, // Guest has no author reference
          authorType: "Guest",
          guestName: guest.name,
          tags: row.tags ? row.tags.split(",").map(t => t.trim()) : ["General"],
          ...hierarchy,
          views: parseInt(row.views) || 0,
          isApproved: row.is_approved === "true" || row.isapproved === "true" || false,
          isPinned: row.is_pinned === "true" || row.ispinned === "true" || false,
          isLocked: row.is_locked === "true" || row.islocked === "true" || false,
          isSolved: row.is_solved === "true" || row.issolved === "true" || false,
        };

        // Find existing thread by title and hierarchy match
        const existingThread = await Thread.findOne({
          title: row.title.trim(),
          ...hierarchy,
        });

        let thread;
        let isNewThread = false;

        if (existingThread) {
          // Update existing thread
          Object.assign(existingThread, threadData);
          existingThread.updatedAt = new Date();
          // Preserve original createdAt if thread_date not provided
          if (!row.thread_date) {
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
        if (row.reply_content && row.reply_content.trim()) {
          // Generate unique date for reply (should be after thread date)
          let replyDate = row.reply_date 
            ? new Date(row.reply_date) 
            : generateRandomDateLastWeek(thread.createdAt);

          // Find existing top-level reply for this thread
          const existingReply = await Reply.findOne({
            threadId: thread._id,
            parentReplyId: null,
            content: row.reply_content.trim(),
          });

          if (existingReply) {
            // Update existing reply
            existingReply.content = row.reply_content.trim();
            existingReply.isApproved = row.reply_approved === "true" || row.replyapproved === "true" || false;
            existingReply.updatedAt = new Date();
            if (row.reply_date) {
              existingReply.createdAt = replyDate;
            }
            await existingReply.save();
            stats.repliesUpdated = (stats.repliesUpdated || 0) + 1;
          } else {
            // Create new reply
            await Reply.create({
              threadId: thread._id,
              content: row.reply_content.trim(),
              author: null,
              authorType: "Guest",
              guestName: guest.name,
              parentReplyId: null, // Top-level reply
              isApproved: row.reply_approved === "true" || row.replyapproved === "true" || false,
              createdAt: replyDate,
              updatedAt: replyDate,
            });
            stats.repliesCreated++;
          }
        }

        // Update or create nested replies if provided (reply2, reply3, etc.)
        let replyIndex = 2;
        let lastReply = null;
        while (row[`reply${replyIndex}_content`] && row[`reply${replyIndex}_content`].trim()) {
          // Find parent reply (use last created/updated reply, or find first top-level reply)
          const parentReply = lastReply || await Reply.findOne({ 
            threadId: thread._id, 
            parentReplyId: null 
          }).sort({ createdAt: -1 });
          
          if (parentReply) {
            // Generate unique date for nested reply (should be after parent reply)
            let nestedReplyDate = row[`reply${replyIndex}_date`] 
              ? new Date(row[`reply${replyIndex}_date`]) 
              : generateRandomDateLastWeek(parentReply.createdAt);

            // Find existing nested reply with same content and parent
            const existingNestedReply = await Reply.findOne({
              threadId: thread._id,
              parentReplyId: parentReply._id,
              content: row[`reply${replyIndex}_content`].trim(),
            });

            if (existingNestedReply) {
              // Update existing nested reply
              existingNestedReply.content = row[`reply${replyIndex}_content`].trim();
              existingNestedReply.isApproved = row[`reply${replyIndex}_approved`] === "true" || false;
              existingNestedReply.updatedAt = new Date();
              if (row[`reply${replyIndex}_date`]) {
                existingNestedReply.createdAt = nestedReplyDate;
              }
              await existingNestedReply.save();
              lastReply = existingNestedReply;
              stats.repliesUpdated = (stats.repliesUpdated || 0) + 1;
            } else {
              // Create new nested reply
              const newReply = await Reply.create({
                threadId: thread._id,
                content: row[`reply${replyIndex}_content`].trim(),
                author: null,
                authorType: "Guest",
                guestName: guest.name,
                parentReplyId: parentReply._id,
                isApproved: row[`reply${replyIndex}_approved`] === "true" || false,
                createdAt: nestedReplyDate,
                updatedAt: nestedReplyDate,
              });
              lastReply = newReply;
              stats.repliesCreated++;
            }
          }
          replyIndex++;
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