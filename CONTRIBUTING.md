# Contributing to Borrow SDK Example

Thank you for your interest in contributing to the Borrow SDK Example! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/borrow-sdk-example.git
   cd borrow-sdk-example
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
5. Start the development server:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/add-new-component` - For new features
- `fix/wallet-connection-bug` - For bug fixes
- `docs/update-readme` - For documentation updates

### Commit Messages

Write clear, concise commit messages:
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Fix bug" not "Fixes bug")
- Keep the first line under 72 characters
- Reference issues when applicable (e.g., "Fix wallet disconnect issue #123")

### Code Style

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic

### Pull Requests

1. Create a new branch from `main`
2. Make your changes
3. Ensure the build passes: `pnpm build`
4. Push your branch and create a Pull Request
5. Fill out the PR template with relevant details
6. Wait for review and address any feedback

## Project Structure

```
src/
├── components/        # React components
│   ├── borrow/       # Borrowing workflow components
│   ├── loans/        # Loan management components
│   ├── repay/        # Repayment components
│   ├── withdraw/     # Withdrawal components
│   ├── dashboard/    # Dashboard components
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
└── lib/              # Utility functions
```

## Reporting Issues

When reporting issues, please include:
- A clear description of the problem
- Steps to reproduce the issue
- Expected vs actual behavior
- Browser and OS information
- Any relevant error messages or screenshots

## Feature Requests

We welcome feature requests! Please:
- Check existing issues to avoid duplicates
- Provide a clear use case for the feature
- Explain how it benefits users of the SDK example

## Questions?

If you have questions, feel free to:
- Open an issue with the "question" label
- Check existing documentation and issues first

Thank you for contributing!
