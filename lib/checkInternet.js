const TIMEOUT_INTERNET_CHECK = 5; // seconds
const axios = require('axios');

const checkInternet = (url) => {
  return new Promise((resolve, reject) => {
    console.log('Checking internet');

    const timer = setTimeout(() => {
      reject(new Error('No internet connection'));
    }, TIMEOUT_INTERNET_CHECK*1000);

    axios.get(url, {timeout: TIMEOUT_INTERNET_CHECK*1000}).then((response) => {
      clearTimeout(timer);
      resolve(true);
      console.log('Connected');
    })
    .catch(function (error) {
      if (error.response) {
      } else if (error.request) {
      } else {
        clearTimeout(timer);
        reject(new Error('No internet connection'));
      }
      console.log('problem checking internet')
      clearTimeout(timer);
    });
  });
}

export default checkInternet;
