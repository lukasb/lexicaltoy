clone repo

create and populate .env.development.local and .env.production.local, then:

```npm install```

two ways to run it:

```npm run dev```

which will set NODE_ENV to "development" and hit the dev db, or 

```npm run build```
```npm run start```

which will set NODE_ENV to "production" and hit the prod db

Create a new users by modifying scripts/create-user.js and running:

```npm run adduser```