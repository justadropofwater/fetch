/**
 * New node file
 */
var crypto = require('crypto');
var cipher = crypto.createCipher('aes-256-cbc','1234567')
var text = "some text to encrypt";
var crypted = cipher.update(text,'utf8','hex')
crypted += cipher.final('hex')
console.log(crypted);