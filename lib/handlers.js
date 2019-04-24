
const _data = require('./data');  
const helpers = require('./helpers');
const config = require('./config');


let handlers = {};


/**
 *  html handlers
 */

handlers.index = (data, callback) => {

    let templateData = {
        'head.title': 'Uptime Monitoring - Made Simple',
        'head.description': 'We offer free, simple uptime monitoring for HTTP/HTTPS sites all kinds. When your site goes down, we\'ll send you a text to let you know',
        'body.class': 'index'
    };

    if(data.method == 'get') {
        helpers.getTemplate('index', templateData, (err, str) => {
            if(!err && str) {
                helpers.addUniversalTemplates(str, templateData, (err, str) => {
                    if(!err && str) {
                        callback(200, str, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                })
            } else {
                callback(500, undefined, 'html');
            }
        })
    } else {
        callback(405, undefined, 'html');
    }
}

handlers.accountCreate = (data, callback) => {

    let templateData = {
        'head.title': 'Create an account',
        'head.description': 'Singup is easy and only takes few seconds',
        'body.class': 'accountCreate'
    };

    if(data.method == 'get') {
        helpers.getTemplate('accountCreate', templateData, (err, str) => {
            if(!err && str) {
                helpers.addUniversalTemplates(str, templateData, (err, str) => {
                    if(!err && str) {
                        callback(200, str, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                })
            } else {
                callback(500, undefined, 'html');
            }
        })
    } else {
        callback(405, undefined, 'html');
    }
}


handlers.favicon = (data, callback) => {
    if(data.method == 'get') {
        helpers.getStaticAsset('favicon.ico', (err, data) => {
            if(!err && data) {
                callback(200, data, 'favicon');
            } else {
                callback(500);
            }
        })
    } else {
        callback(405);
    }
}

handlers.public = (data, callback) => {
    if(data.method == 'get') {
        let trimmedAssetName = data.trimmedPath.replace('public/','').trim();
        if(trimmedAssetName.length > 0) {
            helpers.getStaticAsset(trimmedAssetName, (err, data) => {
                if(!err && data) {
                    let fileTypes = ['.css', '.jpg', '.ico', '.png'];
                    let getContentType = fileTypes.filter(fileType => trimmedAssetName.includes(fileType));
                    let contentType = getContentType.length > 0 ? getContentType[0] : 'plain';
                    contentType = contentType.replace('.','');
                    if(contentType == 'ico') contentType = 'favicon';
                    
                    callback(200, data, contentType);
                } else {
                    callback(404);
                }
            })
        } else {
            callback(404);
        }
    } else {
        callback(405);
    }
}








/**
 *  json API handlers
 */

// users handler
handlers.users = (data, callback) => {
    let acceptedMethods = ['get', 'post', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._users = {};

handlers._users.get = (data, callback) => {
    let phone = typeof(data.queryString.phone) == 'string' && data.queryString.phone.trim().length == 10
                    ? data.queryString.phone.trim() : false;
    let token = typeof(data.header.token) == 'string' && data.header.token.trim().length == 20
                    ? data.header.token.trim() : false;
    if(phone) {
        
        handlers._tokens.varifyToken(token, phone, (tokenIsVarified) => {
            if(tokenIsVarified) {
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) {
                        delete userData.password;
                        callback(200, userData);
                    } else {
                        callback(404, {'Error': 'Sorry could not find any data for this phone number'});
                    }
                })
            } else {
                callback(400, {"Error": "Missing token in header or expired"});
            }
        })
        
    } else {
        callback(404, {"Error": "Missing required field"});
    }
}

handlers._users.post = (data, callback) => {
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0
                        ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0
                        ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10
                        ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0
                        ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true
                        ? true : false;
    
    if(firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (err, data) => {
            if(err) {
                let hashedPassword = helpers.hash(password);
                if(hashedPassword) {
                    let userObject = {firstName, lastName, phone, hashedPassword, tosAgreement: true};
                    _data.create('users', phone, userObject, (err) => {
                        if(!err) {
                            callback(200);
                        } else {
                            callback(err);
                        }
                    })                    
                } else {
                    callback(400, {'Error': 'Sorry could not hash the password'});
                }
            } else {
                callback(400, {'Error': 'A user with that phone number already exists'});
            }
        })
    } else {
        callback(404, {'Error': 'Missing required fields'});
    }


}

handlers._users.put = (data, callback) => {
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10
                    ? data.payload.phone.trim() : false;
    let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0
                    ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0
                    ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0
                    ? data.payload.password.trim() : false; 
    if(phone) {
        
        if(firstName || lastName || password) {
            let token = typeof(data.header.token) == 'string' && data.header.token.trim().length == 20
                            ? data.header.token.trim() : false;

            handlers._tokens.varifyToken(token, phone, (tokenIsVarified) => {
                if(tokenIsVarified) {
                    _data.read('users', phone, (err, userData) => {
                        if(!err && userData) {
                            firstName && (userData.firstName = firstName);
                            lastName && (userData.lastName = lastName);
                            password && (userData.password = helpers.hash(password));
        
                            _data.update('users', phone, userData, (err) => {
                                if(!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(400, {'Error': 'Sorry could not update'});
                                }
                            })
                        } else {
                            callback(404, {'Error': 'The number is not registered'});
                        }
                    })    
                } else {
                    callback(400, {"Error": "Missing token in header or expired"});
                }
            })                
        } else {
            callback(404, {'Error': 'Missing required field'});
        }
    } else {
        callback(404, {'Error': 'Invalid phone number'});
    }
}

handlers._users.delete = (data, callback) => {
    let phone = typeof(data.queryString.phone) == 'string' && data.queryString.phone.trim().length == 10
                    ? data.queryString.phone.trim() : false;
    let token = typeof(data.header.token) == 'string' && data.header.token.trim().length == 20
                    ? data.header.token.trim() : false;

    if(phone) {
        handlers._tokens.varifyToken(token, phone, (tokenIsVarified) => {
            if(tokenIsVarified) {
                _data.read('users', phone, (err, userData) => {
                    if(!err && userData) {
                        _data.delete('users', phone, (err) => {
                            if(!err) {
                                let checks = typeof(userData.checks) == 'object'
                                             && userData.checks instanceof Array
                                             ? userData.checks : [];
                                let checksToDelete = checks.length;
                                if(checksToDelete > 0) {
                                    let checkDeleted = 0;
                                    let deletionError = false;

                                    checks.forEach(check => {
                                        _data.delete('checks', check, (err) => {
                                            if(err) {
                                                deletionError = true;
                                            }
                                            checkDeleted++;
                                            if(checkDeleted == checksToDelete) {
                                                if(!deletionError) {
                                                    callback(200);
                                                } else {
                                                    callback(403, {'Error': 'Error encountered while deleteing checks'});
                                                }
                                            }
                                        })
                                    });
                                } else {
                                    callback(200);
                                }
                            } else {
                                console.log(err);
                                callback('Sorry could not delete the file');
                            }
                        })
                    } else {
                        callback(403, {'Error': 'Sorry could not find the user'});
                    }
                })          
            } else {
                callback(400, {"Error": "Missing token in header or expired"});
            }
        })       
    } else {
        callback(404, {'Error': 'Missing required field'});
    }
}

// Tokens handler
handlers.tokens = (data, callback) => {
    let acceptedMethods = ['get', 'post', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._tokens = {};

handlers._tokens.post = (data, callback) => {
    let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10
                    ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0
                    ? data.payload.password.trim() : false;    
    if(phone && password) {
        _data.read('users', phone, (err, userData) => {
            if(!err && userData) {
                let hashedPassword = helpers.hash(password);
                if(hashedPassword == userData.hashedPassword) {
                    let tokenId = helpers.generateRandomString(20);
                    let expires = Date.now() + 1000 * 60 * 60;
                    let tokenObject = {tokenId, phone, expires};
                    if(tokenId) {
                        _data.create('tokens', tokenId, tokenObject, (err) => {
                            if(!err) {
                                callback(200, tokenObject)
                            } else {
                                callback(400, {'Error': 'Sorry could not create the token file'});
                            }
                        })
                    } else {
                        console.log('Could not create the token id');
                        callback(400, {'Error': 'Sorry could not create the token id'});
                    }
                } else {
                    callback(400, {'Error': 'Password did not matched'});
                }
            } else {
                callback(400, {'Error': 'Wrong phone number or password'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }

}

handlers._tokens.get = (data, callback) => {
    let tokenId = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20
                    ? data.queryString.id.trim() : false;
    if(tokenId) {
        _data.read('tokens', tokenId, (err, tokenData) => {
            if(!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404);
            }
        })
    } else {
        callback(400, {"Error": "Missing required field"});
    }
}
                
handlers._tokens.put = (data, callback) => {
    let tokenId = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20
                    ? data.payload.id.trim() : false;
    let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true
                    ? data.payload.extend : false;
    if(tokenId && extend) {
        _data.read('tokens', tokenId, (err, tokenData) => {
            if(!err && tokenData) {
                if(tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', tokenId, tokenData, (err) => {
                        if(!err) {
                            callback(200);
                        } else {
                            callback(500, {"Error": "Could not update the token"});
                        }
                    })
                } else {
                    callback(400, {"Error": "Token has already expired and can not be extended"});
                }         
            } else {
                callback(404, {"Error": "Invalid token"});
            }
        })
    } else {
        callback(400, {"Error": "Missing required fields"});
    }
                    
}

handlers._tokens.delete = (data, callback) => {
    let tokenId = typeof(data.queryString.id) == 'string' && data.queryString.id.trim().length == 20
                    ? data.queryString.id.trim() : false;
    if(tokenId) {
        _data.delete('tokens', tokenId, (err) => {
            if(!err) {
                callback(200);
            } else {
                callback(400, {"Error": "Could not delete the token"});
            }
        })
    } else {
        callback(404, {"Error": "Missing required field"});
    }
}

handlers._tokens.varifyToken = (tokenId, phone, callback) => {
    _data.read('tokens', tokenId, (err, tokenData) => {
        if(!err && tokenData) {
            if(tokenData.phone == phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        } 
    })
}

// checks handler
handlers.checks = (data, callback) => {
    let acceptedMethods = ['get', 'post', 'put', 'delete'];
    if(acceptedMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, callback);
    } else {
        callback(405);
    }    
};

handlers._checks = {};

handlers._checks.post = (data, callback) => {
    let protocol = typeof(data.payload.protocol) == 'string' 
                     && ['http', 'https'].indexOf(data.payload.protocol) > -1
                     ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string'
                && data.payload.url.trim().length > 0
                ? data.payload.url.trim() : false;
    let method = typeof(data.payload.method) == 'string'
                   && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1
                   ? data.payload.method : false; 
    let successCodes = typeof(data.payload.successCodes) == 'object'
                         && data.payload.successCodes instanceof Array
                         && data.payload.successCodes.length > 0
                         ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number'
                           && data.payload.timeoutSeconds % 1 == 0
                           && data.payload.timeoutSeconds >= 1
                           && data.payload.timeoutSeconds <= 5
                           ? data.payload.timeoutSeconds : false; 
                         
    if(protocol && url && method && successCodes && timeoutSeconds) {
        let tokenId = typeof(data.header.token) == 'string'
                        && data.header.token.length == 20
                        ? data.header.token : false;
        _data.read('tokens', tokenId, (err, tokenData) => {
            if(!err && tokenData) {
                _data.read('users', tokenData.phone, (err, userData) => {
                    if(!err && userData) {
                        let checks = typeof(userData.checks) == 'object'
                                        && userData.checks instanceof Array
                                        ? userData.checks : [];
                        if(checks.length < config.maxCheck) {
                            let checkId = helpers.generateRandomString(20);
                            let checkObject = {checkId, phone: userData.phone, protocol, url, method, successCodes, timeoutSeconds};
                            _data.create('checks', checkId, checkObject, (err) => {
                                if(!err) {
                                    userData.checks = checks;
                                    userData.checks.push(checkId);
                                    _data.update('users', userData.phone, userData, (err) => {
                                        if(!err) {
                                            callback(200, checkObject);
                                        } else {
                                            callback(400);
                                        }
                                    })
                                } else {
                                    callback(400, {"Error": "Sorry could not create the check"});
                                }
                            })
                        } else {
                            callback(404, {"Error": "Maximum limit of checks reached("+config.maxCheck +"checks)"});
                        }    
                    } else {
                        callback(403);
                    }
                })                
            } else {
                callback(403);
            }
        })
    } else {
        callback(400, {"Error": "Missing required fields"});
    }
};

handlers._checks.get = (data, callback) => {
    let checkId = typeof(data.queryString.id) == 'string' 
                    && data.queryString.id.trim().length == 20
                    ? data.queryString.id.trim() : false;
    if(checkId) {
        _data.read('checks', checkId, (err, checkData) => {
            if(!err && checkData) {
                let token = typeof(data.header.token) == 'string'
                             && data.header.token.trim().length == 20
                             ? data.header.token.trim() : false;
                handlers._tokens.varifyToken(token, checkData.phone, (tokenIsVarified) => {
                    if(tokenIsVarified) {
                        callback(200, checkData);
                    } else {
                        callback(400, {'Error': 'Sorry token is wrong or expired'});
                    }
                })
            } else {
                callback(403, {'Error': 'Wrong check id'});
            }
        })
    } else {
        callback(400, {'Error': 'Missing required field'});
    }

}

handlers._checks.put = (data, callback) => {
    let checkId = typeof(data.payload.id) == 'string' 
                    && data.payload.id.trim().length == 20
                    ? data.payload.id.trim() : false;
    let protocol = typeof(data.payload.protocol) == 'string' 
                     && ['http', 'https'].indexOf(data.payload.protocol) > -1
                     ? data.payload.protocol : false;
    let url = typeof(data.payload.url) == 'string'
                && data.payload.url.trim().length > 0
                ? data.payload.url.trim() : false;
    let method = typeof(data.payload.method) == 'string'
                   && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1
                   ? data.payload.method : false; 
    let successCodes = typeof(data.payload.successCodes) == 'object'
                         && data.payload.successCodes instanceof Array
                         && data.payload.successCodes.length > 0
                         ? data.payload.successCodes : false;
    let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number'
                           && data.payload.timeoutSeconds % 1 == 0
                           && data.payload.timeoutSeconds >= 1
                           && data.payload.timeoutSeconds <= 5
                           ? data.payload.timeoutSeconds : false;
    if(checkId) {
        if(protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', checkId, (err, checkData) => {
                if(!err && checkData) {
                    let token = typeof(data.header.token) == 'string'
                          && data.header.token.trim().length == 20
                          ? data.header.token.trim() : false;

                    handlers._tokens.varifyToken(token, checkData.phone, (tokenIsVarified) => {
                        if(tokenIsVarified) {
                            protocol && (checkData.protocol = protocol);
                            url && (checkData.url = url);
                            method && (checkData.method = method);
                            successCodes && (checkData.successCodes = successCodes);
                            timeoutSeconds && (checkData.timeoutSeconds = timeoutSeconds);
                            _data.update('checks', checkId, checkData, (err) => {
                                if(!err) {
                                    callback(200);
                                } else {
                                    callback(400, {'Error': 'Sorry could not update'});
                                }
                            })
                        } else {
                            callback(400, {'Error': 'Token is missing form header or expired'});
                        }
                    })
                } else {
                    callback(404, {'Error': 'Wrong check id'});
                }
            })
        } else {
            callback(404, {'Error': 'Missing required fields'});
        }
    } else {
        callback(404, {'Error': 'Missing required field'});
    }
}

handlers._checks.delete = (data, callback) => {
    let checkId = typeof(data.queryString.id) == 'string' 
                    && data.queryString.id.trim().length == 20
                    ? data.queryString.id.trim() : false;
    if(checkId) {
        _data.read('checks', checkId, (err, checkData) => {
            if(!err && checkData) {
                let token = typeof(data.header.token) == 'string'
                              && data.header.token.trim().length == 20
                              ? data.header.token.trim() : false;
                handlers._tokens.varifyToken(token, checkData.phone, (tokenIsVarified) => {
                    if(tokenIsVarified) {
                        _data.delete('checks', checkId, (err) => {
                            if(!err) {
                                _data.read('users', checkData.phone, (err, userData) => {
                                    if(!err && userData) {
                                        let checks = typeof(userData.checks) == 'object'
                                                        && userData.checks instanceof Array
                                                        ? userData.checks : [];
                                        let checkPosition = checks.indexOf(checkId);
                                        if(checkPosition > -1) {
                                            checks.splice(checkPosition, 1);
                                            _data.update('users', checkData.phone, userData, (err) => {
                                                if(!err) {
                                                    callback(200);
                                                } else {
                                                    callback(400, {'Error': 'Sorry could not update user information'});
                                                }
                                            })
                                        } else {
                                            callback(400, {'Error': 'Sorry could not find the check in user data'});
                                        }
                                    } else {
                                        callback(400, {'Error': 'Sorry could not find user'});
                                    }
                                })
                            } else {
                                callback(400, {'Error': 'Could not delete the check'});
                            }
                        })
                    } else {
                        callback(400, {'Error': 'Sorry token missing or invalid'});
                    }
                })
            } else {
                callback(400, {'Error': 'Wrong check id '});
            }
        })
    } else {    
        callback(403, {'Error': 'Missing required field'});
    }
}

// ping handler
handlers.ping = (data, callback) => {
    callback(200);
};

// not found handler
handlers.notFound = (data, callback) => {
    callback(404);
};




module.exports = handlers;