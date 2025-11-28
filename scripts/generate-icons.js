
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_ICON = path.join(__dirname, '../public/icons/icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
    if (!fs.existsSync(SOURCE_ICON)) {
        console.error(`Source icon not found at ${SOURCE_ICON}`);
        process.exit(1);
    }

    console.log('Generating icons...');

    for (const size of SIZES) {
        const fileName = `icon-${size}x${size}.png`;
        const outputPath = path.join(OUTPUT_DIR, fileName);

        try {
            await sharp(SOURCE_ICON)
                .resize(size, size)
                .png()
                .toFile(outputPath);

            console.log(`✅ Generated ${fileName}`);
        } catch (error) {
            console.error(`❌ Error generating ${fileName}:`, error);
        }
    }

    console.log('Done!');
}

generateIcons();
