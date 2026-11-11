const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Metro reads PNG buffers and file paths with its image dependency', async () => {
  // Exercise Metro's actual consumer API, not image-size in isolation.
  const { getAssetSize, getAssetData } = require(path.resolve('node_modules/metro/src/Assets.js'));
  const imageDirectory = path.resolve('assets/images');
  const images = fs.readdirSync(imageDirectory).filter(name => name.endsWith('.png'));
  assert.ok(images.length > 0);
  for (const name of images) {
    const dimensions = getAssetSize('png', fs.readFileSync(path.join(imageDirectory, name)), name);
    assert.ok(dimensions.width > 0 && dimensions.height > 0, name);
  }
  const asset = await getAssetData(path.join(imageDirectory, 'icon.png'), 'assets/images/icon.png', [], 'web', '/assets');
  assert.ok(asset.width > 0 && asset.height > 0);
});
