var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// var webhdfsmanager = require('webhdfs');
// var request = require("request");
// let url = "http://45.113.232.133";
// let port = 50070;
// let dir_path = "/Processed2014";
// let path = "/webhdfs/v1/" + dir_path + "?op=LISTSTATUS&user.name=hdfs";
// let full_url = url + ':' + port + path;
//
// var hdfs_file_operations = {
//     getFileData: (fileurl) => {
//         request(full_url, (error, response, body) => {
//             if (!error && response.statusCode === 200) {
//                 let jsonStr = JSON.parse(body);
//                 let fileObject = jsonStr.FileStatuses.FileStatus;
//                 let objLength = Object.entries(fileObject).length;
//                 console.log(fileObject[1]['pathSuffix']);
//
//                 console.log("Number of files in the folder: ", objLength);
//             } else {
//                 console.log("Error in retrieving files");
//             }
//         })
//     }
// }



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(3000, function (){
    console.log("Server Listening on port 3000");
});
module.exports = app;
