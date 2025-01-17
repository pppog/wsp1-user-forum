const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
var validator = require('validator');
var Filter = require('bad-words'),
    ofilter = new Filter();
    var filter = new Filter({ placeHolder: 'agel '});
    filter.addWords('agel');

const mysql = require('mysql2');
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
});

const promisePool = pool.promise();

router.get('/', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT lo28forum.*, lo28users.name FROM lo28forum JOIN lo28users WHERE lo28forum.authorId = lo28users.id ORDER BY createdAt DESC");
    res.render('index.njk', {
        rows: rows,
        title: 'Forum',
        loggedin: req.session.loggedin || false,
    });
});

router.get('/internet', async function (req, res, next) {
    res.render('internet.njk', {
        title: 'Pranked',
    });
});

router.get('/access', async function (req, res, next) {
    res.render('access.njk', {
        title: 'ACCESS DENIED',
        loggedin: req.session.loggedin || false,
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
    const [comments] = await promisePool.query(
        `SELECT lo28forum.*, lo28comments.content AS ucomment, lo28comments.authorid AS userid, lo28users.name
        FROM lo28forum
        JOIN lo28comments ON lo28forum.Id = lo28comments.postid
        JOIN lo28users ON lo28comments.authorId = lo28users.id
        WHERE lo28forum.id = ?`,
        [req.params.id]
    );
    console.log(rows[0])
    res.render('post.njk', {
        post: rows[0],
        rows: comments,
        title: 'Post',
        loggedin: req.session.loggedin || false,
        uid: req.session.userid,
    });
});

router.get('/signin', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT * FROM lo28forum");
    res.render('signin.njk', {
        rows: rows,
        title: 'SignIn',
    });
});

router.get('/subscribe', async function (req, res, next) {
    const [rows] = await promisePool.query("SELECT * FROM lo28forum");
    res.render('subscribe.njk', {
        rows: rows,
        title: 'Subscribe',
        loggedin: req.session.loggedin || false,
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
        loggedin: req.session.loggedin || false,
    });
}
});

router.post('/new', async function (req, res, next) {
    const {title, content } = req.body;

    const errors = [];

    if (!title) errors.push('Title is required');
    if (!content) errors.push('Content is required');
    if (title && title.length <= 3)
        errors.push('Title must be at least 3 characters');
    if (content && content.length <= 10)
        errors.push('Content must be at least 10 characters');

    if (errors.length === 0) {
        // sanitize title och body, tvätta datan
        const sanitize = (str) => {
            let temp = str.trim();
            temp = validator.stripLow(temp);
            temp = validator.escape(temp);
            return temp;
        };
        if (title) sanitizedTitle = filter.clean(sanitize(title));
        if (content) sanitizedContent = filter.clean(sanitize(content));
    } else {
        return res.render('errors.njk', {
            rows: errors,
            loggedin: req.session.loggedin || false,
        });
    }

    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM lo28users WHERE id = ?', [req.session.userid]);
    if (!user) {
        user = await promisePool.query('INSERT INTO lo28users (name) VALUES (?)', [req.session.userid]);
    }

    // user.insertId bör innehålla det nya ID:t för författaren

    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('INSERT INTO lo28forum (authorId, title, content) VALUES (?, ?, ?)', [userId, sanitizedTitle, sanitizedContent]);
    res.redirect('/'); // den här raden kan vara bra att kommentera ut för felsökning, du kan då använda tex. res.json({rows}) för att se vad som skickas tillbaka från databasen
});

router.post('/edit', async function (req, res, next) {
    const {title, postid, content} = req.body;

    const errors = [];

    if (!title) errors.push('Title is required');
    if (!content) errors.push('Content is required');
    if (title && title.length <= 3)
        errors.push('Title must be at least 3 characters');
    if (content && content.length <= 10)
        errors.push('Content must be at least 10 characters');

    if (errors.length === 0) {
        // sanitize title och body, tvätta datan
        const sanitize = (str) => {
            let temp = str.trim();
            temp = validator.stripLow(temp);
            temp = validator.escape(temp);
            return temp;
        };
        if (title) sanitizedTitle = filter.clean(sanitize(title));
        if (content) sanitizedContent = filter.clean(sanitize(content));
    } else {
        return res.render('errors.njk', {
            rows: errors,
            loggedin: req.session.loggedin || false,
        });
    }


    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM lo28users WHERE id = ?', [req.session.userid]);
    if (!user) {
        user = await promisePool.query('INSERT INTO lo28users (name) VALUES (?)', [req.session.userid]);
    }

    // user.insertId bör innehålla det nya ID:t för författaren

    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('UPDATE lo28forum SET content = ?, title = ? WHERE id = ?', [sanitizedContent, sanitizedTitle, postid]);
    res.redirect('/post/' + postid); // den här raden kan vara bra att kommentera ut för felsökning, du kan då använda tex. res.json({rows}) för att se vad som skickas tillbaka från databasen
});

router.get('/edit/:postid', async function (req, res, next) {
    if (req.session.loggedin === undefined) {
        
        return res.status(401).redirect('/access');
    } else {
        const [post] = await promisePool.query(
            `SELECT lo28forum.*, lo28users.name AS username
        FROM lo28forum
        JOIN lo28users ON lo28forum.authorId = lo28users.id
        WHERE lo28forum.id = ?;`,
            [req.params.postid]
        );
        if (req.session.userid !== post[0].authorId) {
        
            return res.status(401).redirect('/access');
        } else {
    res.render('edit.njk', {
        title: 'edit',
        post: post[0],
        userid: req.session.userid,
        loggedin: req.session.loggedin,
    });
}
}
});


router.post('/comment', async function (req, res, next) {
    const {postid, content} = req.body;


    const errors = [];

    if (!content) errors.push('Content is required');
    if (content && content.length <= 10)
        errors.push('Content must be at least 10 characters');

    if (errors.length === 0) {
        // sanitize title och body, tvätta datan
        const sanitize = (str) => {
            let temp = str.trim();
            temp = validator.stripLow(temp);
            temp = validator.escape(temp);
            return temp;
        };
        if (content) sanitizedContent = filter.clean(sanitize(content));
    } else {
        return res.render('errors.njk', {
            rows: errors,
            loggedin: req.session.loggedin || false,
        });
    }

    
    // Skapa en ny författare om den inte finns men du behöver kontrollera om användare finns!
    let [user] = await promisePool.query('SELECT * FROM lo28users WHERE id = ?', [req.session.userid]);
    if (!user) {
        user = await promisePool.query('INSERT INTO lo28users (name) VALUES (?)', [req.session.userid]);
    }

    // user.insertId bör innehålla det nya ID:t för författaren

    const userId = user.insertId || user[0].id;

    // kör frågan för att skapa ett nytt inlägg
    const [rows] = await promisePool.query('INSERT INTO lo28comments (authorId, postid, content) VALUES (?, ?, ?)', [userId, postid, sanitizedContent]);
    res.redirect('/'); // den här raden kan vara bra att kommentera ut för felsökning, du kan då använda tex. res.json({rows}) för att se vad som skickas tillbaka från databasen
});

router.get('/comment/:postid', async function (req, res, next) {
    if (req.session.loggedin === undefined) {
        
        return res.status(401).redirect('/access');
    } else {
        const [post] = await promisePool.query(
            `SELECT lo28forum.*, lo28users.name AS username
        FROM lo28forum
        JOIN lo28users ON lo28forum.authorId = lo28users.id
        WHERE lo28forum.id = ?;`,
            [req.params.postid]
        );
    res.render('comment.njk', {
        title: 'Ny kommentar',
        post: post[0],
        userid: req.session.userid,
        loggedin: req.session.loggedin,
    });
}
});

router.get('/profile', async function (req, res, next) {
    if (req.session.loggedin === undefined) {
        
        return res.status(401).redirect('/access');
    } else {
        const [rows] = await promisePool.query("SELECT lo28forum.*, lo28users.name FROM lo28forum JOIN lo28users WHERE lo28forum.authorId = lo28users.id AND lo28users.id = ?", [req.session.userid]);
        console.log(rows)
    res.render('profile.njk', {
        title: 'Profile',
        rows: rows,
        loggedin: req.session.loggedin || false,
        username: req.session.username,
    });}
});

router.get('/user/:name', async function (req, res, next) {
        const [rows] = await promisePool.query("SELECT lo28forum.*, lo28users.name FROM lo28forum JOIN lo28users WHERE lo28forum.authorId = lo28users.id AND lo28users.name = ?", [req.params.name]);
        if (req.session.username === req.params.name) {
            return res.redirect('/profile')
        }
    res.render('user.njk', {
        title: 'user',
        rows: rows,
    });
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
    }

    if (!validator.isAlphanumeric(username,'en-US')) {
        errors.push('Username is not alphanumeric');
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
            return res.render('errors.njk', {
                rows: errors,
                loggedin: req.session.loggedin || false,
            });
    } else {
        bcrypt.hash(password, 10, async function (err, hash) {
            const [newUser] = await promisePool.query('INSERT INTO lo28users (name, password) VALUES (?, ?)', [username, hash])
            return res.redirect('/login');
        });
        

    }
});


router.post('/changeusername', async function (req, res, next){
    const { userid, username } = req.body;
    const errors = [];
    console.log("USER ID IS: " + userid + " AND YOUR NEW USERNAME IS: " + username)
    
    if (username === '') {
        errors.push('Username is Required');
    }
    if (errors.length > 0) {
            return res.render('errors.njk', {
                rows: errors,
                loggedin: req.session.loggedin || false,
            });
    }
    
    const [userCheck] = await promisePool.query('SELECT name FROM lo28users WHERE name = ?',[username],);
    if (userCheck.length > 0){
        errors.push('Username is already taken');
    }
    if (errors.length > 0) {
            return res.render('errors.njk', {
                rows: errors,
                loggedin: req.session.loggedin || false,
            });
    } else {
    const [newUser] = await promisePool.query('UPDATE lo28users SET name = ? where id = ?', [username, userid])
    req.session.username = username;
            return res.redirect('/profile');
    }
});

router.get('/changeusername', async function (req, res, next){
    if (req.session.loggedin = 1) {
    res.render('changeusername.njk', {
        title: 'Update username',
        userid: req.session.userid,
    });
} else {
return res.render('access.njk')
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
    }

    if (password === '') {
        //console.log('Password is Required');
        errors.push('Password is Required');
    }
    if (errors.length > 0) {
            return res.render('errors.njk', {
                rows: errors,
                loggedin: req.session.loggedin || false,
            });
    }

    const [users] = await promisePool.query('SELECT * FROM lo28users WHERE name = ?', [username],);
    if(users.length > 0) {
    bcrypt.compare(password, users[0].password, function (err, result) {
        if (result === true) {
            console.log(users);
            req.session.loggedin = true;
            req.session.userid = users[0].id;
            req.session.username = username;
            return res.redirect('/profile');
        } else {
            errors.push('Invalid password')
            return res.render('errors.njk', {
                rows: errors,
                loggedin: req.session.loggedin || false,
            });
        }
    });
} else {
    errors.push('User does not exist')
    return res.render('errors.njk', {
        rows: errors,
        loggedin: req.session.loggedin || false,
    });
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
