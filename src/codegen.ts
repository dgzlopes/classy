import path from 'path';
import { Project, SyntaxKind } from "ts-morph";
import fs from "fs";

export function runCodegen(target: string) {
  const filePath = target;
  if (!filePath) throw new Error("❌ Provide path to your test file or directory");

  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(path.resolve(filePath));

  const imports = sourceFile.getImportDeclarations()
    .filter(decl => !decl.getModuleSpecifierValue().includes("./dsl"))
    .filter(decl => !decl.getModuleSpecifierValue().includes("classy-k6"))
    .map(decl => decl.getText())
    .join("\n");

  const topLevelStatements = sourceFile.getStatements()
    .filter(stmt => {
      if (stmt.getKind() === SyntaxKind.ImportDeclaration) return false;
      if (stmt.getKind() === SyntaxKind.ClassDeclaration) return false;
      // Only keep function or variable declarations
      return stmt.getKind() === SyntaxKind.FunctionDeclaration ||
        stmt.getKind() === SyntaxKind.VariableStatement;
    })
    .map(stmt => stmt.getText())
    .join("\n\n");

  const classDecls = sourceFile.getClasses().filter(cls => cls.isExported());
  if (classDecls.length === 0) throw new Error("❌ No exported classes found");

  function indentLines(text: string, spaces = 2) {
    const indent = " ".repeat(spaces);
    return text
      .split("\n")
      .map(line => indent + line)
      .join("\n");
  }

  for (const classDecl of classDecls) {
    const testName = classDecl.getName() || "Test";

    let optionsInitializerText = "";
    const optionsProp = classDecl.getProperty("options");
    if (optionsProp) {
      const initializer = optionsProp.getInitializer();
      if (initializer) {
        optionsInitializerText = initializer.getText();
      }
    }

    const setupMethods: { name: string; body: string; params: string }[] = [];
    const teardownMethods: { name: string; body: string; params: string }[] = [];
    const scenarios: { name: string; config: string; body: string; params: string }[] = [];

    for (const method of classDecl.getMethods()) {
      const bodyText = method.getBodyText() || "";
      const paramText = method.getParameters().map(p => p.getText()).join(", ");
      const methodName = method.getName();

      if (methodName === "setup") {
        setupMethods.push({ name: methodName, body: bodyText, params: paramText });
      } else if (methodName === "teardown") {
        teardownMethods.push({ name: methodName, body: bodyText, params: paramText });
      } else {
        const scenarioDecorator = method.getDecorators().find(d => d.getName() === "scenario");
        if (scenarioDecorator) {
          const callExpr = scenarioDecorator.getCallExpression();
          if (!callExpr) throw new Error(`❌ @scenario missing config`);
          const configArg = callExpr.getArguments()[0];
          scenarios.push({ name: methodName, config: configArg.getText(), body: bodyText, params: paramText });
        }
      }
    }

    if (setupMethods.length > 1) {
      throw new Error(`❌ Only one setup() allowed in class ${testName}`);
    }
    if (teardownMethods.length > 1) {
      throw new Error(`❌ Only one teardown() allowed in class ${testName}`);
    }

    let output = `${imports}\n\n${topLevelStatements}\n\n`;

    for (const { name, params, body } of setupMethods) {
      output += `export function setup(${params}) {\n${indentLines(body)}\n}\n\n`;
    }
    for (const { name, params, body } of teardownMethods) {
      output += `export function teardown(${params}) {\n${indentLines(body)}\n}\n\n`;
    }
    for (const { name, params, body } of scenarios) {
      output += `export function ${name}(${params}) {\n${indentLines(body)}\n}\n\n`;
    }

    output += `export const options = {\n`;
    if (optionsInitializerText) {
      output += `  ...${optionsInitializerText},\n`;
    }
    output += `  scenarios: {\n`;
    for (const { name, config } of scenarios) {
      output += `    ${name}: {\n`;
      output += `      executor: "constant-vus",\n`;
      output += `      exec: "${name}",\n`;
      output += `      ...${config}\n`;
      output += `    },\n`;
    }
    output += `  }\n};\n`;

    const outPath = `./${testName}.generated.ts`;
    fs.writeFileSync(outPath, output);
    console.log(`✅ Generated: ${outPath}`);
  }
}
