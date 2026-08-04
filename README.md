# create-base-backend

Interactive CLI initializer to instantly scaffold production-ready Node.js Express APIs in either JavaScript or TypeScript.

## 🚀 Usage

You do not need to install the package globally. Simply run the initializer inside your target workspace directory:

```bash
npx create-base-backend
# or
npm init base-backend
```

### 🎨 Features

- **Interactive Prompts**: Prompts for project name, language selection (TypeScript vs. JavaScript), and automatic dependency installation options.
- **Git-free Cloning**: Clones templates directly from the repository using `degit` (no residual git history, providing a clean repository initialization state).
- **Auto Configuration**: Adjusts project names inside `package.json` and copies `.env.example` templates to `.env` configuration files.
