# Utility Scripts

This folder contains utility scripts for development and maintenance tasks.

## Available Scripts

### check-env.js

Validates that all required environment variables are properly configured.

**Usage:**
```bash
node scripts/check-env.js
```

**What it checks:**
- ✅ `.env` file exists
- ✅ Required Supabase variables are set
- ⚠️ Optional EmailJS variables (warns if missing)
- ❌ Detects placeholder values

**When to use:**
- Before running the app for the first time
- After cloning the repository
- When troubleshooting environment issues
- Before deployment

## Adding New Scripts

When adding new utility scripts:

1. Create a `.js` file in this folder
2. Add a shebang line: `#!/usr/bin/env node`
3. Document the script in this README
4. Add an npm script in `package.json` if needed
5. Make it executable (Unix): `chmod +x scripts/your-script.js`

## Example Script Structure

```javascript
#!/usr/bin/env node

/**
 * Script description
 * Run with: node scripts/your-script.js
 */

// Your code here
console.log('Script running...');
```

## Notes

- Scripts use ES modules (import/export)
- Console statements are allowed in scripts (not production code)
- Scripts should provide clear error messages
- Use exit codes: 0 for success, 1 for errors
