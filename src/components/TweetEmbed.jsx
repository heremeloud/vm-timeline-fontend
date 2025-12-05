import { useEffect } from "react";

export default function TweetEmbed({ url }) {
    // useEffect(() => {
    //     if (!window._twScriptLoaded) {
    //         const tw = document.createElement("script");
    //         tw.src = "https://platform.twitter.com/widgets.js";
    //         tw.async = true;
    //         document.body.appendChild(tw);
    //         window._twScriptLoaded = true;
    //     }
    // }, []);
    useEffect(() => {
        if (!window._twitterLoaded) {
            const tw = document.createElement("script");
            tw.src = "https://platform.twitter.com/widgets.js";
            tw.async = true;
            document.body.appendChild(tw);
            window._twitterLoaded = true;
        } else {
            window.twttr?.widgets?.load();
        }
    }, [posts]);

    return (
        <div className="tweet-embed-wrapper">
            <blockquote className="twitter-tweet" data-conversation="none">
                <a href={url}></a>
            </blockquote>
        </div>
    );
}
