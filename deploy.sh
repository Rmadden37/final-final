#!/bin/bash

# LeadFlow Firebase App Hosting Deployment Script
set -e

echo "🚀 Starting LeadFlow deployment to Firebase App Hosting..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Authenticate with Firebase (if needed)
echo "🔐 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1 || {
    echo "📧 Please login to Firebase..."
    firebase login
}

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting and fix issues
echo "🧹 Running linter with auto-fix..."
npx next lint --fix || echo "⚠️  Some linting issues found but continuing..."

# Clean previous builds
echo "🧽 Cleaning previous builds..."
rm -rf .next out dist

# Build the application for production (includes type checking)
echo "🏗️  Building application for production..."
npm run build

# Check if build directory exists
if [ ! -d ".next" ]; then
    echo "❌ Build output directory '.next' not found"
    exit 1
fi

# Deploy to Firebase App Hosting
echo "🚀 Deploying to Firebase App Hosting..."
firebase deploy --only apphosting

echo "✅ Deployment complete!"
echo "🌐 Your application should be available at your Firebase App Hosting URL"

# Show project info
echo "📋 Project info:"
firebase projects:list
