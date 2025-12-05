import { useEffect } from "react";

export default function TweetEmbed({ url }) {
    useEffect(() => {
        if (!window._twScriptLoaded) {
            const tw = document.createElement("script");
            tw.src = "https://platform.twitter.com/widgets.js";
            tw.async = true;
            document.body.appendChild(tw);
            window._twScriptLoaded = true;
        }
    }, []);
    

    return (
        <div className="tweet-embed-wrapper">
            <blockquote className="twitter-tweet" data-conversation="none">
                <a href={url}></a>
            </blockquote>
        </div>
    );
}
