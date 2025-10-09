#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Security Fix Script
 * Removes sensitive console logging that could expose personal information or tokens
 * Only allows console logging in development mode
 */

const sourceDir = 'd:/eveange/frontend/src';

// Patterns to find and replace
const patterns = [
    {
        // console.log statements
        find: /console\.log\(/g,
        replace: function (match, offset, string) {
            // Check if already wrapped in DEV check
            const beforeMatch = string.substring(0, offset);
            if (beforeMatch.includes('if (import.meta.env.DEV)')) {
                return match; // Already protected
            }
            return 'if (import.meta.env.DEV) console.log(';
        }
    },
    {
        // console.error statements
        find: /console\.error\(/g,
        replace: function (match, offset, string) {
            // Check if already wrapped in DEV check
            const beforeMatch = string.substring(0, offset);
            if (beforeMatch.includes('if (import.meta.env.DEV)')) {
                return match; // Already protected
            }
            return 'if (import.meta.env.DEV) console.error(';
        }
    },
    {
        // console.warn statements
        find: /console\.warn\(/g,
        replace: function (match, offset, string) {
            // Check if already wrapped in DEV check
            const beforeMatch = string.substring(0, offset);
            if (beforeMatch.includes('if (import.meta.env.DEV)')) {
                return match; // Already protected
            }
            return 'if (import.meta.env.DEV) console.warn(';
        }
    }
];

function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        patterns.forEach(pattern => {
            const newContent = content.replace(pattern.find, pattern.replace);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
    }
}

function walkDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            processFile(filePath);
        }
    });
}

console.log('Starting security fixes...');
walkDirectory(sourceDir);
console.log('Security fixes completed!');