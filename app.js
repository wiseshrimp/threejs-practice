var express = require('express');
var app = new express();
var morgan = require('morgan');
var bodyParser = require('body-parser');
var nunjucks = require('nunjucks');
var path = require('path');

var rootPath = path.join(__dirname + '/js');
var modelPath = path.join(__dirname + '/models');
var port = 8080;

var server = app.listen(port, function (err) {
    if (err) throw err; 
});

app.engine('html', nunjucks.render);
app.set('view engine', 'html');
nunjucks.configure('views', { noCache: true });

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(rootPath));
app.use(express.static(modelPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/views/index.html'))
})

module.exports = app;