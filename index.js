const fs = require('fs');
const PDFParser = require("pdf2json");
const COUNTRIES = require('./countries.json');

let completedCount = 0;

// Get PDF File Paths
let pdfPaths;
try {
    console.log('getting PDF files from "put-pdf-files-here" folder');
    pdfPaths = fs.readdirSync('./put-pdf-files-here').filter(path => path.match(/.+\.pdf$/).length > 0);
    console.log(`${pdfPaths.length} PDF files found`);
}
catch(e) {
    console.error(`Error reading PDF files from "put-pdf-files-here" folder. Error: "${e.message}"`);
    process.exit(1);
}

// Parse the PDFs
pdfPaths.forEach((pdfPath, index) => {
    const pdfFullPath = `./put-pdf-files-here/${pdfPath}`;

    const pdfParser = new PDFParser();

    // Error Parsing
    pdfParser.on("pdfParser_dataError", errData => console.error(`Error parsing "${pdfPath}". Error: "errData.parserError"`));

    // Successful Parse
    pdfParser.on("pdfParser_dataReady", pdfData => {

        // Get Texts
        const texts = pdfData.Pages[0].Texts.map(t => t.R[0].T).map(t => decodeURIComponent(t)).map(t => t.trim());

        // Get Name
        let name = '';
        const name1 = texts[0];
        const name2 = texts[1];
        if(COUNTRIES.some(c => name2.match(new RegExp(c, 'i')))) name = name1;
        else name = name1 + name2;

        // Get Date
        let date = '';
        const dateIndex = texts.findIndex((text, index) => (
            (index < texts.length - 2) &&
            text.match(/^[a-zA-Z]{3}$/) &&
            texts[index + 1] == '-' &&
            texts[index + 2].match(/^[0-9]{2}$/)
        ));
        if(dateIndex !== -1) date = texts[dateIndex] + texts[dateIndex + 1] + texts[dateIndex + 2];

        // Copy PDF into results directory with new name
        const newPdfName = date ? `${name} Invoice ${date}` : `${name} Invoice`;
        const newPdfFullPath = `./results/${newPdfName}.pdf`;
        try {
            fs.copyFileSync(pdfFullPath, newPdfFullPath);
            console.log(`[${index + 1}/${pdfPaths.length}] "${name}" generated!`);
            completedCount++;
        }
        catch(e) {
            console.error(`[${pdfPath}] error copying PDF into new file "${newPdfFullPath}". Error: ${e.message}`);
        }
    });

    pdfParser.loadPDF(pdfFullPath);
});

const interval = setInterval(() => {
    if(completedCount == pdfPaths.length) {
        console.log('Done! Press Enter to exit');
        process.stdin.once('data', () => process.exit());
        clearInterval(interval);
    }
}, 500);
