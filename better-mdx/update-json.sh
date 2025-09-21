#!/bin/bash

echo "🔄 Updating Better MDX extension..."

# Package the extension
echo "📦 Packaging extension..."
vsce package

# Install the updated extension
echo "⬇️ Installing updated extension..."
cursor --install-extension better-mdx-0.0.1.vsix --force

echo "✅ Extension updated successfully!"
echo "💡 You may need to reload Cursor to see changes in existing files."
