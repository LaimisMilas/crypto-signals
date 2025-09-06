const fs = require('fs');
const sql = fs.readFileSync('src/storage/schema.pg.sql', 'utf8');
const tableRegex = /CREATE TABLE IF NOT EXISTS (\w+) \(([^;]*?)\);/gi;
const tables = {};
let match;
while ((match = tableRegex.exec(sql))) {
  const name = match[1];
  const colsSection = match[2];
  const lines = colsSection.split(/,\n/).map(l => l.trim()).filter(Boolean);
  tables[name] = { cols: [], refs: [] };
  for (const line of lines) {
    const colMatch = line.match(/^("?)(\w+)\1\s+/);
    if (colMatch) {
      const colName = colMatch[2];
      tables[name].cols.push(colName);
    }
    const refMatch = line.match(/REFERENCES\s+(\w+)/i);
    if (refMatch) {
      tables[name].refs.push(refMatch[1]);
    }
  }
}
let out = 'erDiagram\n';
for (const [t, info] of Object.entries(tables)) {
  out += `  ${t} {\n`;
  for (const c of info.cols) {
    out += `    string ${c}\n`;
  }
  out += '  }\n';
}
for (const [t, info] of Object.entries(tables)) {
  for (const r of info.refs) {
    out += `  ${t} }o--|| ${r} : FK\n`;
  }
}
fs.writeFileSync('docs/er-diagram.md', '```mermaid\n' + out + '```\n');
