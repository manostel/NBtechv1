# Internationalization (i18n) Guide

This application uses `react-i18next` for internationalization support. Currently supports **English** and **Greek (Ελληνικά)**.

## Quick Start

### Using Translations in Components

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.loading')}</h1>
      <p>{t('devices.title')}</p>
    </div>
  );
}
```

### Changing Language

The language can be changed in two ways:

1. **Via Settings Drawer**: Go to Settings → Localization → Language
2. **Programmatically**:
```typescript
import { useTranslation } from 'react-i18next';

const { i18n } = useTranslation();
i18n.changeLanguage('el'); // Change to Greek
i18n.changeLanguage('en'); // Change to English
```

## Translation Keys Structure

Translations are organized by feature/domain:

- `common.*` - Common UI elements (buttons, labels, etc.)
- `auth.*` - Authentication pages
- `devices.*` - Device management
- `dashboard.*` - Dashboard pages
- `alarms.*` - Alarm management
- `subscriptions.*` - Subscription management
- `commands.*` - Command execution
- `notifications.*` - Notification system
- `settings.*` - Settings page
- `user.*` - User account information

## Adding New Translations

1. **Add to English file** (`src/i18n/locales/en.json`):
```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}
```

2. **Add to Greek file** (`src/i18n/locales/el.json`):
```json
{
  "myFeature": {
    "title": "Η Λειτουργία Μου",
    "description": "Αυτή είναι η λειτουργία μου"
  }
}
```

3. **Use in component**:
```typescript
const { t } = useTranslation();
return <h1>{t('myFeature.title')}</h1>;
```

## Current Status

✅ **Fully Translated:**
- Settings drawer (partial)
- Basic UI elements

🔄 **In Progress:**
- Dashboard components
- Device management
- Alarms and subscriptions
- Notifications

## Language Detection

The app automatically detects the user's browser language and uses it if available. The preference is saved in `localStorage` and persists across sessions.

## Date/Time Formatting

For date/time formatting, use the current language:
```typescript
const { i18n } = useTranslation();
const locale = i18n.language === 'el' ? 'el-GR' : 'en-GB';
const formatted = new Date().toLocaleString(locale);
```

