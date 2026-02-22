/* DATA MANAGEMENT: GOOGLE SHEETS & MOCK DATA */

const CONFIG = {
    // Replace with your CSV URL
    csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTfX6o_W1y8q6v_r1R_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p_S1p/pub?output=csv',
    categories: ['Character', 'Monster', 'Pet', 'Item', 'Magic']
};

let rawData = [];

async function loadRealmData() {
    try {
        if (CONFIG.csvUrl.includes('S1p_S1p')) {
            console.log("Using internal archive (Mock Data)");
            rawData = getMockArchive();
        } else {
            const response = await fetch(CONFIG.csvUrl);
            const csvText = await response.text();
            rawData = parseCSV(csvText);
        }
    } catch (e) {
        console.error("Data Sync Failed:", e);
        rawData = getMockArchive();
    }
    return rawData;
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i];
        });
        return obj;
    });
}

function getMockArchive() {
    const data = [];
    const images = [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=600&fit=crop',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=600&fit=crop'
    ];
    
    CONFIG.categories.forEach(cat => {
        for (let i = 1; i <= 3; i++) {
            data.push({
                category: cat,
                name: `${cat} Legend ${i}`,
                nickname: `Title of ${cat}`,
                rarity: ['S', 'A', 'B', 'C', 'D'][Math.floor(Math.random() * 5)],
                main_image_url: images[i-1],
                extra_image_1: 'https://picsum.photos/400/400?random=1',
                extra_image_2: 'https://picsum.photos/400/400?random=2',
                extra_image_3: 'https://picsum.photos/400/400?random=3',
                tags: `${cat}, Power, Ancient`,
                story: `Born from the fragments of the old world, this ${cat} possesses power beyond mortal comprehension. Legend says that seeing its true form brings either infinite wisdom or eternal madness.`
            });
        }
    });
    return data;
}
