const { exec } = require("child_process");

exports.convertPdfToWord = (input, output) => {
  exec(`libreoffice --headless --convert-to docx ${input} --outdir ${output}`);
};
