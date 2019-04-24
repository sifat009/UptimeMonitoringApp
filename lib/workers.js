
const path = require('path');
const url = require('url');
const http = require('http');
const https = require('https');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');
const util = require('util');
const debuglog = util.debuglog('workers');


const workers = {};


workers.getAllChecks = () => {
    _data.list('checks', (err, checks) => {
        if(!err && checks && checks.length > 0) {
            checks.forEach(check => {
                _data.read('checks', check, (err, originalCheckData) => {
                    if(!err && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        debuglog("Sorry an error occured during fetching data for the checks");
                    }
                })
            });
        } else {
            debuglog("Couldn't find any check to perform");
        }
    })
}

workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null 
                          ? originalCheckData : false;

    originalCheckData.checkId = typeof(originalCheckData.checkId) == 'string'
                                  && originalCheckData.checkId.trim().length == 20
                                  ? originalCheckData.checkId.trim() : false;
    
    originalCheckData.phone = typeof(originalCheckData.phone) == 'string'
                                  && originalCheckData.phone.trim().length == 10
                                  ? originalCheckData.phone.trim() : false;
    
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' 
                                   && ['http', 'https'].indexOf(originalCheckData.protocol) > -1
                                   ? originalCheckData.protocol : false;

    originalCheckData.url = typeof(originalCheckData.url) == 'string'
                              && originalCheckData.url.trim().length > 0
                              ? originalCheckData.url.trim() : false;

    originalCheckData.method = typeof(originalCheckData.method) == 'string'
                                 && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1
                                 ? originalCheckData.method : false;

    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object'
                                       && originalCheckData.successCodes instanceof Array
                                       && originalCheckData.successCodes.length > 0
                                       ? originalCheckData.successCodes : false;

    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number'
                                        && originalCheckData.timeoutSeconds % 1 == 0
                                        && originalCheckData.timeoutSeconds >= 1
                                        && originalCheckData.timeoutSeconds <= 5
                                        ? originalCheckData.timeoutSeconds : false;     

    // this two can't be set if the check is never checked
    originalCheckData.state = typeof(originalCheckData.state) == 'string'
                                 && ['up', 'down'].indexOf(originalCheckData.state) > -1
                                 ? originalCheckData.state : 'down'; 

    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number'
                                      && originalCheckData.lastChecked > 0
                                      ? originalCheckData.lastChecked : false;
                                      
    if(originalCheckData.checkId && 
        originalCheckData.phone &&
        originalCheckData.protocol &&
        originalCheckData.url && 
        originalCheckData.method && 
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds) {
            workers.performCheck(originalCheckData);
    } else {
        debuglog("Error: One of the check isn't formatted property, skipped it");
    }
                                
}

workers.performCheck = (originalCheckData) => {
    const checkOutcome = {
        'error': false,
        'responseCode': false
    }
    let outcomeSent = false;
    let parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
    let hostName = parsedUrl.hostname;
    let path = parsedUrl.path;

    const requestDetails = {
        'protocol': originalCheckData.protocol+':',
        'hostname': hostName,
        'method': originalCheckData.method,
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    }
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    let req = _moduleToUse.request(requestDetails, (res) => {
        checkOutcome.responseCode = res.statusCode;
        
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', (err) => {
        checkOutcome.error = {
            'error': true,
            'value': err
        }
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    })
    
    req.on('timeout', (err) => {
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        }
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    })

    req.end();
}


workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    let checkTime = Date.now();
    let state = !checkOutcome.error
                  && checkOutcome.responseCode
                  && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
                  ? 'up': 'down';
    let alertWarranted = originalCheckData.lastChecked
                           && originalCheckData.state !== state
                           ? true : false;
    
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = checkTime;

    workers.log(newCheckData,state, checkOutcome, alertWarranted, checkTime);
    
    _data.update('checks', newCheckData.checkId, newCheckData, (err) => {
        if(!err) {
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debuglog("Check state not changed so no alert needed");
            }
        } else {
            debuglog("Sorry couldn't update one of the check data");
        }
    })
}

workers.log = (newCheckData,state, checkOutcome, alertWarranted, checkTime) => {
    const logData = {newCheckData,state, checkOutcome, alertWarranted, checkTime};
    const logString = JSON.stringify(logData);
    const logFileName = newCheckData.checkId;

    _logs.append(logFileName, logString, (err) => {
        if(!err) {
            debuglog("logging file succeeded");
        } else {
            debuglog("Couldn't append the file");
        }
    })
}


workers.alertUserToStatusChange = (newCheckData) => {
    let msg = `Alert: the status of ${newCheckData.method}, ${newCheckData.protocol}://${newCheckData.url} is : ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.phone, msg, (err) => {
        if(!err) {
            debuglog("Success: Send alert to user", msg);
        } else {
            debuglog("Couldn't send alert to user via sms");
        }
    })
} 

workers.rotateLogs = () => {
    _logs.list(false, (err, logs) => {
        if(!err && logs && logs.length > 0) {
            logs.forEach(log => {
                let logId = log.replace('.log', '');
                let newfileId = logId+'-'+Date.now();
                _logs.compress(logId, newfileId, (err) => {
                    if(!err) {
                        _logs.truncate(logId, (err) => {
                            if(!err) {
                                debuglog('\x1b[32m%s\x1b[0m', "success in truncating log files");
                            } else {
                                debuglog('\x1b[31m%s\x1b[0m', "Error truncating log file");
                            }
                        })
                    } else {
                        debuglog("Error in compress");
                    }
                })
            })
        } else {
            debuglog("Sorry couldn't find any log file to rotate");
        }
    })
}

workers.logRotationLoop = () => {
    setInterval(workers.rotateLogs, 1000*60*60*24);
}

workers.loop = () => {
    setInterval(workers.getAllChecks, 1000*60);
}

workers.init = () => {
    console.log('\x1b[34m%s\x1b[0m', `Background workers are running`);
    workers.getAllChecks();
    workers.loop();
    workers.rotateLogs();
    workers.logRotationLoop();

}


module.exports = workers;