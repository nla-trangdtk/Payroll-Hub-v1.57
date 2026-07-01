const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, 'app/pages/01-timesheet/TimesheetSummary.tsx');
let content = fs.readFileSync(file, 'utf8');

// The replacement logic:
const startIndex = content.indexOf('const computedData = useMemo(() => {');
const endIndex = content.indexOf('  }, [computedData.employeeSummary, computedData.centerSummary]);');

if (startIndex !== -1 && endIndex !== -1) {
  const pre = content.substring(0, startIndex);
  
  // Actually we need to keep the useEffect that sets TA_Employee_Summary
  // Let's find the closing bracket of useMemo
  const useMemoEndStr = '  }, [';
  const lastBracketBeforeEndIndex = content.lastIndexOf(useMemoEndStr, endIndex - 100);
  
  let useMemoEnd = content.indexOf(']);', lastBracketBeforeEndIndex);
  
  // Just use regex to replace everything between const computedData = useMemo and its closing bracket.
  const regex = /const computedData = useMemo\(\(\) => \{[\s\S]*?uiSettings\.defaultAuditYear,\n  \]\);/g;
  
  const hookCode = `const computedData = useTimesheetCalculations(
    rosterData,
    salaryScaleData,
    staffData,
    cacheData,
    debouncedFromDate,
    debouncedToDate
  );`;

  let finalContent = content.replace(regex, hookCode);
  fs.writeFileSync(file, finalContent);
  console.log("Success");
} else {
  console.log("Failed to find boundaries", startIndex, endIndex);
}
