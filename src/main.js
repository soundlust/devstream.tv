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


    function init() {
        async.parallel([
            initTwitch,
            initData
        ], function (err, res) {
            if (err) {
                return error(err);
            }

            getStreams(res[1]);
        });

        $refresh.on("click", function () {
            getStreams();
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




    function sortByViewers(a, b) {
        return a.views - b.views;
    }

    function getStreams(data) {
        var count = 0,
            key;

        //either cache data or load data from cache
        if (data === undefined) {
            data = cachedData;
        } else {
            cachedData = data;
        }

        //count total streams
        for (key in data) {
            if (data.hasOwnProperty(key)) {
                count += data[key].length;
            }
        }

        $streams.html("<li>Checking {0} streams...</li>".format(count));

        //check streams on each streaming service
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
                $streams.html("<li>No streams are online :(</li>");
                return;
            }

            flattened.sort(sortByViewers);
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
            var data;

            if (err) {
                return cb(err);
            }

            if (res.streams.length === 0) {
                return cb(null, []);
            }

            data = [];
            res.streams.forEach(function (val) {
                data.push({
                    "title": val.channel.status,
                    "name": val.channel.name,
                    "embed": TWITCH_EMBED.format(EMBED_WIDTH, EMBED_HEIGHT, val.channel.name),
                    "chat": TWITCH_CHAT.format(CHAT_WIDTH, CHAT_HEIGHT, val.channel.name),
                    "url": val.channel.url,
                    "viewers": val.viewers
                });
            });

            cb(null, data);
        });
    }


    function render(val) {
        var el;

        el = $(MENU_ITEM.format(val.name, val.viewers));
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
