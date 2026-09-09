import { toSvg } from "html-to-image";

// Chrome and Safari both refuse very large canvases, so cap the pixels rather than fail late.
const MAX_PIXELS = 12e6;
const MAX_SCALE = 2;

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("the drawing could not be rendered"));
        image.src = url;
    });
}

function whenLoaded(image) {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 3000);
    });
}

function fromCanvas(image) {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    canvas.getContext("2d").drawImage(image, 0, 0);
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

// Bakes every portrait into the node as a data URL before drawing. html-to-image's own fetch path
// caches a failure for the whole page, and Safari will not hand back a canvas-clean copy of an
// image it already cached without CORS, so try the canvas first and the network second.
export async function inlineImages(root) {
    await Promise.all([...root.querySelectorAll("img")].map(async (image) => {
        const source = image.src;
        if (!source || source.startsWith("data:")) return;
        await whenLoaded(image);
        if (image.naturalWidth) {
            try {
                image.src = fromCanvas(image);
                return;
            } catch {
                // Tainted canvas: the image was fetched without CORS. Fall through to the network.
            }
        }
        try {
            image.src = await fromNetwork(source);
        } catch {
            // Leave the original URL; html-to-image gets one more try at it.
            image.src = source;
        }
    }));
}

// html-to-image's own toPng waits on requestAnimationFrame, which never fires in a background tab,
// so this drives the canvas step directly and reports which stage failed.
export async function elementToPngBlob(element, options = {}) {
    const { backgroundColor = "#ffffff", aspectRatio = null, ...rest } = options;
    let svgUrl;
    try {
        svgUrl = await toSvg(element, { backgroundColor, ...rest });
    } catch (error) {
        try {
            svgUrl = await toSvg(element, { backgroundColor, ...rest, skipFonts: true });
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
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("the image came out empty")), "image/png");
        } catch (error) {
            reject(new Error(`the image could not be saved (${error?.message || error})`));
        }
    });
}
