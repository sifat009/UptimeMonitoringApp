/**
 * Frontend login for application
 */

 const app = {};

 app.config = {
     'sessionToken': false
 };

 app.client = {};

 app.client.request = (headers, path, method, queryStringObject, payload, callback) => {
     headers = typeof(headers) == 'object' && headers !== null ? headers : {};
     path = typeof(path) == 'string' ? path : '/';
     method = typeof(method) == 'string' && ['GET', 'POST', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
     queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
     payload = typeof(payload) == 'object' && payload !== null ? payload : {};
     callback = typeof(callback) == 'function' ? callback : false;

     let requestUrl = path+'?';
     let counter = 0; 
     for(queryKey in queryStringObject) {
         if(queryStringObject.hasOwnProperty(queryKey)) {
             counter++;
             if(counter > 1) {
                 requestUrl += '&';
             }
             requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
         }
     }

     let xhr = new XMLHttpRequest();
     xhr.open(method, requestUrl, true);
     xhr.setRequestHeader('Contet-Type', 'application/json');
     for(headerKey in headers) {
        if(headers.hasOwnProperty(headerKey)) {
            xhr.setRequestHeader(headerKey, headers[headerKey]);
        }
     }
     if(app.config.sessionToken) {
         xhr.setRequestHeader('token', app.config.sessionToken.id);
     }

     xhr.onreadystatechange = () => {
         if(xhr.readyState == XMLHttpRequest.DONE) {
             let statusCode = xhr.status;
             let responseReturned = xhr.responseText;

             if(callback) {
                 try {
                     let parsedResponse = JSON.parse(responseReturned);
                     callback(statusCode, parsedResponse);
                 } catch (error) {
                     callback(statusCode, false);
                 }
             }
         }
     }

     let payloadString = JSON.stringify(payload);
     xhr.send(payloadString);

 }


 app.bindForms = () => {
     document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        let method = this.method.toUpperCase();
        let path = this.action;
        let formId = this.id;
        let payload = {};
        let elements = Array.from(this.elements);
        

        document.querySelector(`#${formId} .formError`).style.display = 'hidden';
        
        elements.forEach(element => {
            if(element.type !== 'submit') {
                let elementValue = element.type === 'checkbox' ? element.checked : element.value;
                payload[element.name] = elementValue;
            }
        });
        
        app.client.request(undefined, path, method, undefined, payload, (statusCode, responsePayload) => {
            if(statusCode !== 200 ) {
                let err = typeof(responsePayload.Error) == 'string' ? responsePayload.Error : 'An error occured in form submission';
                document.querySelector(`#${formId} .formError`).innerHTML = err;
                document.querySelector(`#${formId} .formError`).style.display = 'block';

            } else {
                app.formResponseProcessor(formId, payload, responsePayload);
            }
        })

     })
 }

app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
    let functionToCall = false;
    if(formId == 'accountCreate') {
        console.log('form submission successful');
    }
}

app.init = () => {
    app.bindForms();
}

window.onload = () => {
    app.init();
}









