// Dependencies 
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

let lib = {};

lib.basedir = path.join(__dirname, '/../.data/');

// create new file
lib.create = (dir, fileName, data, callback) => {
    fs.open(lib.basedir+dir+ '/'+ fileName+ '.json', 'wx', (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            let dataString = JSON.stringify(data);
            fs.writeFile(fileDescriptor, dataString, (err) => {
                if(!err) {
                    fs.close(fileDescriptor, (err) => {
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    })    
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Could not create new file, it may already exists');
        }
    })
}

// read data form file
lib.read = (dir, fileName, callback) => {
    fs.readFile(lib.basedir+dir+'/'+fileName+'.json', 'utf-8', (err, data) => {
        if(!err && data) {
            callback(err, helpers.parseJsonToObject(data));
        } else {
            callback(err, data);
        }
    })
}

// update data
lib.update = (dir, fileName, data, callback) => {
    fs.open(lib.basedir+dir+'/'+fileName+'.json', 'r+', (err, fileDescriptor) => {
        if(!err && fileDescriptor) {
            let dataString = JSON.stringify(data);
            fs.truncate(lib.basedir+dir+'/'+fileName+'.json', (err) => {
                if(!err) {
                    fs.writeFile(fileDescriptor, dataString, (err) => {
                        if(!err) {
                            fs.close(fileDescriptor, (err) => {
                                if(!err) {
                                    callback(false);
                                } else {
                                    callback('Sorry problem in closing file');
                                }
                            })
                        } else {
                            callback('sorry could not write in the update file.');
                        }
                    })
                } else {
                    callback('sorry could not truncate the file.');
                }
            })
        } else {
            callback('Sorry could not open file for editing');
        }
    })
}

// Delete data
lib.delete = (dir, fileName, callback) => {
    fs.unlink(lib.basedir+dir+'/'+fileName+'.json', (err) => {
        if(!err) {
            callback(false);
        } else {
            callback('Error deleting file');
        }
    })
}

// List all the files from a directory
lib.list = (dir, callback) => {
    fs.readdir(lib.basedir+dir+'/', (err, data) => {
        if(!err && data && data.length > 0) {
            const trimmedFileNames = data.map(fileName => fileName.replace('.json', ''));
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    })
}

module.exports = lib;