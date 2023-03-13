# Users + forum

## History

```bash
mkdir wsp1-user-forum
cd wsp1-user-forum
npm init -y
git init
touch .gitignore
git add .
git commit -m "🎉"
git branch -M main
touch app.ks
mkdir bin
```

https://github.com/jensnti/wsp1-login-facit/blob/main/app.js

https://github.com/jensnti/wsp1-login-facit/blob/main/bin/www -> server.js

package.json

```json
    "dev": "nodemon -e js,html,njk .server.js",
```
    
```bash
npm install nodemon --save-dev
npm install express dotenv bcrypt cookie-parser express-session morgan mysql2 nunjucks
```