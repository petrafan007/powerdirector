const text = "I will re-examine the `skills/nano-banana-pro/scripts/image.py` Python script... **Icon Details (media/powerdirector-icon.png)**:";
const imageAssetRegex = /(!\[.*?\]\(.*?\)|\bmedia\/[^\s)\]<"']+\.(?:png|jpe?g|webp|gif|svg))/g;
const mainChunks = text.split(imageAssetRegex);
console.log("mainChunks:", mainChunks);
mainChunks.forEach((chunk, idx) => {
    if (!chunk) return;
    if (chunk.match(imageAssetRegex)) console.log(`[${idx}] MATCH:`, chunk);
    else {
        console.log(`[${idx}] TEXT:`, chunk);
        const codeChunks = chunk.split(/`([^`]+)`/g);
        codeChunks.forEach((c, i) => {
            console.log(`   codeChunk[${i}] (isCode: ${i % 2 === 1}) ->`, c);
        });
    }
});
