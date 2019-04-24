


const crypto = require('crypto');
const config = require('./config');
const queryString = require('querystring');
const https = require('https');
const fs = require('fs');
const path = require('path');

let helpers = {};

helpers.hash = (str) => {
    if(typeof(str) == 'string' && str.trim().length > 0) {
        return crypto.createHmac('sha256', config.secretKey).update(str).digest('hex');
    } else {
        return false;
    }
}

helpers.parseJsonToObject = (str)=> {
    try {
        return obj = JSON.parse(str);
    } catch (e) {
        return {};
    }
}

helpers.generateRandomString = (strlen) => {
    strlen = typeof(strlen) == 'number' && strlen > 0 ? strlen : false;
    if(strlen) {
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomString = '';
        for(let i = 0; i < strlen; i++) {
            let randomCharacter = possibleCharacters[Math.floor(Math.random() * possibleCharacters.length)];
            randomString += randomCharacter;
        }
        return randomString;
    } else {
        return false;
    }
}

helpers.sendTwilioSms = (phone, msg, callback) => {
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600  ? msg.trim() : false;
    if(phone && msg) {
        let payload = {
            'From': config.twilio.fromPhone,
            'To': '+1'+phone,
            'Body': msg
        }

        let stringPayload = queryString.stringify(payload);

        let requestDetails = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
              'Content-Type' : 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(stringPayload)
            }
        }

        let req = https.request(requestDetails, (res) => {
            let status = res.statusCode;
            if(status == 200 || status == 201) {
                callback(false);
            } else {
                callback(`status code returned ${status}`);
            }
        })

        req.on('error', (err) => {
            callback(err);
        })

        req.write(stringPayload);

        req.end();
        
    } else {
        callback('Invalid phone number or msg');
    }
}

helpers.getTemplate = (templateName, data = {}, callback) => {
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data != null ? data : {};

    if(templateName) {
        let templateDir = path.join(__dirname, './../templates/');
        fs.readFile(templateDir + templateName + '.html', 'utf8', (err, str) => {
            if(!err && str && str.length > 0) {
                str = helpers.interpolate(str, data);
                callback(false, str);
            } else {
                callback("No template found");
            }
        } )
    } else {
        callback('A valid template name is not specified');
    }
}

helpers.addUniversalTemplates = (str, data, callback) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data != null ? data : {};

    helpers.getTemplate('_header', data, (err, headerString) => {
        if(!err && headerString) {
            helpers.getTemplate('_footer', data, (err, footerString) => {
                if(!err && footerString) {
                    let fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback("Couldn't find the footer string");
                }
            })
        } else {
            callback("Couldn't find the header string");
        }
    })

} 


helpers.interpolate = (str, data) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data != null ? data : {};

    for(let keyName in config.templateGlobals) {
        if(config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.'+keyName] = config.templateGlobals[keyName];
        }
    }

    for(let key in data) {
        if(data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
            let find = '{'+key+'}';
            let replace = data[key];
            str = str.replace(find, replace);
        }
    }

    return str;
}


helpers.getStaticAsset = (fileName, callback) => {
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;
    if(fileName) {
        let publicDir = path.join(__dirname, './../public/');
        fs.readFile(publicDir+fileName, (err, data) => {
            if(!err && data) {
                callback(false, data);
            } else {
                callback(404, "Couldn't read from the file");
            }
        })
    } else {
        callback("Sorry couldn't find the file requested");
    }
}





module.exports = helpers;



