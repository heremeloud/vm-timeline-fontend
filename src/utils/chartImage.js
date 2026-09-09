import { toSvg } from "html-to-image";

// Chrome and Safari both refuse very large canvases, so cap the pixels rather than fail late.
const MAX_PIXELS = 16e6;
const MAX_SCALE = 2;

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("the drawing could not be rendered"));
        image.src = url;
    });
}

// html-to-image's own toPng waits on requestAnimationFrame, which never fires in a background tab,
// so this drives the canvas step directly and reports which stage failed.
export async function elementToPngBlob(element, options = {}) {
    const { backgroundColor = "#ffffff", ...rest } = options;
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
    const scale = Math.min(MAX_SCALE, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("the image came out empty")), "image/png");
        } catch (error) {
            reject(new Error(`the image could not be saved (${error?.message || error})`));
        }
    });
}
