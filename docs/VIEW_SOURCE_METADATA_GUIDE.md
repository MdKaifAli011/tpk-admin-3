# View-Source Metadata Guide

## ✅ How to Verify Metadata in View-Source

### Step-by-Step Instructions

1. **Open URL with Tab Parameter**
   ```
   Example: http://localhost:3000/self-study/jee/physics?tab=discussion
   ```

2. **Do a Full Page Refresh**
   - Press `F5` (Windows/Linux) or `Cmd+R` (Mac)
   - OR use `Ctrl+F5` / `Cmd+Shift+R` for hard refresh (clears cache)

3. **View Page Source**
   - Right-click on the page → "View Page Source"
   - OR Press `Ctrl+U` (Windows/Linux) or `Cmd+Option+U` (Mac)

4. **Search for Metadata**
   - Press `Ctrl+F` (Windows/Linux) or `Cmd+F` (Mac)
   - Search for `<title>` to find the title tag
   - Search for `meta name="description"` to find the description
   - Search for `robots` to check indexing status

### Expected Results

#### Overview Tab (Default)
```html
<title>Physics - JEE Exam Preparation | TestPrepKart</title>
<meta name="description" content="Prepare for Physics in JEE exam with comprehensive study materials...">
```

#### Discussion Forum Tab
```html
<title>Physics - Discussion Forum | TestPrepKart</title>
<meta name="description" content="Join the Physics discussion forum. Ask questions, share study notes...">
```

#### Practice Test Tab
```html
<title>Physics - Practice Tests | TestPrepKart</title>
<meta name="description" content="Access practice tests for Physics. Improve your exam preparation...">
```

#### Performance Tab
```html
<title>Physics - Performance Analytics | TestPrepKart</title>
<meta name="robots" content="noindex, nofollow">
```

---

## 🔍 Troubleshooting

### Issue: View-Source Shows Old Metadata

**Cause**: Browser cache or client-side navigation

**Solution**:
1. Hard refresh: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Use incognito/private window
4. Verify in Network tab → Response → Search for `<title>`

### Issue: Metadata Not Updating Based on Tab

**Check**:
1. Verify URL has `?tab=discussion` parameter
2. Do a FULL page refresh (F5), not just client navigation
3. Check browser console for errors
4. Verify `generateMetadata` is being called (check server logs)

### Issue: Performance Tab Is Indexable

**Check**:
1. Verify view-source contains: `<meta name="robots" content="noindex, nofollow">`
2. Check that `isTabIndexable("performance")` returns `false`
3. Verify `generateTabAwareMetadata` sets `robots: { index: false }`

---

## 📋 Testing Checklist

### ✅ SSR Metadata (View-Source)

- [ ] `/jee/physics?tab=overview` → Shows overview metadata
- [ ] `/jee/physics?tab=discussion` → Shows discussion forum metadata
- [ ] `/jee/physics?tab=practice` → Shows practice test metadata
- [ ] `/jee/physics?tab=performance` → Shows `noindex` meta tag
- [ ] `/jee/physics/mechanics/kinematics?tab=discussion` → Shows chapter-level discussion metadata
- [ ] `/jee/physics?tab=discussion&thread=xyz` → Shows thread-specific metadata (if available server-side)

### ✅ All 7 Route Levels

- [ ] Exam level: `/jee?tab=discussion`
- [ ] Subject level: `/jee/physics?tab=discussion`
- [ ] Unit level: `/jee/physics/mechanics?tab=discussion`
- [ ] Chapter level: `/jee/physics/mechanics/kinematics?tab=discussion`
- [ ] Topic level: `/jee/physics/mechanics/kinematics/motion?tab=discussion`
- [ ] Subtopic level: `/jee/physics/mechanics/kinematics/motion/velocity?tab=discussion`
- [ ] Definition level: `/jee/physics/mechanics/kinematics/motion/velocity/speed?tab=discussion`

---

## 🎯 Key Points

1. **View-Source Shows SSR Metadata**: This is what Google crawls ✅
2. **Full Page Refresh Required**: Client navigation doesn't update view-source (this is normal)
3. **Metadata Is Generated Server-Side**: Every layout generates correct metadata based on tab parameter
4. **Performance Tab Is Protected**: Non-indexable to protect user privacy

---

## 📝 Example Test URLs

Replace `localhost:3000` with your domain:

```
http://localhost:3000/self-study/jee/physics?tab=overview
http://localhost:3000/self-study/jee/physics?tab=discussion
http://localhost:3000/self-study/jee/physics?tab=practice
http://localhost:3000/self-study/jee/physics?tab=performance
http://localhost:3000/self-study/jee/physics/mechanics/kinematics?tab=discussion
http://localhost:3000/self-study/jee/physics/mechanics/kinematics?tab=discussion&thread=some-thread-slug
```

---

**Last Updated**: 2024
**Next.js Version**: 16.0.1
