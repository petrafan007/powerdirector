/**
 * Test script for the new PowerDirector-style image generation router
 * 
 * Run with: npx ts-node tests/verify-image-gen-router.ts
 */

import {
    generateImageWithFallback,
    coerceImageGenModelConfig,
    isImageGenConfigured,
    type ImageGenModelConfig,
    type ImageGenRouterConfig,
} from '../src/tools/image-gen-router';

// Mock config for testing
const mockConfig = {
    agents: {
        defaults: {
            imageGenModel: {
                primary: 'skill:nano-banana-pro',
                fallbacks: ['google/imagen-3.0-generate-001', 'openai/dall-e-3'],
            },
        },
    },
};

// Test 1: Config coercion
console.log('\n=== Test 1: Config Coercion ===');
const coerced = coerceImageGenModelConfig(mockConfig);
console.log('Coerced config:', JSON.stringify(coerced, null, 2));
console.log('Is configured:', isImageGenConfigured(coerced));

// Test 2: Parse model references
console.log('\n=== Test 2: Model Reference Parsing ===');
const testRefs = [
    'skill:nano-banana-pro',
    'google/imagen-3.0-generate-001',
    'openai/dall-e-3',
    'stability/sd3.5-large',
    'invalid-format',
    '',
];

for (const ref of testRefs) {
    const hasSkill = ref.startsWith('skill:');
    const hasSlash = ref.includes('/');
    console.log(`  "${ref}" -> type: ${hasSkill ? 'skill' : hasSlash ? 'provider/model' : 'invalid'}`);
}

// Test 3: Candidate resolution
console.log('\n=== Test 3: Candidate Resolution ===');
const testConfigs: ImageGenModelConfig[] = [
    { primary: 'skill:nano-banana-pro', fallbacks: ['google/imagen-3.0-generate-001'] },
    { primary: 'google/imagen-3.0-generate-001' },
    { fallbacks: ['openai/dall-e-3'] },
    {},
];

for (const cfg of testConfigs) {
    const candidates: string[] = [];
    if (cfg.primary?.trim()) candidates.push(cfg.primary.trim());
    for (const fb of cfg.fallbacks ?? []) {
        if (fb?.trim()) candidates.push(fb.trim());
    }
    console.log(`  Config: ${JSON.stringify(cfg)}`);
    console.log(`  Candidates: ${candidates.length > 0 ? candidates.join(', ') : '(none)'}`);
    console.log(`  Is configured: ${isImageGenConfigured(cfg)}`);
    console.log('');
}

// Test 4: Verify config.json has correct structure
console.log('\n=== Test 4: Config File Structure ===');
import fs from 'fs';
try {
    const configPath = './powerdirector.config.json';
    const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const imageGenModel = rawConfig?.agents?.defaults?.imageGenModel;
    
    if (imageGenModel) {
        console.log('✅ imageGenModel found in config:');
        console.log(`   primary: ${imageGenModel.primary}`);
        console.log(`   fallbacks: ${JSON.stringify(imageGenModel.fallbacks)}`);
    } else {
        console.log('❌ imageGenModel NOT found in config');
    }
} catch (error: any) {
    console.log(`❌ Error reading config: ${error.message}`);
}

// Test 5: Verify schema includes imageGenModel
console.log('\n=== Test 5: Schema Verification ===');
try {
    const schemaPath = './src/config/config-schema.ts';
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    if (schemaContent.includes('imageGenModel')) {
        console.log('✅ imageGenModel found in config-schema.ts');
    } else {
        console.log('❌ imageGenModel NOT found in config-schema.ts');
    }
} catch (error: any) {
    console.log(`❌ Error reading schema: ${error.message}`);
}

// Test 6: Verify tool registry wiring
console.log('\n=== Test 6: Tool Registry Wiring ===');
try {
    const registryPath = './ui/lib/registry/tools.ts';
    const registryContent = fs.readFileSync(registryPath, 'utf8');
    
    if (registryContent.includes('coerceImageGenModelConfig')) {
        console.log('✅ coerceImageGenModelConfig imported in tools.ts');
    } else {
        console.log('❌ coerceImageGenModelConfig NOT imported in tools.ts');
    }
    
    if (registryContent.includes('imageGenModel:')) {
        console.log('✅ imageGenModel passed to ImageGenTool');
    } else {
        console.log('❌ imageGenModel NOT passed to ImageGenTool');
    }
} catch (error: any) {
    console.log(`❌ Error reading registry: ${error.message}`);
}

console.log('\n=== All Tests Complete ===\n');