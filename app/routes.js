module.exports = function(app) {

  app.get('/', function(req, res) {
    res.render('index.html');
  });

  app.get('/match', function(req, res) {
    res.render('match.html');
  });
}
