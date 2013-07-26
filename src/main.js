/* global Twitch:true, $:true, async:true */

if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] !== "undefined" ? args[number] : match;
        });
    };
}

(function () {
    "use strict";

    var EMBED_WIDTH = $("#stream").width(),
        EMBED_HEIGHT = EMBED_WIDTH / 16 * 9,
        CHAT_WIDTH = EMBED_WIDTH,
        CHAT_HEIGHT = 335,

        MENU_ITEM = $("#menu_item").html(),
        TWITCH_EMBED = $("#twitch_embed").html(),
        TWITCH_CHAT = $("#twitch_chat").html(),

        $stream = $("#stream"),
        $streams = $("#streams"),
        $title = $("#title"),
        $refresh = $("#refresh"),

        cachedData;

    /*
    EMBED_WIDTH = 400;
    EMBED_HEIGHT = 300;
    CHAT_WIDTH = 350;
    CHAT_HEIGHT = 300;
    */

    function init() {
        async.parallel([
            initTwitch,
            initData
        ], function (err, res) {
            if (err) {
                return error(err);
            }

            cachedData = res[1];
            getStreams(cachedData);
        });

        $refresh.on("click", function () {
            $streams.html("<li>Loading streams...</li>");
            getStreams(cachedData);
        });
    }

    function initTwitch(cb) {
        Twitch.init({"clientId": "4osl8fgjiguf0jao9kuzq4zsezsrqhz"}, function (err, res) {
            if (err) {
                return cb(err);
            }

            cb(null, res);
        });
    }

    function initData(cb) {
        $.getJSON("data/streams.json", function (data) {
            cb(null, data);
        });
    }





    function getStreams(data) {
        async.parallel([
            function (cb) {
                getTwitchStreams(data["twitch.tv"], cb);
            }
        ], function (err, res) {
            var flattened;

            if (err) {
                return error(err);
            }

            $streams.empty();
            flattened = Array.prototype.concat.apply([], res);

            if (flattened.length === 0) {
                $streams.append($(MENU_ITEM.format("No streams are online :(")));
                return;
            }

            flattened.forEach(render);
        });
    }

    function getTwitchStreams(streams, cb) {
        Twitch.api({
            "method": "streams",
            "params": {
                "channel": streams.join(","),
                "limit": 100,
                "embeddable": true
            }
        }, function (err, res) {
            var i,
                data;

            if (err) {
                return cb(err);
            }

            if (res.streams.length === 0) {
                return cb(null, []);
            }

            data = [];
            for (i = 0; i < res.streams.length; ++i) {
                data.push({
                    "title": res.streams[i].channel.status,
                    "name": res.streams[i].channel.name,
                    "embed": TWITCH_EMBED.format(EMBED_WIDTH, EMBED_HEIGHT, res.streams[i].channel.name),
                    "chat": TWITCH_CHAT.format(CHAT_WIDTH, CHAT_HEIGHT, res.streams[i].channel.name),
                    "url": res.streams[i].channel.url
                });
            }

            cb(null, data);
        });
    }


    function render(val) {
        var el;

        el = $(MENU_ITEM.format(val.name));
        el.on("click", function () {
            $title.text(val.title || val.name);
            $title.attr("href", val.url);
            $stream.html(val.embed);
            $stream.append(val.chat);
        });
        $streams.append(el);
    }

    function error(msg) {
        $("#stream").text(msg);
    }

    init();
})();
