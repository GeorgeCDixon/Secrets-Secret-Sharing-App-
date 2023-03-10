//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//var encrypt = require('mongoose-encryption'); 
//const md5 = require("md5");  // This one used for password hashing
//const bcrypt = require('bcrypt');
//const saltRounds = 10;
const session = require('express-session');
const passport =require("passport");
const passpostLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app =express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));


//setting up express-session
//app.set("trust-proxy", 1)
app.use(session({
    secret : "HereWeCanUseAStringWhatWeWant",
    resave: false,
    saveUninitialized : false,
   // cookie :{secure:true}
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.set("strictQuery", false);
mongoose.connect("mongodb://localhost:27017/secretsDB",{useNewUrlParser: true});

//mongoose.set("useCreateIndex", true);

const userSchema= new mongoose.Schema({
    email: String,
    password: String,
    googleId:String,
    secret:String
});

userSchema.plugin(passpostLocalMongoose);
userSchema.plugin(findOrCreate);

//Encrypting password using mongoose-encryption npm package


//userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


//google 0auth setup
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] })
    );

    app.get("/auth/google/secrets", 
    passport.authenticate("google", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect secrets route
      res.redirect('/secrets');
    });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function(req, res){
    const submittedSecret= req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                foundUser.secret= submittedSecret;

                foundUser.secret= submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });        
});

app.get("/secrets", function(req, res){
    User.find({"secret": {$ne:null}}, function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                res.render("secrets", {userWithSecrets: foundUser});
            }
        }
    });
});

app.get("/logout", function(req, res){
    req.logout(function(err){   // Here deauthentication will be happen...passportDOCS
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });   
    
});

app.post("/register", function(req,res){
    User.register({username: req.body.username}, req.body.password , function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");

            });
        }
            });
        
    });

app.post("/login", function(req, res){
    const user = new User({
        username: req.body.username,
        password:req.body.password
    });
    req.login(user, function(err){
        if(!err){
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }else{
            console.log(err);
        }
    })
});





app.listen(3000, function(){
    console.log("Server started on port 3000");
});