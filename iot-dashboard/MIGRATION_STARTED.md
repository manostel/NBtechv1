# Migration Started - Next Steps

## ✅ What's Been Done

1. **Vite Configuration**
   - Created `vite.config.js` with optimized settings
   - Moved `index.html` to root (Vite requirement)
   - Updated build configuration for code splitting

2. **React Query Setup**
   - Installed `@tanstack/react-query` and devtools
   - Created `src/lib/react-query.js` with optimized defaults
   - Updated `src/index.js` to include QueryClientProvider
   - Created `src/hooks/useDeviceData.js` with sample hooks

3. **Zustand Stores**
   - Created `src/stores/authStore.js` - replaces App.js state
   - Created `src/stores/themeStore.js` - ready for theme migration

4. **Package.json Updates**
   - Updated scripts: `dev`, `start`, `build`, `preview`
   - Added Vite and React Query dependencies
   - Removed CRA dependencies

## 📦 Installation Steps

Run these commands to install the new dependencies:

```bash
cd /home/telectronio/dev/NBtechv1/iot-dashboard
npm install
```

This will install:
- `vite` - Build tool
- `@vitejs/plugin-react` - React plugin for Vite
- `zustand` - State management
- `@tanstack/react-query` - Server state management
- `@tanstack/react-query-devtools` - Development tools

## 🚀 Testing the Migration

### 1. Start Development Server

```bash
npm run dev
# or
npm start
```

You should see Vite start much faster than CRA (usually <1 second vs 10-30 seconds).

### 2. Test the App

- Open http://localhost:3000
- Verify the app loads correctly
- Check browser console for any errors

### 3. Check React Query DevTools

- Look for the React Query logo in the bottom-left corner
- Click it to see query cache and status

## ⚠️ Known Issues to Fix

### 1. Environment Variables

If you use `process.env.REACT_APP_*` variables, update them:
- **CRA:** `process.env.REACT_APP_API_URL`
- **Vite:** `import.meta.env.VITE_API_URL`

Update `vite.config.js` if needed:
```js
define: {
  'process.env': import.meta.env,
}
```

### 2. Public Assets

Vite uses `/` for public assets instead of `%PUBLIC_URL%`:
- ✅ Already fixed in `index.html`
- Assets in `public/` folder are automatically served

### 3. Capacitor Compatibility

The build output is still `build/` directory (for Capacitor compatibility).
After building, sync with Capacitor:
```bash
npm run build
npx cap sync android
```

## 📝 Next Migration Steps

### Step 1: Update App.js to Use Auth Store

Replace the useState logic in `App.js` with Zustand:

```javascript
// Before
const [user, setUser] = useState(...);

// After
import { useAuthStore } from './stores/authStore';
const { user, login, logout, isSessionValid } = useAuthStore();
```

### Step 2: Migrate One Component to React Query

Start with a simple component that fetches data. Example:

```javascript
// Before
const [data, setData] = useState(null);
useEffect(() => {
  fetch(API_URL).then(res => res.json()).then(setData);
}, [deviceId]);

// After
import { useDeviceData } from '../hooks/useDeviceData';
const { data, isLoading, error } = useDeviceData(deviceId, userEmail);
```

### Step 3: Add Code Splitting

Update `App.js` to lazy load routes:

```javascript
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./components/Dashboard'));
```

## 🔍 Troubleshooting

### Issue: Module not found errors

**Solution:** Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Vite can't find index.html

**Solution:** Make sure `index.html` is in the root directory (not in `public/`)

### Issue: Build fails

**Solution:** Check for CRA-specific code:
- Remove any `process.env.REACT_APP_*` usage
- Update imports if needed
- Check `vite.config.js` for correct paths

### Issue: Capacitor build fails

**Solution:** 
1. Run `npm run build` first
2. Then `npx cap sync android`
3. Check `capacitor.config.json` has correct `webDir: "build"`

## 📚 Resources

- [Vite Migration Guide](https://vitejs.dev/guide/migration.html)
- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)

## 🎯 Priority Order

1. ✅ Install dependencies (`npm install`)
2. ✅ Test dev server (`npm run dev`)
3. ⏭️ Update App.js to use auth store
4. ⏭️ Migrate one component to React Query
5. ⏭️ Add code splitting
6. ⏭️ Gradually migrate more components

---

**Status:** Ready for testing
**Next:** Install dependencies and test the dev server

