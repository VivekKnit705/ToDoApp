const express = require("express");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const session = require('express-session');
const mongoDBSession = require('connect-mongodb-session')(session);

const userSchema = require('./userSchema');
const todoSchema = require('./todoSchema');


const app = express();


const mongoURI = `mongodb+srv://vivek_705:Kknit69gmail@cluster0.w7i4ac8.mongodb.net/backendjs?retryWrites=true&w=majority`;
const store = new mongoDBSession({
    uri: mongoURI,
    collection: "sessions"
})



// Middleware - after request and before api call
app.use(express.json());
app.use(express.urlencoded({ extends: true }));
app.use(express.static('public'));

//EJS Template Rendering Engine
app.set("view engine", 'ejs');

// Add session object in req
app.use(session({
    secret: 'hello backendjs',
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true },
    store: store
}))

const accessStore={};
const rateLimiting=(req,res,next)=>{

    // logged in Single user account, Private api (only api's that logged in user can access)

    const sessionId=req.session.id;
    if(!sessionId){
        return res.send({
            status:400,
            message:"Bad Request"
        })
    }
    const lastAccessTime=accessStore[sessionId];
    if(!lastAccessTime){
        accessStore[sessionId]=lastAccessTime;
        next();
    }
    const currentTime=Date.now();
    const diff=currentTime-lastAccessTime;
    if(diff<300){
        return res.send({
            status:400,
            message:"Too many request please try again later"
        })
    }
    accessStore[sessionId]=Date.now();
    next();
}

app.get('/',rateLimiting, (req, res) => {
    res.send("Welcome to Our App");
})



app.get('/profile', (req, res) => {
    if (req.session.isAuth) {
        res.send("Welcome to Profile Page");
    }
    else {
        res.send("you are not loggedIn, Please logIn");
    }
});

app.get('/register', (req, res) => {
    res.render('register');
})

app.get('/login', (req, res) => {
    res.render(`login`);
})
// app.get('/profile/:id/:name', (req, res) => {
//     console.log(req.params);
//     res.send("my name is vivek");
// })
// app.get('/payment', (req, res) => {
//     res.send("payment sucess");
// })
// app.post('/payment', (req, res) => {
//     res.send("payment done sucessufully");
// })

// app.get('/orders', (req, res) => {
//     console.log(req.query);
//     res.send("Order get Placed");
// })
// app.post('/orders', (req, res) => {
//     console.log(req.body);
// })


// app.use(() => {
//     console.log("Hello Vivek");
// })



mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(res => {
    console.log("Connected Succesfully");
}).catch(err => {
    console.log("failed to connect", err);
});


function checkAuth(req, res, next) {
    if (req.session.isAuth) {
        next();
    }
    else {
        return res.send({
            status: 400,
            message: "You are not logged in please logIn."
        })
    }
}

function cleanUpAndValidate({ name, username, phone, email, password }) {
    return new Promise((resolve, reject) => {

        if (typeof (email) !== 'string')
            reject('Invalid Email');
        if (typeof (username) !== 'string')
            reject('Invalid Username');
        if (typeof (name) !== 'string')
            reject('Invalid name');
        if (typeof (password) !== 'string')
            reject('Invalid Password');

        // Empty strings evaluate to false
        if (!username || !password || !name || !email)
            reject('Invalid Data');

        if (username.length < 3 || username.length > 100)
            reject('Username should be 3 to 100 charcters in length');

        if (password.length < 5 || password > 300)
            reject('Password should be 5 to 300 charcters in length');

        if (!validator.isEmail(email))
            reject('Invalid Email');

        if (phone !== undefined && typeof (phone) !== 'string')
            reject('Invalid Phone');

        if (phone !== undefined && typeof (phone) === 'string') {
            if (phone.length !== 10 && validator.isAlphaNumeric(phone))
                reject('Invalid Phone');
        }

        resolve();
    })
}


// Allows user to register
app.post('/register', async (req, res) => {
    const { name, username, email, password, phone } = req.body;

    // Validation of Data
    try {
        const msg = await cleanUpAndValidate({ name, username, email, password, phone });
    }
    catch (err) {
        return res.send({
            status: 400,  // Failed
            message: "cleanUpandValidate is not working currectly",
            error: err

        })
    }
    let userExist;
    // Check if user already exists
    try {
        userExist = await userSchema.findOne({ email });
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Internal Server Error. Please try again.",
            error: err
        })
    }
    if (userExist) {
        return res.send({
            status: 400,
            message: "user with same email exist"
        })
    }

    try {
        userExist = await userSchema.findOne({ username });
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Internal Servar Error, Please try again.",
            error: err
        })
    }
    if (userExist) {
        return res.send({
            status: 400,
            message: "user with same username exist"
        })
    }
    const hashedPassword = await bcrypt.hash(password, 13); // md5 
    let user = new userSchema({
        name,
        username,
        email,
        password: hashedPassword,
        phone
    })

    try {
        const userDb = await user.save(); // Create Operation
        return res.send({
            status: 200,
            message: "Registration Successful",
            data: {
                _id: userDb._id,
                username: userDb.username,
                email: userDb.email
            }
        });
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Internal Server Error. Please try again.",
            error: err
        })
    }
})


app.post("/login", async (req, res) => {
    const { loginId, password } = req.body;
    // login can be either email or username
    if (!loginId || !password || typeof (loginId) !== "string" || typeof (password) !== "string") {
        return res.send({
            status: 400,
            message: "Invalid Data"
        })
    }

    // find() -> may return multiple object, return an Array of Object
    // findOne() -> One object return null if nothing matches, Return an Object
    let userDb;
    try {
        if (validator.isEmail(loginId)) {
            userDb = await userSchema.findOne({ email: loginId });
        }
        else {
            userDb = await userSchema.findOne({ username: loginId });
        }
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Internal server Error, Please Try Again",
            error: err
        })
    }

    if (!userDb) {
        return res.send({
            status: 400,
            message: "User Not Found",
            data: req.body
        });
    }
    const isMathch = await bcrypt.compare(password, userDb.password);
    if (!isMathch) {
        return res.send({
            status: 400,
            message: "Invalid Password",
            data: req.body
        });
    }
    req.session.isAuth = true;
    req.session.user = { username: userDb.username, email: userDb.email, userId: userDb._id };
    res.send({
        status: 200,
        message: "Logged In Succesufully"
    });
})
app.get('/dashboard',rateLimiting,checkAuth, (req, res) => {
    
    res.render('dashboard');
    // console.log(req);
    // res.send('welcome to our app')
});


// let users = [
//     {
//         userId: 1,
//         name: "Vivek"
//     }
// ];
// let nextUserId = 2;
//read data from database
// app.get('/users', (req, res) => {
//     res.send(users);
// })
// create a new entry in database
// app.post('/users', (req, res) => {
//     const name1 = req.body.name;
//     const user = {
//         userid: nextUserId,
//         name: name1
//     }
//     nextUserId++;
//     users.push(user)
//     res.send("user succesfully registerde")
// })


// update if the obj is present otherwise it add it to the db
// app.put('/users', (req, res) => {

//     const { userId, name } = req.body;
//     const recordUpdated = false;

//     users.map(user => {
//         if (user.userId == userId) {
//             recordUpdated = true;
//             user.name = name;
//         }
//         return user;
//     })
//     if (recordUpdated == true) {
//         return res.send("uset updated succesfully");
//     }
//     let user = {
//         userId,
//         name
//     }
//     users.push(user);
//     res.send("user added succesfuly")
// });
// update or modify the existing data
// app.patch('/users', (req, res) => {
//     const { userId, name } = req.body;

//     users.map(user => {
//         if (user.userId == userId) {
//             user.name = name;
//         }
//         return user;
//     })
//     res.send("updated succesfully");
// })
// app.delete('/users', (req, res) => {
//     const { userId } = req.body;
//     users = users.filter(user => user.userId != userId);
//     res.send("deleted succesfully");
// })







app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            throw err;
        }
        res.send("Logged Out Succesfully")
    })
})
app.post('/create-todo',rateLimiting, checkAuth, async (req, res) => {

    const { todo } = req.body;
    if (!todo) {
        res.send({
            status: 400, message: "Invalid Todo"
        })
    }

    if (todo.lenght > 200) {
        return res.send({
            status: 400,
            message: "Todo text is too long, Todo can be max 200 character"
        })
    }
    const userId = req.session.user.userId;
    const creation_datetime = new Date();
    // console.log(userId)
    const todoCount = await todoSchema.count({ userId: userId });
    // console.log(todoCount);
    if (todoCount >= 10) {
        return res.send({
            status: 400,
            message: "You have already created 1000. Please try creating your old todo delete"
        })
    }

    const todoObj = new todoSchema({
        todo,
        userId,
        creation_datetime
    })
    try {
        const todoDb = await todoObj.save();
        return res.send({
            status: 200,
            message: "Succesfullly todo cretaed"
        })
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Integrnal sever error please try again"
        })
    }

})

app.post('/read-todo', rateLimiting, checkAuth, async (req, res) => {

    const userId = req.session.user.userId;
    // limit is number of todo we want to show at a time in each api call
    const LIMIT = 5;
    // number of todod you want to skip 
    const skip = req.query.skip || 0;
    let todos = [];
    try {
        // console.log(userId.toString())
        todos = await todoSchema.aggregate([
            { $match: { userId: userId.toString() } },
            { $sort: { todo: -1 } },
            {
                $facet: {
                    data: [{
                        $skip: parseInt(skip)
                    }, { $limit: LIMIT }]
                }
            }
        ])
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "1Internal Server Error, Please try again.",
            data: todos

        })
    }
    return res.send({
        status: 200,
        message: "Read Successfully",
        data: todos[0].data
    })
})

app.post('/edit-todo',rateLimiting, checkAuth, async (req, res) => {

    const { todoId, todoText } = req.body;
    if (!todoText) {
        res.send({
            status: 400, message: "Invalid Todo"
        })
    }
    if (todoText.length > 200) {
        return res.send({
            status: 400,
            message: "Todo text is too long, Todo can be max 200 character"
        })
    }
    try {
        const todo = await todoSchema.findOneAndUpdate({ _id: todoId }, { todo: todoText })
        return res.send({
            status: 200,
            message: "Update Successfully",
            data: todo
        })
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Interenal Server Error"
        })
    }




})
app.post('/delete-todo',rateLimiting, checkAuth, async (req, res) => {

    const { todoId } = req.body;
    try {
        const todo = await todoSchema.findOneAndDelete({ _id: todoId })
        return res.send({
            status: 200,
            message: "Deleted Successfully",
            data: todo
        })
    }
    catch (err) {
        return res.send({
            status: 400,
            message: "Interenal Server Error"
        })
    }

})
app.listen(process.env.PORT || 3000, function(){
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
  });