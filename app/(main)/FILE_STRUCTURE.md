# File Structure Documentation

## `app/(main)` Directory

This document provides a comprehensive overview of the file structure within the `app/(main)` directory.

---

## 📁 Root Level Files

```
app/(main)/
├── layout.js                    # Main layout wrapper with SEO metadata
├── page.js                      # Homepage component (606 lines)
├── error.jsx                    # Error boundary component
├── loading.jsx                  # Loading state component
└── not-found.js                 # 404 Not Found page component
```

---

## 📂 Directory Structure

### 1. **`/layout/`** - Layout Components

```
layout/
├── MainLayout.jsx              # Main layout wrapper (134 lines)
│   ├── Handles sidebar state
│   ├── Responsive design (mobile/desktop)
│   └── Error boundary integration
├── Navbar.jsx                  # Top navigation bar
├── Sidebar.jsx                 # Sidebar navigation (530 lines)
└── Footer.jsx                  # Footer component
```

**Purpose**: Core layout components that wrap all pages in the application.

---

### 2. **`/components/`** - Reusable Components

#### **Root Component Files:**

```
components/
├── ChapterCompletionTracker.jsx
├── ChapterProgressItem.jsx
├── ChaptersListClient.jsx
├── ChaptersSectionClient.jsx
├── Collapsible.jsx
├── CongratulationsModal.jsx
├── ContactForm.jsx
├── DiscussionForumTab.jsx
├── DownloadButton.jsx
├── DownloadModal.jsx
├── ErrorState.jsx
├── ExamCard.jsx
├── ExamDropdown.jsx
├── HeaderCard.jsx
├── ListItem.jsx
├── LoadingState.jsx
├── LoginPromptModal.jsx
├── NavigationClient.jsx
├── OverviewTab.jsx
├── PerformanceTab.jsx
├── PracticeTestList.jsx
├── PracticeTestTab.jsx
├── ProgressTracker.jsx
├── PropTypes.js
├── RichContent.jsx
├── ScrollToTop.jsx
├── ServiceWorkerRegistration.jsx
├── SidebarNavigationTree.jsx  # Sidebar navigation tree (360 lines)
├── SkeletonLoader.jsx
├── SubjectCompletionTracker.jsx
├── SubjectProgressClient.jsx
├── TabsClient.jsx
├── TestSubmissionRegistrationModal.jsx
├── TextEllipsis.jsx
├── UnitCompletionTracker.jsx
├── UnitProgressClient.jsx
├── UnitsListClient.jsx
└── UnitsSectionClient.jsx
```

#### **Subdirectories:**

**`/components/forms/`** - Form Components

```
forms/
├── FormFieldInput.jsx
├── FormRenderer.jsx
├── formUtils.js
├── SubmitStatusMessage.jsx
└── VerificationInput.jsx
```

**`/components/constants/`** - Form Constants

```
constants/
└── formConstants.js
```

**`/components/utils/`** - Component Utilities

```
utils/
└── formValidation.js
```

**`/components/hooks/`** - Component-Specific Hooks

```
hooks/
└── useVerification.js
```

**Purpose**: Reusable UI components, forms, utilities, and hooks used throughout the application.

---

### 3. **`/lib/`** - Library & Utilities

```
lib/
├── api.js                      # API client/utilities
├── hierarchicalNavigation.js  # Navigation hierarchy logic
│
├── hooks/                      # Custom React hooks
│   ├── useDataFetching.js
│   ├── useOptimizedFetch.js
│   └── usePathnameWithoutRerender.js
│
└── utils/                      # Utility functions
    └── mathJaxLoader.js
```

**Purpose**: Core utilities, API clients, and shared hooks for data fetching and navigation.

---

### 4. **`/hooks/`** - Application-Level Hooks

```
hooks/
├── useProgress.js              # Progress tracking hook
└── useStudent.js               # Student data hook
```

**Purpose**: Application-level custom hooks for managing state and data.

---

### 5. **`/login/`** - Authentication Pages

```
login/
└── page.js                     # Login page component (267 lines)
    ├── Email/password authentication
    ├── Form validation
    └── Token storage
```

**Purpose**: User authentication and login functionality.

---

### 6. **`/register/`** - Registration Pages

```
register/
└── page.js                     # Registration page component (931 lines)
    ├── Two-step registration form
    ├── Step 1: Basic info (name, class)
    ├── Step 2: Account details (email, phone, password)
    ├── Country selection
    └── Exam selection
```

**Purpose**: New user registration with multi-step form.

---

### 7. **`/contact/`** - Contact Pages

```
contact/
└── page.js                     # Contact page component (434 lines)
    ├── Contact information cards
    ├── Office hours
    ├── Coaching inquiry section
    ├── Counseling help section
    ├── Contact form integration
    └── FAQ section
```

**Purpose**: Contact information, inquiry forms, and support resources.

---

### 8. **`/[exam]/`** - Dynamic Exam Routes

This is a **deeply nested dynamic route structure** for hierarchical content navigation:

```
[exam]/
├── layout.js                   # Exam layout wrapper
├── page.js                     # Exam overview page
├── loading.js                  # Loading state
├── error.js                    # Error boundary
│
└── [subject]/                  # Dynamic subject route
    ├── layout.js
    ├── page.js
    │
    └── [unit]/                 # Dynamic unit route
        ├── layout.js
        ├── page.js
        │
        └── [chapter]/          # Dynamic chapter route
            ├── layout.js
            ├── page.js
            │
            └── [topic]/        # Dynamic topic route
                ├── layout.js
                ├── page.js
                │
                └── [subtopic]/ # Dynamic subtopic route
                    ├── layout.js
                    ├── page.js
                    │
                    └── [definition]/ # Dynamic definition route
                        ├── layout.js
                        └── page.js
```

**Route Pattern**:

- `/jee` → Exam page
- `/jee/physics` → Subject page
- `/jee/physics/mechanics` → Unit page
- `/jee/physics/mechanics/kinematics` → Chapter page
- `/jee/physics/mechanics/kinematics/motion` → Topic page
- `/jee/physics/mechanics/kinematics/motion/velocity` → Subtopic page
- `/jee/physics/mechanics/kinematics/motion/velocity/speed` → Definition page

**Purpose**: Hierarchical content navigation for exams, subjects, units, chapters, topics, subtopics, and definitions.

---

## 📊 File Statistics

### Total Files by Type:

- **JavaScript/JSX Files**: ~60+ files
- **Layout Files**: 9 files (including nested routes)
- **Page Files**: 9 files (including nested routes)
- **Component Files**: 30+ files
- **Hook Files**: 5 files
- **Utility Files**: 3 files

### Key Features:

1. **Modular Architecture**: Clear separation of concerns
2. **Reusable Components**: Extensive component library
3. **Dynamic Routing**: Deep nested routes for content hierarchy
4. **Custom Hooks**: Shared logic for data fetching and state management
5. **Form Handling**: Dedicated form components and utilities
6. **Error Handling**: Error boundaries and error states
7. **Loading States**: Skeleton loaders and loading components
8. **Progress Tracking**: Multiple progress tracking components

---

## 🔄 Data Flow

```
User Request
    ↓
Route Handler ([exam]/[subject]/...)
    ↓
Layout Component (MainLayout)
    ↓
Page Component
    ↓
Custom Hooks (useProgress, useStudent, useDataFetching)
    ↓
API Client (lib/api.js)
    ↓
Backend API
```

---

## 🎯 Key Functionalities

1. **Authentication**: Login and registration flows
2. **Content Navigation**: Hierarchical exam content browsing
3. **Progress Tracking**: Chapter, unit, and subject completion tracking
4. **Practice Tests**: Test listing and submission
5. **Forms**: Contact forms, verification inputs
6. **Modals**: Various modal components for user interactions
7. **Navigation**: Sidebar navigation tree with collapsible sections
8. **Responsive Design**: Mobile-first approach with sidebar toggle

---

## 📝 Notes

- All components use React functional components with hooks
- Client-side components are marked with `"use client"` directive
- Server components are used for layouts and metadata
- Error boundaries are implemented at multiple levels
- Loading states are handled with Suspense and custom loaders
- The structure follows Next.js 13+ App Router conventions

---

## 🔗 Related Files Outside `(main)`

This structure integrates with:

- Root `app/` directory (global layouts, providers)
- `@/lib/api` (shared API utilities)
- `@/constants` (shared constants)
- `@/utils` (shared utilities)
- `@/components` (global components like ErrorBoundary)

---

_Last Updated: Based on current codebase structure_
_Generated: File structure documentation_




