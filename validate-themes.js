const fs = require('fs');
const path = require('path');

const themesDir = './themes';

function validateTheme(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const theme = JSON.parse(content);

        // Basic validation: check if it's a valid JSON and has required fields
        if (!theme.name) {
            console.error(`Theme ${filePath} is missing 'name' field`);
            return false;
        }
        if (!theme.colors) {
            console.error(`Theme ${filePath} is missing 'colors' field`);
            return false;
        }
        if (!theme.tokenColors) {
            console.error(`Theme ${filePath} is missing 'tokenColors' field`);
            return false;
        }

        console.log(`Theme ${filePath} is valid`);
        return true;
    } catch (error) {
        console.error(`Error validating theme ${filePath}: ${error.message}`);
        return false;
    }
}

function main() {
    if (!fs.existsSync(themesDir)) {
        console.error(`Themes directory '${themesDir}' does not exist`);
        process.exit(1);
    }

    const files = fs.readdirSync(themesDir).filter(file => file.endsWith('.json'));
    let allValid = true;

    for (const file of files) {
        const filePath = path.join(themesDir, file);
        if (!validateTheme(filePath)) {
            allValid = false;
        }
    }

    if (allValid) {
        console.log('All themes are valid');
        process.exit(0);
    } else {
        console.error('Some themes are invalid');
        process.exit(1);
    }
}

main();