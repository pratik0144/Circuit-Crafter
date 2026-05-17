const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('/Users/pratikpotadar/Downloads/CircuitCrafter_Component_Library.pdf');
pdf(dataBuffer).then(function(data) {
    console.log(data.text.substring(0, 3000));
}).catch(console.error);
