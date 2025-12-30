# Fix: Webpack Error - Module not found index.js

## Problem
You're seeing this error because the **old CRA/Craco dev server is still running**:
```
ERROR: Can't resolve '/home/telectronio/dev/NBtechv1/iot-dashboard/src/index.js'
```

## Solution

### Step 1: Stop the Old Dev Server
The old `craco start` process is still running. Stop it:

```bash
# Kill the old process
pkill -f "craco start"

# Or press Ctrl+C in the terminal where it's running
```

### Step 2: Use Vite Instead
Now use the new Vite dev server:

```bash
cd /home/telectronio/dev/NBtechv1/iot-dashboard
npm run dev
# or
npm start
```

**Important:** Use `npm run dev` or `npm start` (both run Vite now), **NOT** `craco start`.

### Step 3: Verify It's Working
You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

**NOT** webpack compilation messages.

## Why This Happened

- We migrated from **Create React App (CRA)** to **Vite**
- The old `craco start` command was still running
- CRA uses webpack and looks for `index.js`
- Vite uses the new `index.tsx` file

## Files Changed

- ✅ `src/index.js` → `src/index.tsx` (TypeScript)
- ✅ `package.json` scripts updated to use Vite
- ✅ `vite.config.js` created
- ✅ `index.html` updated to point to `index.tsx`

## Old vs New

### ❌ Old (CRA/Craco)
```bash
npm start  # Runs: craco start (webpack)
# Looks for: src/index.js
```

### ✅ New (Vite)
```bash
npm run dev  # Runs: vite (Vite dev server)
# Uses: src/index.tsx
```

## If You Still See Errors

1. **Clear node_modules cache:**
   ```bash
   rm -rf node_modules/.cache
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Make sure you're using the right command:**
   ```bash
   # ✅ Correct
   npm run dev
   
   # ❌ Wrong (old CRA)
   npm run start  # If this still runs craco, check package.json
   ```

## Note About craco.config.js

The `craco.config.js` file is still in your project but **won't be used** with Vite. You can:
- **Leave it** (harmless, just unused)
- **Delete it** (if you want to clean up)

Vite uses `vite.config.js` instead.

---

**Status:** Fixed! Use `npm run dev` to start Vite.

