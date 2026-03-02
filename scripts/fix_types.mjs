import fs from 'fs';
const txt = fs.readFileSync('C:/Users/USER/.gemini/antigravity/brain/864887f7-78a1-457e-abfb-874742797bf3/.system_generated/steps/3110/output.txt', 'utf8');
const json = JSON.parse(txt);
fs.writeFileSync('database.types.ts', json.types);
console.log('Successfully wrote database.types.ts');
