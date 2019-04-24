

let environments = {}; 

environments.staging = {
    'httpPort': 200,
    'httpsPort': 201,
    'envName': 'staging',
    'secretKey': 'This is a secret',
    'maxCheck': 5,
    'twilio': {
        'accountSid' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone' : '+15005550006'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'Simple JS',
        'yearCreated': '2019',
        'baseUrl': 'http://localhost:200'
    }
};

environments.production = {
    'httpPort': 100,
    'httpsPort': 101,
    'envName': 'production',
    'secretKey': 'This is a secret',
    'maxCheck': 5,
    'twilio': {
        'accountSid' : 'AC04a5c90adabd6d48b6fbfa66be2977fa',
        'authToken' : '2fb7449dc138fe41edfdf7f651ac40f3',
        'fromPhone' : '+8801675545631'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'Simple JS',
        'yearCreated': '2019',
        'baseUrl': 'http://localhost:100'
    }
};

let exportEnvironment = environments[process.env.NODE_ENV]
                         && environments[(process.env.NODE_ENV).toLowerCase()] || environments.staging;

module.exports = exportEnvironment;