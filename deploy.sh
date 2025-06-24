#!/bin/bash

# LeadFlow Firebase Deployment Script
set -e

echo "🚀 Starting LeadFlow deployment to Firebase..."

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

# Run TypeScript check
echo "🔍 Running TypeScript check..."
npm run typecheck

# Run linting
echo "🧹 Running linter..."
npm run lint

# Build the application
echo "🏗️  Building application for production..."
npm run build

# Check if build directory exists
if [ ! -d "out" ]; then
    echo "❌ Build output directory 'out' not found"
    exit 1
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌐 Your application should be available at your Firebase hosting URL"

# Show project info
echo "📋 Project info:"
firebase projects:list
