import fs from 'fs';
import path from 'path';
import { CardEngine } from '../src/engine.js';

const processDir = (baseDir) => {
    const cardsDir = path.resolve(baseDir);
    if (!fs.existsSync(cardsDir)) return;

    const dirs = fs.readdirSync(cardsDir).filter(f => fs.statSync(path.join(cardsDir, f)).isDirectory() && f.startsWith('dm-'));

    for (const dir of dirs) {
        const metadataPath = path.join(cardsDir, dir, 'metadata.json');
        if (!fs.existsSync(metadataPath)) continue;

        console.log(`Processing ${metadataPath}...`);
        const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

        let modified = false;
        for (const card of data) {
            const abilities = CardEngine.parseAbilities(card, null, null);
            
            if (Object.keys(abilities).length > 0) {
                card.abilities = abilities;
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
            console.log(`Updated ${metadataPath}`);
        } else {
            console.log(`No changes for ${metadataPath}`);
        }
    }
}

processDir('cards');
processDir('public/cards');
