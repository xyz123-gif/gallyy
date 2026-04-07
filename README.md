# Your Vault (Supabase)

Mobile-first website with:
- username + password signup/login
- upload photo from phone gallery/camera
- view photos in gallery
- zoom in/out via lightbox
- delete photo

All data is in Supabase:
- auth users (password is securely hashed by Supabase Auth)
- `profiles` table (username)
- `photos` table (photo metadata)
- `photos` storage bucket (actual image files)

## Tech choice

- Frontend: React + Vite (JavaScript)
- Backend: Supabase (Auth + Postgres + Storage)

This is a suitable stack for low-lag mobile usage because:
- Vite production build is lightweight
- Supabase handles auth/storage efficiently
- image grid uses lazy-loading

## 1) Supabase setup

1. Create a Supabase project.
2. In Supabase Dashboard -> SQL Editor, run `supabase-schema.sql`.
3. In Auth settings:
   - Disable email confirmation for quick testing, or keep it enabled for production.
4. Copy project URL + anon key from Settings -> API.

## 2) App setup

1. Create `.env` from `.env.example`.
2. Fill:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Install and run:

```bash
npm install
npm run dev
```

## Important note about username-only login

Supabase password login requires email/phone internally.  
This app uses your username to generate an internal email format:

`<username>@mobile-gallery.app`

So user experience is still username + password only.

## Production suggestions

- Keep `profiles.username` rules strict (already normalized to lowercase + safe characters).
- Add image size limit before upload.
- Consider private bucket + signed URLs for stronger privacy.
