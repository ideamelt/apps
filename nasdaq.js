
// LOGGED IN

$(document).ready(function() {

Echo.Loader.initEnvironment(function() {

Echo.Loader.download([
		{'url': 'http://ideamelt.com/static/dev/im.library.js'},
		{'url': 'http://community-qc.nasdaq.com/common/templates/backplane-channel.ashx'},
		{'url': 'http://ideamelt.com/static/apps/nasdaq/im.library.js'}
	], function() {

	$.get(Backplane.getChannelID(), {}, function (data) {
		if (!data || !data.length) return;
		if (data.pop().message.type == "identity/login") {
			Backplane.expectMessagesWithin(5, ["identity/ack"]);
		}
	}, "jsonp");

    $.cookie('bp_channel_id', Backplane.getChannelID(), { path: '/', domain: '.nasdaq.com'});

    // disabling AJAX transport for IE
    if ($.browser && $.browser.msie && Echo && Echo.API) {
        Echo.API.Transports.AJAX.available = function() {
            return false;
        };
    }

    // init UserSession via HTTPS
    Echo.UserSession({
        "appkey": "echo.ideamelt.notifier.nasdaq.prod",
        "useSecureAPI": true
    });

    (function(jQuery) {
		"use strict";

		var $ = jQuery;

		var plugin = Echo.Plugin.manifest("PostButtonTypeChange", "Echo.StreamServer.Controls.Submit");

		if (Echo.Plugin.isDefined(plugin)) return;

		plugin.init = function() {
			this.extendTemplate("replace", "postButton",
				'<div class="{class:postButton} btn echo-primaryFont"></div>');
		};

		Echo.Plugin.create(plugin);

	})(Echo.jQuery);

	IdeaMelt.init({api_key: 'dev.nasdaq'});

    // now init all IdeaMelt apps		
	Echo.Loader.initApplication({
		'script': 'http://ideamelt.com/static/apps/nasdaq/im.thenotifier.js',
		'component': 'IdeaMelt.Apps.TheNotifier',
		'config': {
			"target": document.getElementById("notifier"),
            "appkey": 'echo.ideamelt.notifier.nasdaq.prod',
            "imAppkey": 'dev.nasdaq',
            "baseDomain": 'http://www.nasdaq.com/',
            "useSecureAPI": true,
            "ready": function() {
	          	notifier = this;

				$("#notifier").click(function() {
				if($(".ideameltnotifier-notifier-stream-frame").css("display")=="none")
					alert("notifier used");
					//triggerAsyncOmnitureEvent("event14","community:user:notifier");
			});
           }
            //"debug": true
		}
	});

	if(typeof imnewsFeed!='undefined') {
	   Echo.Loader.initApplication({
			'script': 'http://ideamelt.com/static/apps/nasdaq/im.socialstream.js',
			'component': 'IdeaMelt.Apps.SocialStream',
			'config': {
				"target": document.getElementById("activities"),
	          "appkey": 'echo.ideamelt.news-feed.nasdaq.prod',
	          "imAppkey": 'dev.nasdaq',
	          "namespace": 'nasdaq',
	          "baseDomain": 'http://nasdaq.com',
	          "pulseSource": 'Nasdaq',
	          "symbolLink": 'http://www-qc.nasdaq.com/symbol/[xxx]/stream',
	          "personalize": true, //optional boolean
	          "userUrls": false, //optional array
	          "filter": 'stories', //optional boolean
	          "useSecureAPI": true,
	          "autoReplyNotifs": true,
	          "autLikeNotifs": true,
	          "ready": function() {
	          	userstream = this;
	          }
			}
		});
    }
	else if(typeof imisProfile!='undefined') {
	   Echo.Loader.initApplication({
			'script': 'http://ideamelt.com/static/apps/nasdaq/im.socialstream.js',
			'component': 'IdeaMelt.Apps.SocialStream',
			'config': {
				"target": document.getElementById("activity"),
	          "appkey": 'echo.ideamelt.user-activity-feed.nasdaq.prod',
	          "imAppkey": 'dev.nasdaq',
	          "namespace": 'nasdaq',
	          "baseDomain": 'http://nasdaq.com',
	          "pulseSource": 'Nasdaq',
	          "symbolLink": 'http://www-qc.nasdaq.com/symbol/[xxx]/stream',
	          "personalize": false, //optional boolean
	          "userUrls": [imisProfile], //optional array
	          "filter": 'stories', //optional boolean
	          "useSecureAPI": true,
	          "autoReplyNotifs": true,
	          "autoLikeNotifs": true,
	          "ready": function() {
	          	userstream = this;
	          }
			}
		});
	}

	else if (myPage == 'companynewsstory') {
		Echo.Loader.initApplication({
			"script": "http://cdn.realtidbits.com/libs/v3/comments/comments.min.js",
			"component": "RTB.Apps.Comments",
			"config": {
				"cssURL": "http://realtidbits.com/libs/v3/comments/comments.css",
				"streamQuery": 'childrenof:'+document.location.href+' -user.state:ModeratorBanned -state:SystemFlagged,ModeratorFlagged,ModeratorDeleted,ModeratorBanned -source:Twitter sortOrder:reverseChronological itemsPerPage:15 safeHTML:permissive children:1 -state:SystemFlagged,ModeratorFlagged,ModeratorDeleted,ModeratorBanned -source:Twitter',
				"target": document.getElementById('articlecomments'),
				"appkey": 'echo.realtidbits.commenting.nasdaq.prod',
				"sharing": {"enabled": true},
				"auth": {"loginButton": false},
				"pageLike": {"enabled": false},
				"ready": function() {comments = this;},
				"plugins": {
					"formAuth": [],
					"reply": [{"name": "PostButtonTypeChange"}],
					"stream": [],
					"submit": [{"name": "PostButtonTypeChange"}]
				},
				"settings": {
					"tabs": {
						"social": false,
						"community": false
					},
					"tokbox": {"enabled": false},
					"topComments": {
						"enabled": false
					}	
				}
			}
		});

		IdeaMelt.EventHooks.rtbComments(comments, true, true);
	}
});
});
});





// NOT LOGGED IN

$(document).ready(function() {

Echo.Loader.initEnvironment(function() {

Echo.Loader.download([
		{'url': 'http://community-qc.nasdaq.com/common/scripts/jquery.cookie.js'},
		{'url': 'http://community-qc.nasdaq.com/common/templates/backplane-channel.ashx'},
		{'url': 'http://ideamelt.com/static/apps/nasdaq/im.library.js'}
	], function() {

	$.get(Backplane.getChannelID(), {}, function (data) {
		if (!data || !data.length) return;
		if (data.pop().message.type == "identity/login") {
			Backplane.expectMessagesWithin(5, ["identity/ack"]);
		}
	}, "jsonp");

    $.cookie('bp_channel_id', Backplane.getChannelID(), { path: '/', domain: '.nasdaq.com'});

    // disabling AJAX transport for IE
    if ($.browser && $.browser.msie && Echo && Echo.API) {
        Echo.API.Transports.AJAX.available = function() {
            return false;
        };
    }

    // init UserSession via HTTPS
    Echo.UserSession({
        "appkey": "echo.ideamelt.notifier.nasdaq.prod",
        "useSecureAPI": true
    });

    (function(jQuery) {
		"use strict";

		var $ = jQuery;

		var plugin = Echo.Plugin.manifest("PostButtonTypeChange", "Echo.StreamServer.Controls.Submit");

		if (Echo.Plugin.isDefined(plugin)) return;

		plugin.init = function() {
			this.extendTemplate("replace", "postButton",
				'<div class="{class:postButton} btn echo-primaryFont"></div>');
		};

		Echo.Plugin.create(plugin);

	})(Echo.jQuery);

	IdeaMelt.init({api_key: 'dev.nasdaq'});

    // now init all IdeaMelt apps		

	if (myPage == 'companynewsstory') {
		Echo.Loader.initApplication({
			"script": "http://cdn.realtidbits.com/libs/v3/comments/comments.min.js",
			"component": "RTB.Apps.Comments",
			"config": {
				"cssURL": "http://realtidbits.com/libs/v3/comments/comments.css",
				"streamQuery": 'childrenof:'+document.location.href+' -user.state:ModeratorBanned -state:SystemFlagged,ModeratorFlagged,ModeratorDeleted,ModeratorBanned -source:Twitter sortOrder:reverseChronological itemsPerPage:15 safeHTML:permissive children:1 -state:SystemFlagged,ModeratorFlagged,ModeratorDeleted,ModeratorBanned -source:Twitter',
				"target": document.getElementById('articlecomments'),
				"appkey": 'echo.realtidbits.commenting.nasdaq.prod',
				"sharing": {"enabled": true},
				"auth": {"loginButton": false},
				"pageLike": {"enabled": false},
				"ready": function() {comments = this;},
				"plugins": {
					"formAuth": [],
					"reply": [{"name": "PostButtonTypeChange"}],
					"stream": [],
					"submit": [{"name": "PostButtonTypeChange"}]
				},
				"settings": {
					"tabs": {
						"social": false,
						"community": false
					},
					"tokbox": {"enabled": false},
					"topComments": {
						"enabled": false
					}	
				}
			}
		});

		IdeaMelt.EventHooks.rtbComments(comments, true, true);
	}
});
});
});