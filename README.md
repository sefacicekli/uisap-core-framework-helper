# UISAP Core Framework Helper

A Visual Studio Code extension to enhance development with the `@uisap/core` framework, providing navigation support for models and routes in the UISAP Integration Suite API.

## Features

- **Model Navigation**: Click on model properties like `this.activityModel` in controllers to jump to the corresponding model file (e.g., `app/models/Activity.js`), based on the `modelsDir` setting in `config/app.js`.
- **Route Navigation**: In `routes/api.js`, click on controller names (e.g., `ExampleController`) to open the controller file, or method names (e.g., `'index'`) to navigate to the specific method definition.

### Example Usage

- **Model Navigation**:
  In `app/controllers/ActivitiesController.js`, right-click `this.activityModel` and select **Go to Definition** to open `app/models/Activity.js`.
- **Route Navigation**:
  In `routes/api.js`, right-click `SystemHealthController` or `'getHealth'` in `fastify.Route.get('/system-health', { handler: [SystemHealthController, 'getHealth'] });` to navigate to the controller or method.

## Requirements

- VS Code version 1.100.0 or higher.
- Node.js version 20.x.
- A project using the `@uisap/core` framework (e.g., UISAP Integration Suite API).

## Installation

1. Install the extension from the VS Code Marketplace (once published) or manually via a `.vsix` file.
2. Open a `@uisap/core` project in VS Code.
3. Ensure `.js` files are recognized as JavaScript (default in VS Code).

## Extension Settings

This extension does not currently add any custom settings.

## Known Issues

- Ensure your project follows the standard `@uisap/core` structure (e.g., `app/models`, `app/controllers`, `routes/api.js`).
- Windows path handling requires normalized paths, which the extension handles automatically.

## Release Notes

### 0.0.1

- Initial release with model and route navigation for `@uisap/core` projects.
- Supports jumping to model files from `this.<model>Model` references.
- Supports navigating to controller files and methods from `routes/api.js`.

## Contributing

Contributions are welcome! Please submit issues or pull requests to the [GitHub repository](#).

## License

MIT License

---

**Following extension guidelines**

This extension follows the [VS Code extension guidelines](https://code.visualstudio.com/api/references/extension-guidelines).