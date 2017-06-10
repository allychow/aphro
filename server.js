// server.js
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var flash = require('connect-flash');
var http = require("http");
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var querystring = require('querystring');
var request = require('request'); // "Request" library

var app = express();

app.use(express.static(__dirname + '/views'))
  .use(cookieParser());
app.engine('html', require('ejs').renderFile);

app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

/*
 * SPOTIFY AUTH
 */
var client_id = '7631b015e54f4cf0b6e2800dbf6e0753'; // Your client id
var client_secret = '0e0907fcc6b84b5e8793bece2b17c15e'; // Your secret
var redirect_uri = 'http://localhost:8080/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

var token1 = '';

app.get('/songs', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  token1 = 'BQD0hAGgE8WJIcGW0LernwL-4YfVhCIJg_2QLc01rKqy3L6l6dU8lMTQcu1nCTyNKOXcWELX-hAur37BzlULZpU6p8WAxxSbMSIvBv2gzRFiDVMleMIUnauWapHXCxMf8HoGBDaG0GkblgRvzOK_2HvINEeEMaMNFI1yNMIra6OOPoUqRusWONwbckyRFnrYwZ-qqP8ILTAELxRI2D_3X00Z-BxCnnHCMZ8UGIl6KZBOYGf9KBcBfYkXOk5RruWh_ylM9p0';
  //console.log(token1);

  // your application requests authorization
  var scope = 'user-library-read';
  var options = {
    url: 'https://api.spotify.com/v1/me/tracks',
    headers: {
      'Authorization': 'Bearer ' + token1,
      'response_type': 'code',
      'client_id': client_id,
      'scope': scope,
      'state': state
    },
    json: true
  };

  request.get(options, function(error, req, body) {
    console.log(body);
    res.send(body);
  });

});


app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: {
            'Authorization': 'Bearer ' + access_token
          },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
          token1 = access_token;
          console.log(token1);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});
/*
 * END SPOTIFY AUTH
 */

//app.set('view engine', 'ejs'); // set up ejs for templating
//app.use('/assets', express.static('assets'));

// routes ======================================================================
require('./app/routes.js')(app);

// launch ======================================================================
app.listen(port);
console.log('The magic happens on port ' + port);
