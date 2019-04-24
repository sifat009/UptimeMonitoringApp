
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const lib = {}
lib.basedir = path.join(__dirname, '/../.logs/');

lib.append = (fileName, logData, callback) => {
    fs.open(lib.basedir+fileName+'.log', 'a', (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, logData+'\n', (err) => {
                if(!err) {
                    fs.close(fileDescriptor, (err) => {
                        if(!err) {
                            callback(false);
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    })
}

lib.list = (addZipFiles, callback) => {
    fs.readdir(lib.basedir, (err, files) => {
        if(!err && files && files.length > 0) {
            let filesList = [];
            files.forEach(file => {
                if(file.indexOf('.log') > -1) {
                    filesList.push(file.replace('.log', ''));
                }
                if(file.indexOf('.gz.b64') > -1 && addZipFiles) {
                    filesList.push(file.replace('.gz.b64', ''));
                }
            })
            callback(false, filesList);
        } else {
            callback(err);
        }
    })
}

lib.compress = (fileName, newFileName, callback) => {
    fileName = fileName + '.log';
    newFileName = newFileName + '.gz.b64';
    fs.readFile(lib.basedir+fileName, 'utf8', (err, fileContent) => {
        if(!err && fileContent) {
            zlib.gzip(fileContent, (err, buffer) => {
                if(!err && buffer) {
                    fs.open(lib.basedir+newFileName, 'wx', (err, fileDescriptor) => {
                        if(!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('utf8'), (err) => {
                                if(!err) {
                                    fs.close(fileDescriptor, (err) => {
                                        if(!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    })
                                } else {
                                    callback(err);
                                }
                            })
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    })
}


lib.decompress = (fileName, callback) => {
    fileName = fileName+'.gz.b64';
    fs.readFile(lib.basedir+fileName, 'utf8', (err, fileContent) => {
        if(!err && fileContent) {
            let buffer = Buffer.from(fileContent, 'base64');
            zlib.unzip(buffer, (err, outputBuffer) => {
                if(!err && outputBuffer) {
                    let str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    })
}

lib.truncate = (fileName, callback) => {
    fileName = fileName + '.log';
    fs.truncate(lib.basedir + fileName, (err) => {
        if(!err) {
            callback(false);
        } else {
            callback(err);
        }
    })
}

module.exports = lib;