require('dotenv').config();
const express = require("express")
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const User = require('./schema/user')
const Job = require('./schema/job')
const Post = require('./schema/post');
const Message = require('./schema/message');

const app = express();

app.use(express.static("public"));
app.use(express.json())
app.use(express.urlencoded());
app.use(cookieParser())
app.set('view engine', 'ejs');

app.listen(3000, () => {
    console.log("Server started on port 3000...")
})

mongoose.connect(process.env.DB_STRING)


////// GET ROUTES //////
app.get('/', verifyLoggedIn, (req, res) => {
    res.render('landing')
})

app.get('/login', (req, res) => {
    res.render('login', {message: ""})
})

app.get('/signup', (req, res) => {
    res.render('sign-up', {message: ""})
})

app.get('/forgotpassword', (req, res) => {
    res.render('forgot-password')
})

app.get('/map', verifyToken, (req, res) => {
    res.render("map", {apiKey: process.env.API_KEY})
})

app.get('/createjob', verifyToken, (req, res) => {
    res.render('create-job', {message: ""})
})

app.get('/contact', verifyToken, (req, res) => {
    res.render('contact', {message: ""})
})

app.get('/error', (req, res) => {
    res.render('errorPage')
})

app.get('/logout', (req, res) => {
    res.clearCookie("token").redirect('/')
})

// Fetch news sources and render them to the news page
app.get('/news', verifyToken, async (req, res) => {
    const url = 'https://newsapi.org/v2/everything?q=wisconsin&apiKey=' + process.env.NEWS_API_KEY
    const options = {
        "method": "GET"
    }
    const response = await fetch(url, options)
    .then(res => res.json())
    .catch(e => {
        console.error({
            "message": "oh no",
            error: e
        })
    })
    res.render('news', {articles: response.articles})
})

// Render all jobs on admin view
app.get('/admin-jobs-all', verifyTokenAdmin, (req, res) => {
    Post.find({}, (err, posts) => {
        if (!err) {
            res.render('admin-jobs-all', {posts: posts})
        }
    })
})

// Admin can delete any job post
app.get('/admin-job-delete/:id', verifyToken, (req, res) => {
    const id = req.params.id
    Post.findOneAndDelete({_id: id}, (err, result) => {
        if (!err) {
            res.redirect('/admin-jobs-all')
        }
    })
})

// render jobs that user posted in view posted jobs page
app.get('/posted-jobs', verifyToken, (req, res) => {
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)
    const userEmail = user.email
    Post.find({creator: userEmail}, (err, posts) => {
        if (!err) {
            res.render('user-jobs', {posts: posts})
        }
    })
})

// Delete user's posted job
app.get('/job-delete/:id', verifyToken, (req, res) => {
    const id = req.params.id
    Post.findOneAndDelete({_id: id}, (err, result) => {
        if (!err) {
            res.redirect('/posted-jobs')
        }
    })
})

// render user account infomation
app.get('/account', verifyToken, (req, res) => {
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)
    res.render('account-info', {user: user, message: ""})
})

// Retrieve all job posts from database and render to /jobs page
app.get('/jobs', verifyToken, (req, res) => {
    Post.find({}, (err, jobs) => {
        if (!err) {
            res.render('jobs', {jobs: jobs})
        }
    })
})

// Direct to admin jobs page, render all job posts from user 
app.get('/admin-jobs', verifyTokenAdmin, (req, res) => {
    Job.find({}, (err, posts) => {
        if (!err) {
            res.render('admin-jobs', {posts: posts})
        }
    })
})

// Delete job post in admin view
app.get('/delete/:id', verifyTokenAdmin,(req, res) => {
    const id = req.params.id
    Job.findOneAndDelete({_id: id}, (err, job) => {
        if (!err) {
            res.redirect('/admin-jobs')
        }
    })
})

// Approve user job posts, add job post to post collection
// remove use job post from job collection
app.get('/approve/:id', verifyTokenAdmin,(req, res) => {
    const id = req.params.id
    
    Job.findOne({_id: id}, (err, result) => {
        if(!err) {
            const newPost = new Post({
                company: result.company,
                title: result.title,
                link: result.link,
                description: result.description,
                creator: result.creator
            })

            Job.deleteOne({_id: id}, (err) => {
                if (!err) {
                    newPost.save((err) => {
                        if (!err) {
                            res.redirect('/admin-jobs')
                        }
                    })
                }
            })
        }
    })
})

// Direct to admin messages page, render all messages from user
app.get('/admin-messages', verifyTokenAdmin,(req, res) => {
    Message.find({}, (err, results) => {
        if (!err) {
            res.render("admin-messages", {messages: results})
        }
    })
})

// Admin ability to delete messages recieved from users
app.get('/deleteMessage/:id', verifyTokenAdmin, (req, res)  => {
    const id = req.params.id
    Message.findOneAndDelete({_id: id}, (err, result) => {
        if (!err) {
            res.redirect('/admin-messages')
        }
    })
})

// Direct to admin users page, render all users
app.get('/admin-users', verifyTokenAdmin, (req, res) => {
    User.find({}, (err, users) => {
        if (!err) {
            res.render('admin-users', {users: users})
        }
    })
})

// Admin ability to delete users
app.get('/delete-user/:id', verifyTokenAdmin, (req, res) => {
    const id = req.params.id
    User.findOneAndDelete({_id: id}, (err, result) => {
        if (!err) {
            res.redirect('/admin-users')
        }
    })
})

// Render admin acconut infomation
app.get('/admin-account', verifyTokenAdmin, (req, res) => {
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)
    res.render('admin-account', {user: user, message: ""})
})


////// POST ROUTES //////
// Grabs user sign up info and save to database
app.post('/signup', (req, res) => {
    const firstname = req.body.firstname
    const lastname = req.body.lastname
    const email = req.body.email
    const password = req.body.password

    // check if there is already an account with the email, send error message
    // if there is no account with the email, create the account
    User.findOne({email: email}, (err, result) => {
        if (err) {
            res.render('errorPage')
        } else {
            if (result) {
                res.render('sign-up', {message: "User already exists."})
            } else {
                bcrypt.hash(password, 10, (err, hash) => {
                    const newUser = new User({
                        firstname: firstname,
                        lastname: lastname,
                        email: email,
                        password: hash,
                        role: "normal"
                    })

                    newUser.save((err) => {
                        if(!err) {
                            res.redirect('/login')
                        }
                    })
                })
            }
        }
    })
})

// User Login... Authenticate and Authorize user 
app.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password

    // Check if email is in DB, if yes, then check password
    User.findOne({email: email}, (err, foundUser) => {
        if (err) {
            res.render('errorPage')
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, (err, result) => {
                    if (result === true) {
                        // Create token
                        const accessToken = jwt.sign({
                            firstname: foundUser.firstname,
                            lastname: foundUser.lastname,
                            email: foundUser.email,
                            role: foundUser.role
                        }, process.env.ACCESS_TOKEN_SECRET)

                        // Determine if user is admin or normal user
                        // Create a cookie with the token
                        if (foundUser.role === "admin") {
                            res.cookie("token", accessToken, {
                                httpOnly: true
                            }).redirect('/admin-messages')
                        } else {
                            res.cookie("token", accessToken, {
                                httpOnly: true
                            }).redirect('/map')
                        }
                    } else {
                        res.render('login', {message: "Email or Password is incorrect."})
                    }
                })
            } else {
                res.render('login', {message: "Email or Password is incorrect."})
            }
        }
    })
})

// Grabs user created job form input and save to database
app.post('/createjob', verifyToken, (req, res) => {
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)
    const userEmail = user.email
    const company = req.body.company
    const jobTitle = req.body.title
    const jobLink = req.body.joblink
    const jobDescription = req.body.description

    const newJob = new Job({
        company: company,
        title: jobTitle,
        link: jobLink,
        description: jobDescription,
        creator: userEmail
    })

    newJob.save((err) => {
        if (err) {
            res.render('create-job', {message: "There was an error. Please Retry."})
        } else {
            res.render('create-job', {message: "Job successfully sent to admin for verification."})
        }
    })
})

// Grabs user contact message input and saves to database
app.post('/contact', verifyToken, (req, res) => {
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)
    const userEmail = user.email
    const subject = req.body.subject
    const message = req.body.message

    const newMessage = new Message({
        subject: subject,
        message: message,
        creator: userEmail
    })

    newMessage.save((err) => {
        if (!err) {
            res.render('contact', {message: "Successfully sent message."})
        } else {
            res.render('contact', {message: "There was an error. Please Try again."})
        }
    })
})

// Update / change user password
app.post('/account', verifyToken, (req, res) => {
    const currentPassword = req.body.currentPassword
    const newPassword = req.body.newPassword
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)

    User.findOne({email: user.email}, (err, foundUser) => {
        if (!err) {           
            if (foundUser) {
                bcrypt.compare(currentPassword, foundUser.password, (err, result) => {
                    if (result === true) {
                        bcrypt.hash(newPassword, 10, (err, hash) => {
                            if (!err) {
                                User.findOneAndUpdate({email: user.email}, {password: hash}, (err, result) => {
                                    if (!err) {
                                        res.render('account-info', {user: user, message: "Password has successfully been changed."})
                                    }
                                })
                            }
                        })
                    } else {
                        res.render('account-info', {user: user, message: "Inccorect password, try again."})
                    }
                })
            }
        }
    })
})

// Update / change admin password
app.post('/admin-account', verifyTokenAdmin, (req, res) => {
    const currentPassword = req.body.currentPassword
    const newPassword = req.body.newPassword
    const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)

    User.findOne({email: user.email}, (err, foundUser) => {
        if (!err) {           
            if (foundUser) {
                bcrypt.compare(currentPassword, foundUser.password, (err, result) => {
                    if (result === true) {
                        bcrypt.hash(newPassword, 10, (err, hash) => {
                            if (!err) {
                                User.findOneAndUpdate({email: user.email}, {password: hash}, (err, result) => {
                                    if (!err) {
                                        res.render('admin-account', {user: user, message: "Password has successfully been changed."})
                                    }
                                })
                            }
                        })
                    } else {
                        res.render('admin-account', {user: user, message: "Inccorect password, try again."})
                    }
                })
            }
        }
    })
})

////// MIDDLEWARE //////
// Middleware function to verify user is logged in, via token
function verifyToken(req, res, next) {
    jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            res.redirect('/')
        }
        next()
    })
}

// Middleware function to check if user is an admin
function verifyTokenAdmin(req, res, next) {
    jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            res.redirect('/')
        } else {
            const user = jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET)
            if (user.role === "admin") {
                next()
            } else {
                res.redirect('/map')
            }
        }
    })
    
}

// user will automatically be directed to /map when going to the home page, if they already have a token/already logged in
function verifyLoggedIn(req, res, next) {
    jwt.verify(req.cookies.token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (!err) {
            res.redirect('/map')
        } else {
            next()
        }
    })
}