import test from 'node:test';
import assert from 'node:assert/strict';
import { paintPortrait, inlineImages } from './chartImage.js';

function recordingContext() {
    const calls = [];
    const context = Object.fromEntries(['save', 'restore', 'beginPath', 'moveTo', 'lineTo', 'ellipse', 'closePath', 'clip', 'drawImage'].map((name) => [name, (...args) => calls.push([name, ...args])]));
    return { context, calls };
}

test('portrait is painted directly after rounded clipping with a centered cover crop', () => {
    const { context, calls } = recordingContext();
    const image = { naturalWidth: 400, naturalHeight: 200 };
    paintPortrait(context, { image, x: 20, y: 30, width: 100, height: 120,
        radii: ['46% 40%', '46% 40%', '15% 13%', '15% 13%'], objectPosition: '50% 50%' });
    assert.deepEqual(calls.find(([name]) => name === 'drawImage'), ['drawImage', image, -50, 30, 240, 120]);
    const arcs = calls.filter(([name]) => name === 'ellipse');
    assert.equal(arcs.length, 4);
    assert.equal(arcs[0][3], 46);
    assert.equal(arcs[0][4], 48);
    assert.ok(calls.findIndex(([name]) => name === 'clip') < calls.findIndex(([name]) => name === 'drawImage'));
    assert.deepEqual(calls.at(-1), ['restore']);
});

test('portrait respects non-centered object position', () => {
    const { context, calls } = recordingContext();
    const image = { naturalWidth: 400, naturalHeight: 200 };
    paintPortrait(context, { image, x: 20, y: 30, width: 100, height: 120,
        radii: ['0px', '0px', '0px', '0px'], objectPosition: '100% 50%' });
    assert.deepEqual(calls.find(([name]) => name === 'drawImage'), ['drawImage', image, -120, 30, 240, 120]);
});

test('charts with placeholder portraits need no raster image preparation', async () => {
    assert.deepEqual(await inlineImages({ getBoundingClientRect: () => ({left:0,top:0}), querySelectorAll: () => [] }), []);
});
