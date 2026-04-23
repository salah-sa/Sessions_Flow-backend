const fs = require('fs');
const html = fs.readFileSync('form.html', 'utf8');
const match = html.match(/var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);\n/);
if (match) {
  const data = JSON.parse(match[1]);
  const items = data[1][1];
  items.forEach(i => {
    if (i[4]) {
      // i[4] is an array of form fields
      i[4].forEach(field => {
         console.log(`Title: ${i[1]} | Field Name: ${field[12] ? field[12][0] : ''} | ID: entry.${field[0]}`);
      });
    }
  });
}
