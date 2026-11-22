# Deployment guide

This guide puts LifeBalance on a single Linux server (Ubuntu 22.04 or 24.04). It uses Nginx, PHP-FPM 8.3+, MySQL 8 and a static build of the frontend. The API and the SPA share one domain, so the browser needs no CORS setup.

```
https://lifebalance.example.com/        → frontend/dist (static)
https://lifebalance.example.com/api/*   → Laravel (backend/public/index.php)
https://lifebalance.example.com/storage → backend/public/storage (avatars)
```

## 1. Server packages
```bash
sudo apt update
sudo apt install -y nginx mysql-server unzip git \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-intl php8.3-bcmath
curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
```

## 2. Database
```sql
CREATE DATABASE life_balance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lifebalance'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT ALL PRIVILEGES ON life_balance.* TO 'lifebalance'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Backend
```bash
sudo mkdir -p /var/www/lifebalance && sudo chown $USER:www-data /var/www/lifebalance
git clone <your-repo> /var/www/lifebalance
cd /var/www/lifebalance/backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```
Set these values in `.env`:
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://lifebalance.example.com
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=life_balance
DB_USERNAME=lifebalance
DB_PASSWORD=<strong-password>
CACHE_STORE=database   # or redis
LOG_LEVEL=warning
```
Then run:
```bash
php artisan migrate --force
php artisan storage:link
php artisan config:cache && php artisan route:cache && php artisan event:cache
sudo chown -R www-data:www-data storage bootstrap/cache
```
Create your account from the sign-up page. Don't run the seeders in production; the demo account uses a public password.

## 4. Frontend
```bash
cd /var/www/lifebalance/frontend
npm ci
npm run build          # outputs frontend/dist
```
The SPA calls `/api` on the same origin by default. If you host the API on a different domain, build with `VITE_API_URL=https://api.example.com/api npm run build`. Then restrict `allowed_origins` in `backend/config/cors.php` (publish it with `php artisan config:publish cors`) to your frontend's URL.

## 5. Nginx
```nginx
server {
    listen 80;
    server_name lifebalance.example.com;
    root /var/www/lifebalance/frontend/dist;
    index index.html;

    client_max_body_size 20M;   # backups / avatars

    location /api {
        root /var/www/lifebalance/backend/public;
        try_files $uri /index.php?$query_string;
    }
    location /storage {
        alias /var/www/lifebalance/backend/public/storage;
    }
    location ~ ^/index\.php$ {
        root /var/www/lifebalance/backend/public;
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root/index.php;
    }
    location / {
        try_files $uri $uri/ /index.html;   # SPA routes
    }
    location ~* \.(js|css|svg|png|woff2?)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```
Then reload Nginx and add HTTPS:
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d lifebalance.example.com
```
HTTPS matters. Browsers only allow notifications and geolocation on secure origins (or `localhost`).

## 6. Updating
```bash
cd /var/www/lifebalance && git pull
cd backend && composer install --no-dev --optimize-autoloader && php artisan migrate --force && php artisan optimize
cd ../frontend && npm ci && npm run build
```

## 7. Backups
- **In the app:** go to Settings → Data → Download backup. This gives you a JSON file of everything in your account, which you can restore later.
- **Server:** set up a nightly `mysqldump`:
  ```bash
  0 2 * * * mysqldump -u lifebalance -p'<pw>' life_balance | gzip > /var/backups/lifebalance-$(date +\%F).sql.gz
  ```

## 8. Security checklist
- [ ] `APP_DEBUG=false` and `APP_ENV=production`
- [ ] HTTPS enabled
- [ ] A strong database password, and MySQL not exposed publicly
- [ ] `storage/` and `bootstrap/cache` writable by `www-data` only
- [ ] Optional: limit token lifetime with `SANCTUM_EXPIRATION` (minutes) in `config/sanctum.php`

What the API already does:
- Every record is scoped to the authenticated user. Another user's ID returns 404.
- Validation runs on every endpoint.
- Login and register are rate-limited to 10 requests per minute; the rest of the API to 240.

## Roadmap ideas
- Web Push with a service worker, so reminders arrive while the app is closed
- GitHub API sync for contributions
- Installable PWA with an offline cache
- A Hijri calendar and Ramadan mode (suhoor and iftar times from the same prayer engine)
