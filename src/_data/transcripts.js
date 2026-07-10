const fs = require("fs");
const path = require("path");

// Maps episode number -> transcript text. Files are manually maintained
// plain text, one per episode, in ./transcripts/<episode>.txt.
module.exports = () => {
  const dir = path.join(__dirname, "transcripts");
  const transcripts = {};

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".txt")) continue;
    const episodeNumber = file.replace(".txt", "");
    transcripts[episodeNumber] = fs.readFileSync(path.join(dir, file), "utf-8").trim();
  }

  return transcripts;
};
