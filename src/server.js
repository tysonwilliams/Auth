const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const User = require('./user.js');

const STATUS_USER_ERROR = 422;
const BCRYPT_COST = 11;

const server = express();
server.use(express.json());
server.use(session({
  secret: 'e5SPiqsEtjexkTj3Xqovsjzq8ovjfgVDFMfUzSmJO21dtXs4re',
  resave: true,
  saveUninitialized: false,
}));

const checkRestricted = (req, res, next) => {
  // get route path
  const path = req.path;
  // if routes contain the String 'restricted' then check if the user is logged in
  if (path.startsWith('/restricted')) {
    auth(req, res, next);
  } else {
    next();
  }
};

server.use(checkRestricted);

/* Sends the given err, a string or an object, to the client. Sets the status
 * code appropriately. */
const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (err && err.message) {
    res.json({ message: err.message, stack: err.stack });
  } else {
    res.json({ error: err });
  }
};

// middleware to check to see if user is logged in
const auth = (req, res, next) => {
  if (req.session.username) {
    User.findOne({ username: req.session.username })
      .then((user) => {
        req.user = user;
        next();
      })
      .catch((err) => {
        console.error('error logging in', err);
      });
  } else {
    res.status(STATUS_USER_ERROR).send({ message: 'You are not logged in' });
  }
};

server.get('/restricted/users', auth, (req, res) => {
  User.find()
    .then((users) => res.status(200).json(users))
    .catch((err) => {
      res.status(500)
      .json({ MESSAGE: 'There was an error getting users' });
    });
});

// TODO: implement routes
server.post('/users', (req, res) => {
  const userInfo = req.body;
  const user = new User(userInfo);
  user
  .save()
  .then((savedUser) => {
    res
    .status(200)
    .json(savedUser);
  })
  .catch((err) => {
    res
    .status(500)
    .json({ MESSAGE: 'There was an error saving the user' });
  });
});

server.post('/log-in', (req, res) => {
  const username = req.body.username.toLowerCase();
  const potentialPW = req.body.passwordHash;
  
  if (!potentialPW || !username) {
    sendUserError('Username and password required', res);
    return;
  }
  
  User
  .findOne({
    username
  })
  .then((foundUser) => {
    foundUser.checkPassword(potentialPW, (err, response) => {
      if (response) {
        req.session.username = username;
        res.status(200).json({ success: true, user: req.session.username });
      } else {
        res
        .status(500)
        .json({ success: false });
      }
    });
  })
  .catch((err) => {
    res
    .status(500)
    .json({ MESSAGE: 'There was an error logging in.', error: 'No user found.' });
  });
});

// TODO: add local middleware to this route to ensure the user is logged in
server.get('/me', auth, (req, res) => {
  // Do NOT modify this route handler in any way.
  res.json(req.user);
});

module.exports = { server };
