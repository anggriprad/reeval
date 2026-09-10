const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://emsifa.github.io/api-wilayah-indonesia/api';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  }
  return res.json();
}

async function run() {
  console.log('Fetching provinces...');
  const provinces = await fetchJson(`${BASE_URL}/provinces.json`);
  
  let allRegencies = [];
  let allDistricts = [];

  console.log(`Found ${provinces.length} provinces. Fetching regencies and districts...`);
  
  // Limiting to Jawa Barat (32) and DKI Jakarta (31) and Banten (36) to avoid massive JSON size, 
  // or fetch all? The user asked for "data provinsi, kota/kabupaten, serta kecamatan...".
  // Fetching all might take a while, let's fetch all.
  for (let i = 0; i < provinces.length; i++) {
    const prov = provinces[i];
    console.log(`[${i+1}/${provinces.length}] Fetching regencies for province ${prov.name}...`);
    try {
      const regencies = await fetchJson(`${BASE_URL}/regencies/${prov.id}.json`);
      allRegencies.push(...regencies);

      for (let j = 0; j < regencies.length; j++) {
        const regency = regencies[j];
        const districts = await fetchJson(`${BASE_URL}/districts/${regency.id}.json`);
        allDistricts.push(...districts);
      }
    } catch (e) {
      console.warn(`Warning: Failed to fetch data for province ${prov.name}: ${e.message}`);
    }
  }

  const result = {
    provinces,
    regencies: allRegencies,
    districts: allDistricts
  };

  const outPath = path.join(__dirname, '../src/lib/regions.json');
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`Successfully saved to ${outPath} (Total Provinces: ${provinces.length}, Regencies: ${allRegencies.length}, Districts: ${allDistricts.length})`);
}

run().catch(console.error);
