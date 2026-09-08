import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneModel as p } from '../src/lib/phoneModel.ts';

test('phone screen preserves crop proportions and an even bezel', () => {
  const horizontalInset = (p.width - p.screenWidth) / 2;
  const verticalInset = (p.height - p.screenHeight) / 2;
  assert.ok(Math.abs(horizontalInset - verticalInset) < .0001, 'Bottom and side bezels should have equal physical width');
  assert.ok(Math.abs(p.crop.width / p.crop.height / (p.screenWidth / p.screenHeight) - 1) < .001, 'Artwork must not be visibly stretched');
  assert.ok(p.screenRadius < p.radius && p.screenRadius > 0);
  assert.ok(p.crop.x > 176 && p.crop.y > 527, 'Crop must sit inside the baked-in image frame');
  assert.ok(p.crop.x + p.crop.width < 1144 && p.crop.y + p.crop.height < 2630);
});
