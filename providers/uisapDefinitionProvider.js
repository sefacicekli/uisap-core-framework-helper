import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

// Fix for traverse default export
const traverse = _traverse.default || _traverse;

// Normalize paths for Windows
const normalizePath = (p) => path.normalize(p).replace(/\\/g, "/");

export class UISAPDefinitionProvider {
  async provideDefinition(document, position, token) {
    console.log("UISAP Core Framework Helper: provideDefinition called", {
      file: normalizePath(document.fileName),
      line: position.line,
      character: position.character,
    });

    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      console.log("UISAP Core Framework Helper: No word found at position");
      return undefined;
    }

    const word = document.getText(wordRange);
    const lineText = document.lineAt(position.line).text;

    console.log("UISAP Core Framework Helper: Word clicked:", word);

    let result;
    // Case 1: Model navigation (e.g., this.activityModel)
    if (
      word.endsWith("Model") &&
      lineText.includes("this.") &&
      document.fileName.includes("controllers")
    ) {
      console.log("UISAP Core Framework Helper: Handling model navigation");
      result = await this.handleModelNavigation(document, word, position);
    }
    // Case 2: Route navigation in api.js
    else if (
      document.fileName.endsWith("routes/api.js") ||
      document.fileName.endsWith("routes" + path.sep + "api.js")
    ) {
      console.log(
        "UISAP Core Framework Helper: Document file name:",
        normalizePath(document.fileName)
      );
      console.log("UISAP Core Framework Helper: Handling route navigation");
      result = await this.handleRouteNavigation(document, position, word);
    } else {
      console.log("UISAP Core Framework Helper: No navigation case matched");
      return undefined;
    }

    // Ensure direct navigation by returning a single Location with a slight delay to take precedence
    if (result) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(result);
        }, 50); // Small delay to ensure precedence over other providers
      });
    }
    return undefined;
  }

  async handleModelNavigation(document, word, position) {
    console.log("UISAP Core Framework Helper: Model navigation for word:", word);

    // Parse the controller file to find this.resolve('ModelName')
    const code = fs.readFileSync(document.fileName, "utf-8");
    let modelName;

    try {
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript"],
      });

      traverse(ast, {
        CallExpression(nodePath) {
          if (
            nodePath.node.callee.type === "MemberExpression" &&
            nodePath.node.callee.object.type === "ThisExpression" &&
            nodePath.node.callee.property.name === "resolve" &&
            nodePath.node.arguments[0]?.type === "StringLiteral"
          ) {
            const resolvedName = nodePath.node.arguments[0].value;
            if (word === `${resolvedName.toLowerCase()}Model`) {
              modelName = resolvedName;
              console.log("UISAP Core Framework Helper: Found model:", modelName);
            }
          }
        },
      });
    } catch (error) {
      console.error("UISAP Core Framework Helper: Error parsing controller code:", error);
      return undefined;
    }

    if (!modelName) {
      console.log("UISAP Core Framework Helper: Model name not found");
      return undefined;
    }

    // Find config/app.js (at project root, same level as app)
    const projectRoot = path.dirname(path.dirname(path.dirname(document.fileName))); // From app/controllers/ to project root
    const configPath = normalizePath(path.join(projectRoot, "config", "app.js"));
    console.log("UISAP Core Framework Helper: Project root:", projectRoot);
    console.log("UISAP Core Framework Helper: Config path:", configPath);
    if (!fs.existsSync(configPath)) {
      console.log("UISAP Core Framework Helper: Config file not found:", configPath);
      return undefined;
    }

    const configCode = fs.readFileSync(configPath, "utf-8");
    let modelsDir = normalizePath(path.join(projectRoot, "app", "models")); // Default to app/models/

    try {
      const configAst = parse(configCode, { sourceType: "module" });

      traverse(configAst, {
        Property(nodePath) {
          if (nodePath.node.key.name === "modelsDir") {
            if (
              nodePath.node.value.type === "CallExpression" &&
              nodePath.node.value.callee.name === "join"
            ) {
              const args = nodePath.node.value.arguments.map((arg) => {
                if (arg.type === "StringLiteral") {
                  return arg.value;
                }
                return "";
              });
              modelsDir = normalizePath(path.join(projectRoot, ...args));
              console.log("UISAP Core Framework Helper: Found modelsDir:", modelsDir);
            }
          }
        },
      });
    } catch (error) {
      console.error("UISAP Core Framework Helper: Error parsing config code:", error);
      return undefined;
    }

    // Construct the model file path
    const modelFile = normalizePath(path.join(modelsDir, `${modelName}.js`));
    if (!fs.existsSync(modelFile)) {
      console.log("UISAP Core Framework Helper: Model file not found:", modelFile);
      return undefined;
    }

    console.log("UISAP Core Framework Helper: Navigating to model file:", modelFile);
    return {
      originSelectionRange: document.getWordRangeAtPosition(position), // Tıklanan kelimenin tam aralığı
      targetUri: vscode.Uri.file(modelFile),
      targetRange: new vscode.Range(0, 0, 0, 0),
      targetSelectionRange: new vscode.Range(0, 0, 0, 0),
    };
  }

  async handleRouteNavigation(document, position, word) {
    console.log("UISAP Core Framework Helper: Route navigation for word:", word);

    const code = fs.readFileSync(document.fileName, "utf-8");
    let controllerName;
    let methodName;
    let controllerPath;

    try {
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript"],
      });

      traverse(ast, {
        CallExpression(nodePath) {
          // fastify.Route.get, fastify.Route.post vb. kontrolü
          if (
            nodePath.node.callee.type === "MemberExpression" &&
            nodePath.node.callee.object.type === "MemberExpression" &&
            nodePath.node.callee.object.object.name === "fastify" &&
            nodePath.node.callee.object.property.name === "Route" &&
            ["get", "post", "put", "delete", "patch"].includes(nodePath.node.callee.property.name)
          ) {
            const options = nodePath.node.arguments[1]; // İkinci argüman seçenekler objesi
            if (options && options.type === "ObjectExpression") {
              const handlerProp = options.properties.find(prop => prop.key.name === "handler");
              if (handlerProp && handlerProp.value.type === "ArrayExpression") {
                const [controllerRef, methodLiteral] = handlerProp.value.elements;
                if (controllerRef.type === "Identifier" && methodLiteral.type === "StringLiteral") {
                  const handlerStart = handlerProp.value.start;
                  const handlerEnd = handlerProp.value.end;
                  const startPos = document.positionAt(handlerStart);
                  const endPos = document.positionAt(handlerEnd);

                  console.log("Handler array range:", startPos, "to", endPos);
                  console.log("Clicked position:", position);

                  if (
                    position.line >= startPos.line &&
                    position.line <= endPos.line &&
                    (position.line > startPos.line || position.character >= startPos.character) &&
                    (position.line < endPos.line || position.character <= endPos.character)
                  ) {
                    controllerName = controllerRef.name; // Ör: 'SystemHealthController'
                    methodName = methodLiteral.value; // Ör: 'getHealth'
                    console.log("UISAP Core Framework Helper: Found route:", {
                      controllerName,
                      methodName,
                    });
                  }
                }
              }
            }
          }
        },
      });

      if (!controllerName) {
        console.log("UISAP Core Framework Helper: Controller name not found");
        return undefined;
      }

      // Controller'ın import yolunu bul
      traverse(ast, {
        ImportDeclaration(nodePath) {
          nodePath.node.specifiers.forEach((spec) => {
            if (spec.local.name === controllerName) {
              let importPath = nodePath.node.source.value;
              // Eğer importPath .js ile bitmiyorsa, ekle
              if (!importPath.endsWith('.js')) {
                importPath += '.js';
              }
              // Göreceli yolu mutlak yola çevir
              const absolutePath = path.resolve(path.dirname(document.fileName), importPath);
              controllerPath = normalizePath(absolutePath);
              console.log("UISAP Core Framework Helper: Found controller path:", controllerPath);
            }
          });
        },
      });
    } catch (error) {
      console.error("UISAP Core Framework Helper: Error parsing route code:", error);
      return undefined;
    }

    if (!controllerPath || !fs.existsSync(controllerPath)) {
      console.log("UISAP Core Framework Helper: Controller file not found:", controllerPath || "undefined");
      return undefined;
    }

    // Metod adına tıklanırsa metoda git
    if (methodName && word === methodName) {
      const controllerCode = fs.readFileSync(controllerPath, "utf-8");
      try {
        const controllerAst = parse(controllerCode, { sourceType: "module" });
        let methodPosition;

        traverse(controllerAst, {
          ClassMethod(nodePath) {
            if (nodePath.node.key.name === methodName) {
              const line = nodePath.node.loc.start.line - 1;
              const column = nodePath.node.loc.start.column;
              methodPosition = new vscode.Position(line, column);
              console.log("UISAP Core Framework Helper: Found method position:", { line, column });
            }
          },
        });

        if (methodPosition) {
          console.log("UISAP Core Framework Helper: Navigating to method:", methodName, "in", controllerPath);
          return new vscode.Location(vscode.Uri.file(controllerPath), methodPosition);
        } else {
          console.log("UISAP Core Framework Helper: Method not found:", methodName);
        }
      } catch (error) {
        console.error("UISAP Core Framework Helper: Error parsing controller code:", error);
        return undefined;
      }
    }

    // Controller adına tıklanırsa dosyanın başına git
    if (word === controllerName || !methodName) {
      console.log("UISAP Core Framework Helper: Navigating to controller file:", controllerPath);
      return new vscode.Location(vscode.Uri.file(controllerPath), new vscode.Position(0, 0));
    }

    console.log("UISAP Core Framework Helper: No navigation target found for word:", word);
    return undefined;
  }
}