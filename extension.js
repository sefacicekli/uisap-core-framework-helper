import * as vscode from 'vscode';
import { UISAPDefinitionProvider } from './providers/uisapDefinitionProvider.js';
import * as path from 'path';
import * as fs from 'fs';

console.log('UISAP Core Framework Helper: Extension module loaded');

export async function activate(context) {
  try {
    console.log('UISAP Core Framework Helper: Activating extension...');

    // Register the definition provider for JavaScript files
    console.log('UISAP Core Framework Helper: Registering definition provider');
    const provider = new UISAPDefinitionProvider();
    const selector = { scheme: 'file', language: 'javascript' };
    context.subscriptions.push(
      vscode.languages.registerDefinitionProvider(selector, provider)
    );

    // Register the helloWorld command
    console.log('UISAP Core Framework Helper: Registering helloWorld command');
    context.subscriptions.push(
      vscode.commands.registerCommand('uisap-core-framework-helper.helloWorld', () => {
        console.log('UISAP Core Framework Helper: Hello World command executed');
        vscode.window.showInformationMessage('Hello World from UISAP Core Framework Helper!');
      })
    );

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'uisap.showInitializedMessage';
    context.subscriptions.push(statusBarItem);

    // Register the command for the status bar item
    context.subscriptions.push(
      vscode.commands.registerCommand('uisap.showInitializedMessage', () => {
        vscode.window.showInformationMessage('This project is successfully initialized by uisap/core');
      })
    );

    // Function to update the status bar based on package.json
    function updateStatusBar() {
      if (!vscode.workspace.workspaceFolders) {
        statusBarItem.hide();
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        statusBarItem.hide();
        return;
      }

      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.dependencies && packageJson.dependencies['@uisap/core']) {
          console.log('UISAP Core Framework Helper: Found @uisap/core in package.json');
          statusBarItem.text = 'Uisap Core $(uisap-icon)';
          statusBarItem.tooltip = '';
          statusBarItem.show();
        } else {
          statusBarItem.hide();
        }
      } catch (error) {
        console.error('package.json okunurken hata oluştu:', error);
        statusBarItem.hide();
      }
    }

    // Initial update of the status bar
    updateStatusBar();

    // Watch for changes in package.json
    if (vscode.workspace.workspaceFolders) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.workspace.workspaceFolders[0], 'package.json')
      );
      watcher.onDidChange(() => updateStatusBar());
      watcher.onDidCreate(() => updateStatusBar());
      watcher.onDidDelete(() => updateStatusBar());
      context.subscriptions.push(watcher);
    }

    console.log('UISAP Core Framework Helper: Activation complete');
  } catch (error) {
    console.error('UISAP Core Framework Helper: Activation error:', error);
    vscode.window.showErrorMessage(`UISAP Core Framework Helper: Failed to activate - ${error.message}`);
  }
}

export function deactivate() {
  console.log('UISAP Core Framework Helper: Deactivated');
}