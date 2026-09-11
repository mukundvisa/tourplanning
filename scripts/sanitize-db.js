require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function clean(html) {
  if (!html) return html;
  return html
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/style=(['"]).*?\1/gi, '')
    .replace(/<span\s*>\s*(.*?)\s*<\/span>/gi, '$1')
    .trim();
}

async function run() {
  const places = await prisma.masterPlace.findMany();
  for (const p of places) {
    if (p.description) {
      const sanitized = clean(p.description);
      if (sanitized !== p.description) {
        await prisma.masterPlace.update({
          where: { id: p.id },
          data: { description: sanitized }
        });
        console.log('Sanitized place:', p.name);
      }
    }
  }
  console.log('Finished sanitizing database records.');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
