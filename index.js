#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import prompts from 'prompts';
import { red, green, bold, cyan, gray } from 'kolorist';
import degit from 'degit';



async function main() {
  console.log(bold(cyan('\n🚀 Welcome to the Base Backend Template Generator!\n')));

  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'Enter your project name:',
      initial: 'base-backend-app',
      validate: value => {
        const pattern = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
        return pattern.test(value) ? true : 'Invalid package.json name pattern.';
      }
    },
    {
      type: 'select',
      name: 'template',
      message: 'Choose template edition:',
      choices: [
        { title: `${bold('TypeScript Edition')} ${gray('(Recommended - complete 10/10)')}`, value: 'ts' },
        { title: `${bold('JavaScript Edition')} ${gray('(Express Base starter)')}`, value: 'js' }
      ],
      initial: 0
    },
    {
      type: 'confirm',
      name: 'runInstall',
      message: 'Do you want to run npm install automatically?',
      initial: true
    }
  ], {
    onCancel: () => {
      console.log(red('\n❌ Operation cancelled by the user.'));
      process.exit(1);
    }
  });

  const { projectName, template, runInstall } = response;
  const targetDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    console.log(red(`\n❌ Error: Directory "${projectName}" already exists. Please choose a different name.`));
    process.exit(1);
  }

  const gitSource = template === 'ts'
    ? 'aditya3012singh/production-express-typescript-starter'
    : 'aditya3012singh/initial-backend-js';

  console.log(cyan(`\n📥 Downloading ${template === 'ts' ? 'TypeScript' : 'JavaScript'} template...`));

  try {
    const emitter = degit(gitSource, {
      cache: false,
      force: true
    });

    await emitter.clone(targetDir);
    console.log(green('✅ Template downloaded successfully!'));
  } catch (error) {
    console.log(gray('ℹ️ HTTP download failed. Retrying using local Git credentials...'));
    try {
      const emitter = degit(gitSource, {
        cache: false,
        force: true,
        mode: 'git'
      });
      await emitter.clone(targetDir);
      console.log(green('✅ Template downloaded successfully via Git clone!'));
    } catch (gitError) {
      console.error(red('\n❌ Failed to download template repository from GitHub:'), gitError);
      process.exit(1);
    }
  }

  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.name = projectName;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    } catch (err) {
      console.log(red('⚠️ Warning: Failed to customize package.json.'));
    }
  }

  const envExamplePath = path.join(targetDir, '.env.example');
  const envPath = path.join(targetDir, '.env');
  if (fs.existsSync(envExamplePath) && !fs.existsSync(envPath)) {
    try {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(gray('📝 Created .env configuration file from .env.example.'));
    } catch (e) {
      console.log(red('⚠️ Warning: Failed to copy .env.example to .env.'));
    }
  }

  if (runInstall) {
    console.log(cyan('\n📦 Installing dependencies. This might take a few moments...'));
    try {
      execSync('npm install', { cwd: targetDir, stdio: 'inherit' });
      console.log(green('\n✅ Dependencies installed successfully!'));
    } catch (err) {
      console.log(red('\n⚠️ Warning: Failed to install dependencies. You can install them manually using "npm install".'));
    }
  }

  console.log('\n==========================================================');
  console.log(green('🎉 Your project is ready!'));
  console.log('==========================================================');
  console.log(`\nTo get started, run:\n`);
  console.log(cyan(`  cd ${projectName}`));
  if (!runInstall) {
    console.log(cyan(`  npm install`));
  }
  console.log(cyan(`  npx prisma generate`));
  if (template === 'ts') {
    console.log(cyan(`  npm run dev`));
  } else {
    console.log(cyan(`  npm start`));
  }
  console.log('\n==========================================================\n');
}

main().catch(err => {
  console.error(red('\n❌ An unexpected error occurred:'), err);
  process.exit(1);
});
