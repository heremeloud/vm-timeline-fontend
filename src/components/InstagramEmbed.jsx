import { useEffect } from "react";

export default function InstagramEmbed({ url }) {
    useEffect(() => {
        const process = () => {
            if (window.instgrm?.Embeds?.process) {
                window.instgrm.Embeds.process();
            }
        };

        if (!window.instgrm) {
            const script = document.createElement("script");
            script.src = "https://www.instagram.com/embed.js";
            script.async = true;
            script.onload = process;
            document.body.appendChild(script);
        } else {
            process();
        }
    }, [url]);

    return (
        <blockquote
            className="instagram-media"
            data-instgrm-permalink={url}
            data-instgrm-version="14"
            data-instgrm-captioned="true"
            style={{ width: "100%", margin: 0, padding: 0 }}
        ></blockquote>
    );
}
