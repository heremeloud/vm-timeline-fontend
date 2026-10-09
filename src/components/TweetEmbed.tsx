import { useEffect } from "react";
import useNearViewport from "../hooks/useNearViewport";

export default function TweetEmbed({ url }: { url: string }) {
    const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();

    useEffect(() => {
        if (!isNearViewport) return;

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
    }, [url, isNearViewport]);

    return (
        <div ref={ref} className="tweet-embed-wrapper">
            {isNearViewport ? (
                <blockquote className="twitter-tweet" data-conversation="none">
                    <a href={url}></a>
                </blockquote>
            ) : (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    View post on X
                </a>
            )}
        </div>
    );
}
