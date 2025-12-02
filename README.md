# Company File Storage System

A secure file storage system for teams, built with Supabase and hosted on Netlify.

## Features

- 📁 Upload multiple files with drag & drop
- 🔍 Search and filter files by type
- 👁️ Preview images, PDFs, and text files
- 📊 View storage statistics
- 👥 User authentication
- 📱 Responsive design

## Setup Instructions

### 1. Supabase Setup
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Create a new project or use your existing one
3. Get your project URL and anon key from Settings > API
4. Update `supabase-config.js` with your credentials

### 2. Database Setup
Run this SQL in the Supabase SQL Editor:

```sql
CREATE TABLE files (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size BIGINT,
  type TEXT,
  description TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);