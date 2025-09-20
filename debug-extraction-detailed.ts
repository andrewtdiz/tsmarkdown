import { splitComponent } from './src/parser/component-scanner';

const completeTypeScriptSource = `
import { Dashboard } from "./components/Dashboard";
import { getData } from "./api/getData";

const VERSION_NUMBER = "1.0.0";
const inlineVersion = (
    *Version: {{ VERSION_NUMBER }}!*
);

async function TestComponent() {
  const { data, error, timedout } = await getData();

  if (error) return false;
  if (timedout) return (
    **API Error**
  )
  if (!data) {
    return (
      **Error**: No data available

      {{ null }}
    )
  }

  return (
    # Admin panel
    {{ data.isAuthorized ? (
        Authorized
    ) : (
        Not Authorized
    )}}
    {{ !data.active && (
        Account is inactive
    )}}
    - Name: {{ data.name }}
    - Description: {{ data.description }}
      Access your information here

    <content>
      <@Dashboard />
    </content>

    {{ inlineVersion }}
  )
}
`;

console.log("=== Debugging Detailed Extraction ===");
const split = splitComponent(completeTypeScriptSource);
console.log("Return statements found:", split.returnStatements.length);

split.returnStatements.forEach((stmt, index) => {
  console.log(`\nReturn ${index + 1}:`);
  console.log(`  Start: ${stmt.contentStartIndex}, End: ${stmt.contentEndIndex}`);
  const extracted = completeTypeScriptSource.slice(stmt.contentStartIndex, stmt.contentEndIndex);
  console.log(`  Extracted content:`, JSON.stringify(extracted));

  // Show the actual source around this area
  const start = Math.max(0, stmt.contentStartIndex - 50);
  const end = Math.min(completeTypeScriptSource.length, stmt.contentEndIndex + 50);
  console.log(`  Source context:`);
  console.log(completeTypeScriptSource.slice(start, end));
  console.log('');
});
