const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream('logo.png');
https.get('https://drive.usercontent.google.com/download?id=1L89-Js-em1jLGxANEA6tOCDTiQ1oOzD0&export=download', function(response) {
  if (response.statusCode === 302 || response.statusCode === 303) {
    https.get(response.headers.location, function(redirectResponse) {
      redirectResponse.pipe(file);
    });
  } else {
    response.pipe(file);
  }
});
