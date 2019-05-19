var express = require('express');
var router = express.Router();
var webhdfsmanager = require('webhdfs');
var request = require("request");

//hdfs parameters
let url = "http://45.113.232.133";
let port = 50070;
let dir_path = "/Processed2014";
let path = "/webhdfs/v1/" + dir_path + "?op=LISTSTATUS&user.name=hdfs";
let full_url = url + ':' + port + path;
let hdfs = webhdfsmanager.createClient({
    user: "ubuntu",
    host: "45.113.232.133",
    port: 50070, //change here if you are using different port
    path: "webhdfs/v1/"
});

//function to fetch files from hdfs
var hdfs_file_operations = {
    getFileData: (fileurl) => {
        let hdfs_file_name = null;
        request(full_url, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                let jsonStr = JSON.parse(body);
                let fileObject = jsonStr.FileStatuses.FileStatus;
                let objLength = Object.entries(fileObject).length;
                console.log(fileObject[1]['pathSuffix']);
                let hdfs_file_name = full_url+'/'+fileObject[1]['pathSuffix'];
                let path1 = "Processed2014/" + fileObject[1]['pathSuffix'];
                //let path2 = "http://45.113.232.133:50075/webhdfs/v1/Processed2014/part-00000-8d909489-d7cc-4374-93c4-b8d275d4a130.csv";
                console.log("path----->"+ path1);
                console.log("Number of files in the folder: ", objLength);
                if(hdfs_file_name !== null){
                    let remoteFileStream = hdfs.createReadStream(path1);
                    remoteFileStream.on("error", function onError(err) { //handles error while read
                        // Do something with the error
                        console.log("...error: ", err);
                    });
                    let dataStream = [];
                    let outputStream = [];
                    remoteFileStream.on("data", function onChunk(chunk) { //on read success
                        // Do something with the data chunk
                        dataStream.push(chunk);
                        //console.log('..chunk..',chunk);
                        dataStream.map( (chunk) =>{
                            outputStream.push(chunk.toString());

                        });
                        // console.log('output Stream',outputStream);
                        return outputStream;
                    });
                }
            } else {
                console.log("Error in retrieving files");
            }
        });
    }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  hdfs_file_operations.getFileData(full_url);
  res.render('index', { title: 'Air Pollution Analytics App' });
});

module.exports = router;
