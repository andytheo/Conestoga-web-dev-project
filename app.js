const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const _ = require('lodash');
const {check, validationResult} = require ('express-validator');
const session = require('express-session');
const path = require('path');

// Multer image middleware
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({storage: storage})

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

// Express session
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
  Post.find({}).exec((error, allPosts) => {
    if (error) {
      console.log(error);
    } else {
      res.render('index', {
      allPosts: allPosts
    })      
    }
  })
})

app.get('/create-post', (req, res) => {
  if (req.session.userLoggedIn) {
    res.render('create-post')
  } else {
    res.redirect('/login')
  }
})

app.post('/create-post', upload.single('image'), [
  check ('title', 'Title is required!').notEmpty(),
  check ('content', 'Content is required!').notEmpty(),
  check ('image', '')
  .custom((value, {req}) => {
    if(!req.file) throw new Error('Image is required')
    return true;
  })
], (req, res) => {

    const errors = validationResult(req);
    console.log(errors);

    if (!errors.isEmpty()) {
      res.render('create-post', {errors : errors.array()});
    }

    else {
      const newPost = {
        title: req.body.title,
        content: req.body.content,
        image: `images/${req.file.filename}`
    }
      
    let myPost = new Post(newPost);
    myPost.save();
    res.redirect('/posts');
  }
})

app.get('/login', (req, res) => {
    res.render('login')
})

app.post('/login', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  Admin.findOne({username : username, password : password}).exec((err, admin) => {
    if (admin) {
        req.session.username = admin.username;
        req.session.userLoggedIn = true;
        res.redirect('/create-post');
      }
      else {
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
          res.render("post-page", {post: post})
        } else {
          console.log("Page not found");
        }
      });
    }
  })
})

app.get('/delete/:id', (req, res) => {  
  if (req.session.userLoggedIn) {
    let id = req.params.id;
    Post.findByIdAndDelete({_id : id}).exec(function (err, post) {
      if (post) {
        res.render ('delete', {message : "Record Deleted Successfully!"});
      }
      else {
        res.render ('delete', {message : "Sorry, Record Not Deleted!"});
      }
    })
  }
  else {
    res.redirect('/login');
  }
})

app.get('/edit/:id', (req, res) => { 
  if (req.session.userLoggedIn) {
    let id = req.params.id;
    Post.findOne({_id : id}).exec(function (err, post) {
      if (post) {
        res.render ('edit', {post : post});
      }
      else {
        res.send ('Sorry! No post with this id');
      }
    })
  }
  else {
    res.redirect('/login');
  }
})

app.post('/edit/:id', upload.single('image'), [
  check ('title', 'Title is required!').notEmpty(),
  check ('content', 'Content is required!').notEmpty(),
  check ('image', '')
  .custom((value, {req}) => {
    if(!req.file) throw new Error('Image is required')
    return true;
  })
], (req, res) => { 
    let id = req.params.id;
    const errors = validationResult(req);
    console.log(errors);

    if (!errors.isEmpty()) {
      if (req.session.userLoggedIn) {
        Post.findOne({_id : id}).exec(function (err, post) {
          if (post) {
            res.render ('edit', {post : post, errors : errors.array()});
          }
          else {
            res.send ('Sorry! No post with this id');
          }
      })
    }
    else {
      res.redirect('/login');
      }
    }

    else {
      const edittedPost = {
      title: req.body.title,
      content: req.body.content,
      image: `images/${req.file.filename}`
    }
    
    Post.findOne({_id : id}).exec(function(err, post){
      post.title = edittedPost.title;
      post.content = edittedPost.content;
      post.image = edittedPost.image;
      post.save();
    })
    res.render('edit-success', {message: "Edit successful."})
  }
})

app.get('*', (req, res) => {
  res.render("error-page")
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
})