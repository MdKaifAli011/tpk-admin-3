# Blog System Fixes - Summary

## Issues Fixed

### 1. ✅ ObjectId Comparison Issues

**Problem:** API routes were comparing `examId` as strings instead of MongoDB ObjectIds, causing blogs/categories not to show.

**Fixed Files:**

- `app/api/blog/route.js` - Now converts `examId` to ObjectId before querying
- `app/api/blog/category/route.js` - Now converts `examId` to ObjectId before querying

### 2. ✅ Case-Insensitive Status Matching

**Problem:** Status comparison was case-sensitive ("active" vs "ACTIVE").

**Fixed Files:**

- `app/api/blog/route.js` - Uses case-insensitive regex for status matching
- `app/api/blog/category/route.js` - Already had case-insensitive matching

### 3. ✅ Sidebar Caching Issues

**Problem:** Sidebar was showing deleted blog categories due to client-side and server-side caching.

**Fixed Files:**

- `app/(main)/lib/api.js`:
  - Added `forceRefresh` parameter to `fetchBlogs()` and `fetchBlogCategories()`
  - Added cache-busting with `cache: "no-store"` and `Cache-Control: no-cache` headers
  - Added timestamp parameter for client-side cache busting
- `app/(main)/layout/Sidebar.jsx`:
  - Added `forceRefresh: true` when loading blog categories
  - Added `pathname` to dependency array to refresh when navigating
  - Added refresh logic when visiting blog pages

### 4. ✅ Blog Page Refresh

**Problem:** Blog pages weren't refreshing to show new blogs.

**Fixed Files:**

- `app/(main)/[exam]/blog/page.js` - Added `forceRefresh: true`
- `app/(main)/[exam]/blog/category/[categorySlug]/page.js` - Added `forceRefresh: true`

---

## Your Current Data

Based on your data:

- ✅ **Category "Cat1"**: `_id: 694a26bca2578ca1db33e52b`, `status: "active"`, `examId: 690c6b4b59f1d132e16a0eae`
- ✅ **Blog "blog1"**: `categoryId: 694a26bca2578ca1db33e52b`, `status: "active"`, `examId: 690c6b4b59f1d132e16a0eae`

**The data looks correct!** The `categoryId` matches the category `_id`.

---

## What to Do Now

### Step 1: Restart Your VPS Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
PORT=3001 npm start
```

### Step 2: Clear Browser Cache

- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Or clear browser cache completely

### Step 3: Test the Pages

1. **Blog List Page**: Visit `/self-study/neet/blog`
   - Should show "blog1" blog post
2. **Category Page**: Visit `/self-study/neet/blog/category/cat1`

   - Should show "blog1" blog post filtered by category

3. **Sidebar**: Check the sidebar
   - Should show "Cat1" category under Blog section
   - Should NOT show deleted categories

---

## 🔴 CRITICAL FIX: Port Mismatch Issue (December 23, 2025)

### Problem Found

The server-side fetch was trying to call `http://localhost:3000` but the server was running on port 3001, causing:

```
Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This happens because Next.js auto-selects port 3001 when 3000 is busy, but the code defaults to 3000.

### Solution

**Option 1 (Recommended):** Set the environment variable in your `.env` file:

```bash
NEXT_PUBLIC_APP_URL=http://194.238.17.203:3001
# OR for local development:
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

**Option 2:** Set PORT when starting the server:

```bash
PORT=3001 npm run dev
```

**Option 3:** The code now falls back to relative URLs when no env vars are set (Next.js handles this internally).

### Fixed Files

- `app/(main)/lib/api.js` - Updated `getBaseUrl()` to use PORT env var or fallback to relative URLs

---

## Latest Fixes (December 23, 2025)

### ✅ Fixed: examId String Conversion in fetchBlogs

**Problem:** When `exam._id` is an ObjectId object, it wasn't being converted to string before being passed to the API, causing query mismatches.

**Fixed Files:**

- `app/(main)/lib/api.js`:
  - `fetchBlogs()`: Now converts `examId` to string using `toString()` or `String()`
  - `fetchBlogCategories()`: Same fix applied
  - Added `encodeURIComponent()` for proper URL encoding
  - Added comprehensive error logging

### ✅ Fixed: Blog Page examId Handling

**Problem:** Blog page was passing `exam._id` directly without ensuring it's a string.

**Fixed Files:**

- `app/(main)/[exam]/blog/page.js`:
  - Converts `exam._id` to string before passing to `fetchBlogs()`
  - Added detailed logging for debugging
  - Better error handling

### ✅ Enhanced: Error Logging

Added comprehensive logging to help diagnose issues:

- Logs exam ID, exam name, and blog count
- Logs API URLs being called
- Logs error details when API calls fail
- Logs blog data structure for debugging

---

## If Blogs Still Don't Show

### Check 1: Verify Blog Status

Make sure the blog status is exactly `"active"` (lowercase):

```javascript
// In MongoDB or via admin panel
// Blog status should be: "active" (not "Active" or "ACTIVE")
```

### Check 2: Verify Exam ID Match

The blog's `examId` must match the exam you're viewing:

```javascript
// Blog examId: 690c6b4b59f1d132e16a0eae
// Should match the NEET exam ID
```

### Check 3: Check API Response

Test the API directly:

```bash
# Test blog API
curl "http://194.238.17.203:3001/self-study/api/blog?status=active&examId=690c6b4b59f1d132e16a0eae"

# Test category API
curl "http://194.238.17.203:3001/self-study/api/blog/category?status=active&examId=690c6b4b59f1d132e16a0eae"
```

### Check 4: Check Server Logs

With the new logging, you should see detailed information in your server logs:

- "Blog page: Fetching blogs for exam" - Shows exam ID being used
- "Blog page: Fetched blogs result" - Shows how many blogs were fetched
- "Fetched blogs:" - Shows the actual blog data from API
- Any errors will be logged with full details

### Check 5: Verify Environment Variables

Make sure these are set correctly on your VPS:

```bash
NEXT_PUBLIC_BASE_PATH=/self-study
NEXT_PUBLIC_API_URL=http://194.238.17.203:3001/self-study/api
# OR
NEXT_PUBLIC_APP_URL=http://194.238.17.203:3001
```

### Check 6: Server Logs for Errors

Check your server logs for errors. The error you showed:

```
⨯ TypeError: controller[kState].transformAlgorithm is not a function
```

This might be a Node.js version issue. Make sure you're using a compatible Node.js version (18.x or 20.x recommended).

---

## Additional Notes

### Cache Clearing

The cache manager clears all entries matching "blog-categories" pattern when:

- A category is created/updated/deleted
- A blog is created/updated/deleted

### Sidebar Refresh

The sidebar now:

- Refreshes categories when you navigate to blog pages
- Uses `forceRefresh: true` to bypass all caches
- Clears stale data automatically

### API Improvements

- All blog/category APIs now properly handle ObjectId conversion
- Case-insensitive status matching ensures "active", "Active", "ACTIVE" all work
- Better error handling and empty array returns

---

## Testing Checklist

- [ ] Restart VPS server
- [ ] Clear browser cache
- [ ] Visit `/self-study/neet/blog` - should show "blog1"
- [ ] Visit `/self-study/neet/blog/category/cat1` - should show "blog1"
- [ ] Check sidebar - should show "Cat1" category
- [ ] Check sidebar - should NOT show deleted categories
- [ ] Create a new blog - should appear immediately
- [ ] Delete a blog - should disappear from sidebar and pages

---

## If Issues Persist

1. **Check MongoDB directly**: Verify the data exists and status is correct
2. **Check server logs**: Look for any errors in the console
3. **Test API endpoints**: Use curl or Postman to test APIs directly
4. **Verify Node.js version**: Should be 18.x or 20.x
5. **Clear all caches**: Restart server to clear server-side cache

---

## Files Modified

1. `app/api/blog/route.js` - ObjectId conversion, case-insensitive status
2. `app/api/blog/category/route.js` - ObjectId conversion
3. `app/(main)/lib/api.js` - Cache-busting, examId string conversion, enhanced logging
4. `app/(main)/layout/Sidebar.jsx` - Force refresh, pathname dependency
5. `app/(main)/[exam]/blog/page.js` - Force refresh, examId string conversion, enhanced logging
6. `app/(main)/[exam]/blog/category/[categorySlug]/page.js` - Force refresh

All fixes are backward compatible and won't break existing functionality.

---

## Debugging Steps

If blogs are still not showing after all fixes:

1. **Check Server Console Logs**: Look for the new log messages:

   - "Blog page: Fetching blogs for exam" - Should show the exam ID
   - "Blog page: Fetched blogs result" - Should show blog count > 0
   - "Fetched blogs:" - Should show the actual blog data

2. **Check Network Tab**: In browser DevTools, check if the API call to `/api/blog` is:

   - Being made (should see the request)
   - Returning 200 status
   - Returning data in the response

3. **Verify exam.\_id Format**: The exam ID should be a valid MongoDB ObjectId string (24 hex characters)

4. **Test Direct API Call**: Use curl or Postman to test the API directly and compare with what the frontend receives

5. **Check Base URL**: Ensure `getBaseUrl()` is constructing the correct URL for server-side fetches
