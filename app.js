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
    password: String
});

userSchema.plugin(passpostLocalMongoose);

//Encrypting password using mongoose-encryption npm package


//userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields:["password"]});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req, res){
    res.render("home");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});
/*app.get("/secrets", function(req, res){
    res.render("secrets");
});*/
app.get("/submit", function(req, res){
    res.render("submit");
});

app.get("/secrets", function(req, res){
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
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