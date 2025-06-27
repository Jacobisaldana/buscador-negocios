const fs = require('fs');
const path = require('path');

// Leer el archivo .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('Archivo .env no encontrado. Copia .env.template a .env y configura tu API Key.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/REACT_APP_GOOGLE_PLACES_API_KEY=(.+)/);

if (!apiKeyMatch || apiKeyMatch[1] === 'tu_api_key_aqui') {
  console.error('API Key no configurada en .env. Reemplaza "tu_api_key_aqui" con tu API Key real.');
  process.exit(1);
}

const apiKey = apiKeyMatch[1].trim();

// Verificar si el HTML ya tiene la API Key correcta
const htmlPath = path.join(__dirname, 'public', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

if (htmlContent.includes(apiKey)) {
  console.log('HTML ya tiene la API Key correcta');
  process.exit(0);
}

// Actualizar el archivo HTML
htmlContent = htmlContent.replace(/key=[^&"]*/, `key=${apiKey}`);

fs.writeFileSync(htmlPath, htmlContent);
console.log('HTML actualizado con la API Key');