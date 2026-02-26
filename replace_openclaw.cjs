const fs = require('fs');
const path = require('path');
const files = fs.readFileSync('files_to_process.txt', 'utf8').trim().split('\n');

let count = 0;
files.forEach(f => {
  if (!f || !fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  const hasReplacement = content.includes('POWERDIRECTOR') || content.includes('PowerDirector') || content.includes('powerdirector');
  if (!hasReplacement) return;

  content = content.replace(/POWERDIRECTOR/g, 'POWERDIRECTOR');
  content = content.replace(/PowerDirector/g, 'PowerDirector');
  content = content.replace(/powerdirector/g, 'powerdirector');

  // Write the file back to powerdirector-source
  fs.writeFileSync(f, content, 'utf8');

  // Copy to personal instance ~/powerdirector
  const dest = path.join('/home/jcavallarojr/powerdirector', f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content, 'utf8');
  count++;
});

console.log('Successfully replaced and copied ' + count + ' files to ~/powerdirector');
