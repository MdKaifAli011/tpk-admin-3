# TestPrepKart - Deep Project Analysis

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture Patterns](#architecture-patterns)
5. [UI Structure & Layouting](#ui-structure--layouting)
6. [API Structure & Handling](#api-structure--handling)
7. [Models & Database](#models--database)
8. [Authentication & Authorization](#authentication--authorization)
9. [File & Folder Management](#file--folder-management)
10. [Component Creation Patterns](#component-creation-patterns)

---

## 🎯 Project Overview

**TestPrepKart** is a comprehensive exam preparation platform built with Next.js 16 (App Router), MongoDB, and React. The project serves two distinct user groups:

1. **Admin Panel** (`(admin)` group) - Content management system for administrators
2. **Main App** (`(main)` group) - Student-facing learning platform

**Base Path**: `/self-study` (configured in `next.config.mjs`)

---

## 🛠 Technology Stack

### Core Technologies
- **Framework**: Next.js 16.0.1 (App Router)
- **Runtime**: React 19.2.0
- **Database**: MongoDB with Mongoose 8.19.2
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 3.3.1
- **HTTP Client**: Axios 1.13.1
- **Styling**: Tailwind CSS 4

### Key Libraries
- **Rich Text Editor**: CKEditor 4, Lexical
- **Icons**: react-icons 5.5.0
- **Math Rendering**: MathJax 2.7.9
- **Form Handling**: Custom implementations
- **Caching**: Custom cacheManager utility

---

## 📁 Project Structure

### Root Directory Layout

```
tpk-admin-3/
├── app/                    # Next.js App Router directory
│   ├── (admin)/           # Admin route group (doesn't affect URL)
│   ├── (main)/            # Main app route group (doesn't affect URL)
│   ├── api/               # API routes (Next.js Route Handlers)
│   ├── globals.css        # Global styles
│   ├── layout.js          # Root layout
│   └── logout/            # Logout page
├── config/                # Configuration files
│   └── config.js          # App configuration (env vars)
├── constants/             # Application constants
│   └── index.js           # All constants (messages, configs, etc.)
├── middleware/            # Server-side middleware
│   └── authMiddleware.js  # Authentication middleware
├── models/                # Mongoose models (database schemas)
├── lib/                   # Shared libraries
│   ├── api.js            # Axios instance & API helpers
│   ├── auth.js           # Authentication utilities
│   └── mongodb.js        # Database connection
├── utils/                 # Utility functions
│   ├── apiResponse.js    # API response helpers
│   ├── cacheManager.js   # Caching utilities
│   ├── logger.js         # Logging utilities
│   └── pagination.js     # Pagination helpers
└── components/            # Shared components
    ├── ErrorBoundary.jsx
    └── shared/           # Shared UI components
```

---

## 🏗 Architecture Patterns

### 1. **Route Groups Pattern**
Next.js route groups `(admin)` and `(main)` organize code without affecting URLs:

- `(admin)` - Admin panel routes
  - URL: `/self-study/admin/*`
  - Layout: Admin-specific layout with sidebar
  - Auth: Admin user authentication

- `(main)` - Student-facing routes
  - URL: `/self-study/*` (excluding `/admin/*`)
  - Layout: Public/main app layout
  - Auth: Student authentication (optional)

### 2. **API Route Pattern (Next.js App Router)**
API routes use Next.js Route Handlers (not Pages Router):

```
app/api/
├── auth/
│   ├── login/route.js     # POST handler
│   ├── register/route.js  # POST handler
│   └── verify/route.js    # GET handler
├── exam/
│   ├── route.js           # GET, POST handlers
│   └── [id]/route.js      # GET, PUT, DELETE handlers
└── ...
```

**Pattern**: Each route file exports HTTP methods:
```javascript
export async function GET(request) { ... }
export async function POST(request) { ... }
export async function PUT(request, { params }) { ... }
export async function DELETE(request, { params }) { ... }
```

### 3. **Server & Client Component Separation**
- **Server Components** (default): Data fetching, SEO, initial render
- **Client Components** (`"use client"`): Interactivity, hooks, browser APIs

---

## 🎨 UI Structure & Layouting

### Admin Panel UI Structure

#### Layout Hierarchy
```
app/(admin)/layout.js (Client Component)
  └── AdminLayout
      ├── AuthGuard (checks authentication)
      ├── ErrorBoundary (error handling)
      ├── Header (persistent, no re-render on nav)
      ├── Sidebar (persistent, no re-render on nav)
      └── <main> (content area, changes on navigation)
```

#### Admin Layout Features
- **Fixed Header**: Top navigation bar (64px height, lg:pt-20)
- **Collapsible Sidebar**: 256px width (lg:ml-64)
- **Content Area**: Max-width 7xl, centered, padding
- **Authentication**: Token-based, verified on mount
- **Permission-based UI**: Components check user roles

#### Admin Component Organization
```
app/(admin)/
├── components/
│   ├── auth/
│   │   └── AuthGuard.jsx       # Auth wrapper
│   ├── common/
│   │   └── PermissionButton.jsx # Permission-aware buttons
│   ├── features/               # Feature components (32 files)
│   │   ├── ExamManagement.jsx
│   │   ├── SubjectManagement.jsx
│   │   └── ...
│   ├── table/                  # Data table components (12 files)
│   │   ├── ExamTable.jsx
│   │   └── ...
│   └── ui/                     # UI components
│       ├── RichTextEditor.jsx
│       ├── SkeletonLoader.jsx
│       └── Toast.jsx
├── hooks/
│   └── usePermissions.js       # Permission checking hook
└── layouts/
    ├── Header.jsx              # Top navigation
    ├── Sidebar.jsx             # Side navigation
    └── MainLayout.jsx          # (legacy/unused)
```

#### Admin Page Pattern
```javascript
// app/(admin)/admin/exam/page.js
import ExamManagement from '../../components/features/ExamManagement';

export default function ExamPage() {
  return <ExamManagement />;
}
```

### Main App UI Structure

#### Layout Hierarchy
```
app/(main)/layout.js (Server Component with metadata)
  └── MainLayoutClient (Client Component)
      ├── ErrorBoundary
      ├── ServiceWorkerRegistration
      ├── ScrollToTop
      ├── WhatsAppFloatButton
      ├── Navbar (persistent)
      ├── Sidebar (conditional, 300px width)
      ├── <main> (content area)
      └── Footer
```

#### Main Layout Features
- **Responsive Navbar**: Adaptive height (110px md:120px)
- **Dynamic Sidebar**: 300px width, collapsible, conditional rendering
- **Content Area**: Flexible width, optional full-width mode
- **Student Auth**: Optional authentication (guest mode supported)
- **Service Worker**: PWA support

#### Main Component Organization
```
app/(main)/
├── components/              # 53 files (48 .jsx, 5 .js)
│   ├── ExamCard.jsx
│   ├── ProgressTracker.jsx
│   ├── forms/              # Form components
│   ├── hooks/              # Component hooks
│   └── utils/              # Component utilities
├── hooks/                  # App-level hooks
│   ├── useProgress.js
│   └── useStudent.js
├── lib/
│   ├── api.js             # API client helpers
│   └── hierarchicalNavigation.js
└── layout/
    ├── Navbar.jsx
    ├── Sidebar.jsx
    ├── Footer.jsx
    └── MainLayoutClient.jsx
```

---

## 🔌 API Structure & Handling

### API Client Setup (`lib/api.js`)

**Axios Instance Configuration**:
```javascript
const api = axios.create({
  baseURL: `${basePath}/api`,  // /self-study/api
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});
```

**Request Interceptor**:
- Adds authentication tokens (admin or student)
- Token selection based on route and context:
  - Admin routes: Uses `token` (admin token)
  - Student routes: Uses `student_token` (student token)
  - Discussion routes: Context-aware token selection

**Response Interceptor**:
- Handles 401 (redirects to login)
- Handles 403 (forbidden)
- Handles network errors
- Clears invalid tokens

### API Route Structure

#### Standard CRUD Pattern
```javascript
// app/api/exam/route.js
export async function GET(request) {
  // 1. Check authentication (if needed)
  const authCheck = await requireAuth(request);
  if (authCheck.error) return NextResponse.json(authCheck, { status: 401 });

  // 2. Connect to database
  await connectDB();

  // 3. Parse query parameters
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePagination(searchParams);

  // 4. Build query
  const query = { /* filters */ };

  // 5. Execute query (with caching if applicable)
  const data = await Model.find(query).sort({ orderNumber: 1 });

  // 6. Return standardized response
  return successResponse(data, "Data fetched successfully");
}

export async function POST(request) {
  // 1. Check authentication & permissions
  const authCheck = await requireAction(request, "POST");
  if (authCheck.error) return NextResponse.json(authCheck, { status: 403 });

  // 2. Validate input
  const body = await request.json();
  if (!body.name) return errorResponse("Name required", 400);

  // 3. Create record
  const newRecord = await Model.create(body);

  // 4. Clear cache (if applicable)
  cacheManager.clear("prefix-");

  // 5. Return success response
  return successResponse(newRecord, "Created successfully", 201);
}
```

#### Dynamic Routes Pattern
```javascript
// app/api/exam/[id]/route.js
export async function GET(request, { params }) {
  const { id } = await params;  // Next.js 15+ async params
  const exam = await Exam.findById(id);
  if (!exam) return notFoundResponse("Exam not found");
  return successResponse(exam);
}

export async function PUT(request, { params }) {
  const authCheck = await requireAction(request, "PUT");
  if (authCheck.error) return NextResponse.json(authCheck, { status: 403 });
  
  const { id } = await params;
  const body = await request.json();
  const updated = await Exam.findByIdAndUpdate(id, body, { new: true });
  return successResponse(updated, "Updated successfully");
}
```

### API Response Standardization

All API responses follow this structure:
```javascript
// Success Response
{
  success: true,
  message: "Operation successful",
  data: { /* actual data */ },
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Error Response
{
  success: false,
  message: "Error message",
  errors: { /* validation errors if any */ },
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

### Helper Functions (`utils/apiResponse.js`)
- `successResponse(data, message, status)` - Create success response
- `errorResponse(message, status, errors)` - Create error response
- `handleApiError(error, customMessage)` - Handle Mongoose errors
- `notFoundResponse(message)` - 404 response
- `unauthorizedResponse()` - 401 response
- `forbiddenResponse()` - 403 response

---

## 🗄 Models & Database

### Model Structure Pattern

All models follow Mongoose schema patterns:

```javascript
// models/Exam.js
import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const examSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    orderNumber: { type: Number, required: true, min: 1 },
    status: { 
      type: String, 
      enum: ["active", "inactive", "draft"], 
      default: "active" 
    },
  },
  { timestamps: true }  // Adds createdAt, updatedAt
);

// Pre-save hooks (slug generation, validation)
examSchema.pre("save", async function (next) {
  // Auto-generate slug from name
  if (this.isModified("name") || this.isNew) {
    this.slug = await generateUniqueSlug(/* ... */);
  }
  next();
});

// Cascading delete hooks
examSchema.pre("findOneAndDelete", async function () {
  // Delete related documents
  await Subject.deleteMany({ examId: this._id });
  // ...
});

// Model export (handles hot-reload)
const Exam = mongoose.models.Exam || mongoose.model("Exam", examSchema);
export default Exam;
```

### Key Models

1. **User Models**:
   - `User.js` - Admin users (roles: admin, super_moderator, moderator, editor, viewer)
   - `Student.js` - Student users (with cascading delete)

2. **Content Hierarchy**:
   - `Exam` → `Subject` → `Unit` → `Chapter` → `Topic` → `SubTopic`
   - Each level has a `Details` model for content (e.g., `SubjectDetails.js`)

3. **Content Details Pattern**:
   - Separate model for rich content (prevents main schema bloat)
   - Example: `Subject.js` (metadata) + `SubjectDetails.js` (content, SEO)
   - Related via `subjectId` foreign key

4. **Supporting Models**:
   - `Blog`, `BlogCategory`, `BlogComment`
   - `Thread`, `Reply` (discussion forum)
   - `DownloadFolder`, `DownloadFile`
   - `PracticeCategory`, `PracticeSubCategory`, `PracticeQuestion`
   - `Form`, `Lead`

5. **Progress Tracking**:
   - `StudentProgress` - Unit/chapter progress
   - `SubjectProgress` - Subject-level progress
   - `StudentTestResult` - Test scores

### Model Relationships

**Hierarchical Relationships**:
- Exam → Subjects (one-to-many)
- Subject → Units (one-to-many)
- Unit → Chapters (one-to-many)
- Chapter → Topics (one-to-many)
- Topic → SubTopics (one-to-many)

**Cascading Deletes**:
- Deleting Exam deletes all Subjects, Units, Chapters, etc.
- Deleting Subject deletes all Units, Chapters, etc.
- Deleting Student deletes all Progress and Test Results

**Content Separation**:
- Main models store metadata (name, slug, status, orderNumber)
- Details models store content (rich text, SEO metadata)

---

## 🔐 Authentication & Authorization

### Authentication System

#### Two Authentication Systems

1. **Admin Authentication** (`lib/auth.js`)
   - JWT tokens stored in `localStorage` as `token`
   - User roles: `admin`, `super_moderator`, `moderator`, `editor`, `viewer`
   - Token payload: `{ userId, email, role }`
   - Verification: Checks token validity AND user existence in database

2. **Student Authentication** (`lib/studentAuth.js`)
   - JWT tokens stored in `localStorage` as `student_token`
   - Student model with email/password
   - Token payload: `{ type: "student", studentId, email }`
   - Guest mode: Students can browse without login

### Authorization Middleware (`middleware/authMiddleware.js`)

**Functions**:
- `requireAuth(request)` - Check if user is authenticated
- `requireRole(request, requiredRoles)` - Check if user has specific role(s)
- `requireAction(request, action)` - Check if user can perform action (GET, POST, PUT, DELETE)
- `requireUserManagement(request)` - Check if user can manage users (admin only)

**Permission Matrix** (`lib/auth.js`):
```javascript
const rolePermissions = {
  viewer: ["GET"],
  editor: ["GET", "PUT", "PATCH"],
  moderator: ["GET", "POST", "PUT", "PATCH"],
  super_moderator: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  admin: ["GET", "POST", "PUT", "PATCH", "DELETE", "MANAGE_USERS"]
};
```

### Client-Side Permission Hook (`app/(admin)/hooks/usePermissions.js`)

```javascript
const { canCreate, canEdit, canDelete, canReorder, canManageUsers, role } = usePermissions();
```

**Features**:
- Reads user from localStorage
- Normalizes role strings
- Updates on storage events
- Provides permission helpers and messages

### Layout-Level Authentication

**Admin Layout** (`app/(admin)/layout.js`):
- Client component that checks auth on mount
- Verifies token with `/api/auth/verify`
- Redirects to `/admin/login` if unauthenticated
- Uses `AuthGuard` component for additional protection

**Main Layout** (`app/(main)/layout/MainLayout.jsx`):
- Optional student authentication
- Verifies student token if present
- Guest mode supported (no redirect)

---

## 📂 File & Folder Management

### Naming Conventions

1. **Routes (Pages)**:
   - Files: `page.js` (Next.js convention)
   - Folders: `kebab-case` (e.g., `blog-category/`)
   - Dynamic routes: `[id]/page.js` or `[slug]/page.js`

2. **Components**:
   - Files: `PascalCase.jsx` (e.g., `ExamManagement.jsx`)
   - Folders: `camelCase` (e.g., `components/features/`)

3. **API Routes**:
   - Files: `route.js` (Next.js convention)
   - Dynamic routes: `[id]/route.js`

4. **Models**:
   - Files: `PascalCase.js` (e.g., `Subject.js`)
   - Exports: Default export of model

5. **Utilities**:
   - Files: `camelCase.js` (e.g., `apiResponse.js`)
   - Folders: `camelCase` (e.g., `utils/`)

### File Creation Patterns

#### Creating a New Admin Page

1. **Create Route Folder**: `app/(admin)/admin/my-feature/page.js`
```javascript
import MyFeatureManagement from '../../components/features/MyFeatureManagement';
export default function MyFeaturePage() {
  return <MyFeatureManagement />;
}
```

2. **Create Feature Component**: `app/(admin)/components/features/MyFeatureManagement.jsx`
```javascript
"use client";
import React, { useState, useEffect } from "react";
import MyFeatureTable from "../table/MyFeatureTable";
import { usePermissions } from "../../hooks/usePermissions";
import api from "@/lib/api";

const MyFeatureManagement = () => {
  const { canCreate, canEdit, canDelete } = usePermissions();
  const [data, setData] = useState([]);
  // ... component logic
};
```

3. **Create Table Component**: `app/(admin)/components/table/MyFeatureTable.jsx`
```javascript
"use client";
// Table component for displaying data
```

4. **Add Sidebar Menu Item**: Update `app/(admin)/layouts/Sidebar.jsx`
```javascript
{ name: "My Feature", href: "/admin/my-feature", icon: FaIcon }
```

#### Creating a New API Route

1. **Create Route File**: `app/api/my-feature/route.js`
```javascript
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import MyFeature from "@/models/MyFeature";
import { successResponse, errorResponse, handleApiError } from "@/utils/apiResponse";
import { requireAuth, requireAction } from "@/middleware/authMiddleware";

export async function GET(request) {
  try {
    const authCheck = await requireAuth(request);
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: 401 });
    }
    await connectDB();
    // ... fetch logic
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request) {
  try {
    const authCheck = await requireAction(request, "POST");
    if (authCheck.error) {
      return NextResponse.json(authCheck, { status: 403 });
    }
    await connectDB();
    // ... create logic
    return successResponse(newRecord, "Created successfully", 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

2. **Create Dynamic Route** (if needed): `app/api/my-feature/[id]/route.js`
```javascript
export async function GET(request, { params }) {
  const { id } = await params;
  // ... fetch single item
}

export async function PUT(request, { params }) {
  const { id } = await params;
  // ... update logic
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  // ... delete logic
}
```

#### Creating a New Model

1. **Create Model File**: `models/MyFeature.js`
```javascript
import mongoose from "mongoose";
import { createSlug, generateUniqueSlug } from "../utils/serverSlug.js";

const myFeatureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    status: { 
      type: String, 
      enum: ["active", "inactive"], 
      default: "active" 
    },
    orderNumber: { type: Number, min: 1 },
    // ... other fields
  },
  { timestamps: true }
);

// Indexes
myFeatureSchema.index({ slug: 1 });
myFeatureSchema.index({ orderNumber: 1 });

// Pre-save hooks
myFeatureSchema.pre("save", async function (next) {
  if (this.isModified("name") || this.isNew) {
    this.slug = await generateUniqueSlug(/* ... */);
  }
  next();
});

// Export model
const MyFeature = mongoose.models.MyFeature || mongoose.model("MyFeature", myFeatureSchema);
export default MyFeature;
```

2. **Create Details Model** (if needed): `models/MyFeatureDetails.js`
```javascript
const myFeatureDetailsSchema = new mongoose.Schema(
  {
    myFeatureId: { type: mongoose.Schema.Types.ObjectId, ref: "MyFeature", required: true },
    content: { type: String, default: "" },
    title: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    keywords: { type: String, default: "" },
  },
  { timestamps: true }
);

myFeatureDetailsSchema.index({ myFeatureId: 1 }, { unique: true });
```

---

## 🧩 Component Creation Patterns

### Admin Feature Component Pattern

```javascript
"use client";
import React, { useState, useEffect } from "react";
import MyFeatureTable from "../table/MyFeatureTable";
import { usePermissions } from "../../hooks/usePermissions";
import { ToastContainer, useToast } from "../ui/Toast";
import api from "@/lib/api";

const MyFeatureManagement = () => {
  // 1. Permission hooks
  const { canCreate, canEdit, canDelete, role } = usePermissions();
  const { toasts, removeToast, success, error: showError } = useToast();

  // 2. State management
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: "", status: "active" });

  // 3. Data fetching
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/my-feature?status=all");
      if (response.data?.success) {
        setData(response.data.data || []);
      }
    } catch (error) {
      showError("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 4. CRUD handlers
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canCreate) {
      showError("Permission denied");
      return;
    }
    // ... add logic
  };

  const handleEdit = (item) => {
    if (!canEdit) {
      showError("Permission denied");
      return;
    }
    setEditingItem(item);
    setFormData({ name: item.name, status: item.status });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      showError("Permission denied");
      return;
    }
    // ... delete logic
  };

  // 5. Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1>My Feature Management</h1>
        {canCreate && (
          <button onClick={() => setShowAddForm(true)}>Add New</button>
        )}
      </div>

      {/* Form Modal */}
      {showAddForm && (
        <form onSubmit={handleAdd}>
          {/* Form fields */}
        </form>
      )}

      {/* Table */}
      <MyFeatureTable
        data={data}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canEdit={canEdit}
        canDelete={canDelete}
        isLoading={isLoading}
      />

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default MyFeatureManagement;
```

### Main App Component Pattern

```javascript
"use client";
import React, { useState, useEffect } from "react";
import api from "@/lib/api";

const MyComponent = ({ initialData }) => {
  const [data, setData] = useState(initialData || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Client-side data fetching if needed
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get("/my-endpoint");
        setData(response.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      {/* Component UI */}
    </div>
  );
};

export default MyComponent;
```

### Server Component Pattern (Main App)

```javascript
// app/(main)/my-page/page.js (Server Component)
import { fetchMyData } from "../lib/api";
import MyClientComponent from "../components/MyClientComponent";

export default async function MyPage() {
  // Server-side data fetching
  const data = await fetchMyData();

  return (
    <div>
      <h1>My Page</h1>
      <MyClientComponent initialData={data} />
    </div>
  );
}
```

---

## 📝 Key Patterns & Best Practices

### 1. **Constants Management** (`constants/index.js`)
- All constants centralized in one file
- Includes: messages, configurations, routes, API endpoints, validation rules
- Exported as named exports for tree-shaking

### 2. **Error Handling**
- API routes: Use `handleApiError` for consistent error responses
- Components: Try-catch blocks with user-friendly error messages
- ErrorBoundary: Catches React errors in layouts

### 3. **Caching Strategy**
- API routes: Use `cacheManager` for in-memory caching
- Cache keys: Prefix-based (e.g., `exams-active-1-10`)
- Cache invalidation: Clear on create/update/delete operations

### 4. **Pagination Pattern**
```javascript
const { page, limit, skip } = parsePagination(searchParams);
const data = await Model.find(query)
  .sort({ orderNumber: 1 })
  .skip(skip)
  .limit(limit);
const total = await Model.countDocuments(query);
return createPaginationResponse(data, total, page, limit);
```

### 5. **Slug Generation**
- Auto-generated from name using `utils/serverSlug.js`
- Unique within parent scope (e.g., subject slugs unique per exam)
- Handles conflicts with numeric suffixes

### 6. **Order Number Management**
- Auto-incremented if not provided
- Unique within parent scope
- Used for sorting in API responses

### 7. **Status Management**
- All content models have `status` field: `"active" | "inactive"`
- Default: `"active"`
- Filtering: `status=all` returns all, `status=active` returns only active

### 8. **Password Security**
- Bcrypt hashing (10 rounds)
- Passwords excluded from queries (`select: false`)
- `toJSON` method removes password from responses

---

## 🔄 Data Flow

### Admin Panel Flow
1. User logs in → JWT token stored in localStorage
2. Layout checks auth → Verifies token with `/api/auth/verify`
3. Component mounts → Fetches data from API
4. User performs action → API validates permissions → Updates database
5. Cache cleared → Component refetches data

### Main App Flow
1. Page loads → Server component fetches initial data
2. Client components hydrate → Optional additional fetching
3. User interacts → API calls (with or without auth)
4. Data updates → Component re-renders

---

## 🚀 Deployment Configuration

### Base Path
- All routes prefixed with `/self-study`
- Configured in `next.config.mjs`
- Affects: API routes, static assets, internal navigation

### Environment Variables
Required variables (validated in `config/config.js`):
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session secret
- `NEXT_PUBLIC_BASE_PATH` - Base path (default: `/self-study`)
- `NEXT_PUBLIC_API_URL` - API base URL

---

## 📊 Summary

This project follows a **clean, modular architecture** with:

✅ **Separation of Concerns**: Admin vs Main app separation  
✅ **Role-Based Access Control**: Granular permissions  
✅ **RESTful API Design**: Standardized endpoints and responses  
✅ **Component Reusability**: Shared components and utilities  
✅ **Type Safety**: Consistent data structures  
✅ **Error Handling**: Comprehensive error management  
✅ **Performance**: Caching, pagination, optimization  
✅ **Security**: Authentication, authorization, password hashing  
✅ **Scalability**: Modular structure, clear patterns  

The codebase is production-ready with comprehensive error handling, authentication, and a well-organized structure that supports both content management (admin) and user-facing features (main app).

