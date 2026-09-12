import { toSvg } from "html-to-image";

// Chrome and Safari both refuse very large canvases, so cap the pixels rather than fail late.
const MAX_PIXELS = 12e6;
const MAX_SCALE = 2;

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = async () => {
            try {
                if (image.decode) await image.decode();
                if (!image.naturalWidth) throw new Error("empty image");
                resolve(image);
            } catch { reject(new Error("the image could not be decoded")); }
        };
        image.onerror = () => reject(new Error("the drawing could not be rendered"));
        image.src = url;
    });
}


function fromCanvas(image, maxDimension = 2048) {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
}

async function fromNetwork(url) {
    const response = await fetch(url, { mode: "cors", credentials: "omit", cache: "reload" });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("could not read the image"));
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// Return decoded, origin-clean images without changing the React-owned DOM.
// Processing sequentially bounds peak image-decoding memory on mobile devices.
export async function inlineImages(root) {
    const portraits = [];
    const rootBox = root.getBoundingClientRect();
    for (const node of root.querySelectorAll("img.relationship-chart-portrait")) {
        const source = node.currentSrc || node.src;
        if (!source) continue;
        let png;
        try {
            if (!node.complete || !node.naturalWidth) throw new Error("not loaded");
            png = fromCanvas(node);
        } catch {
            try {
                const url = source.startsWith("data:") ? source : await fromNetwork(source);
                png = fromCanvas(await loadImage(url));
            } catch {
                throw new Error("a character photo could not be loaded for export. Please retry when the photo is visible");
            }
        }
        const image = await loadImage(png);
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        portraits.push({ node, image, x: box.left - rootBox.left, y: box.top - rootBox.top,
            width: box.width, height: box.height,
            radii: [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius],
            objectPosition: style.objectPosition,
        });
    }
    return portraits;
}

// Rounded clipping and object-fit: cover are applied directly on the final canvas.
// This avoids embedded raster images inside SVG foreignObject on iOS WebKit.
export function paintPortrait(context, portrait) {
    const { image, x, y, width: w, height: h } = portrait;
    if (!w || !h) return;
    const radius = (value, size) => value.endsWith("%") ? parseFloat(value) * size / 100 : parseFloat(value) || 0;
    const corners = portrait.radii.map((value) => {
        const parts = value.split(/\s+/);
        return [Math.min(w / 2, radius(parts[0], w)), Math.min(h / 2, radius(parts[1] || parts[0], h))];
    });
    const [tl, tr, br, bl] = corners;
    context.save();
    context.beginPath();
    context.moveTo(x + tl[0], y);
    context.lineTo(x + w - tr[0], y);
    context.ellipse(x + w - tr[0], y + tr[1], tr[0], tr[1], 0, -Math.PI / 2, 0);
    context.lineTo(x + w, y + h - br[1]);
    context.ellipse(x + w - br[0], y + h - br[1], br[0], br[1], 0, 0, Math.PI / 2);
    context.lineTo(x + bl[0], y + h);
    context.ellipse(x + bl[0], y + h - bl[1], bl[0], bl[1], 0, Math.PI / 2, Math.PI);
    context.lineTo(x, y + tl[1]);
    context.ellipse(x + tl[0], y + tl[1], tl[0], tl[1], 0, Math.PI, Math.PI * 1.5);
    context.closePath();
    context.clip();
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const dw = image.naturalWidth * scale, dh = image.naturalHeight * scale;
    const position = (portrait.objectPosition || "50% 50%").split(/\s+/);
    const offset = (value, space) => value?.endsWith("%") ? space * parseFloat(value) / 100 : parseFloat(value) || 0;
    context.drawImage(image, x + offset(position[0], w - dw), y + offset(position[1] || "50%", h - dh), dw, dh);
    context.restore();
}

// html-to-image's own toPng waits on requestAnimationFrame, which never fires in a background tab,
// so this drives the canvas step directly and reports which stage failed.
export async function elementToPngBlob(element, options = {}) {
    const { backgroundColor = "#ffffff", aspectRatio = null, portraits = [], ...rest } = options;
    const photoNodes = new Set(portraits.map((portrait) => portrait.node));
    const filter = (node) => !photoNodes.has(node) && (!rest.filter || rest.filter(node));
    let svgUrl;
    try {
        svgUrl = await toSvg(element, { backgroundColor, ...rest, filter });
    } catch (error) {
        try {
            svgUrl = await toSvg(element, { backgroundColor, ...rest, filter, skipFonts: true });
        } catch {
            throw new Error(`the chart could not be copied (${error?.message || error})`);
        }
    }
    const image = await loadImage(svgUrl);
    const width = element.offsetWidth || image.width, height = element.offsetHeight || image.height;
    // Pad the drawing out to the asked-for frame so every export comes back the same shape.
    let frameWidth = width, frameHeight = height;
    if (aspectRatio) {
        if (width / height >= aspectRatio) frameHeight = width / aspectRatio;
        else frameWidth = height * aspectRatio;
    }
    const scale = Math.min(MAX_SCALE, Math.sqrt(MAX_PIXELS / Math.max(1, frameWidth * frameHeight)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(frameWidth * scale));
    canvas.height = Math.max(1, Math.round(frameHeight * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, Math.round((frameWidth - width) / 2 * scale), Math.round((frameHeight - height) / 2 * scale),
        Math.round(width * scale), Math.round(height * scale));
    context.save();
    context.translate(Math.round((frameWidth - width) / 2 * scale), Math.round((frameHeight - height) / 2 * scale));
    context.scale(Math.round(width * scale) / width, Math.round(height * scale) / height);
    for (const portrait of portraits) paintPortrait(context, portrait);
    context.restore();
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("the image came out empty")), "image/png");
        } catch (error) {
            reject(new Error(`the image could not be saved (${error?.message || error})`));
        }
    });
}
