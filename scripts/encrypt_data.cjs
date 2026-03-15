#!/usr/bin/env node
'use strict';

/**
 * Encrypts all dashboard JSON files into a single encrypted bundle.
 *
 * Usage:
 *   DASHBOARD_EMAIL=admin@example.com DASHBOARD_PASSWORD=secret123 \
 *     node scripts/encrypt_data.cjs public/data
 *
 * Output:
 *   public/data/bundle.enc  — encrypted bundle (JSON envelope with salt, iv, ciphertext)
 *   All original .json files are deleted.
 *
 * Encryption:
 *   - Key derived via PBKDF2(email + ":" + password, salt, 100k iterations, SHA-256)
 *   - Data encrypted with AES-256-GCM
 *   - Both email and password must be correct to decrypt
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 32; // AES-256
const IV_LENGTH = 12;  // GCM standard
const SALT_LENGTH = 16;

function encrypt(plaintext, email, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const passphrase = email.toLowerCase().trim() + ':' + password;
  const key = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    tag: authTag.toString('hex'),
    data: encrypted.toString('base64'),
  };
}

function main() {
  const dataDir = path.resolve(process.argv[2] || 'public/data');
  const email = process.env.DASHBOARD_EMAIL;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!email || !password) {
    console.error('Error: DASHBOARD_EMAIL and DASHBOARD_PASSWORD environment variables are required.');
    console.error('Usage: DASHBOARD_EMAIL=x DASHBOARD_PASSWORD=y node scripts/encrypt_data.cjs public/data');
    process.exit(1);
  }

  if (!fs.existsSync(dataDir)) {
    console.error(`Error: Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  // Read all JSON files
  const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  if (jsonFiles.length === 0) {
    console.error('Error: No JSON files found in', dataDir);
    process.exit(1);
  }

  const bundle = {};
  for (const file of jsonFiles) {
    const key = file.replace('.json', '');
    const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
    bundle[key] = JSON.parse(content);
  }

  const plaintext = JSON.stringify(bundle);
  const plaintextSize = (Buffer.byteLength(plaintext) / 1024).toFixed(1);

  console.log(`Bundling ${jsonFiles.length} files (${plaintextSize} KB plaintext)`);

  // Encrypt
  const encrypted = encrypt(plaintext, email, password);
  const encJson = JSON.stringify(encrypted);
  const encSize = (Buffer.byteLength(encJson) / 1024).toFixed(1);

  // Write encrypted bundle
  const bundlePath = path.join(dataDir, 'bundle.enc');
  fs.writeFileSync(bundlePath, encJson);
  console.log(`Encrypted bundle: ${encSize} KB → ${bundlePath}`);

  // Delete original JSON files
  for (const file of jsonFiles) {
    fs.unlinkSync(path.join(dataDir, file));
  }
  console.log(`Deleted ${jsonFiles.length} plaintext JSON files`);
  console.log('Done.');
}

main();
