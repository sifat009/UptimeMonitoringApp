

const http = require('http');
const url = require('url');
const {StringDecoder} = require('string_decoder');
const config = require('./config');
const https = require('https');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debuglog = util.debuglog('server');

let server = {};


server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
});


server.unifiedServer = (req, res) => {
    let parsedUrl = url.parse(req.url, true);
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g,'');
    let method = req.method.toLowerCase();
    let queryString = parsedUrl.query;
    let header = req.headers;
    let buffer = '';
    let decoder = new StringDecoder('utf-8');
    
    req.on('data', (data) => {
        buffer += decoder.write(data);
    });
    
    req.on('end', () => {
        buffer += decoder.end();
        let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
        chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;
        
        let data = { method, trimmedPath, header, payload: helpers.parseJsonToObject(buffer), queryString };
        chosenHandler(data, (statusCode, payload, contentType = 'json') => {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 303;
            let payloadString = '';

            if(contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof(payload) == 'string' ? payload : '';
            }
            if(contentType == 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof(payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }
            if(contentType == 'favicon') {
                res.setHeader('Content-Type', 'image/x-icon');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'css') {
                res.setHeader('Content-Type', 'text/css');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'png') {
                res.setHeader('Content-Type', 'image/png');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'jpg') {
                res.setHeader('Content-Type', 'image/jpeg');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            if(contentType == 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            
            res.writeHead(statusCode);
            res.end(payloadString);
            
            if(statusCode == 200) {
                debuglog('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} / ${trimmedPath} ${statusCode}`);
            } else {
                debuglog('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} / ${trimmedPath} ${statusCode}`);
            }
        });
        
    });
    
};

server.router = {
    '': handlers.index,
    'public': handlers.public,
    'favicon.ico': handlers.favicon,
    'account/create': handlers.accountCreate,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks
};   

server.init = () => {

    server.httpServer.listen(config.httpPort , () => {
        console.log('\x1b[33m%s\x1b[0m', `server is listening to ${config.httpPort} port and using ${config.envName} environment`);
    });
    
    server.httpsServer.listen(config.httpsPort , () => {
        console.log('\x1b[35m%s\x1b[0m', `server is listening to ${config.httpsPort} port and using ${config.envName} environment`);
    });
    
}

module.exports = server;