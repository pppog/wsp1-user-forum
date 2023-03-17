const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
});

const promisePool = pool.promise();

router.get('/', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT lo28forum.*, lo28users.name FROM lo28forum JOIN lo28users WHERE  lo28forum.authorId = lo28users.id ORDER BY createdAt DESC");
    res.render('index.njk', {
        rows: rows,
        title: 'Forum',
    });
});

router.get('/access', async function (req, res, next) {
    res.render('access.njk', {
        title: 'ACCESS DENIED',
    });
});

router.get('/post/:id', async function (req, res, next) {
    const [rows] = await promisePool.query(
        `SELECT lo28forum.*, lo28users.name AS username
    FROM lo28forum
    JOIN lo28users ON lo28forum.authorId = lo28users.id
    WHERE lo28forum.id = ?;`,
        [req.params.id]
    );
    console.log(rows[0])
    res.render('post.njk', {
        post: rows[0],
        title: 'Forum',
    });
});

router.get('/signin', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT * FROM lo28forum");
    res.render('signin.njk', {
        rows: rows,
        title: 'Forum',
    });
});

router.get('/subscribe', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT * FROM lo28forum");
    res.render('subscribe.njk', {
        rows: rows,
        title: 'Forum',
    });
});


router.get('/new', async function (req, res, next) {
    if (req.session.loggedin === undefined) {
        
        return res.status(401).redirect('/access');
    } else {
        console.log(req.session.userid)
    const [users] = await promisePool.query('SELECT * FROM lo28users WHERE id = ?', [req.session.userid]);
    res.render('new.njk', {
        title: 'Nytt inlägg',
        users,
    });
}
});

router.post('/new', async function (req, res, next) {
    const {title, content } = req.body;

    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM lo28users WHERE id = ?', [req.session.userid]);
    if (!user) {
        user = await promisePool.query('INSERT INTO lo28users (name) VALUES (?)', [req.session.userid]);
    }

    // user.insertId bör innehålla det nya ID:t för författaren

    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('INSERT INTO lo28forum (authorId, title, content) VALUES (?, ?, ?)', [userId, title, content]);
    res.redirect('/'); // den här raden kan vara bra att kommentera ut för felsökning, du kan då använda tex. res.json({rows}) för att se vad som skickas tillbaka från databasen
});


router.get('/profile', async function (req, res, next) {
    if (req.session.loggedin === undefined) {
        
        return res.status(401).redirect('/access');
    } else {
        const [rows] = await promisePool.query("SELECT * FROM lo28forum WHERE authorId = ?", [req.session.userid]);
        console.log(rows)
    const [username] = await promisePool.query('SELECT * FROM lo28users WHERE id = ?', [req.session.userid],);
    res.render('profile.njk', {
        title: 'Profile',
        username: username[0].name,
        rows: rows,
    });}
});

router.get('/crypt/:password', function (req, res, next) {
    bcrypt.hash(req.params.password, 10, function (err, hash) {
        // Store hash in your password DB.
        return res.json({ hash });
    });
});


router.post('/register', async function (req, res, next){
    const { username, password, passwordConfirmation } = req.body;
    const errors = [];
    
    if (username === '') {
        errors.push('Username is Required');
    } else {
    }

    if (password === '') {
        errors.push('Password is Required');
    }
    if (password !== passwordConfirmation) {
        errors.push('Passwords do not match');
    }
    const [userCheck] = await promisePool.query('SELECT name FROM lo28users WHERE name = ?',[username],);
    if (userCheck.length > 0){
        errors.push('Username is already taken');
    }
    if (errors.length > 0) {
        return res.json([errors]);
    } else {
        bcrypt.hash(password, 10, async function (err, hash) {
            const [newUser] = await promisePool.query('INSERT INTO lo28users (name, password) VALUES (?, ?)', [username, hash])
            return res.redirect('/login');
        });
        

    }
});

router.get('/register', async function (req, res, next){
    res.render('register.njk', {
        title: 'Register ALC',
    });
});


router.get('/login', function (req, res, next) {
    res.render('login.njk', {
        title: 'Login ALC',
    });
});

router.post('/login', async function (req, res, next) {
    const { username, password } = req.body;
    const errors = [];
    
    if (username === '') {
        //console.log('Username is Required');
        errors.push('Username is Required');
    } else {
    }

    if (password === '') {
        //console.log('Password is Required');
        errors.push('Password is Required');
    }
    if (errors.length > 0) {
        return res.json([errors]);
    }

    const [users] = await promisePool.query('SELECT * FROM lo28users WHERE name = ?', [username],);
    if(users.length > 0) {
    bcrypt.compare(password, users[0].password, function (err, result) {
        if (result === true) {
            console.log(users);
            req.session.loggedin = true;
            req.session.userid = users[0].id;
            return res.redirect('/profile');
        } else {
            return res.json('Invalid username or password');
        }
    });
} else {
    return res.redirect("/login");
}
});

router.get('/delete', async function (req, res, next) {
    if (req.session.loggedin === true) {
        req.session.loggedin = false;
        await promisePool.query('DELETE FROM lo28users WHERE id = ?', [req.session.userid],);
        return res.redirect('/login');
    }
});

router.get('/logout', function (req, res, next){
    req.session.loggedin = undefined;
    
        return res.redirect('/login')
    
});

router.post('/logout', async function (req, res, next){
    if (req.session.loggedin === undefined) {
        
        return res.status(401).redirect('/access');
    }
    else {
        req.session.loggedin=undefined;
        return res.redirect('/')
    }
});


module.exports = router;
