# PetalSpeak

## Projekti kohta

PetalSpeak on veebirakendus lillevaliku, tellimise ja lillekeele sümboolika uurimiseks. Projekt koosneb kahest peamisest osast:

- `back/` — backend Node.js-i, Expressi ja MySQL-iga
- `front/` — staatiline frontend HTML/CSS/JS abil

Veebirakendus toetab mitut keelt (`en`, `ru`, `et`) ning sisaldab:

- kasutajate registreerimist ja autentimist
- testi tulemustest lähtuva kimpu soovituste salvestamist
- tellimuste esitamist
- administraatori paneeli kasutajate ja tellimuste haldamiseks
- piltide üleslaadimist (avatari ja toodete jaoks)

## Arhitektuur

### Backend (`back/`)

- `server.js` — serveri käivitamine, staatiliste failide teenindamine ja API marsruutide ühendamine
- `routes/auth.js` — registreerimine, sisselogimine, JWT autentimine
- `routes/tests.js` — testitulemuste salvestamine ja vaatamine
- `routes/orders.js` — tellimuste loomine, emaili kinnituse saatmine
- `routes/products.js` — toodete haldamine ja mitmekeelsete nimede käsitlemine
- `routes/admin.js` — kasutajate ja tellimuste haldus
- `middleware/auth.js` — JWT tokeni kontrollimine
- `middleware/requireRole.js` — kasutajarolli kontrollimine
- `config/mysql.js` — MySQL andmebaasi ühendamine
- `utils/mailer.js` — meili saatmine Nodemaileriga

### Frontend (`front/`)

- HTML-lehed: `index.html`, `login.html`, `admin.html`, `cart.html`, `profile.html`, `order.html`, `success.html`, `test.html`
- `assets/js/` — kliendipoolne loogika
- `assets/css/style.css` — stiilid
- `locales/` — keeled ja tõlkefailid

## Peamised funktsioonid

- kasutaja registreerimine ja sisselogimine
- JWT kaitse ja middleware privaatses API-s
- parooli tugevuse kontroll registreerimise ajal
- ajutine konto blokeerimine pärast 3 ebaõnnestunud sisselogimist
- toodete CRUD operatsioonid koos pildi üleslaadimisega
- tellimuste esitamine nii külalisena kui ka sisselogitud kasutajana
- testitulemuste salvestamine kasutajale ja ilma kasutajata
- admin-paneel: kasutajate nimekiri, blokeerimine, kustutamine ja rollide määramine
- tellimuste statistika ja enim müüdud toodete ülevaade
- staatilised frontend lehed serveeritakse Expressiga

## Paigaldamine

### Nõuded

- Node.js 18+
- MySQL
- npm

### Backend

```bash
cd back
npm install
```

### Frontend

```bash
cd ../front
npm install
```

## Andmebaasi seadistamine

Failis `back/config/mysql.js` on vaikimisi seaded:

- host: `127.0.0.1`
- user: `root`
- password: ``
- database: `petalspeak`

Loo käsitsi andmebaas `petalspeak`. Andmebaasi skeem ei kuulu reposse, kuid tabelid peaksid vastama kasutatud marsruutidele:

- `users`
- `bouquet_categories`
- `feeling_types`
- `products`
- `orders`
- `order_items`
- `test_results`

> Vajadusel lisa `.env` fail ja vii ühenduse andmed ning JWT saladus koodist välja.

## Serveri käivitamine

```bash
cd back
node server.js
```

Server on saadaval aadressil:

```
http://localhost:3000
```

## API

### Auth

- `POST /api/auth/register` — registreerimine
- `POST /api/auth/login` — sisselogimine

### Tests

- `POST /api/tests` — testi tulemus salvestatakse
- `GET /api/test-results/my` — praeguse kasutaja testi tulemuste toomine

### Orders

- `POST /api/orders` — tellimuse esitamine

### Products

- `GET /api/products` — toodete nimekiri
- `POST /api/products` — toote loomine
- `PUT /api/products/:id` — toote uuendamine
- `DELETE /api/products/:id` — toote kustutamine

### Admin

- `GET /api/admin/users` — kasutajate nimekiri
- `PUT /api/admin/users/:id/make-admin` — määramine adminiks
- `PUT /api/admin/users/:id/remove-admin` — admini eemaldamine
- `PUT /api/admin/users/:id/block` — kasutaja blokeerimine
- `PUT /api/admin/users/:id/unblock` — kasutaja blokeeringu eemaldamine
- `PUT /api/admin/users/:id/delete` — kasutaja kustutamine
- `GET /api/admin/orders` — tellimuste nimekiri
- `GET /api/admin/stats` — tellimuste statistika

## Testimine

### Backend

```bash
cd back
npm test
```

### Katvus

```bash
cd back
npx jest --coverage --runInBand
```

### Frontend

```bash
cd front
npm test
```

## Omadused ja soovitused

- JWT saladus `secret123` on hetkel kõvakodeeritud
- Laaditud failid salvestatakse kausta `back/uploads`
- `products.js` kasutab tootete nimede automaatset tõlget väliste API-de kaudu (Google, LibreTranslate, MyMemory)
- Tellimuse kinnitusmeilid saadetakse `nodemailer` abil

## Kontakt

Kui soovid projekti täiendada, lisada lokaliseerimist või andmebaasi migratsioone, lisa vastavad sätted ja `.env` fail.

