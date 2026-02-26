const text = "I will re-examine the `skills/nano-banana-pro/scripts/image.py` Python script to ensure it's correctly using the `generate_images` method";
const imageAssetRegex = /(!\[.*?\]\(.*?\)|\bmedia\/[^\s)\]<"']+\.(?:png|jpe?g|webp|gif|svg))/g;
const mainChunks = text.split(imageAssetRegex);

console.log("mainChunks:", mainChunks);

mainChunks.forEach((mainChunk, mainIdx) => {
    if (!mainChunk) return;
    if (mainChunk.match(imageAssetRegex)) {
        console.log("Matched image:", mainChunk);
    } else {
        const codeChunks = mainChunk.split(/`([^`]+)`/g);
        console.log("codeChunks:", codeChunks);
        codeChunks.forEach((chunk, i) => {
            console.log(`  i=${i}, isCode=${i % 2 === 1}: '${chunk}'`);
        });
    }
});
