#!/usr/bin/env node

/**
 * Script to check if all required environment variables are set
 * Run with: node scripts/check-env.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

const optionalVars = [
  'VITE_EMAILJS_SERVICE_ID',
  'VITE_EMAILJS_TEMPLATE_ID',
  'VITE_EMAILJS_PUBLIC_KEY'
];

function checkEnvFile() {
  const envPath = join(__dirname, '..', '.env');
  
  if (!existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('\n📝 Please create a .env file in the project root.');
    console.log('💡 You can copy .env.example as a starting point:\n');
    console.log('   cp .env.example .env\n');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });

  let hasErrors = false;
  let hasWarnings = false;

  console.log('🔍 Checking environment variables...\n');

  // Check required variables
  console.log('Required Variables:');
  requiredVars.forEach(varName => {
    if (!envVars[varName] || envVars[varName] === '') {
      console.log(`  ❌ ${varName} - Missing or empty`);
      hasErrors = true;
    } else if (envVars[varName].includes('your-') || envVars[varName].includes('YOUR_')) {
      console.log(`  ⚠️  ${varName} - Contains placeholder value`);
      hasErrors = true;
    } else {
      console.log(`  ✅ ${varName} - Set`);
    }
  });

  // Check optional variables
  console.log('\nOptional Variables (EmailJS):');
  optionalVars.forEach(varName => {
    if (!envVars[varName] || envVars[varName] === '') {
      console.log(`  ⚠️  ${varName} - Not set (email notifications disabled)`);
      hasWarnings = true;
    } else if (envVars[varName].includes('your-') || envVars[varName].includes('YOUR_')) {
      console.log(`  ⚠️  ${varName} - Contains placeholder value`);
      hasWarnings = true;
    } else {
      console.log(`  ✅ ${varName} - Set`);
    }
  });

  console.log('\n' + '='.repeat(50));

  if (hasErrors) {
    console.log('\n❌ Environment check failed!');
    console.log('\n📚 Please refer to README.md for setup instructions.');
    console.log('🔗 Supabase setup: https://supabase.com/docs');
    process.exit(1);
  }

  if (hasWarnings) {
    console.log('\n⚠️  Some optional variables are not configured.');
    console.log('   Email notifications will be disabled.');
    console.log('\n📚 See docs/EMAILJS_SETUP.md for EmailJS configuration.');
  } else {
    console.log('\n✅ All environment variables are properly configured!');
  }

  console.log('\n🚀 You can now run: npm run dev\n');
}

checkEnvFile();
