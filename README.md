clone repo

create and populate .env.development.local and .env.production.local, then:

```npm install```

two ways to run it:

```npm run dev```

which will set NODE_ENV to "development" and hit the dev db, or 

```npm run build```
```npm run start```

which will set NODE_ENV to "production" and hit the prod db

Create a new user by modifying scripts/create-user.js and running:

```npm run adduser```

for playwright tests, create .env.test.local and populate with the same values as .env.development.local except for the db credentials, then run:

```
cd playwright-tests
docker compose up -d
cd ..
NODE_ENV=test npx playwright test --ui
cd playwright-tests
docker compose down
```