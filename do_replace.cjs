const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync('files_to_process.txt', 'utf8').trim().split('\n');
let replaced = 0, skippedExists = 0, skippedContent = 0;
for (const f of lines) {
    if (!fs.existsSync(f)) {
        skippedExists++;
        continue;
    }
    const c = fs.readFileSync(f, 'utf8');
    if (!c.includes('POWERDIRECTOR') && !c.includes('PowerDirector') && !c.includes('powerdirector')) {
        skippedContent++;
        continue;
    }

    // Perform replacement
    let newC = c.replace(/POWERDIRECTOR/g, 'POWERDIRECTOR').replace(/PowerDirector/g, 'PowerDirector').replace(/powerdirector/g, 'powerdirector');
    if (newC === c) {
        skippedContent++;
        continue;
    }

    fs.writeFileSync(f, newC);

    const dest = path.join('/home/jcavallarojr/powerdirector', f);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, newC);
    replaced++;
}
console.log('Replaced:', replaced, 'Skipped(exists):', skippedExists, 'Skipped(content):', skippedContent);
