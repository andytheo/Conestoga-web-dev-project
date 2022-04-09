const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
// const {check, validationResult} = require ('express-validator');
const session = require('express-session');
const path = require('path');
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images')
  },
  filename: (req, file, cb) => {
    console.log(file)
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({storage: storage})

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
// app.use(fileUpload());

app.use(session({
  secret: 'anonymous',
  resave: false,
  saveUninitialized: true
}))

// Database connection
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/pagesDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, err => {
		console.log('MongoDB connected')});

const Admin = mongoose.model('admin', {
    username : String,
    password : String
})

const Post = mongoose.model('post', {
    title : String,
    content : String,
    image: {
      type: String
    }
})

app.get('/', (req, res) => {
    res.render('index')
})

app.get('/create-post', (req, res) => {
  // if (req.session.userLoggedIn) {
    res.render('create-post')
  // } else {
    // res.redirect('/login')
  // }
})

app.post('/create-post', upload.single('image'), (req, res) => {
  const newPost = {
    title: req.body.title,
    content: req.body.content,
    image: `images/${req.file.filename}`
  }
  
  let myPost = new Post(newPost);
  myPost.save().then(() => {
    console.log(newPost);
  })

  res.redirect('/posts');
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  Admin.findOne({username : username, password : password}).exec((err, admin) => {
      console.log(`Error: ${err}`);
      console.log(`Admin: ${admin}`);

      if (admin) 
        {
          req.session.username = admin.username;
          req.session.userLoggedIn = true;
          res.redirect('/create-post');
        }
        else
        {
          res.render('login', {error : "Sorry Login Failed. Please try again!"});
        }
    })
})

app.get('/posts', (req, res) => {
  Post.find({}).exec((error, allPosts) => {
    if (error) {
      console.log(error);
    } else {
      res.render('all-posts', {
      allPosts: allPosts
    })      
    }
  })
})

app.get('/posts/:post', (req, res) => {

  let title = _.lowerCase(req.params.post);
  Post.find({}).exec((error, allPosts) => {
    
    if (error) {
      console.log(error);
    } else {
      allPosts.forEach(post => {
      let savedTitle = _.lowerCase(post.title);
        if (title === savedTitle) {
          res.render("post-page", {post})
        } 
      });
    }
    // res.redirect("/posts")
  })
  
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
})