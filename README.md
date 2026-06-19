# Daisy Trail

Ionic/Angular troop management app with a Laravel API. Shared data is stored in a database and protected by bearer-token authentication, role-scoped updates, and optimistic revision checks so stale devices cannot silently overwrite newer changes.

## First run

Requirements: Node.js, PHP 8.3+, Composer, and PHP's SQLite extension.

```bash
npm install
npm run api:setup
npm run api:start
```

In a second terminal:

```bash
npm start
```

The API runs at `http://127.0.0.1:8000/api`. Demo logins are shown on the sign-in screen. The first successful save imports the existing starter troop data into the database.

For a device or hosted environment, set its API URL once before opening the app:

```js
localStorage.setItem('troop-tracker-api-url', 'https://your-api.example.com/api')
```

## Production database

SQLite is configured for local setup. For multiple simultaneous leaders, PostgreSQL or MySQL is recommended. Set `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD` in `backend/.env`, then run:

```bash
cd backend
php artisan migrate --seed
```

Never commit `backend/.env`. Serve Laravel over HTTPS in production.
