#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import pc from 'picocolors';

// Setup __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    console.log(pc.cyan(pc.bold('\n✨ Welcome to Sparks! Let\'s build your digital garden.\n')));

    const response = await prompts([
        {
            type: 'text',
            name: 'projectName',
            message: 'What is the name of your project?',
            initial: 'my-digital-garden',
            validate: (value) =>
                value.trim().length > 0 ? true : 'Project name cannot be empty'
        }
    ]);

    const projectName = response.projectName;
    if (!projectName) {
        console.log(pc.red('Operation cancelled.'));
        process.exit(1);
    }

    const targetDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
        console.log(pc.red(`\n❌ Error: Directory "${projectName}" already exists.`));
        process.exit(1);
    }

    // Find the template. 
    // In a monorepo, if running locally, it's at ../../../templates/nextjs-basic
    // Once published to npm, it will be bundled inside the package (e.g., ../templates/nextjs-basic)
    const templateDir = path.resolve(__dirname, '../../../templates/nextjs-basic');

    console.log(pc.blue(`\nScaffolding project in ${targetDir}...`));

    // 1. Copy the template folder to the target directory
    fs.cpSync(templateDir, targetDir, { recursive: true });

    // 2. Rename _gitignore to .gitignore (NPM renames .gitignore during publish)
    const gitignorePath = path.join(targetDir, '_gitignore');
    if (fs.existsSync(gitignorePath)) {
        fs.renameSync(gitignorePath, path.join(targetDir, '.gitignore'));
    }

    // 3. Update the package.json with the user's project name
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        pkg.name = projectName;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    console.log(pc.green('\n✅ Success! Your digital garden is ready.\n'));
    console.log('Next steps:');
    console.log(pc.cyan(`  cd ${projectName}`));
    console.log(pc.cyan('  bun install'));
    console.log(pc.cyan('  bun run dev\n'));
}

run().catch((err) => {
    console.error(pc.red('\nAn unexpected error occurred:'));
    console.error(err);
    process.exit(1);
});
