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
      type: 'select',
      name: 'database',
      message: 'Choose database layer:',
      choices: [
        { title: 'PostgreSQL + Prisma (Default)', value: 'postgres' },
        { title: 'MongoDB + Mongoose', value: 'mongodb' }
      ],
      initial: 0
    },
    {
      type: 'select',
      name: 'eventBus',
      message: 'Choose event messaging broker:',
      choices: [
        { title: 'Redis Pub/Sub (Default)', value: 'redis' },
        { title: 'RabbitMQ (AMQP)', value: 'rabbitmq' },
        { title: 'Apache Kafka', value: 'kafka' }
      ],
      initial: 0
    },
    {
      type: 'confirm',
      name: 'includeTesting',
      message: 'Include Vitest unit/integration testing suite?',
      initial: true
    },
    {
      type: 'confirm',
      name: 'includeMetrics',
      message: 'Include Prometheus telemetry metrics & /docs routes?',
      initial: true
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

  const { projectName, template, database, eventBus, includeTesting, includeMetrics, runInstall } = response;
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

  // --- ASSEMBLING THE CUSTOM STACK (Option A) ---
  console.log(cyan('\n🔧 Customizing your codebase templates...'));

  const isTs = template === 'ts';
  const ext = isTs ? 'ts' : 'js';

  // 1. Database layer customization
  if (database === 'postgres') {
    // Remove Mongoose config & models & providers
    const mongooseConfig = path.join(targetDir, `src/core/config/mongoose.${ext}`);
    const mongooseUserModel = path.join(targetDir, `src/modules/auth/models/user.model.${ext}`);
    const mongooseUserRepo = path.join(targetDir, `src/modules/auth/repositories/providers/mongoose.user.repository.${ext}`);
    
    if (fs.existsSync(mongooseConfig)) fs.unlinkSync(mongooseConfig);
    if (fs.existsSync(mongooseUserModel)) fs.unlinkSync(mongooseUserModel);
    if (fs.existsSync(mongooseUserRepo)) fs.unlinkSync(mongooseUserRepo);
  } else if (database === 'mongodb') {
    // Remove Prisma configuration
    const prismaDir = path.join(targetDir, 'prisma');
    if (fs.existsSync(prismaDir)) fs.rmSync(prismaDir, { recursive: true, force: true });

    const dbConfig = path.join(targetDir, `src/core/config/db.${ext}`);
    const dbWrapper = path.join(targetDir, `src/core/config/db.wrapper.${ext}`);
    const prismaClientConfig = path.join(targetDir, `src/core/config/prisma.${ext}`);
    const prismaUserRepo = path.join(targetDir, `src/modules/auth/repositories/providers/prisma.user.repository.${ext}`);

    if (fs.existsSync(dbConfig)) fs.unlinkSync(dbConfig);
    if (fs.existsSync(dbWrapper)) fs.unlinkSync(dbWrapper);
    if (fs.existsSync(prismaClientConfig)) fs.unlinkSync(prismaClientConfig);
    if (fs.existsSync(prismaUserRepo)) fs.unlinkSync(prismaUserRepo);

    // Make Mongoose database configuration the default db configuration
    const mongooseConfig = path.join(targetDir, `src/core/config/mongoose.${ext}`);
    if (fs.existsSync(mongooseConfig)) {
      fs.renameSync(mongooseConfig, dbConfig);
    }

    // Set default repository export to Mongoose
    const userRepoFile = path.join(targetDir, `src/modules/auth/repositories/user.repository.${ext}`);
    if (fs.existsSync(userRepoFile)) {
      const repoContent = isTs
        ? `import { MongooseUserRepository } from './providers/mongoose.user.repository.js';\nimport { IUserRepository } from './user.repository.interface.js';\n\nconst userRepository: IUserRepository = new MongooseUserRepository();\nexport default userRepository;\n`
        : `import { MongooseUserRepository } from './providers/mongoose.user.repository.js';\n\nconst userRepository = new MongooseUserRepository();\nexport default userRepository;\n`;
      fs.writeFileSync(userRepoFile, repoContent, 'utf8');
    }

    // Replace Prisma connection boot with Mongoose connection boot in server.ts/js
    const serverPath = path.join(targetDir, `src/server.${ext}`);
    if (fs.existsSync(serverPath)) {
      let serverContent = fs.readFileSync(serverPath, 'utf8');
      if (isTs) {
        serverContent = serverContent
          .replace(/import \{ prisma \} from '\.\/core\/config\/db\.wrapper\.js';/g, "import Database from './core/config/db.js';")
          .replace(/prisma\.\$connect\(\)/g, 'Database.connect()')
          .replace(/prisma\.\$disconnect\(\)/g, 'Database.disconnect()');
      } else {
        serverContent = serverContent
          .replace(/Database\.client\.\$connect\(\)/g, 'Database.connect()')
          .replace(/Database\.client\.\$disconnect\(\)/g, 'Database.disconnect()');
      }
      fs.writeFileSync(serverPath, serverContent, 'utf8');
    }
  }

  // 2. Event messaging broker customization
  const providersDir = path.join(targetDir, `src/core/events/providers`);
  const eventBusFile = path.join(targetDir, `src/core/events/eventBus.${ext}`);
  const dualModeBusFile = path.join(targetDir, `src/core/events/dualModeEventBus.${ext}`);

  if (eventBus === 'redis') {
    // Keep dualModeEventBus as default eventBus (rename dualModeEventBus -> eventBus)
    if (fs.existsSync(eventBusFile)) fs.unlinkSync(eventBusFile);
    if (fs.existsSync(dualModeBusFile)) {
      fs.renameSync(dualModeBusFile, eventBusFile);
    }
    // Delete unused providers folder
    if (fs.existsSync(providersDir)) fs.rmSync(providersDir, { recursive: true, force: true });
  } else if (eventBus === 'rabbitmq' || eventBus === 'kafka') {
    // Remove dualModeEventBus and redisEventBus
    const redisBusFile = path.join(targetDir, `src/core/events/redisEventBus.${ext}`);
    if (fs.existsSync(eventBusFile)) fs.unlinkSync(eventBusFile);
    if (fs.existsSync(redisBusFile)) fs.unlinkSync(redisBusFile);
    if (fs.existsSync(dualModeBusFile)) fs.unlinkSync(dualModeBusFile);

    // Promote rabbitmq or kafka bus to the default eventBus
    const selectedBusFile = path.join(providersDir, `${eventBus}.bus.${ext}`);
    if (fs.existsSync(selectedBusFile)) {
      fs.renameSync(selectedBusFile, eventBusFile);
    }

    // Delete unused providers folder
    if (fs.existsSync(providersDir)) fs.rmSync(providersDir, { recursive: true, force: true });

    // Modify server.ts/js to initialize the promoted event bus (which requires .initialize())
    const indexAppPath = path.join(targetDir, `src/index.${ext}`);
    if (fs.existsSync(indexAppPath)) {
      let indexContent = fs.readFileSync(indexAppPath, 'utf8');
      indexContent = indexContent
        .replace(/registerAllListeners\(\)/g, 'await eventBus.initialize();\n    registerAllListeners()')
        .replace(/import { registerAllListeners }/g, 'import eventBus from "./core/events/eventBus.js";\nimport { registerAllListeners }');
      fs.writeFileSync(indexAppPath, indexContent, 'utf8');
    }
  }

  // 3. Optional Features Customization: Testing
  if (!includeTesting) {
    const healthTestDir = path.join(targetDir, `src/core/health/__tests__`);
    const authTestDir = path.join(targetDir, `src/modules/auth/__tests__`);
    const helpersTestDir = path.join(targetDir, `src/__tests__`);
    const vitestConfig = path.join(targetDir, `vitest.config.${ext}`);

    if (fs.existsSync(healthTestDir)) fs.rmSync(healthTestDir, { recursive: true, force: true });
    if (fs.existsSync(authTestDir)) fs.rmSync(authTestDir, { recursive: true, force: true });
    if (fs.existsSync(helpersTestDir)) fs.rmSync(helpersTestDir, { recursive: true, force: true });
    if (fs.existsSync(vitestConfig)) fs.unlinkSync(vitestConfig);
  }

  // 4. Optional Features Customization: Metrics and Telemetry / Docs
  if (!includeMetrics) {
    const metricsDir = path.join(targetDir, `src/core/metrics`);
    const metricsRoute = path.join(targetDir, `src/api/routes/metrics.routes.${ext}`);
    const metricsMiddleware = path.join(targetDir, `src/api/middleware/metrics.middleware.${ext}`);
    const swaggerConfig = path.join(targetDir, `src/core/config/swagger.${ext}`);

    if (fs.existsSync(metricsDir)) fs.rmSync(metricsDir, { recursive: true, force: true });
    if (fs.existsSync(metricsRoute)) fs.unlinkSync(metricsRoute);
    if (fs.existsSync(metricsMiddleware)) fs.unlinkSync(metricsMiddleware);
    if (fs.existsSync(swaggerConfig)) fs.unlinkSync(swaggerConfig);

    // Strip routes from app.ts/app.js
    const appPath = path.join(targetDir, `src/app.${ext}`);
    if (fs.existsSync(appPath)) {
      let appContent = fs.readFileSync(appPath, 'utf8');
      appContent = appContent
        .replace(/import { metricsMiddleware } from '\.\/api\/middleware\/metrics\.middleware\.js';\r?\n?/g, '')
        .replace(/import { register } from '\.\/core\/metrics\/index\.js';\r?\n?/g, '')
        .replace(/import swaggerUi from 'swagger-ui-express';\r?\n?/g, '')
        .replace(/import { swaggerSpec } from '\.\/core\/config\/swagger\.js';\r?\n?/g, '')
        .replace(/app\.use\(metricsMiddleware\);\r?\n?/g, '')
        .replace(/app\.use\('\/docs', swaggerUi\.serve, swaggerUi\.setup\(swaggerSpec\)\);\r?\n?/g, '')
        .replace(/\/\/ Prometheus Metrics Endpoint[\s\S]*?app\.get\('\/metrics'[\s\S]*?\}\);\r?\n?/g, '');
      fs.writeFileSync(appPath, appContent, 'utf8');
    }
  }

  // 5. Package JSON adjustments
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      packageJson.name = projectName;

      const deps = packageJson.dependencies || {};
      const devDeps = packageJson.devDependencies || {};
      const scripts = packageJson.scripts || {};

      if (database === 'postgres') {
        delete deps['mongoose'];
      } else if (database === 'mongodb') {
        delete deps['@prisma/client'];
        delete devDeps['prisma'];
        delete packageJson['prisma'];
        delete scripts['db:migrate'];
        delete scripts['db:seed'];
      }

      if (eventBus === 'redis') {
        delete deps['amqplib'];
        delete deps['kafkajs'];
        delete devDeps['@types/amqplib'];
      } else if (eventBus === 'rabbitmq') {
        delete deps['ioredis'];
        delete deps['kafkajs'];
      } else if (eventBus === 'kafka') {
        delete deps['ioredis'];
        delete deps['amqplib'];
        delete devDeps['@types/amqplib'];
      }

      if (!includeTesting) {
        delete devDeps['vitest'];
        delete devDeps['supertest'];
        delete devDeps['@vitest/coverage-v8'];
        delete devDeps['vitest-mock-extended'];
        delete scripts['test'];
        delete scripts['test:watch'];
        delete scripts['test:coverage'];
      }

      if (!includeMetrics) {
        delete deps['prom-client'];
        delete deps['swagger-ui-express'];
        delete devDeps['@types/swagger-ui-express'];
      }

      packageJson.dependencies = deps;
      packageJson.devDependencies = devDeps;
      packageJson.scripts = scripts;

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    } catch (err) {
      console.log(red('⚠️ Warning: Failed to customize package.json.'), err);
    }
  }

  // 6. env.example adjustments
  const envExamplePath = path.join(targetDir, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    try {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      if (database === 'mongodb') {
        envContent = envContent.replace(/DATABASE_URL="postgresql:\/\/[\s\S]*?"/g, 'MONGODB_URI="mongodb://localhost:27017/base_backend"');
      }
      if (eventBus === 'rabbitmq') {
        envContent += '\nRABBITMQ_URI="amqp://localhost:5672"\n';
      }
      if (eventBus === 'kafka') {
        envContent += '\nKAFKA_BROKERS="localhost:9092"\n';
      }
      fs.writeFileSync(envExamplePath, envContent, 'utf8');
    } catch (err) {
      console.log(red('⚠️ Warning: Failed to customize .env.example.'));
    }
  }

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
  if (database === 'postgres') {
    console.log(cyan(`  npx prisma generate`));
  }
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
