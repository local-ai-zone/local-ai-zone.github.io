const fs = require('fs');
const cheerio = require('cheerio');

const mainHtml = fs.readFileSync('index.html', 'utf8');
const $main = cheerio.load(mainHtml);

const blogHtml = fs.readFileSync('guides/ai-coding-prompts-master-techniques-2025.html', 'utf8');
const $blog = cheerio.load(blogHtml);

console.log('Main site header elements:', $main('header.premium-header *').length);
console.log('Blog post header elements:', $blog('header.premium-header *').length);

console.log('\nMain site footer elements:', $main('footer.premium-footer *').length);
console.log('Blog post footer elements:', $blog('footer.premium-footer *').length);

// Check if classes match
const mainHeaderClasses = new Set();
$main('header.premium-header *').each((i, el) => {
    const cls = $main(el).attr('class');
    if (cls) cls.split(/\s+/).forEach(c => mainHeaderClasses.add(c));
});

const blogHeaderClasses = new Set();
$blog('header.premium-header *').each((i, el) => {
    const cls = $blog(el).attr('class');
    if (cls) cls.split(/\s+/).forEach(c => blogHeaderClasses.add(c));
});

const commonClasses = [...mainHeaderClasses].filter(c => blogHeaderClasses.has(c));
console.log('\nHeader class overlap:', commonClasses.length, '/', Math.max(mainHeaderClasses.size, blogHeaderClasses.size));
console.log('Similarity:', ((commonClasses.length / Math.max(mainHeaderClasses.size, blogHeaderClasses.size)) * 100).toFixed(1) + '%');
