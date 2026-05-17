import fs from 'fs';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const dataBuffer = fs.readFileSync('/Users/pratikpotadar/Downloads/CircuitCrafter_Component_Library.pdf');
pdfParse(dataBuffer).then(function(data) {
    console.log(data.text.substring(0, 3000));
}).catch(console.error);
