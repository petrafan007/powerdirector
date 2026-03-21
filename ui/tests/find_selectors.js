import fs from 'fs';
const html = fs.readFileSync('ui/tests/page_content.html', 'utf8');

// Simple regex to find buttons and inputs with their labels or aria-labels
const buttonRegex = /<button[^>]*>(.*?)<\/button>/g;
const ariaLabelRegex = /aria-label="(.*?)"/g;

console.log('Buttons found:');
let match;
while ((match = buttonRegex.exec(html)) !== null) {
  console.log(`- Content: ${match[1]}, Tag: ${match[0].substring(0, 50)}...`);
}

console.log('\nAria-labels found:');
while ((match = ariaLabelRegex.exec(html)) !== null) {
  console.log(`- ${match[1]}`);
}

const inputRegex = /<input[^>]*>/g;
console.log('\nInputs found:');
while ((match = inputRegex.exec(html)) !== null) {
  console.log(`- ${match[0]}`);
}

const textareaRegex = /<textarea[^>]*>/g;
console.log('\nTextareas found:');
while ((match = textareaRegex.exec(html)) !== null) {
  console.log(`- ${match[0]}`);
}
