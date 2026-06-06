import { useEffect } from "react";

export default function TweetEmbed({ url }) {
    useEffect(() => {
        const loadTweet = () => {
            window.twttr?.widgets?.load();
        };

        if (!window._twScriptLoaded) {
            const tw = document.createElement("script");
            tw.src = "https://platform.twitter.com/widgets.js";
            tw.async = true;
            tw.onload = loadTweet;
            document.body.appendChild(tw);
            window._twScriptLoaded = true;
        } else {
            setTimeout(loadTweet, 0);
        }
    }, [url]);

    return (
        <div className="tweet-embed-wrapper">
            <blockquote className="twitter-tweet" data-conversation="none">
                <a href={url}></a>
            </blockquote>
        </div>
    );
}
