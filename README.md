# 🌸 PetalSpeak

Veebirakendus lillevaliku, personaliseeritud soovituste ja tellimuste haldamiseks.  
Projekt kasutab backendis Node.js + Express + MySQL ning frontendis HTML, CSS ja JavaScripti.  
Rakendus toetab kolme keelt: eesti, inglise ja vene.

---

# 📦 Tehnoloogiad

- Node.js
- Express.js
- MySQL
- HTML / CSS / JavaScript
- JWT autentimine
- Playwright
- Jest
- Nodemailer
- Multer

---

# ⚙️ Nõuded

Enne projekti käivitamist veenduge, et teil on installitud:

| Tarkvara | Versioon |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| MySQL | 5.7+ |
| Git | 2.0+ |

Versioonide kontrollimine:

```bash
node --version
npm --version
mysql --version
```

---

# 📥 Projekti paigaldamine

## 1. Repositooriumi kloonimine

```bash
git clone <repository-url>
cd PetalSpeak
```

---

## 2. Backend sõltuvuste paigaldamine

```bash
cd back
npm install
```

---

## 3. Frontend sõltuvuste paigaldamine

```bash
cd ../front
npm install
npx playwright install
```

---

# 🗄️ Andmebaasi seadistamine

## MySQL andmebaasi loomine

Avage MySQL terminal või phpMyAdmin ning käivitage:

```sql
CREATE DATABASE petalspeak
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

---

## Andmebaasi tabelite loomine

```sql
USE petalspeak;

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  role ENUM('admin', 'user') DEFAULT 'user',
  is_blocked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INT DEFAULT 0,
  blocked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_en VARCHAR(255) NOT NULL,
  name_et VARCHAR(255),
  name_ru VARCHAR(255),
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image VARCHAR(255),
  category_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bouquet_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_en VARCHAR(255),
  name_et VARCHAR(255),
  name_ru VARCHAR(255),
  description TEXT
);

CREATE TABLE feeling_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_en VARCHAR(255),
  name_et VARCHAR(255),
  name_ru VARCHAR(255),
  description TEXT
);

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  delivery_address VARCHAR(255),
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'confirmed', 'shipped', 'delivered') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE test_results (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  test_answer_1 VARCHAR(50),
  test_answer_2 VARCHAR(50),
  test_answer_3 VARCHAR(50),
  bouquet_recommendation_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

# 🔐 Keskkonna muutujad

Looge fail:

```bash
back/.env
```

Sisu:

```env

JWT_SECRET=your-secret-key

MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

Kõik vajalikud paroolid leiate tööle lisatud failist envlogin.txt. 
```

---

# ⚡ MySQL ühenduse seadistamine

Fail:

```bash
back/config/mysql.js
```

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'petalspeak',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

---

# 🚀 Projekti käivitamine

## Backend käivitamine

```bash
cd back
npm start
```

või

```bash
node back/server.js
```

Eduka käivitamise korral:

```bash
Server running on http://localhost:3000
```

---

## Rakenduse avamine

Avage brauseris:

```text
http://localhost:3000
```

---

# 🧪 Testimine

## Backend testid (Jest)

Kõik testid:

```bash
cd back
npm test
```

Verbose režiim:

```bash
npm test -- --verbose
```

Coverage raport:

```bash
npm test -- --coverage --runInBand
```

---

## Frontend testid (Playwright)

Kõik testid:

```bash
cd front
npm test
```

UI režiim:

```bash
npm test -- --ui
```

Debug režiim:

```bash
npm test -- --debug
```

Chromium:

```bash
npm test -- --project=chromium
```

Firefox:

```bash
npm test -- --project=firefox
```

WebKit:

```bash
npm test -- --project=webkit
```

Testi raport:

```bash
npx playwright show-report
```

Konkretse test:
```bash
npx playwright test tests/admin_fixed.spec.js
```
---

# 🌐 API marsruudid

## Auth

### Registreerimine

```http
POST /api/auth/register
```

### Sisselogimine

```http
POST /api/auth/login
```

---

## Products

### Kõik tooted

```http
GET /api/products
```

### Toote loomine

```http
POST /api/products
```

### Toote uuendamine

```http
PUT /api/products/:id
```

### Toote kustutamine

```http
DELETE /api/products/:id
```

---

## Orders

### Tellimuse loomine

```http
POST /api/orders
```

---

## Admin

### Kasutajate nimekiri

```http
GET /api/admin/users
```

### Kasutaja blokeerimine

```http
PUT /api/admin/users/:id/block
```

### Kasutaja kustutamine

```http
DELETE /api/admin/users/:id
```

---

# ✨ Peamised funktsioonid

## 👤 Kasutajahaldus

- Registreerimine ja sisselogimine
- JWT autentimine
- Paroolide krüptimine bcrypt abil
- Konto blokeerimine pärast 3 ebaõnnestunud sisselogimist
- Profiili ja avataari haldus

---

## 🌸 Toodete haldus

- CRUD operatsioonid
- Piltide üleslaadimine
- Mitmekeelne toodete sisu
- Kategooriate süsteem

---

## 🛒 Tellimused

- Ostukorvi süsteem
- Tellimuste loomine
- Tellimuste ajalugu
- E-posti kinnitused

---

## 🧠 Soovituste süsteem

- Lillede soovitused testi põhjal
- Testi tulemuste salvestamine
- Anonüümne testimine

---

## 🛠️ Admin paneel

- Kasutajate haldus
- Rollide määramine
- Tellimuste statistika
- Enim müüdud toodete ülevaade

---

# 🏗️ Projekti struktuur

```text
PetalSpeak/
├── back/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── tests/
│   ├── uploads/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── front/
│   ├── assets/
│   ├── locales/
│   ├── tests/
│   ├── index.html
│   ├── login.html
│   ├── admin.html
│   ├── cart.html
│   ├── profile.html
│   ├── test.html
│   ├── playwright.config.js
│   └── package.json
│
└── package.json
```

---

# 🔐 Turvalisus

- Paroolid krüptitakse bcrypt abil
- JWT tokenite kehtivusaeg on 24 tundi
- Admin funktsioonid vajavad admin õigusi
- SQL päringud kasutavad parametriseeritud päringuid
- Keskkonna muutujad hoitakse `.env` failis

---

# 🐛 Levinud probleemid

| Probleem | Lahendus |
|---|---|
| Cannot find module | Käivitage `npm install` |
| ECONNREFUSED 127.0.0.1:3306 | Kontrollige MySQL serverit |
| Database doesn't exist | Looge `petalspeak` andmebaas |
| Playwright browsers missing | Käivitage `npx playwright install` |
| Port 3000 already in use | Muutke serveri porti |

---

# 📊 Andmebaasi varundamine

Varundamine:

```bash
mysqldump -u root -p petalspeak > petalspeak_backup.sql
```

Taastamine:

```bash
mysql -u root -p petalspeak < petalspeak_backup.sql
```

---

# 🤝 Kaasosalustamine

```bash
git checkout -b feature/YourFeature
git commit -m "Add feature"
git push origin feature/YourFeature
```

Seejärel avage Pull Request.

---

# 📄 Litsents

ISC License

---

# 👤 Kontakt

Küsimuste või probleemide korral avage issue repositooriumis.

---