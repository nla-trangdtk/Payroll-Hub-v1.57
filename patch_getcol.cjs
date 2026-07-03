const fs = require('fs');
let code = fs.readFileSync('src/app/pages/03-master/AEDataConfig.tsx', 'utf8');

const target = `      // 1. Exact Match (either targetField itself or an exact match on fuzzy Keywords)
      const idx = headers.findIndex((h: any) => {
        const hUp = String(h).toUpperCase().trim();
        if (hUp === targetField.toUpperCase()) return true;
        return fuzzyKeywords.some((k) => hUp === k.toUpperCase().trim());
      });
      if (idx !== -1) return idx;

      // 2. Contains Match
      return headers.findIndex((h: any) => {
        const hUp = String(h).toUpperCase().trim();
        if (hUp === targetField.toUpperCase()) return true;
        return fuzzyKeywords.some((k) => hUp.includes(k.toUpperCase().trim()));
      });`;

const replacement = `      // 1. Exact Match on targetField
      let idx = headers.findIndex((h: any) => String(h).toUpperCase().trim() === targetField.toUpperCase());
      if (idx !== -1) return idx;

      // 2. Exact Match on fuzzy keywords
      if (fuzzyKeywords && fuzzyKeywords.length > 0) {
        idx = headers.findIndex((h: any) => {
          const hUp = String(h).toUpperCase().trim();
          return fuzzyKeywords.some((k) => hUp === k.toUpperCase().trim());
        });
        if (idx !== -1) return idx;
      }

      // 3. Contains Match on targetField
      idx = headers.findIndex((h: any) => String(h).toUpperCase().trim().includes(targetField.toUpperCase()));
      if (idx !== -1) return idx;

      // 4. Contains Match on fuzzy keywords
      if (fuzzyKeywords && fuzzyKeywords.length > 0) {
        return headers.findIndex((h: any) => {
          const hUp = String(h).toUpperCase().trim();
          return fuzzyKeywords.some((k) => hUp.includes(k.toUpperCase().trim()));
        });
      }
      return -1;`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/app/pages/03-master/AEDataConfig.tsx', code);
  console.log("Success");
} else {
  console.log("Not found");
}
